const GITHUB_API_BASE = "https://api.github.com";
const MAX_SOLIDITY_FILES = 20;

interface RepoMetadata {
  default_branch?: string;
}

interface TreeItem {
  path?: string;
  type?: string;
}

function githubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN?.trim();
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "AuditMind-AI",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchGithubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: githubHeaders(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${message}`);
  }

  return response.json() as Promise<T>;
}

async function fetchGithubText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: githubHeaders(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub file fetch failed (${response.status}): ${message}`);
  }

  return response.text();
}

function bundleFiles(files: Array<{ path: string; content: string }>): string {
  return files
    .map((file) => `// File: ${file.path}\n${file.content.trim()}`)
    .join("\n\n");
}

function parseGithubUrl(githubUrl: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(githubUrl.trim());
  } catch {
    throw new Error("Invalid GitHub URL.");
  }

  if (!["github.com", "raw.githubusercontent.com"].includes(parsed.hostname)) {
    throw new Error("Only public GitHub URLs are supported.");
  }

  return parsed;
}

async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const repoMetadata = await fetchGithubJson<RepoMetadata>(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);
  return repoMetadata.default_branch || "main";
}

function toRawGithubUrl(owner: string, repo: string, branch: string, filePath: string): string {
  const encodedPath = filePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${encodedPath}`;
}

async function resolveSingleGithubFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string> {
  const content = await fetchGithubText(toRawGithubUrl(owner, repo, branch, filePath));
  return bundleFiles([{ path: filePath, content }]);
}

async function resolveGithubRepoTree(
  owner: string,
  repo: string,
  branch: string,
  subPath = ""
): Promise<string> {
  const treeResponse = await fetchGithubJson<{ tree?: TreeItem[] }>(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );

  const solidityFiles = (treeResponse.tree || [])
    .filter((item) => item.type === "blob" && typeof item.path === "string")
    .map((item) => item.path as string)
    .filter((path) => path.toLowerCase().endsWith(".sol"))
    .filter((path) => (subPath ? path.startsWith(`${subPath}/`) || path === subPath : true))
    .slice(0, MAX_SOLIDITY_FILES);

  if (solidityFiles.length === 0) {
    throw new Error("No Solidity files were found in the provided GitHub location.");
  }

  const files = await Promise.all(
    solidityFiles.map(async (path) => ({
      path,
      content: await fetchGithubText(toRawGithubUrl(owner, repo, branch, path)),
    }))
  );

  return bundleFiles(files);
}

export async function resolveFromGithub(githubUrl: string): Promise<string> {
  const parsed = parseGithubUrl(githubUrl);
  const parts = parsed.pathname.split("/").filter(Boolean);

  if (parsed.hostname === "raw.githubusercontent.com") {
    if (parts.length < 4) {
      throw new Error("Raw GitHub URL must include owner, repo, branch, and file path.");
    }

    const [owner, repo, branch, ...fileParts] = parts;
    return resolveSingleGithubFile(owner, repo, branch, fileParts.join("/"));
  }

  if (parts.length < 2) {
    throw new Error("GitHub URL must include owner and repository.");
  }

  const [owner, repo, mode, branch, ...rest] = parts;

  if (!mode) {
    return resolveGithubRepoTree(owner, repo, await getDefaultBranch(owner, repo));
  }

  if (mode === "blob") {
    if (!branch || rest.length === 0) {
      throw new Error("GitHub blob URL must include a branch and file path.");
    }

    return resolveSingleGithubFile(owner, repo, branch, rest.join("/"));
  }

  if (mode === "tree") {
    if (!branch) {
      throw new Error("GitHub tree URL must include a branch.");
    }

    return resolveGithubRepoTree(owner, repo, branch, rest.join("/"));
  }

  return resolveGithubRepoTree(owner, repo, await getDefaultBranch(owner, repo));
}
