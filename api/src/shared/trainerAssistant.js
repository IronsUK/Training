const { getCurrentState, saveCurrentState } = require("./stateStore");
const { listSessionLogDocuments } = require("./logStore");
const { generateCoachResponse } = require("./llmCoach");

async function handleTrainerMessage(message) {
  const trimmedMessage = String(message || "").trim();
  if (!trimmedMessage) {
    throw new Error("Message is required.");
  }

  const stateResult = await getCurrentState();
  const state = stateResult.state;
  const logs = await listSessionLogDocuments({ limit: 24 });

  const response = await generateCoachResponse({
    message: trimmedMessage,
    state,
    logs
  });

  return applyAssistantAction(state, response);
}

async function applyAssistantAction(state, response) {
  const action = response.action;

  if (!action || action.type === "none") {
    return {
      reply: response.reply,
      stateChanged: false,
      intent: "chat"
    };
  }

  if (action.type !== "switch_next_session") {
    return {
      reply: response.reply,
      stateChanged: false,
      intent: "chat"
    };
  }

  const sessionName = String(action.sessionName || "").trim();
  if (!sessionName) {
    return {
      reply: response.reply,
      stateChanged: false,
      intent: "chat"
    };
  }

  const allowedSession = (state.rotation || []).find((session) => normalizeText(session) === normalizeText(sessionName));
  if (!allowedSession) {
    return {
      reply: `${response.reply}\n\nI did not apply a session change because '${sessionName}' is not in your current rotation.`,
      stateChanged: false,
      intent: "chat"
    };
  }

  const updatedState = structuredClone(state);
  updatedState.status.next_session = allowedSession;
  await saveCurrentState(updatedState);

  return {
    reply: response.reply,
    stateChanged: true,
    state: updatedState,
    intent: "switch-next-session"
  };
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

module.exports = {
  handleTrainerMessage
};