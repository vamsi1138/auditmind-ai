interface QwenChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface QwenChatRequest {
  model: string;
  messages: QwenChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

function extractTextFromResponse(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }

  const choice = data?.choices?.[0];

  if (typeof choice?.message?.content === "string") {
    return choice.message.content;
  }

  if (Array.isArray(choice?.message?.content)) {
    const textPart = choice.message.content.find((part: any) => part?.type === "text");
    if (textPart?.text) return String(textPart.text);
  }

  if (typeof choice?.text === "string") {
    return choice.text;
  }

  return "";
}

export async function callQwenEndpoint(prompt: string): Promise<string> {
  const apiUrl = process.env.QWEN_API_URL?.trim();
  const apiKey = process.env.QWEN_API_KEY?.trim();
  const model = process.env.QWEN_MODEL?.trim() || "qwen3.5-27b-awq-4bit";

  if (!apiUrl) {
    throw new Error("QWEN_API_URL is not configured.");
  }

  const payload: QwenChatRequest = {
    model,
    messages: [
      {
        role: "system",
        content: "Return strict JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Qwen endpoint failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const text = extractTextFromResponse(data);

  if (!text) {
    throw new Error("Qwen endpoint returned an empty response.");
  }

  return text;
}
