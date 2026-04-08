import type { RiskItem, RiskLevel } from "../types/report";

interface FunctionBlock {
  name: string;
  signature: string;
  body: string;
  fullText: string;
  lowerSignature: string;
  lowerBody: string;
}

function hasText(source: string, value: string): boolean {
  return source.indexOf(value) !== -1;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function joinNaturalLanguage(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function createRisk(
  id: string,
  title: string,
  severity: RiskLevel,
  category: string,
  description: string,
  whyItMatters: string,
  suggestion: string,
  tags: string[]
): RiskItem {
  return {
    id,
    title,
    severity,
    category,
    description,
    whyItMatters,
    suggestion,
    tags,
  };
}

function extractBlockBody(code: string, openBraceIndex: number) {
  let depth = 1;
  let cursor = openBraceIndex + 1;

  while (cursor < code.length && depth > 0) {
    const char = code[cursor];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    cursor += 1;
  }

  return {
    body: code.slice(openBraceIndex + 1, Math.max(openBraceIndex + 1, cursor - 1)),
    end: cursor,
  };
}

function extractFunctionBlocks(code: string): FunctionBlock[] {
  const blocks: FunctionBlock[] = [];
  const pattern = /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)[^{;]*\{/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(code)) !== null) {
    const openBraceIndex = pattern.lastIndex - 1;
    const { body, end } = extractBlockBody(code, openBraceIndex);
    const signature = code.slice(match.index, openBraceIndex).trim();
    const fullText = code.slice(match.index, end);

    blocks.push({
      name: match[1],
      signature,
      body,
      fullText,
      lowerSignature: signature.toLowerCase(),
      lowerBody: body.toLowerCase(),
    });
  }

  return blocks;
}

function extractSpecialBlock(code: string, kind: "fallback" | "receive"): FunctionBlock | null {
  const sourcePattern =
    kind === "fallback"
      ? /fallback\s*\([^)]*\)\s*external[^{;]*\{/g
      : /receive\s*\([^)]*\)\s*external[^{;]*\{/g;
  const match = sourcePattern.exec(code);

  if (!match) return null;

  const openBraceIndex = sourcePattern.lastIndex - 1;
  const { body, end } = extractBlockBody(code, openBraceIndex);
  const signature = code.slice(match.index, openBraceIndex).trim();
  const fullText = code.slice(match.index, end);

  return {
    name: kind,
    signature,
    body,
    fullText,
    lowerSignature: signature.toLowerCase(),
    lowerBody: body.toLowerCase(),
  };
}

function getContractName(code: string): string | null {
  const match = code.match(/\b(?:contract|library|interface)\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match?.[1] || null;
}

function functionNames(blocks: FunctionBlock[]): string[] {
  return uniqueStrings(blocks.map((block) => block.name));
}

function listFunctionNames(blocks: FunctionBlock[]): string {
  return joinNaturalLanguage(functionNames(blocks));
}

function hasAccessRestriction(block: FunctionBlock): boolean {
  const headerHasModifier =
    /\bonly(owner|admin|role|governance|manager|minter|pauser)\b/i.test(block.signature) ||
    /\b(auth|authorized)\b/i.test(block.signature);

  if (headerHasModifier) {
    return true;
  }

  const openingWindow = block.body.split(/\r?\n/).slice(0, 8).join("\n");
  return (
    /(require|if)\s*\([^)]*(msg\.sender|_msgsender\(\)|tx\.origin)[^)]*(owner|admin|manager|minter|pauser|governance|role)/i.test(
      openingWindow
    ) ||
    /(require|if)\s*\([^)]*(owner|admin|manager|minter|pauser|governance|role)[^)]*(msg\.sender|_msgsender\(\)|tx\.origin)/i.test(
      openingWindow
    ) ||
    /hasrole\s*\(|_checkrole\s*\(/i.test(openingWindow)
  );
}

function hasLowLevelCall(block: FunctionBlock): boolean {
  return /\.call\s*(?:\(|\{)/i.test(block.body);
}

function hasNonReentrantProtection(block: FunctionBlock): boolean {
  return /\bnonreentrant\b/i.test(block.signature) || /reentrancyguard/i.test(block.fullText);
}

function hasStateUpdateAfterCall(block: FunctionBlock): boolean {
  const callMatch = block.body.match(/\.call\s*(?:\(|\{)/i);
  if (callMatch?.index === undefined) return false;

  const afterCall = block.body.slice(callMatch.index);
  return (
    /\b(?:balances?|rewards?|credits?|tokenbalances?)\s*\[[^\]]+\]\s*(?:\+=|-=|=)/i.test(afterCall) ||
    /\b(?:totalSupply|owner|paused|locked|implementation|treasury|feePercent)\b\s*(?:\+=|-=|=)/i.test(afterCall)
  );
}

function findConcreteReentrancyFunctions(functions: FunctionBlock[]): FunctionBlock[] {
  return functions.filter(
    (block) =>
      hasLowLevelCall(block) &&
      !hasNonReentrantProtection(block) &&
      hasStateUpdateAfterCall(block)
  );
}

function isIssuanceFunction(block: FunctionBlock): boolean {
  if (!/(mint|bonus|reward|airdrop)/i.test(block.name)) {
    return false;
  }

  return (
    /\b_mint\s*\(/i.test(block.body) ||
    /\btotalSupply\s*\+=/i.test(block.body) ||
    /\b(?:balances?|rewards?|credits?|tokenbalances?)\s*\[[^\]]+\]\s*\+=/i.test(block.body)
  );
}

function findUnrestrictedIssuanceFunctions(functions: FunctionBlock[]): FunctionBlock[] {
  return functions.filter((block) => isIssuanceFunction(block) && !hasAccessRestriction(block));
}

function isBurnPermissionReviewFunction(block: FunctionBlock): boolean {
  if (!/burn/i.test(block.name)) {
    return false;
  }

  const signatureMentionsAddress = /\baddress\b/i.test(block.signature);
  const bodyTouchesForeignBalance =
    /\b(?:balances?|tokenbalances?)\s*\[[^\]]+\]\s*-=/i.test(block.body) &&
    !/\b(?:balances?|tokenbalances?)\s*\[\s*msg\.sender\s*\]\s*-=/i.test(block.body);

  return !hasAccessRestriction(block) && (signatureMentionsAddress || bodyTouchesForeignBalance);
}

function isExternallyCallableWithdrawFunction(block: FunctionBlock): boolean {
  return (
    /\b(public|external)\b/i.test(block.signature) &&
    /(withdraw|claim|redeem|unstake|drain|sweep|rescue)/i.test(block.name)
  );
}

function findWithdrawReviewFunctions(functions: FunctionBlock[]): FunctionBlock[] {
  return functions.filter((block) => isExternallyCallableWithdrawFunction(block));
}

function isDrainCapabilityFunction(block: FunctionBlock): boolean {
  const dangerousName = /(adminwithdraw|emergencywithdraw|withdrawall|drainall|drain|sweep|rescue)/i;
  const sendsValue = /\.(?:call|transfer|send)\s*(?:\(|\{)/i.test(block.body);
  const touchesFullBalance = /address\s*\(\s*this\s*\)\s*\.balance/i.test(block.body);
  const arbitraryRecipientTransfer =
    /\baddress\s+payable\s+[A-Za-z_][A-Za-z0-9_]*\b/i.test(block.signature) &&
    /\.(?:call|transfer|send)\s*(?:\(|\{)/i.test(block.body);

  return sendsValue && (dangerousName.test(block.name) || touchesFullBalance || arbitraryRecipientTransfer);
}

function findDrainCapabilityFunctions(functions: FunctionBlock[]): FunctionBlock[] {
  return functions.filter((block) => isDrainCapabilityFunction(block));
}

function hasUntrackedPayableFallback(code: string): boolean {
  const fallbackBlock = extractSpecialBlock(code, "fallback");
  if (!fallbackBlock || !/\bpayable\b/i.test(fallbackBlock.signature)) {
    return false;
  }

  return !(
    /revert\s*\(/i.test(fallbackBlock.body) ||
    /emit\s+/i.test(fallbackBlock.body) ||
    /\b(?:balances?|credits?|deposits?)\s*\[[^\]]+\]/i.test(fallbackBlock.body) ||
    /\.(?:call|transfer|send|delegatecall)\s*(?:\(|\{)/i.test(fallbackBlock.body)
  );
}

function hasManagerRoles(lowerCode: string): boolean {
  return hasText(lowerCode, "mapping(address => bool) public admins") ||
    hasText(lowerCode, "mapping(address=>bool) public admins") ||
    hasText(lowerCode, "mapping(address => bool) public managers") ||
    hasText(lowerCode, "mapping(address=>bool) public managers");
}

export function detectRuleFlags(code: string): string[] {
  const lowerCode = code.toLowerCase();
  const functions = extractFunctionBlocks(code);
  const flags: string[] = [];

  const concreteReentrancyFunctions = findConcreteReentrancyFunctions(functions);
  const unrestrictedIssuanceFunctions = findUnrestrictedIssuanceFunctions(functions);
  const drainCapabilityFunctions = findDrainCapabilityFunctions(functions);

  if (hasText(lowerCode, "selfdestruct")) flags.push("selfdestruct-usage");
  if (hasText(lowerCode, "delegatecall")) flags.push("delegatecall-usage");
  if (hasText(lowerCode, "tx.origin")) flags.push("tx-origin-usage");
  if (hasText(lowerCode, ".call(") || hasText(lowerCode, ".call{")) flags.push("low-level-call");
  if (hasText(lowerCode, "onlyowner")) flags.push("owner-privileges");
  if (hasText(lowerCode, "mint(")) flags.push("mint-function");
  if (hasText(lowerCode, "burn(")) flags.push("burn-function");
  if (hasText(lowerCode, "pause(") || hasText(lowerCode, "unpause(")) flags.push("pause-controls");
  if (findWithdrawReviewFunctions(functions).length > 0) flags.push("withdraw-like-function");
  if (concreteReentrancyFunctions.length > 0) flags.push("possible-reentrancy");
  if (unrestrictedIssuanceFunctions.length > 0) flags.push("unprotected-mint");
  if (drainCapabilityFunctions.length > 0) flags.push("admin-drain-capability");
  if (hasUntrackedPayableFallback(code)) flags.push("payable-fallback-entrypoint");

  return uniqueStrings(flags);
}

export function detectFeatures(code: string): string[] {
  const lowerCode = code.toLowerCase();
  const features: string[] = [];

  if (hasText(lowerCode, "erc20")) features.push("ERC20-like logic");
  if (hasText(lowerCode, "erc721") || hasText(lowerCode, "nft")) features.push("NFT-like logic");
  if (hasText(lowerCode, "ownable") || hasText(lowerCode, "owner")) features.push("Ownership controls");
  if (hasManagerRoles(lowerCode)) features.push("Admin or manager roles");
  if (hasText(lowerCode, "constructor")) features.push("Constructor initialization");
  if (
    hasText(lowerCode, "mapping(address => uint256)") ||
    hasText(lowerCode, "mapping(address=>uint256)")
  ) {
    features.push("Balance tracking");
  }
  if (hasText(lowerCode, "rewards[")) features.push("Reward accounting");
  if (hasText(lowerCode, "mint(")) features.push("Mint capability");
  if (hasText(lowerCode, "burn(")) features.push("Burn capability");
  if (hasText(lowerCode, "pause(") || hasText(lowerCode, "unpause(")) features.push("Pause controls");
  if (hasText(lowerCode, "selfdestruct")) features.push("Self-destruct mechanism");
  if (hasText(lowerCode, "delegatecall")) features.push("Delegatecall usage");
  if (hasText(lowerCode, ".call(") || hasText(lowerCode, ".call{")) features.push("Low-level external calls");
  if (hasText(lowerCode, "fallback()")) features.push("Fallback entrypoint");
  if (hasText(lowerCode, "event ")) features.push("Event emission");

  return uniqueStrings(features);
}

export function buildRuleBasedRisks(code: string): RiskItem[] {
  const lowerCode = code.toLowerCase();
  const functions = extractFunctionBlocks(code);
  const risks: RiskItem[] = [];

  const concreteReentrancyFunctions = findConcreteReentrancyFunctions(functions);
  const unrestrictedIssuanceFunctions = findUnrestrictedIssuanceFunctions(functions);
  const drainCapabilityFunctions = findDrainCapabilityFunctions(functions);
  const withdrawReviewFunctions = findWithdrawReviewFunctions(functions);
  const burnPermissionReviewFunctions = functions.filter((block) =>
    isBurnPermissionReviewFunction(block)
  );

  if (hasText(lowerCode, "selfdestruct")) {
    risks.push(
      createRisk(
        "selfdestruct-usage",
        "Use of selfdestruct",
        "High",
        "Destructive Control",
        "The contract contains selfdestruct, which can remove contract code and alter expected lifecycle behavior.",
        "A privileged caller may be able to permanently disable the contract or redirect remaining funds.",
        "Avoid selfdestruct unless absolutely necessary, and restrict access to it very carefully.",
        ["selfdestruct", "admin", "destructive"]
      )
    );
  }

  if (hasText(lowerCode, "delegatecall")) {
    risks.push(
      createRisk(
        "delegatecall-usage",
        "Use of delegatecall",
        "High",
        "Execution Context",
        "The contract uses delegatecall, which runs external code in the current contract context.",
        "Unsafe delegatecall usage can lead to storage corruption or full contract compromise.",
        "Avoid delegatecall unless your design truly requires it, and tightly control target contracts.",
        ["delegatecall", "proxy", "execution"]
      )
    );
  }

  if (hasText(lowerCode, "tx.origin")) {
    risks.push(
      createRisk(
        "tx-origin-usage",
        "Use of tx.origin",
        "High",
        "Authentication",
        "The contract appears to use tx.origin for authorization logic.",
        "tx.origin can be abused through phishing-style interactions and is not safe for access control.",
        "Use msg.sender instead of tx.origin for authorization decisions.",
        ["tx.origin", "auth", "access-control"]
      )
    );
  }

  if (hasText(lowerCode, ".call(") || hasText(lowerCode, ".call{")) {
    risks.push(
      createRisk(
        "low-level-call",
        "Low-level external call usage",
        "Medium",
        "External Calls",
        "The contract uses low-level call operations.",
        "Improper handling of low-level calls can introduce reentrancy risk or silent failure behavior.",
        "Use checks-effects-interactions, verify return values, and consider reentrancy guards.",
        ["call", "external-call", "reentrancy"]
      )
    );
  }

  if (concreteReentrancyFunctions.length > 0) {
    const names = listFunctionNames(concreteReentrancyFunctions);
    risks.push(
      createRisk(
        "possible-reentrancy",
        "External call before state update",
        "High",
        "Reentrancy",
        `The function${concreteReentrancyFunctions.length > 1 ? "s" : ""} ${names} perform low-level calls before updating important storage values.`,
        "An attacker may be able to re-enter before balances, rewards, or other accounting values are finalized.",
        "Move storage updates before external calls and add nonReentrant protection where appropriate.",
        ["reentrancy", "call", "state-ordering"]
      )
    );
  }

  if (hasText(lowerCode, "onlyowner")) {
    risks.push(
      createRisk(
        "owner-privileges",
        "Privileged owner controls detected",
        "Medium",
        "Centralization",
        "The contract uses owner-restricted functionality.",
        "This may be intended, but it increases centralization and key-compromise risk.",
        "Document owner powers clearly and consider multisig or timelock for sensitive actions.",
        ["onlyOwner", "owner", "admin"]
      )
    );
  }

  if (unrestrictedIssuanceFunctions.length > 0) {
    const names = listFunctionNames(unrestrictedIssuanceFunctions);
    risks.push(
      createRisk(
        "unprotected-mint",
        "Mint or reward issuance without clear access restriction",
        "High",
        "Token Controls",
        `The function${unrestrictedIssuanceFunctions.length > 1 ? "s" : ""} ${names} appear to increase balances, rewards, or total supply without clear access control.`,
        "Unrestricted issuance can let any caller inflate supply, credit arbitrary accounts, or mint claimable value.",
        "Protect issuance paths with explicit access control and document who is allowed to create value.",
        ["mint", "reward", "access-control"]
      )
    );
  }

  if (burnPermissionReviewFunctions.length > 0) {
    const names = listFunctionNames(burnPermissionReviewFunctions);
    risks.push(
      createRisk(
        "burn-review",
        "Burn function needs permission review",
        "Medium",
        "Token Controls",
        `The function${burnPermissionReviewFunctions.length > 1 ? "s" : ""} ${names} can burn assets without a clear permission model.`,
        "Unclear burn permissions may allow misuse or unexpected asset destruction.",
        "Review who is allowed to burn, which accounts can be targeted, and document the intended permission model.",
        ["burn", "token", "permissions"]
      )
    );
  }

  if (hasText(lowerCode, "function pause(") || hasText(lowerCode, "function unpause(")) {
    risks.push(
      createRisk(
        "pause-controls",
        "Pause or unpause controls detected",
        "Medium",
        "Administrative Controls",
        "The contract appears to support pausing logic.",
        "Pause controls can be useful, but they also introduce trust assumptions and admin power.",
        "Make pause authority explicit and consider multisig protection for pause operations.",
        ["pause", "admin", "control"]
      )
    );
  }

  if (
    hasText(lowerCode, "setowner(") ||
    hasText(lowerCode, "transferownership(") ||
    hasText(lowerCode, "changeowner(") ||
    hasText(lowerCode, "setadmin(")
  ) {
    risks.push(
      createRisk(
        "ownership-transfer",
        "Ownership or admin transfer capability detected",
        "Low",
        "Administrative Controls",
        "The contract allows ownership or admin changes.",
        "Changing privileged roles affects who ultimately controls sensitive functions.",
        "Ensure privileged role changes are restricted and emit clear events.",
        ["ownership", "admin", "upgrade"]
      )
    );
  }

  if (drainCapabilityFunctions.length > 0) {
    const names = listFunctionNames(drainCapabilityFunctions);
    const allRestricted = drainCapabilityFunctions.every((block) => hasAccessRestriction(block));
    risks.push(
      createRisk(
        "admin-drain-capability",
        allRestricted
          ? "Privileged drain or emergency withdrawal capability"
          : "Fund drain function without clear access restriction",
        allRestricted ? "Medium" : "High",
        "Funds Management",
        `The function${drainCapabilityFunctions.length > 1 ? "s" : ""} ${names} can move contract funds to an operator-selected recipient or out of the contract balance.`,
        allRestricted
          ? "Even when intended, concentrated drain powers materially increase trust and key-compromise risk."
          : "If this path is not tightly restricted, a caller may be able to withdraw funds they do not own.",
        allRestricted
          ? "Document this emergency power clearly and consider multisig, timelock, and event coverage for every privileged withdrawal."
          : "Restrict this path with explicit access control and verify that only intended emergency operators can use it.",
        ["withdraw", "admin", "funds"]
      )
    );
  }

  if (hasUntrackedPayableFallback(code)) {
    risks.push(
      createRisk(
        "payable-fallback-funds-trap",
        "Payable fallback may accept untracked funds",
        "Medium",
        "Funds Management",
        "The contract exposes a payable fallback path without obvious accounting, forwarding, or rejection logic.",
        "ETH sent with unexpected calldata may become untracked or rely on privileged recovery paths instead of normal user accounting.",
        "Either route fallback deposits into the intended accounting flow or revert unexpected payable fallback calls.",
        ["fallback", "payable", "funds"]
      )
    );
  }

  if (
    withdrawReviewFunctions.length > 0 &&
    concreteReentrancyFunctions.length === 0 &&
    drainCapabilityFunctions.length === 0
  ) {
    const names = listFunctionNames(withdrawReviewFunctions);
    risks.push(
      createRisk(
        "public-withdraw-review",
        "Externally callable withdrawal path detected",
        "Medium",
        "Funds Management",
        `The function${withdrawReviewFunctions.length > 1 ? "s" : ""} ${names} move value through publicly callable withdrawal-style flows.`,
        "Withdrawal logic deserves careful review because permission checks, accounting order, and external interaction patterns directly affect user funds.",
        "Review modifiers, balance checks, and state update ordering around each withdrawal flow.",
        ["withdraw", "public", "funds"]
      )
    );
  }

  return risks;
}

export function generateRuleSummary(code: string): string {
  const lowerCode = code.toLowerCase();
  const contractName = getContractName(code) || "This contract";
  const ruleFlags = detectRuleFlags(code);

  const behaviors: string[] = [];
  if (hasText(lowerCode, "deposit(") || hasText(lowerCode, "receive()")) {
    behaviors.push("accept inbound ETH or deposit-style value flows");
  }
  if (hasText(lowerCode, "withdraw(") || hasText(lowerCode, "claim")) {
    behaviors.push("move value back out through withdrawal or claim paths");
  }
  if (hasText(lowerCode, "mint(") || hasText(lowerCode, "burn(")) {
    behaviors.push("include token-like mint or burn logic");
  }
  if (hasText(lowerCode, "delegatecall")) {
    behaviors.push("execute external logic in its own storage context");
  }

  const controls: string[] = [];
  if (hasText(lowerCode, "owner")) controls.push("owner-controlled functions");
  if (hasManagerRoles(lowerCode)) controls.push("admin or manager roles");
  if (hasText(lowerCode, "pause(") || hasText(lowerCode, "unpause(")) controls.push("pause controls");

  const reviewAreas: string[] = [];
  if (ruleFlags.includes("tx-origin-usage")) reviewAreas.push("tx.origin-based authorization");
  if (ruleFlags.includes("possible-reentrancy")) reviewAreas.push("state updates that happen after external calls");
  if (ruleFlags.includes("delegatecall-usage")) reviewAreas.push("delegatecall trust boundaries");
  if (ruleFlags.includes("unprotected-mint")) reviewAreas.push("issuance functions without clear access control");
  if (ruleFlags.includes("admin-drain-capability")) reviewAreas.push("privileged fund-drain capabilities");
  if (ruleFlags.includes("payable-fallback-entrypoint")) reviewAreas.push("payable fallback handling");

  const sentences = [
    behaviors.length > 0
      ? `${contractName} appears to ${joinNaturalLanguage(behaviors)}.`
      : `${contractName} appears to implement custom Solidity business logic that should be reviewed for access control, fund movement, and external integrations.`,
    controls.length > 0
      ? `Privileged controls include ${joinNaturalLanguage(controls)}.`
      : "",
    reviewAreas.length > 0
      ? `The highest-priority review areas are ${joinNaturalLanguage(reviewAreas)}.`
      : "",
  ].filter(Boolean);

  return sentences.join(" ");
}
