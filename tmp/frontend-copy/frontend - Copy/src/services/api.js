const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

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

async function postAnalyzePayload(payload, options = {}) {
  const { signal } = options;

  const postAnalyze = async (path) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal,
      body: JSON.stringify(payload)
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      throw new Error("Backend not reachable");
    }

    if (!response.ok || !data?.success) {
      const error = new Error(data?.error || "Backend not reachable");
      error.status = response.status;
      throw error;
    }

    return data;
  };

  try {
    return await postAnalyze("/agent/analyze");
  } catch (error) {
    const unavailable = error?.status === 404 || error?.status === 405;
    if (!unavailable) {
      throw error;
    }

    return postAnalyze("/analyze");
  }
}

export async function analyzeContract(code, options = {}) {
  return postAnalyzePayload({ code }, options);
}

export async function analyzeGithubSource(githubUrl, options = {}) {
  return postAnalyzePayload({ githubUrl }, options);
}

export async function getAgentCapabilities() {
  const response = await fetch(`${API_BASE_URL}/agent/capabilities`);
  if (!response.ok) {
    throw new Error("Agent capabilities unavailable");
  }

  const data = await response.json();
  if (!data?.success) {
    throw new Error("Agent capabilities unavailable");
  }

  return data.agent;
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
