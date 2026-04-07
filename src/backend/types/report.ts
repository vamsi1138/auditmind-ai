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

export interface AgentDraftReport {
  contractSummary?: string;
  possibleRisks?: RiskItem[];
  beginnerExplanation?: string;
  agentReasoning?: string;
  attackSurface?: string;
  evidenceSignals?: string[];
  priorityReviewAreas?: string[];
  confidenceNotes?: string;
}

export interface AuditReport {
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
