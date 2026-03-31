export function validateContractInput(contractCode: string): string | null {
  if (!contractCode || contractCode.trim().length === 0) {
    return "Contract code is required.";
  }

  if (contractCode.trim().length < 30) {
    return "Contract code is too short to analyze.";
  }

  if (contractCode.length > 100000) {
    return "Contract code is too large. Please submit a smaller contract.";
  }

  const lowerCode = contractCode.toLowerCase();

  if (!lowerCode.includes("contract") && !lowerCode.includes("pragma solidity")) {
    return "Input does not look like Solidity contract code.";
  }

  return null;
}