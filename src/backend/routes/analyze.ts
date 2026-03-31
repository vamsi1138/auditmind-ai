import { Request, Response } from "express";
import { analyzeContract } from "../services/analyzer";
import { resolveContractCode } from "../services/inputResolver";
import { validateContractInput } from "../utils/validators";

export async function analyzeRoute(req: Request, res: Response) {
  try {
    const input = req.body;
    const contractCode = await resolveContractCode(input);

    const validationError = validateContractInput(contractCode);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    const report = await analyzeContract(contractCode);

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Analysis error:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed.",
    });
  }
}