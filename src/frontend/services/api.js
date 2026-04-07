const API_BASE_URL = (import.meta.env.VITE_API_BASE || "http://localhost:3001").replace(/\/$/, "");

function toOverallSeverity(verdict) {
  if (verdict === "High Risk") return "High";
  if (verdict === "Caution") return "Medium";
  return "Low";
}

function toRiskScore10(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(10, Math.round(numeric / 10)));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function extractFunctionNames(contractCode) {
  if (typeof contractCode !== "string" || contractCode.trim().length === 0) {
    return [];
  }

  const matches = contractCode.matchAll(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g);
  return unique(Array.from(matches, (match) => match[1])).slice(0, 8);
}

function buildSourceMeta(kind, sourceValue) {
  if (kind !== "github" || typeof sourceValue !== "string") {
    return null;
  }

  try {
    const url = new URL(sourceValue);
    const parts = url.pathname.split("/").filter(Boolean);
    return {
      type: "github",
      owner: parts[0] || "unknown",
      repo: parts[1] || "unknown",
      branch: parts[3] || "default",
      filesAnalyzed: parts.length > 4 ? [parts.slice(4).join("/")] : [],
    };
  } catch {
    return {
      type: "github",
      owner: "unknown",
      repo: "unknown",
      branch: "default",
      filesAnalyzed: [],
    };
  }
}

function buildSourceValidation(kind) {
  if (kind === "github") {
    return {
      isValid: true,
      message: "GitHub source resolved and analyzed through the backend.",
    };
  }

  if (kind === "address") {
    return {
      isValid: true,
      message: "Verified contract source was fetched and analyzed.",
    };
  }

  return null;
}

function buildStructuredReportSections(report, context = {}) {
  const risks = Array.isArray(report?.possibleRisks) ? report.possibleRisks : [];
  const features = Array.isArray(report?.detectedFeatures) ? report.detectedFeatures : [];
  const flags = Array.isArray(report?.ruleFlags) ? report.ruleFlags : [];
  const functionNames = extractFunctionNames(context.contractCode);

  const combinedSummary = unique([
    report?.contractSummary?.trim(),
    report?.agentReasoning?.trim(),
  ]).join("\n\n");

  const importantFunctions = functionNames.length > 0
    ? functionNames.map((name) => `- ${name}`).join("\n")
    : features.length > 0
    ? features.map((feature) => `- ${feature}`).join("\n")
    : "Not found in analysis output.";

  const possibleRisks = risks.length > 0
    ? risks
        .map((risk) => `- [${risk.severity}] ${risk.title}: ${risk.description || risk.whyItMatters}`)
        .join("\n")
    : "- No major risks were surfaced by the current rule engine and agent pass.";

  const whyItMatters = risks.length > 0
    ? risks
        .slice(0, 3)
        .map((risk) => `- ${risk.whyItMatters || risk.description}`)
        .join("\n")
    : report?.agentReasoning?.trim() || report?.beginnerExplanation?.trim() || "No additional impact narrative was returned.";

  const suggestedFix = risks.length > 0
    ? unique(risks.map((risk) => risk.suggestion)).map((item) => `- ${item}`).join("\n")
    : "- Continue with manual review before deployment.";

  const severity = [
    `Overall Severity: ${toOverallSeverity(report?.verdict)}`,
    `Verdict: ${report?.verdict || "Safe"}`,
    `Risk Score: ${toRiskScore10(report?.riskScore)}/10`,
  ].join("\n");

  const finalVerdict = [
    report?.verdict || "Safe",
    report?.sourceAnalysis?.analysisMode ? `Analysis Mode: ${report.sourceAnalysis.analysisMode}` : "",
    flags.length > 0 ? `Rule Flags: ${flags.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    "Contract Summary": combinedSummary || "No summary available.",
    "Important Functions": importantFunctions,
    "Possible Risks": possibleRisks,
    Severity: severity,
    "Why It Matters": whyItMatters,
    "Suggested Fix": suggestedFix,
    "Final Verdict": finalVerdict,
    "Beginner Explanation":
      report?.beginnerExplanation?.trim() || "Beginner explanation was not provided.",
  };
}

function stringifyStructuredReport(sections) {
  const orderedKeys = [
    "Contract Summary",
    "Important Functions",
    "Possible Risks",
    "Severity",
    "Why It Matters",
    "Suggested Fix",
    "Final Verdict",
    "Beginner Explanation",
  ];

  return orderedKeys
    .filter((key) => sections[key])
    .map((key) => `${key}:\n${sections[key]}`)
    .join("\n\n");
}

function transformBackendReport(report, context = {}) {
  const sections = buildStructuredReportSections(report, context);
  return {
    report: stringifyStructuredReport(sections),
    riskScore: toRiskScore10(report?.riskScore),
    severity: {
      overall: toOverallSeverity(report?.verdict),
    },
    sourceMeta: buildSourceMeta(context.kind, context.sourceValue),
    sourceValidation: buildSourceValidation(context.kind),
    rawBackendReport: report,
  };
}

async function postAnalyzePayload(payload, context = {}, options = {}) {
  const { signal } = options;
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new Error("Backend not reachable");
  }

  if (!response.ok || !data?.success || !data?.report) {
    const error = new Error(data?.error || "Backend not reachable");
    error.status = response.status;
    throw error;
  }

  return transformBackendReport(data.report, context);
}

export function isValidContractAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test((address || "").trim());
}

export function isGithubUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const parsed = new URL(value.trim());
    return parsed.hostname === "github.com" || parsed.hostname === "raw.githubusercontent.com";
  } catch {
    return false;
  }
}

export async function analyzeContract(code, options = {}) {
  return postAnalyzePayload(
    {
      inputType: "code",
      contractCode: code,
    },
    { kind: "code", contractCode: code },
    options
  );
}

export async function analyzeGithubSource(githubUrl, options = {}) {
  return postAnalyzePayload(
    {
      inputType: "github",
      githubUrl,
    },
    { kind: "github", sourceValue: githubUrl },
    options
  );
}

export async function getAgentCapabilities() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error("Agent capabilities unavailable");
  }

  return {
    name: "AuditMind AI",
    runtime: {
      provider: "Eliza + Qwen",
      model: "Configured by backend environment",
    },
    capabilities: [
      "solidity-analysis",
      "risk-detection",
      "structured-reporting",
      "beginner-explanations",
    ],
  };
}

async function fetchSourcifySource(address, mode, options = {}) {
  const { signal } = options;
  const lower = address.toLowerCase();
  const metadataUrl = `https://repo.sourcify.dev/contracts/${mode}/1/${lower}/metadata.json`;

  const metadataResponse = await fetch(metadataUrl, { signal });
  if (!metadataResponse.ok) {
    throw new Error("Contract not verified on explorer");
  }

  const metadata = await metadataResponse.json();
  const sourcePaths = Object.keys(metadata?.sources || {});
  if (!sourcePaths.length) {
    throw new Error("Contract not verified on explorer");
  }

  const firstSourcePath = sourcePaths[0];
  const sourceUrl = `https://repo.sourcify.dev/contracts/${mode}/1/${lower}/sources/${firstSourcePath}`;
  const sourceResponse = await fetch(sourceUrl, { signal });
  if (!sourceResponse.ok) {
    throw new Error("Contract not verified on explorer");
  }

  return sourceResponse.text();
}

export async function fetchContractSource(address, options = {}) {
  const clean = (address || "").trim();
  if (!isValidContractAddress(clean)) {
    throw new Error("Invalid contract address");
  }

  try {
    return await fetchSourcifySource(clean, "full_match", options);
  } catch {
    try {
      return await fetchSourcifySource(clean, "partial_match", options);
    } catch {
      throw new Error("Contract not verified on explorer");
    }
  }
}
