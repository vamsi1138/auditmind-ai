export type RiskLevel = "Info" | "Low" | "Medium" | "High";

export interface RiskItem {
  id: string;
  title: string;
  severity: RiskLevel;
  category: string;
  description: string;
  whyItMatters: string;
  suggestion: string;
  tags: string[];
}

export interface AuditApiReport {
  contractSummary: string;
  possibleRisks: RiskItem[];
  verdict: "Safe" | "Caution" | "High Risk";
  riskScore: number;
  beginnerExplanation: string;
  detectedFeatures: string[];
  ruleFlags: string[];
  agentReasoning?: string;
  sourceAnalysis: {
    validationPassed: boolean;
    ruleEngineUsed: boolean;
    elizaAgentUsed: boolean;
    qwenEndpointUsed: boolean;
    analysisMode?: "fallback" | "qwen-direct" | "eliza-qwen";
  };
}

interface AnalyzeApiResponse {
  success: boolean;
  report?: AuditApiReport;
  error?: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:3001").replace(/\/$/, "");

export async function analyzeContractCode(contractCode: string): Promise<AuditApiReport> {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputType: "code",
      contractCode,
    }),
  });

  let data: AnalyzeApiResponse | null = null;

  try {
    data = (await response.json()) as AnalyzeApiResponse;
  } catch {
    throw new Error("Server did not return valid JSON.");
  }

  if (!response.ok || !data?.success || !data.report) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Failed to analyze contract."
    );
  }

  return data.report;
}