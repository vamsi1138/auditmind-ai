import { resolveFromCode } from "./fetchers/fromCode";
import { resolveFromAddress } from "./fetchers/fromAddress";
import { resolveFromGithub } from "./fetchers/fromGithub";
import { resolveFromUpload } from "./fetchers/fromUpload";

export type AnalyzeInput =
  | {
      inputType: "code";
      contractCode: string;
    }
  | {
      inputType: "address";
      contractAddress: string;
    }
  | {
      inputType: "github";
      githubUrl: string;
    }
  | {
      inputType: "upload";
      fileContent?: string;
      fileName?: string;
      files?: Array<{
        fileContent: string;
        fileName?: string;
      }>;
    };

export async function resolveContractCode(input: AnalyzeInput): Promise<string> {
  switch (input.inputType) {
    case "code":
      return resolveFromCode(input.contractCode);

    case "address":
      return resolveFromAddress(input.contractAddress);

    case "github":
      return resolveFromGithub(input.githubUrl);

    case "upload":
      return resolveFromUpload(input.fileContent, input.fileName, input.files);

    default:
      throw new Error("Unsupported input type.");
  }
}
