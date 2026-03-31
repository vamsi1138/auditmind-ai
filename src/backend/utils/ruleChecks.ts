import type { RiskItem, RiskLevel } from "../types/report";

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

export function detectRuleFlags(code: string): string[] {
  const lowerCode = code.toLowerCase();
  const flags: string[] = [];

  if (lowerCode.includes("selfdestruct")) flags.push("selfdestruct");
  if (lowerCode.includes("delegatecall")) flags.push("delegatecall");
  if (lowerCode.includes("tx.origin")) flags.push("tx.origin");
  if (lowerCode.includes(".call(") || lowerCode.includes(".call{")) flags.push("low-level-call");
  if (lowerCode.includes("onlyowner")) flags.push("owner-controls");
  if (lowerCode.includes("mint(")) flags.push("mint-function");
  if (lowerCode.includes("burn(")) flags.push("burn-function");
  if (lowerCode.includes("pause(") || lowerCode.includes("unpause(")) flags.push("pause-controls");
  if (lowerCode.includes("withdraw(") || lowerCode.includes("drain(")) flags.push("withdraw-like-function");
  if (lowerCode.includes("reentrancyguard") || lowerCode.includes("nonreentrant")) {
    flags.push("reentrancy-protection-detected");
  }

  return flags;
}

export function detectFeatures(code: string): string[] {
  const lowerCode = code.toLowerCase();
  const features: string[] = [];

  if (lowerCode.includes("erc20")) features.push("ERC20-like logic");
  if (lowerCode.includes("erc721") || lowerCode.includes("nft")) features.push("NFT-like logic");
  if (lowerCode.includes("ownable")) features.push("Ownership controls");
  if (lowerCode.includes("constructor")) features.push("Constructor initialization");
  if (lowerCode.includes("mapping(address => uint256)")) features.push("Balance mapping");
  if (lowerCode.includes("mint(")) features.push("Mint capability");
  if (lowerCode.includes("burn(")) features.push("Burn capability");
  if (lowerCode.includes("pause(") || lowerCode.includes("unpause(")) features.push("Pause controls");
  if (lowerCode.includes("selfdestruct")) features.push("Self-destruct mechanism");
  if (lowerCode.includes("delegatecall")) features.push("Delegatecall usage");
  if (lowerCode.includes(".call(") || lowerCode.includes(".call{")) features.push("Low-level external calls");

  return features;
}

export function buildRuleBasedRisks(code: string): RiskItem[] {
  const lowerCode = code.toLowerCase();
  const risks: RiskItem[] = [];

  if (lowerCode.includes("selfdestruct")) {
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

  if (lowerCode.includes("delegatecall")) {
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

  if (lowerCode.includes("tx.origin")) {
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

  if (lowerCode.includes(".call(") || lowerCode.includes(".call{")) {
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

  if (
    (lowerCode.includes(".call(") || lowerCode.includes(".call{")) &&
    !lowerCode.includes("reentrancyguard") &&
    !lowerCode.includes("nonreentrant")
  ) {
    risks.push(
      createRisk(
        "possible-reentrancy",
        "Possible reentrancy exposure",
        "High",
        "Reentrancy",
        "The contract performs external calls without obvious reentrancy protection.",
        "An attacker may be able to re-enter the function before state updates are finalized.",
        "Apply checks-effects-interactions and add ReentrancyGuard or nonReentrant where appropriate.",
        ["reentrancy", "call", "funds"]
      )
    );
  }

  if (lowerCode.includes("onlyowner")) {
    risks.push(
      createRisk(
        "owner-privileges",
        "Privileged owner controls detected",
        "Medium",
        "Centralization",
        "The contract uses owner-restricted functionality.",
        "This may be valid, but a single privileged account creates centralization and key-risk concerns.",
        "Document owner powers clearly and consider multisig or timelock for sensitive actions.",
        ["onlyOwner", "owner", "admin"]
      )
    );
  }

  if (lowerCode.includes("mint(") && !lowerCode.includes("onlyowner") && !lowerCode.includes("role")) {
    risks.push(
      createRisk(
        "unprotected-mint",
        "Mint function without obvious access restriction",
        "High",
        "Token Controls",
        "A mint function appears without an obvious owner or role-based access restriction.",
        "Unauthorized minting can inflate supply and break token economics or trust.",
        "Protect minting with onlyOwner, roles, or another clear access-control mechanism.",
        ["mint", "token", "access-control"]
      )
    );
  }

  if (lowerCode.includes("burn(") && !lowerCode.includes("onlyowner") && !lowerCode.includes("role")) {
    risks.push(
      createRisk(
        "burn-review",
        "Burn function needs access review",
        "Medium",
        "Token Controls",
        "A burn function appears without obvious access restriction logic nearby.",
        "Unclear burn permissions may allow misuse or unexpected asset destruction.",
        "Review who is allowed to burn and document the intended permission model.",
        ["burn", "token", "permissions"]
      )
    );
  }

  if (lowerCode.includes("function pause(") || lowerCode.includes("function unpause(")) {
    risks.push(
      createRisk(
        "pause-controls",
        "Pause or unpause controls detected",
        "Medium",
        "Administrative Controls",
        "The contract appears to support pausing logic.",
        "Pause controls can be useful, but they also introduce admin trust assumptions.",
        "Make pause authority explicit and consider multisig protection for pause operations.",
        ["pause", "admin", "control"]
      )
    );
  }

  if (
    lowerCode.includes("setowner(") ||
    lowerCode.includes("transferownership(") ||
    lowerCode.includes("changeowner(")
  ) {
    risks.push(
      createRisk(
        "ownership-transfer",
        "Ownership transfer capability detected",
        "Low",
        "Administrative Controls",
        "The contract allows ownership changes.",
        "Ownership transfer is common, but it affects who ultimately controls privileged actions.",
        "Ensure ownership transfer is restricted and emits clear events.",
        ["ownership", "admin", "upgrade"]
      )
    );
  }

  if (
    lowerCode.includes("public") &&
    (lowerCode.includes("withdraw(") || lowerCode.includes("drain("))
  ) {
    risks.push(
      createRisk(
        "public-withdraw-review",
        "Public withdraw-like function detected",
        "High",
        "Funds Management",
        "A public withdraw or drain-like function appears in the contract.",
        "If not protected correctly, public fund-moving functions can lead to direct loss of funds.",
        "Review modifiers and require conditions around all withdrawal logic.",
        ["withdraw", "public", "funds"]
      )
    );
  }

  return risks;
}