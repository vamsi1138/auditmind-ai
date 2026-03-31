import { Ollama } from "ollama";

interface AgentResult {
  agentUsed: boolean;
  agentMode: string;
  text: string;
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`OLLAMA_TIMEOUT:${ms}`));
    }, ms);
  });
}

export async function runAgentAnalysis(prompt: string): Promise<AgentResult> {
  const model = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";
  const host = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 20000);

  const client = new Ollama({ host });

  try {
    console.log(`[Ollama] Starting analysis with model: ${model}`);
    console.log(`[Ollama] Host: ${host}`);

    const response = await Promise.race([
      client.chat({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are a smart contract security auditor. Analyze Solidity contracts carefully and return a short practical review in plain text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        options: {
          temperature: 0.2,
        },
      }),
      timeoutPromise(timeoutMs),
    ]);

    const text = response?.message?.content?.trim();

    console.log("[Ollama] Analysis completed successfully");

    return {
      agentUsed: true,
      agentMode: "ollama-local",
      text: text || "No response returned by local Ollama model.",
    };
  } catch (error) {
    console.error("[Ollama] Analysis failed:", error);

    let fallbackReason = "Local Ollama failed. Falling back to rule-based analysis.";

    if (error instanceof Error) {
      if (error.message.startsWith("OLLAMA_TIMEOUT:")) {
        fallbackReason =
          "Local Ollama timed out. Falling back to rule-based analysis.";
      } else if (
        error.message.toLowerCase().includes("fetch failed") ||
        error.message.toLowerCase().includes("econnrefused")
      ) {
        fallbackReason =
          "Could not connect to Ollama. Make sure Ollama is running on localhost:11434.";
      } else if (error.message.toLowerCase().includes("model")) {
        fallbackReason =
          "Ollama model not found. Pull the configured model first and try again.";
      }
    }

    return {
      agentUsed: false,
      agentMode: "fallback",
      text: fallbackReason,
    };
  }
}