import type { AuditReport, RiskItem } from "../types/report";
import { runAgentAnalysis } from "./agentAnalyzer";
import { buildAuditPrompt } from "./promptBuilder";
import {
  buildRuleBasedRisks,
  detectFeatures,
  detectRuleFlags,
  generateRuleSummary,
} from "../utils/ruleChecks";

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

function generateVerdict(riskScore: number, risks: RiskItem[]): "Safe" | "Caution" | "High Risk" {
  if (risks.some((risk) => risk.severity === "High")) return "High Risk";
  if (riskScore >= 20) return "Caution";
  return "Safe";
}

function generateBeginnerExplanation(
  verdict: "Safe" | "Caution" | "High Risk",
  risks: RiskItem[]
): string {
  if (verdict === "High Risk") {
    return "This contract shows strong warning signs and may be unsafe without deeper expert review.";
  }

  if (verdict === "Caution") {
    return "This contract is not automatically unsafe, but it includes features that need careful review.";
  }

  if (risks.length === 0) {
    return "This quick scan did not find major warning patterns, but that does not guarantee full safety.";
  }

  return "Minor concerns were detected, and deeper review is still recommended.";
}

function mergeRisks(ruleRisks: RiskItem[], aiRisks?: RiskItem[]): RiskItem[] {
  const merged = new Map<string, RiskItem>();

  for (const risk of ruleRisks) {
    merged.set(risk.id, risk);
  }

  if (Array.isArray(aiRisks)) {
    for (const risk of aiRisks) {
      if (!risk?.id || !risk?.title || !risk?.severity) continue;

      const existing = merged.get(risk.id);

      if (!existing) {
        merged.set(risk.id, risk);
        continue;
      }

      merged.set(risk.id, {
        ...existing,
        description: risk.description || existing.description,
        whyItMatters: risk.whyItMatters || existing.whyItMatters,
        suggestion: risk.suggestion || existing.suggestion,
        tags: Array.from(new Set([...(existing.tags || []), ...(risk.tags || [])])),
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    const order: Record<string, number> = { High: 0, Medium: 1, Low: 2, Info: 3 };
    return order[a.severity] - order[b.severity];
  });
}

export async function analyzeContract(contractCode: string): Promise<AuditReport> {
  const ruleFlags = detectRuleFlags(contractCode);
  const detectedFeatures = detectFeatures(contractCode);
  const ruleRisks = buildRuleBasedRisks(contractCode);

  const prompt = buildAuditPrompt(contractCode, ruleFlags);
  const agentResult = await runAgentAnalysis(prompt);

  const possibleRisks = mergeRisks(ruleRisks, agentResult.draft?.possibleRisks);
  const riskScore = calculateRiskScore(possibleRisks);
  const verdict = generateVerdict(riskScore, possibleRisks);

  const contractSummary =
    agentResult.draft?.contractSummary?.trim() || generateRuleSummary(contractCode);

  const beginnerExplanation =
    agentResult.draft?.beginnerExplanation?.trim() ||
    generateBeginnerExplanation(verdict, possibleRisks);

  const agentReasoning =
    agentResult.draft?.agentReasoning?.trim() || agentResult.message || "Rule-based analysis used.";

  return {
    contractSummary,
    possibleRisks,
    verdict,
    riskScore,
    beginnerExplanation,
    detectedFeatures,
    ruleFlags,
    agentReasoning,
    sourceAnalysis: {
      validationPassed: true,
      ruleEngineUsed: true,
      elizaAgentUsed: agentResult.provider === "eliza-qwen",
      qwenEndpointUsed:
        agentResult.provider === "eliza-qwen" || agentResult.provider === "qwen-direct",
      analysisMode:
        agentResult.provider === "eliza-qwen"
          ? "eliza-qwen"
          : agentResult.provider === "qwen-direct"
          ? "qwen-direct"
          : "fallback",
    },
  };
}