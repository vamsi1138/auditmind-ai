const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

interface SourcifyMetadataSource {
  content?: string;
}

function formatBundledSources(files: Array<{ path: string; content: string }>): string {
  return files
    .map(
      (file) =>
        `// File: ${file.path}\n${file.content.trim()}`
    )
    .join("\n\n");
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch source from ${url}.`);
  }

  return response.text();
}

async function fetchSourcifyBundle(
  contractAddress: string,
  mode: "full_match" | "partial_match"
): Promise<string> {
  const lowerAddress = contractAddress.toLowerCase();
  const metadataUrl = `https://repo.sourcify.dev/contracts/${mode}/1/${lowerAddress}/metadata.json`;
  const metadataResponse = await fetch(metadataUrl);

  if (!metadataResponse.ok) {
    throw new Error("Contract is not verified on Sourcify.");
  }

  const metadata = await metadataResponse.json();
  const sources = Object.entries(metadata?.sources || {}) as Array<
    [string, SourcifyMetadataSource | undefined]
  >;

  if (sources.length === 0) {
    throw new Error("Verified contract metadata did not include Solidity sources.");
  }

  const files = await Promise.all(
    sources.map(async ([path, source]) => {
      if (typeof source?.content === "string" && source.content.trim().length > 0) {
        return {
          path,
          content: source.content,
        };
      }

      const sourceUrl = `https://repo.sourcify.dev/contracts/${mode}/1/${lowerAddress}/sources/${path}`;
      return {
        path,
        content: await fetchText(sourceUrl),
      };
    })
  );

  return formatBundledSources(files);
}

export async function resolveFromAddress(contractAddress: string): Promise<string> {
  const cleanAddress = contractAddress.trim();

  if (!ADDRESS_PATTERN.test(cleanAddress)) {
    throw new Error("Invalid contract address. Expected a 0x-prefixed 40-byte address.");
  }

  try {
    return await fetchSourcifyBundle(cleanAddress, "full_match");
  } catch {
    return fetchSourcifyBundle(cleanAddress, "partial_match");
  }
}
