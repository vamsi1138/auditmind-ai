import type { AgentDraftReport } from "../types/report";
import { callElizaAudit } from "./elizaAgent";
import { callQwenEndpoint } from "./qwenClient";

export interface AgentAnalysisResult {
  agentUsed: boolean;
  provider: "eliza-qwen" | "qwen-direct" | "fallback";
  draft: AgentDraftReport | null;
  message: string;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function extractJsonBlock(rawText: string): string {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return rawText.slice(start, end + 1).trim();
  }

  return rawText.trim();
}

function repairJsonText(input: string): string {
  let output = "";
  let inString = false;
  let escaping = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
      }
      output += char;
      continue;
    }

    if (escaping) {
      output += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      output += char;
      escaping = true;
      continue;
    }

    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      output += "\\n";
      continue;
    }

    if (char === '"') {
      let nextNonWhitespace = "";
      for (let j = i + 1; j < input.length; j++) {
        const candidate = input[j];
        if (!/\s/.test(candidate)) {
          nextNonWhitespace = candidate;
          break;
        }
      }

      const isStringTerminator =
        nextNonWhitespace === "" || nextNonWhitespace === ":" || nextNonWhitespace === "," ||
        nextNonWhitespace === "}" || nextNonWhitespace === "]";

      if (isStringTerminator) {
        inString = false;
        output += char;
      } else {
        output += '\\"';
      }

      continue;
    }

    output += char;
  }

  return output.replace(/,\s*([}\]])/g, "$1").trim();
}

function parseDraftFromRawText(rawText: string): AgentDraftReport {
  const jsonText = extractJsonBlock(rawText);
  const candidates = [jsonText, repairJsonText(jsonText)];
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      return normalizeDraft(JSON.parse(candidate));
    } catch (error) {
      lastError = error;
    }
  }

  const preview = rawText.replace(/\s+/g, " ").slice(0, 180);
  throw new Error(
    `Agent response was not valid JSON. Preview: ${preview}${preview.length === 180 ? "..." : ""}. ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function normalizeDraft(input: any): AgentDraftReport {
  return {
    contractSummary:
      typeof input?.contractSummary === "string" ? input.contractSummary.trim() : undefined,
    possibleRisks: Array.isArray(input?.possibleRisks)
      ? input.possibleRisks
      : typeof input?.possibleRisks === "string" && input.possibleRisks.trim() === ""
      ? []
      : undefined,
    beginnerExplanation:
      typeof input?.beginnerExplanation === "string"
        ? input.beginnerExplanation.trim()
        : undefined,
    agentReasoning:
      typeof input?.agentReasoning === "string" ? input.agentReasoning.trim() : undefined,
    attackSurface: typeof input?.attackSurface === "string" ? input.attackSurface.trim() : undefined,
    evidenceSignals: normalizeStringArray(input?.evidenceSignals),
    priorityReviewAreas: normalizeStringArray(input?.priorityReviewAreas),
    confidenceNotes:
      typeof input?.confidenceNotes === "string" ? input.confidenceNotes.trim() : undefined,
  };
}

async function tryEliza(prompt: string): Promise<AgentAnalysisResult> {
  const rawText = await callElizaAudit(prompt);
  const draft = parseDraftFromRawText(rawText);

  return {
    agentUsed: true,
    provider: "eliza-qwen",
    draft,
    message: draft.agentReasoning || "ElizaOS + Qwen returned structured analysis.",
  };
}

async function tryQwen(prompt: string): Promise<AgentAnalysisResult> {
  const rawText = await callQwenEndpoint(prompt);
  const draft = parseDraftFromRawText(rawText);

  return {
    agentUsed: true,
    provider: "qwen-direct",
    draft,
    message: draft.agentReasoning || "Qwen returned structured analysis.",
  };
}

export async function runAgentAnalysis(prompt: string): Promise<AgentAnalysisResult> {
  const hasEliza = Boolean(process.env.ELIZA_AUDIT_API_URL?.trim());
  const hasQwen = Boolean(process.env.QWEN_API_URL?.trim());
  const failures: string[] = [];

  if (hasEliza) {
    try {
      return await tryEliza(prompt);
    } catch (error) {
      console.error("[AgentAnalysis] Eliza path failed:", error);
      failures.push(`Eliza: ${formatError(error)}`);
    }
  }

  if (hasQwen) {
    try {
      return await tryQwen(prompt);
    } catch (error) {
      console.error("[AgentAnalysis] Qwen path failed:", error);
      failures.push(`Qwen: ${formatError(error)}`);
    }
  }

  const fallbackMessage =
    failures.length > 0
      ? `Configured agent endpoints failed. ${failures.join(" | ")} Falling back to rule-based analysis.`
      : "No Eliza/Qwen endpoint configured. Falling back to rule-based analysis.";

  return {
    agentUsed: false,
    provider: "fallback",
    draft: null,
    message: fallbackMessage,
  };
}
