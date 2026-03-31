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
  };
}

interface AnalyzeApiResponse {
  success: boolean;
  report: AuditApiReport;
  error?: string;
}

export async function analyzeContractCode(contractCode: string): Promise<AuditApiReport> {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:3001";

  const response = await fetch(`${apiBase}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputType: "code",
      contractCode,
    }),
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    throw new Error("Server did not return valid JSON.");
  }

  if (!response.ok || !data.success) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : JSON.stringify(data?.error || "Failed to analyze contract.");

    throw new Error(message); 
  }

  return data.report;
}