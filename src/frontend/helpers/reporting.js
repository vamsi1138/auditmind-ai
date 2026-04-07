const PATTERN_MAP = [
  { key: "reentrancy", match: /call\s*\{[^}]*value|call\.value|low-level external call|reentrancy/i },
  { key: "access", match: /owner|admin|access control|onlyowner|role/i },
  { key: "withdraw", match: /withdraw|drain|transfer|fund/i },
  { key: "txorigin", match: /tx\.origin/i },
  { key: "delegatecall", match: /delegatecall/i },
  { key: "selfdestruct", match: /selfdestruct/i },
  { key: "mint", match: /mint/i },
  { key: "pause", match: /pause|unpause/i },
];

function toLines(contractCode = "") {
  return String(contractCode || "").split(/\r?\n/);
}

function matchPatternForRisk(risk) {
  const haystack = `${risk?.title || ""} ${risk?.description || ""} ${risk?.tags?.join(" ") || ""}`;
  return PATTERN_MAP.find((pattern) => pattern.match.test(haystack)) || null;
}

export function buildEvidenceMap(contractCode, risks = []) {
  const lines = toLines(contractCode);

  return risks.map((risk) => {
    const pattern = matchPatternForRisk(risk);
    const evidence = [];

    if (pattern) {
      lines.forEach((line, index) => {
        if (pattern.match.test(line) && evidence.length < 3) {
          evidence.push({
            line: index + 1,
            snippet: line.trim() || "(blank line)",
          });
        }
      });
    }

    return {
      riskId: risk.id,
      confidence: buildConfidenceScore(risk, evidence.length),
      evidence,
    };
  });
}

export function buildConfidenceScore(risk, evidenceCount = 0) {
  let score = 35;
  if (risk?.severity === "High") score += 25;
  if (risk?.severity === "Medium") score += 18;
  if (risk?.severity === "Low") score += 10;
  score += Math.min(25, evidenceCount * 10);
  score += Math.min(10, (risk?.tags || []).length * 2);
  return Math.max(20, Math.min(98, score));
}

export function buildAdminPowers(rawReport) {
  const features = rawReport?.detectedFeatures || [];
  const risks = rawReport?.possibleRisks || [];

  const maybeAdd = (label, test) => (test ? label : null);

  return [
    maybeAdd(
      "Ownership controls",
      features.includes("Ownership controls") || risks.some((risk) => /owner|admin/i.test(risk.title))
    ),
    maybeAdd(
      "Pause / emergency controls",
      features.includes("Pause controls") || risks.some((risk) => /pause/i.test(risk.title))
    ),
    maybeAdd(
      "Mint / supply controls",
      features.includes("Mint capability") || risks.some((risk) => /mint/i.test(risk.title))
    ),
    maybeAdd(
      "Withdraw / fund movement",
      risks.some((risk) => /withdraw|drain|fund/i.test(risk.title))
    ),
    maybeAdd(
      "Destructive powers",
      features.includes("Self-destruct mechanism") || risks.some((risk) => /selfdestruct/i.test(risk.title))
    ),
    maybeAdd(
      "Execution-context powers",
      features.includes("Delegatecall usage") || risks.some((risk) => /delegatecall/i.test(risk.title))
    ),
  ].filter(Boolean);
}

export function buildRecommendations(rawReport) {
  return [...new Set((rawReport?.possibleRisks || []).map((risk) => risk.suggestion).filter(Boolean))].slice(0, 6);
}

export function buildFeaturePills(rawReport) {
  return (rawReport?.detectedFeatures || []).slice(0, 8);
}

function patchTemplate(title, before, after) {
  return `Before:\n${before}\n\nAfter:\n${after}`;
}

export function buildAutoFixes(rawReport) {
  const risks = rawReport?.possibleRisks || [];

  return risks.slice(0, 4).map((risk) => {
    const title = risk.title || "Suggested fix";
    const lower = `${risk.title} ${risk.description}`.toLowerCase();

    if (lower.includes("reentrancy")) {
      return {
        title,
        summary: "Move state updates before external calls and add nonReentrant protection.",
        patch: patchTemplate(
          "Reentrancy hardening",
          "function withdraw(uint256 amount) external {\n  (bool ok,) = msg.sender.call{value: amount}(\"\");\n  require(ok);\n  balances[msg.sender] -= amount;\n}",
          "function withdraw(uint256 amount) external nonReentrant {\n  balances[msg.sender] -= amount;\n  (bool ok,) = msg.sender.call{value: amount}(\"\");\n  require(ok, \"Transfer failed\");\n}"
        ),
      };
    }

    if (lower.includes("access") || lower.includes("owner") || lower.includes("admin")) {
      return {
        title,
        summary: "Restrict privileged functions and make authority explicit.",
        patch: patchTemplate(
          "Access control",
          "function setOwner(address newOwner) external {\n  owner = newOwner;\n}",
          "modifier onlyOwner() {\n  require(msg.sender == owner, \"Not owner\");\n  _;\n}\n\nfunction setOwner(address newOwner) external onlyOwner {\n  owner = newOwner;\n}"
        ),
      };
    }

    if (lower.includes("tx.origin")) {
      return {
        title,
        summary: "Use msg.sender rather than tx.origin for authorization.",
        patch: patchTemplate(
          "Authorization fix",
          "require(tx.origin == owner, \"Not owner\");",
          "require(msg.sender == owner, \"Not owner\");"
        ),
      };
    }

    return {
      title,
      summary: risk.suggestion || "Review and patch this issue before deployment.",
      patch: `Suggested action:\n${risk.suggestion || "Manual fix recommended."}`,
    };
  });
}

export function countWarnings(rawReport) {
  return (rawReport?.possibleRisks || []).filter((risk) => risk.severity === "Medium").length;
}

export function countFeatures(rawReport) {
  return (rawReport?.detectedFeatures || []).length;
}

export function filterRisksByConfidence(risks = [], evidenceMap = [], threshold = 0) {
  const confidenceByRiskId = new Map(evidenceMap.map((item) => [item.riskId, item.confidence]));
  return risks.filter((risk) => (confidenceByRiskId.get(risk.id) || 0) >= threshold);
}

export function buildCompareSummary(left, right) {
  if (!left || !right) return null;

  const leftRaw = left.rawBackendReport || {};
  const rightRaw = right.rawBackendReport || {};

  return {
    scoreDelta: (right.riskScore || 0) - (left.riskScore || 0),
    verdicts: [leftRaw.verdict || "Safe", rightRaw.verdict || "Safe"],
    addedRisks: (rightRaw.possibleRisks || []).filter(
      (risk) => !(leftRaw.possibleRisks || []).some((item) => item.id === risk.id)
    ),
    removedRisks: (leftRaw.possibleRisks || []).filter(
      (risk) => !(rightRaw.possibleRisks || []).some((item) => item.id === risk.id)
    ),
  };
}
