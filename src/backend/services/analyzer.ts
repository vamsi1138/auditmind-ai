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

function dedupeStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function countSentences(value: string): number {
  return value
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function isDetailedNarrative(value: string | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return trimmed.length >= 260 && countSentences(trimmed) >= 4;
}

function isDetailedContractSummary(value: string | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return trimmed.length >= 120 && countSentences(trimmed) >= 2;
}

function joinNaturalLanguage(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function humanizeRuleFlag(flag: string): string {
  return flag.replace(/-/g, " ");
}

function formatNumberedSection(title: string, items: string[]): string {
  return `**${title}:**\n${items.map((item, index) => `${index + 1}. ${item}`).join("\n")}`;
}

function buildOverviewSummary(
  contractSummary: string,
  possibleRisks: RiskItem[],
  detectedFeatures: string[],
  verdict: "Safe" | "Caution" | "High Risk"
): string {
  const severityCounts = possibleRisks.reduce(
    (counts, risk) => {
      counts[risk.severity] += 1;
      return counts;
    },
    { High: 0, Medium: 0, Low: 0, Info: 0 } as Record<RiskItem["severity"], number>
  );

  const topFindings = possibleRisks.slice(0, 3).map((risk) => `${risk.title} (${risk.severity})`);
  const parts = [
    ensureSentence(contractSummary),
    possibleRisks.length > 0
      ? `The combined analysis lands on a ${verdict} verdict with ${severityCounts.High} high, ${severityCounts.Medium} medium, ${severityCounts.Low} low, and ${severityCounts.Info} informational findings.`
      : `The combined analysis lands on a ${verdict} verdict and did not surface concrete risk items from the current rules and agent pass.`,
    topFindings.length > 0
      ? `The most important issues to verify first are ${joinNaturalLanguage(topFindings)}.`
      : "",
    detectedFeatures.length > 0
      ? `Detected contract capabilities include ${joinNaturalLanguage(detectedFeatures.slice(0, 4))}, which shape the likely trust boundaries and review focus.`
      : "",
  ].filter(Boolean);

  return parts.join(" ");
}

function buildAttackSurfaceSummary(
  contractSummary: string,
  possibleRisks: RiskItem[],
  detectedFeatures: string[],
  ruleFlags: string[]
): string {
  const featureSentence =
    detectedFeatures.length > 0
      ? `Observed features include ${joinNaturalLanguage(detectedFeatures.slice(0, 5))}.`
      : "";

  const hasAdminRisk = possibleRisks.some((risk) =>
    ["Centralization", "Administrative Controls", "Administrative Control", "Admin Risk", "Access Control"].includes(
      risk.category
    ) || /(owner|admin|access)/i.test(risk.title)
  );
  const hasFundsRisk = possibleRisks.some((risk) =>
    ["Funds Management", "External Calls", "Reentrancy"].includes(risk.category) ||
    /(withdraw|drain|call|fund|reentrancy)/i.test(risk.title)
  );
  const hasExecutionRisk = possibleRisks.some((risk) =>
    ["Execution Context", "Destructive Control"].includes(risk.category) ||
    /(delegatecall|selfdestruct)/i.test(risk.title)
  );

  const parts = [
    ensureSentence(contractSummary),
    hasAdminRisk
      ? "Privileged control paths are part of the attack surface, so ownership, admin rotation, and any emergency powers need close review."
      : "No obvious privileged-control narrative was provided by the agent, so access assumptions should still be verified manually.",
    hasFundsRisk
      ? "Fund-moving or externally callable paths appear in the analysis, which makes state-update ordering, external call handling, and reentrancy protections especially important."
      : "",
    hasExecutionRisk
      ? "Execution-context or destructive behaviors widen the blast radius of a compromised admin key or unsafe downstream integration."
      : "",
    ruleFlags.length > 0
      ? `The strongest machine-detected trust boundaries come from ${joinNaturalLanguage(
          ruleFlags.slice(0, 4).map(humanizeRuleFlag)
        )}.`
      : "",
    featureSentence,
  ].filter(Boolean);

  return parts.join(" ");
}

function buildEvidenceSignals(
  possibleRisks: RiskItem[],
  detectedFeatures: string[],
  ruleFlags: string[]
): string[] {
  const riskSignals = possibleRisks.slice(0, 4).map((risk) =>
    `${risk.severity} severity signal: ${risk.title}. ${risk.description || risk.whyItMatters}`
  );

  const featureSignals = detectedFeatures.slice(0, 2).map(
    (feature) => `Detected capability: ${feature}. This should be matched against the intended permission model and fund flow.`
  );

  const flagSignals = ruleFlags.slice(0, 3).map(
    (flag) => `Rule engine flag: ${humanizeRuleFlag(flag)}. This pattern was visible directly in the submitted contract text.`
  );

  return dedupeStrings([...riskSignals, ...featureSignals, ...flagSignals]).slice(0, 6);
}

function buildPriorityReviewAreas(possibleRisks: RiskItem[], detectedFeatures: string[]): string[] {
  const suggestions = dedupeStrings(
    possibleRisks.slice(0, 6).map(
      (risk) => risk.suggestion || `Review ${risk.title.toLowerCase()} in detail.`
    )
  );

  const featureDrivenAreas = dedupeStrings([
    detectedFeatures.includes("Ownership controls")
      ? "Verify every owner or admin function is intentionally exposed, consistently protected, and clearly documented."
      : undefined,
    detectedFeatures.includes("Low-level external calls")
      ? "Trace each low-level external call end-to-end and confirm state changes happen before interaction where appropriate."
      : undefined,
    detectedFeatures.includes("Self-destruct mechanism")
      ? "Confirm whether self-destruct is truly required, who can trigger it, and what happens to remaining funds."
      : undefined,
    detectedFeatures.includes("Delegatecall usage")
      ? "Review delegatecall target validation, storage layout assumptions, and upgrade trust boundaries."
      : undefined,
  ]);

  const fallbackAreas =
    suggestions.length === 0 && featureDrivenAreas.length === 0
      ? [
          "Review privileged functions, value-transfer paths, and any external integrations manually.",
          "Confirm the intended trust model and compare it with the implemented access controls.",
          "Check whether state changes and external interactions follow a safe order in sensitive functions.",
        ]
      : [];

  return dedupeStrings([...suggestions, ...featureDrivenAreas, ...fallbackAreas]).slice(0, 6);
}

function buildConfidenceSummary(
  provider: "eliza-qwen" | "qwen-direct" | "fallback",
  usedSyntheticExpansion: boolean,
  ruleFlags: string[],
  possibleRisks: RiskItem[]
): string {
  const sourceNote =
    provider === "fallback"
      ? "This reasoning was expanded from deterministic rule-engine findings because an agent response was unavailable."
      : provider === "eliza-qwen"
      ? "This reasoning combines Eliza-routed model output with deterministic rule-engine findings."
      : "This reasoning combines direct Qwen output with deterministic rule-engine findings.";

  const signalNote =
    ruleFlags.length > 0 || possibleRisks.length > 0
      ? "Confidence is higher for explicit code patterns such as flagged calls, admin controls, and destructive behaviors than for business-logic intent."
      : "Confidence is limited because no strong code-level signals were detected in the submitted snippet.";

  const expansionNote = usedSyntheticExpansion
    ? "The narrative was further expanded in-app to keep the review useful when the model response was too terse."
    : "Manual review is still needed to confirm privilege intent, integration assumptions, and edge-case behaviors.";

  return [sourceNote, signalNote, expansionNote].join(" ");
}

function buildDetailedAgentReasoning(
  draft: {
    agentReasoning?: string;
    attackSurface?: string;
    evidenceSignals?: string[];
    priorityReviewAreas?: string[];
    confidenceNotes?: string;
  } | null,
  context: {
    fallbackMessage: string;
    contractSummary: string;
    possibleRisks: RiskItem[];
    detectedFeatures: string[];
    ruleFlags: string[];
    verdict: "Safe" | "Caution" | "High Risk";
    provider: "eliza-qwen" | "qwen-direct" | "fallback";
  }
): string {
  const baseOverview = draft?.agentReasoning?.trim();
  const syntheticOverview = buildOverviewSummary(
    context.contractSummary,
    context.possibleRisks,
    context.detectedFeatures,
    context.verdict
  );
  const usedSyntheticExpansion = !isDetailedNarrative(baseOverview);

  const overview = dedupeStrings([
    baseOverview,
    usedSyntheticExpansion ? syntheticOverview : undefined,
    !baseOverview ? context.fallbackMessage.trim() : undefined,
  ]).join(" ");

  const attackSurface =
    draft?.attackSurface?.trim() ||
    buildAttackSurfaceSummary(
      context.contractSummary,
      context.possibleRisks,
      context.detectedFeatures,
      context.ruleFlags
    );

  const evidenceSignals = dedupeStrings([
    ...(draft?.evidenceSignals || []),
    ...buildEvidenceSignals(context.possibleRisks, context.detectedFeatures, context.ruleFlags),
  ]).slice(0, 6);

  const priorityReviewAreas = dedupeStrings([
    ...(draft?.priorityReviewAreas || []),
    ...buildPriorityReviewAreas(context.possibleRisks, context.detectedFeatures),
  ]).slice(0, 6);

  const confidenceNotes =
    draft?.confidenceNotes?.trim() ||
    buildConfidenceSummary(
      context.provider,
      usedSyntheticExpansion,
      context.ruleFlags,
      context.possibleRisks
    );

  const sections = [
    overview ? `**Overview:** ${overview}` : "",
    attackSurface ? `**Attack Surface:** ${attackSurface}` : "",
    evidenceSignals.length > 0 ? formatNumberedSection("Evidence Signals", evidenceSignals) : "",
    priorityReviewAreas.length > 0
      ? formatNumberedSection("Priority Review Areas", priorityReviewAreas)
      : "",
    confidenceNotes ? `**Confidence Notes:** ${confidenceNotes}` : "",
  ].filter(Boolean);

  return sections.join("\n\n");
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

function pruneOverlappingRisks(risks: RiskItem[]): RiskItem[] {
  const hasConcreteReentrancy = risks.some((risk) =>
    /possible-reentrancy|reentrancy|external call before state update/i.test(
      `${risk.id} ${risk.title} ${risk.description}`
    )
  );

  return risks.filter((risk) => {
    const haystack = `${risk.id} ${risk.title} ${risk.description}`.toLowerCase();

    if (hasConcreteReentrancy && /public-withdraw-review|withdraw-like function detected/.test(haystack)) {
      return false;
    }

    return true;
  });
}

export async function analyzeContract(contractCode: string): Promise<AuditReport> {
  const ruleFlags = detectRuleFlags(contractCode);
  const detectedFeatures = detectFeatures(contractCode);
  const ruleRisks = buildRuleBasedRisks(contractCode);

  const prompt = buildAuditPrompt(contractCode, ruleFlags);
  const agentResult = await runAgentAnalysis(prompt);

  const possibleRisks = pruneOverlappingRisks(mergeRisks(ruleRisks, agentResult.draft?.possibleRisks));
  const riskScore = calculateRiskScore(possibleRisks);
  const verdict = generateVerdict(riskScore, possibleRisks);

  const generatedSummary = generateRuleSummary(contractCode);
  const contractSummary = isDetailedContractSummary(agentResult.draft?.contractSummary)
    ? agentResult.draft?.contractSummary?.trim() || generatedSummary
    : generatedSummary;

  const beginnerExplanation =
    agentResult.draft?.beginnerExplanation?.trim() ||
    generateBeginnerExplanation(verdict, possibleRisks);

  const agentReasoning = buildDetailedAgentReasoning(
    agentResult.draft,
    {
      fallbackMessage: agentResult.message || "Rule-based analysis used.",
      contractSummary,
      possibleRisks,
      detectedFeatures,
      ruleFlags,
      verdict,
      provider: agentResult.provider,
    }
  );

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
