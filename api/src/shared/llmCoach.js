const DEFAULT_API_VERSION = "2024-10-21";

async function generateCoachResponse({ message, state, logs }) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
  const apiKey = process.env.AZURE_OPENAI_API_KEY || "";
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || DEFAULT_API_VERSION;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error("Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT.");
  }

  const response = await fetch(
    `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        temperature: 0.4,
        response_format: {
          type: "json_object"
        },
        messages: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: JSON.stringify(buildUserPayload(message, state, logs))
          }
        ]
      })
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Azure OpenAI request failed.");
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Azure OpenAI returned an empty response.");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Azure OpenAI returned invalid JSON.");
  }

  if (!parsed.reply || typeof parsed.reply !== "string") {
    throw new Error("Azure OpenAI response did not include a valid reply.");
  }

  return {
    reply: parsed.reply.trim(),
    action: parsed.action && typeof parsed.action === "object" ? parsed.action : null
  };
}

function buildSystemPrompt() {
  return [
    "You are a practical personal training assistant for a home dumbbell strength and hypertrophy program.",
    "Be natural, concise, and specific.",
    "Ground every answer in the provided training state and session logs. Do not invent history or plan details that are not present.",
    "Training style: conservative progression, reps first, then tempo, pause, range of motion, unilateral work, rest control, and density.",
    "Default rotation: Push, Lower A, Pull, Lower B.",
    "When the user mentions fatigue from running, padel, or tired legs, it is reasonable to swap from a planned lower session to the next upper-body session.",
    "You may suggest a state-changing action only when the user is clearly asking to change the current plan.",
    "Allowed action types are: none, switch_next_session.",
    "If you use switch_next_session, choose a session name that exists in the provided rotation.",
    "Return only JSON with this shape: {\"reply\": string, \"action\": {\"type\": \"none\"} | {\"type\": \"switch_next_session\", \"sessionName\": string, \"reason\": string}}"
  ].join(" ");
}

function buildUserPayload(message, state, logs) {
  return {
    userMessage: message,
    currentState: {
      cycle: state.cycle,
      rotation: state.rotation,
      status: state.status,
      progression_priority: state.progression_priority,
      next_targets: state.next_targets
    },
    recentLogs: logs.slice(0, 12).map((log) => ({
      date: log.date,
      sessionName: log.sessionName,
      overallFeel: log.overallFeel,
      sessionNotes: log.sessionNotes,
      exercises: (log.exercises || []).map((exercise) => ({
        exerciseName: exercise.exerciseName,
        target: exercise.target,
        sets: exercise.sets
      }))
    }))
  };
}

module.exports = {
  generateCoachResponse
};