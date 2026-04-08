function toLines(contractCode = "") {
  return String(contractCode || "").split(/\r?\n/);
}

function uniqueBy(items, keyBuilder) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyBuilder(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function findRegexEvidence(lines, patterns = [], limit = 4) {
  const evidence = [];

  patterns.forEach((pattern) => {
    lines.forEach((line, index) => {
      if (evidence.length >= limit) {
        return;
      }

      if (pattern.test(line)) {
        evidence.push({
          line: index + 1,
          snippet: line.trim() || "(blank line)",
        });
      }
    });
  });

  return uniqueBy(evidence, (item) => `${item.line}:${item.snippet}`).slice(0, limit);
}

function findFunctionEvidence(lines, namePattern, extraPatterns = [], limit = 4) {
  const functionPattern = new RegExp(`\\bfunction\\s+${namePattern}\\s*\\(`, "i");
  const basePatterns = [functionPattern, ...extraPatterns];
  return findRegexEvidence(lines, basePatterns, limit);
}

function riskText(risk) {
  return `${risk?.id || ""} ${risk?.title || ""} ${risk?.description || ""} ${risk?.tags?.join(" ") || ""}`.toLowerCase();
}

function findEvidenceForRisk(lines, risk) {
  const haystack = riskText(risk);

  if (/selfdestruct-usage|selfdestruct/.test(haystack)) {
    return {
      specificity: 14,
      evidence: findRegexEvidence(lines, [/selfdestruct\s*\(/i]),
    };
  }

  if (/delegatecall-usage|delegatecall/.test(haystack)) {
    return {
      specificity: 14,
      evidence: findRegexEvidence(lines, [/delegatecall\s*\(/i]),
    };
  }

  if (/tx-origin-usage|tx\.origin/.test(haystack)) {
    return {
      specificity: 14,
      evidence: findRegexEvidence(lines, [/tx\.origin/i, /modifier\s+onlyOwner/i]),
    };
  }

  if (/possible-reentrancy|reentrancy|external call before state update/.test(haystack)) {
    return {
      specificity: 13,
      evidence: findRegexEvidence(lines, [
        /\.call\s*(?:\(|\{)/i,
        /\b(?:balances?|rewards?|credits?|tokenbalances?)\s*\[[^\]]+\]\s*(?:\+=|-=|=)/i,
        /\b(?:totalSupply|locked|owner|treasury|feePercent|paused)\b\s*(?:\+=|-=|=)/i,
      ]),
    };
  }

  if (/admin-drain-capability|drain or emergency withdrawal|fund drain/.test(haystack)) {
    return {
      specificity: 13,
      evidence: findRegexEvidence(lines, [
        /\bfunction\s+(?:adminWithdraw|emergencyWithdraw|withdrawAll|drainAll|drain|sweep|rescue)\s*\(/i,
        /address\s*\(\s*this\s*\)\s*\.balance/i,
        /\.(?:transfer|send|call)\s*(?:\(|\{)/i,
      ]),
    };
  }

  if (/unprotected-mint|mint or reward issuance|mint function|no-access-control/.test(haystack)) {
    return {
      specificity: 13,
      evidence: findRegexEvidence(lines, [
        /\bfunction\s+(?:mint|mintBonus|grantReward|setReward|airdrop)\s*\(/i,
        /\b(?:totalSupply|rewards?|balances?|tokenbalances?)\s*\[[^\]]+\]\s*\+=/i,
        /\btotalSupply\s*\+=/i,
      ]),
    };
  }

  if (/burn-review|burn function/.test(haystack)) {
    return {
      specificity: 11,
      evidence: findFunctionEvidence(lines, "(?:burn|burnFrom)", [/\bburn\s*\(/i]),
    };
  }

  if (/payable-fallback-funds-trap|payable fallback/.test(haystack)) {
    return {
      specificity: 12,
      evidence: findRegexEvidence(lines, [/fallback\s*\([^)]*\)\s*external\s+payable/i, /fallback\s*\(/i]),
    };
  }

  if (/pause-controls|pause|unpause/.test(haystack)) {
    return {
      specificity: 10,
      evidence: findFunctionEvidence(lines, "(?:pause|unpause)"),
    };
  }

  if (/ownership-transfer|changeowner|transferownership|setowner/.test(haystack)) {
    return {
      specificity: 10,
      evidence: findRegexEvidence(lines, [
        /\bfunction\s+(?:changeOwner|transferOwnership|setOwner|setAdmin|addAdmin|removeAdmin)\s*\(/i,
        /OwnershipTransferred/i,
      ]),
    };
  }

  if (/owner-privileges|owner controls|admin risk|centralization/.test(haystack)) {
    return {
      specificity: 9,
      evidence: findRegexEvidence(lines, [
        /modifier\s+onlyOwner/i,
        /modifier\s+onlyAdmin/i,
        /\bonlyOwner\b/i,
        /\bonlyAdmin\b/i,
      ]),
    };
  }

  if (/public-withdraw-review|withdraw-like|withdraw/.test(haystack)) {
    return {
      specificity: 9,
      evidence: findRegexEvidence(lines, [
        /\bfunction\s+(?:withdraw|claimReward|claim|redeem|unstake)\s*\(/i,
        /\.(?:transfer|send|call)\s*(?:\(|\{)/i,
      ]),
    };
  }

  if (/low-level-call|external call/.test(haystack)) {
    return {
      specificity: 8,
      evidence: findRegexEvidence(lines, [/\.call\s*(?:\(|\{)/i]),
    };
  }

  return {
    specificity: 4,
    evidence: findRegexEvidence(lines, [
      /modifier\s+onlyOwner/i,
      /\bonlyOwner\b/i,
      /\bfunction\s+\w+\s*\(/i,
    ], 3),
  };
}

export function buildEvidenceMap(contractCode, risks = []) {
  const lines = toLines(contractCode);

  return risks.map((risk) => {
    const { evidence, specificity } = findEvidenceForRisk(lines, risk);

    return {
      riskId: risk.id,
      confidence: buildConfidenceScore(risk, evidence.length, specificity),
      evidence,
    };
  });
}

export function buildConfidenceScore(risk, evidenceCount = 0, specificity = 0) {
  let score = 35;
  if (risk?.severity === "High") score += 25;
  if (risk?.severity === "Medium") score += 18;
  if (risk?.severity === "Low") score += 10;
  score += Math.min(25, evidenceCount * 10);
  score += Math.min(10, (risk?.tags || []).length * 2);
  score += Math.min(14, specificity);
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
      features.includes("Pause controls") ||
        risks.some((risk) => /pause|emergency withdrawal|drain/i.test(risk.title))
    ),
    maybeAdd(
      "Mint / supply controls",
      features.includes("Mint capability") || risks.some((risk) => /mint|reward issuance/i.test(risk.title))
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
    const lower = `${risk.id || ""} ${risk.title || ""} ${risk.description || ""}`.toLowerCase();

    if (lower.includes("reentrancy") || lower.includes("external call before state update")) {
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

    if (lower.includes("unprotected-mint") || lower.includes("mint or reward issuance")) {
      return {
        title,
        summary: "Gate issuance paths behind explicit authorization before minting supply or rewards.",
        patch: patchTemplate(
          "Issuance access control",
          "function mint(address to, uint256 amount) external {\n  tokenBalance[to] += amount;\n  totalSupply += amount;\n}",
          "modifier onlyOwner() {\n  require(msg.sender == owner, \"Not owner\");\n  _;\n}\n\nfunction mint(address to, uint256 amount) external onlyOwner {\n  tokenBalance[to] += amount;\n  totalSupply += amount;\n}"
        ),
      };
    }

    if (lower.includes("admin-drain-capability") || lower.includes("drain or emergency withdrawal")) {
      return {
        title,
        summary: "Limit privileged fund-drain paths and document them as emergency-only operations.",
        patch: patchTemplate(
          "Emergency withdrawal hardening",
          "function adminWithdraw(address payable to, uint256 amount) external onlyAdmin {\n  to.transfer(amount);\n}",
          "function adminWithdraw(address payable to, uint256 amount) external onlyOwner {\n  require(emergencyMode, \"Emergency only\");\n  require(address(this).balance >= amount, \"Low balance\");\n  to.transfer(amount);\n}"
        ),
      };
    }

    if (lower.includes("payable-fallback-funds-trap") || lower.includes("payable fallback")) {
      return {
        title,
        summary: "Reject unexpected payable fallback calls or route them into the intended deposit accounting flow.",
        patch: patchTemplate(
          "Fallback handling",
          "fallback() external payable {\n}",
          "fallback() external payable {\n  revert(\"Unsupported calldata\");\n}\n\nreceive() external payable {\n  balances[msg.sender] += msg.value;\n}"
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
