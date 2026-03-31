const ELIZA_BASE = "http://localhost:3000";

const CHANNEL_ID = "00000000-0000-0000-0000-000000000000";

let initialized = false;

async function ensureAgentConnected() {
  if (initialized) return;

  try {
    await fetch(
      `${ELIZA_BASE}/api/eliza/messaging/central-channels/${CHANNEL_ID}/agents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: "default",
        }),
      }
    );

    initialized = true;
  } catch (err) {
    console.error("Eliza agent connection failed:", err);
  }
}

export async function analyzeWithEliza(contractCode: string) {
  try {
    await ensureAgentConnected();

    const response = await fetch(
      `${ELIZA_BASE}/api/eliza/messaging/central-channels/${CHANNEL_ID}/messages?mode=sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `Analyze this Solidity contract and explain risks:\n\n${contractCode}`,
          userId: "auditmind-backend",
        }),
      }
    );

    const data = await response.json();

    return {
      success: true,
      text: data?.response || data?.text || "No response",
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}