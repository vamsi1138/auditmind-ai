interface UploadedSourceFile {
  fileContent: string;
  fileName?: string;
}

export async function resolveFromUpload(
  fileContent?: string,
  fileName?: string,
  files?: UploadedSourceFile[]
): Promise<string> {
  if (Array.isArray(files) && files.length > 0) {
    return files
      .filter((file) => typeof file?.fileContent === "string" && file.fileContent.trim().length > 0)
      .map((file, index) => `// File: ${file.fileName || `contract-${index + 1}.sol`}\n${file.fileContent.trim()}`)
      .join("\n\n");
  }

  if (typeof fileContent === "string" && fileContent.trim().length > 0) {
    return `// File: ${fileName || "contract.sol"}\n${fileContent.trim()}`;
  }

  throw new Error("Uploaded Solidity content was empty.");
}
