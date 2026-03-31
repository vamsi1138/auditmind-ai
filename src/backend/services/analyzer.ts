import { RiskItem, RiskLevel } from "../types/report";
import { runAgentAnalysis } from "./agentAnalyzer";

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

function detectFeatures(code: string): string[] {
  const lowerCode = code.toLowerCase();
  const features: string[] = [];

  if (lowerCode.includes("erc20")) features.push("ERC20-like logic");
  if (lowerCode.includes("erc721") || lowerCode.includes("nft")) features.push("NFT-like logic");
  if (lowerCode.includes("ownable")) features.push("Ownership controls");
  if (lowerCode.includes("constructor")) features.push("Constructor initialization");
  if (lowerCode.includes("mint(")) features.push("Mint capability");
  if (lowerCode.includes("burn(")) features.push("Burn capability");
  if (lowerCode.includes("pause(") || lowerCode.includes("unpause(")) features.push("Pause controls");
  if (lowerCode.includes("selfdestruct")) features.push("Self-destruct mechanism");
  if (lowerCode.includes("delegatecall")) features.push("Delegatecall usage");
  if (lowerCode.includes(".call(") || lowerCode.includes(".call{")) {
    features.push("Low-level external calls");
  }

  return features;
}

function detectPatterns(code: string): RiskItem[] {
  const risks: RiskItem[] = [];
  const lowerCode = code.toLowerCase();

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
        "The contract uses delegatecall, which executes external code in the current contract context.",
        "Unsafe delegatecall usage can lead to storage corruption, privilege abuse, or full takeover.",
        "Avoid delegatecall unless required by design, and strictly control the target address and call path.",
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
        "This pattern can be abused through phishing-style attacks and is unsafe for access control.",
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
        "Improper handling of low-level calls can create reentrancy risk or silent failure behavior.",
        "Use checks-effects-interactions, verify return values, and consider reentrancy protection.",
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
        "An attacker may be able to re-enter a function before state updates are finalized.",
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
        "This may be intended, but it increases centralization and key-compromise risk.",
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
        "Unauthorized minting can inflate supply and break token trust or economics.",
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
        "Pause controls can be protective, but they also introduce trust assumptions and admin power.",
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
        "Ownership transfer is common, but it changes who controls privileged actions.",
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
        "Review modifiers, require checks, and state update ordering around all withdrawal logic.",
        ["withdraw", "public", "funds"]
      )
    );
  }

  return risks;
}

function generateSummary(code: string): string {
  const lowerCode = code.toLowerCase();

  if (lowerCode.includes("selfdestruct")) {
    return "This contract includes a self-destruct mechanism which can permanently remove the contract from the blockchain.";
  }

  if (lowerCode.includes("erc20")) {
    return "This contract appears to implement or interact with an ERC-20 style token.";
  }

  if (lowerCode.includes("erc721") || lowerCode.includes("nft")) {
    return "This contract appears to implement or interact with an NFT-style token.";
  }

  if (lowerCode.includes("ownable")) {
    return "This contract appears to include ownership-based administrative controls.";
  }

  if (lowerCode.includes("constructor")) {
    return "This contract includes deployment-time initialization logic through a constructor.";
  }

  if (lowerCode.includes("mapping(address => uint256)")) {
    return "This contract likely manages balances or account-based asset tracking.";
  }

  return "This contract appears to define custom Solidity logic and should be reviewed for admin powers, external calls, and fund-moving behavior.";
}

function calculateRiskScore(risks: RiskItem[]): number {
  let score = 0;

  for (const risk of risks) {
    if (risk.severity === "High") score += 25;
    if (risk.severity === "Medium") score += 15;
    if (risk.severity === "Low") score += 8;
    if (risk.severity === "Info") score += 3;
  }

  return Math.min(score, 100);
}

function generateVerdict(riskScore: number): "Safe" | "Caution" | "High Risk" {
  if (riskScore >= 60) return "High Risk";
  if (riskScore >= 20) return "Caution";
  return "Safe";
}

function generateBeginnerExplanation(
  verdict: "Safe" | "Caution" | "High Risk",
  risks: RiskItem[]
): string {
  if (verdict === "High Risk") {
    return "This contract shows strong warning signs and may be unsafe, especially around permissions, external calls, or destructive functions.";
  }

  if (verdict === "Caution") {
    return "This contract is not automatically unsafe, but it includes features that need careful review, especially around admin powers or fund movement.";
  }

  if (risks.length === 0) {
    return "This quick scan did not find major warning patterns, but that does not guarantee the contract is fully safe.";
  }

  return "This contract has only limited concerns in this quick scan, but deeper review is still recommended.";
}

function buildAuditPrompt(contractCode: string, possibleRisks: RiskItem[]): string {
  const shortenedCode = contractCode.slice(0, 2500);

  const riskLines =
    possibleRisks.length > 0
      ? possibleRisks.map((risk) => `- ${risk.title} [${risk.severity}]`).join("\n")
      : "- No major rule-based flags detected";

  return `
Review this Solidity contract briefly.

Contract:
${shortenedCode}

Detected risk flags:
${riskLines}

Give:
1. one-sentence security summary
2. biggest concern
3. one practical fix

Keep it under 120 words.
`.trim();
}

export async function analyzeContract(contractCode: string): Promise<any> {
  const possibleRisks = detectPatterns(contractCode);
  const contractSummary = generateSummary(contractCode);
  const detectedFeatures = detectFeatures(contractCode);
  const riskScore = calculateRiskScore(possibleRisks);
  const verdict = generateVerdict(riskScore);
  const beginnerExplanation = generateBeginnerExplanation(verdict, possibleRisks);
  const ruleFlags = possibleRisks.map((risk) => risk.id);

  const prompt = buildAuditPrompt(contractCode, possibleRisks);

  const agentResult = await runAgentAnalysis(prompt);

  return {
    contractSummary,
    possibleRisks,
    verdict,
    riskScore,
    beginnerExplanation,
    detectedFeatures,
    ruleFlags,
    agentReasoning: agentResult.text,
    sourceAnalysis: {
      validationPassed: true,
      ruleEngineUsed: true,
      elizaAgentUsed: agentResult.agentUsed,
      qwenEndpointUsed: agentResult.agentMode === "ollama-local",
    },
  };
}