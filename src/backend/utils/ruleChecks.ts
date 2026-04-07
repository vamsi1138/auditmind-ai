import type { RiskItem, RiskLevel } from "../types/report";

function hasText(source: string, value: string): boolean {
  return source.indexOf(value) !== -1;
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

export function detectRuleFlags(code: string): string[] {
  const lowerCode = code.toLowerCase();
  const flags: string[] = [];

  if (hasText(lowerCode, "selfdestruct")) flags.push("selfdestruct-usage");
  if (hasText(lowerCode, "delegatecall")) flags.push("delegatecall-usage");
  if (hasText(lowerCode, "tx.origin")) flags.push("tx-origin-usage");
  if (hasText(lowerCode, ".call(") || hasText(lowerCode, ".call{")) flags.push("low-level-call");
  if (hasText(lowerCode, "onlyowner")) flags.push("owner-privileges");
  if (hasText(lowerCode, "mint(")) flags.push("mint-function");
  if (hasText(lowerCode, "burn(")) flags.push("burn-function");
  if (hasText(lowerCode, "pause(") || hasText(lowerCode, "unpause(")) flags.push("pause-controls");
  if (hasText(lowerCode, "withdraw(") || hasText(lowerCode, "drain(")) flags.push("withdraw-like-function");

  if (
    (hasText(lowerCode, ".call(") || hasText(lowerCode, ".call{")) &&
    !hasText(lowerCode, "nonreentrant") &&
    !hasText(lowerCode, "reentrancyguard")
  ) {
    flags.push("possible-reentrancy");
  }

  return flags;
}

export function detectFeatures(code: string): string[] {
  const lowerCode = code.toLowerCase();
  const features: string[] = [];

  if (hasText(lowerCode, "erc20")) features.push("ERC20-like logic");
  if (hasText(lowerCode, "erc721") || hasText(lowerCode, "nft")) features.push("NFT-like logic");
  if (hasText(lowerCode, "ownable") || hasText(lowerCode, "owner")) features.push("Ownership controls");
  if (hasText(lowerCode, "constructor")) features.push("Constructor initialization");
  if (
    hasText(lowerCode, "mapping(address => uint256)") ||
    hasText(lowerCode, "mapping(address=>uint256)")
  ) {
    features.push("Balance tracking");
  }
  if (hasText(lowerCode, "mint(")) features.push("Mint capability");
  if (hasText(lowerCode, "burn(")) features.push("Burn capability");
  if (hasText(lowerCode, "pause(") || hasText(lowerCode, "unpause(")) features.push("Pause controls");
  if (hasText(lowerCode, "selfdestruct")) features.push("Self-destruct mechanism");
  if (hasText(lowerCode, "delegatecall")) features.push("Delegatecall usage");
  if (hasText(lowerCode, ".call(") || hasText(lowerCode, ".call{")) features.push("Low-level external calls");
  if (hasText(lowerCode, "event ")) features.push("Event emission");

  return features;
}

export function buildRuleBasedRisks(code: string): RiskItem[] {
  const lowerCode = code.toLowerCase();
  const risks: RiskItem[] = [];

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

  if (
    (hasText(lowerCode, ".call(") || hasText(lowerCode, ".call{")) &&
    !hasText(lowerCode, "reentrancyguard") &&
    !hasText(lowerCode, "nonreentrant")
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

  if (hasText(lowerCode, "mint(") && !hasText(lowerCode, "onlyowner") && !hasText(lowerCode, "role")) {
    risks.push(
      createRisk(
        "unprotected-mint",
        "Mint function without obvious access restriction",
        "High",
        "Token Controls",
        "A mint function appears without an obvious owner or role-based access restriction.",
        "Unauthorized minting can inflate supply and break token trust or economics.",
        "Protect minting with onlyOwner, roles, or another clear access-control mechanism.",
        ["mint", "token", "access-control"]
      )
    );
  }

  if (hasText(lowerCode, "burn(") && !hasText(lowerCode, "onlyowner") && !hasText(lowerCode, "role")) {
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

  if (
    hasText(lowerCode, "public") &&
    (hasText(lowerCode, "withdraw(") || hasText(lowerCode, "drain("))
  ) {
    risks.push(
      createRisk(
        "public-withdraw-review",
        "Public withdraw-like function detected",
        "High",
        "Funds Management",
        "A public withdraw or drain-like function appears in the contract.",
        "If not protected correctly, public fund-moving functions can lead to direct loss of funds.",
        "Review modifiers, require checks, and state update ordering around all withdrawal logic.",
        ["withdraw", "public", "funds"]
      )
    );
  }

  return risks;
}

export function generateRuleSummary(code: string): string {
  const lowerCode = code.toLowerCase();

  if (hasText(lowerCode, "selfdestruct")) {
    return "This contract includes a self-destruct mechanism which can permanently remove the contract from the blockchain.";
  }

  if (hasText(lowerCode, "erc20")) {
    return "This contract appears to implement or interact with an ERC-20 style token.";
  }

  if (hasText(lowerCode, "erc721") || hasText(lowerCode, "nft")) {
    return "This contract appears to implement or interact with an NFT-style token.";
  }

  if (hasText(lowerCode, "ownable") || hasText(lowerCode, "owner")) {
    return "This contract appears to include ownership-based administrative controls.";
  }

  if (hasText(lowerCode, "constructor")) {
    return "This contract includes deployment-time initialization logic through a constructor.";
  }

  if (
    hasText(lowerCode, "mapping(address => uint256)") ||
    hasText(lowerCode, "mapping(address=>uint256)")
  ) {
    return "This contract likely manages balances or account-based asset tracking.";
  }

  return "This contract appears to define custom Solidity logic and should be reviewed for admin powers, external calls, and fund movement.";
}