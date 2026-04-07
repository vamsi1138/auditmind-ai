import { randomUUID } from "node:crypto";

interface ElizaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ElizaChatRequest {
  model: string;
  messages: ElizaChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

function extractTextFromResponse(data: any): string {
  if (typeof data?.agentResponse?.text === "string" && data.agentResponse.text.length > 0) {
    return data.agentResponse.text;
  }

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

  if (typeof data?.response === "string") {
    return data.response;
  }

  return "";
}

function getJsonHeaders(apiKey?: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

function getElizaBaseUrl(apiUrl: string): string {
  const parsed = new URL(apiUrl);
  parsed.pathname = parsed.pathname.replace(/\/api\/chat\/?$/i, "") || "/";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

async function callElizaChatEndpoint(
  apiUrl: string,
  apiKey: string | undefined,
  model: string,
  prompt: string
): Promise<string> {
  const payload: ElizaChatRequest = {
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
    max_tokens: 2000,
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: getJsonHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Eliza chat endpoint failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const text = extractTextFromResponse(data);

  if (!text) {
    throw new Error("Eliza chat endpoint returned an empty response.");
  }

  return text;
}

async function resolveElizaAgentId(baseUrl: string, apiKey: string | undefined): Promise<string> {
  const configuredAgentId = process.env.ELIZA_AUDIT_AGENT_ID?.trim();
  if (configuredAgentId) {
    return configuredAgentId;
  }

  const response = await fetch(`${baseUrl}/api/agents`, {
    method: "GET",
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Eliza agents endpoint failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const agents = Array.isArray(data?.data?.agents) ? data.data.agents : [];
  const activeAgent = agents.find((agent: any) => agent?.status === "active");
  const firstAgent = agents.find((agent: any) => typeof agent?.id === "string");
  const agentId = activeAgent?.id || firstAgent?.id;

  if (!agentId) {
    throw new Error("No Eliza agents were found. Start an agent or set ELIZA_AUDIT_AGENT_ID.");
  }

  return String(agentId);
}

async function callElizaSessionEndpoint(
  baseUrl: string,
  apiKey: string | undefined,
  prompt: string
): Promise<string> {
  const agentId = await resolveElizaAgentId(baseUrl, apiKey);
  const userId = randomUUID();

  const sessionResponse = await fetch(`${baseUrl}/api/messaging/sessions`, {
    method: "POST",
    headers: getJsonHeaders(apiKey),
    body: JSON.stringify({
      agentId,
      userId,
      metadata: {
        source: "auditmind-ai",
        purpose: "security-audit",
      },
    }),
  });

  if (!sessionResponse.ok) {
    const text = await sessionResponse.text();
    throw new Error(`Eliza session creation failed (${sessionResponse.status}): ${text}`);
  }

  const sessionData = await sessionResponse.json();
  const sessionId = sessionData?.sessionId;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("Eliza session creation did not return a sessionId.");
  }

  const messageResponse = await fetch(`${baseUrl}/api/messaging/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: getJsonHeaders(apiKey),
    body: JSON.stringify({
      content: prompt,
      transport: "http",
      metadata: {
        source: "auditmind-ai",
        purpose: "security-audit",
      },
    }),
  });

  if (!messageResponse.ok) {
    const text = await messageResponse.text();
    throw new Error(`Eliza session message failed (${messageResponse.status}): ${text}`);
  }

  const data = await messageResponse.json();
  const text = extractTextFromResponse(data);

  if (!text) {
    throw new Error("Eliza session endpoint returned an empty response.");
  }

  return text;
}

export async function callElizaAudit(prompt: string): Promise<string> {
  const apiUrl = process.env.ELIZA_AUDIT_API_URL?.trim();
  const apiKey = process.env.ELIZA_AUDIT_API_KEY?.trim() || process.env.ELIZAOS_API_KEY?.trim();
  const model =
    process.env.ELIZA_AUDIT_MODEL?.trim() ||
    process.env.QWEN_MODEL?.trim() ||
    "qwen3.5-27b-awq-4bit";

  if (!apiUrl) {
    throw new Error("ELIZA_AUDIT_API_URL is not configured.");
  }

  const errors: string[] = [];
  const shouldTryChatEndpoint = /\/api\/chat\/?$/i.test(apiUrl);

  if (shouldTryChatEndpoint) {
    try {
      return await callElizaChatEndpoint(apiUrl, apiKey, model, prompt);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  try {
    return await callElizaSessionEndpoint(getElizaBaseUrl(apiUrl), apiKey, prompt);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  if (!shouldTryChatEndpoint) {
    try {
      const chatUrl = `${getElizaBaseUrl(apiUrl)}/api/chat`;
      return await callElizaChatEndpoint(chatUrl, apiKey, model, prompt);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(errors.join(" | "));
}
