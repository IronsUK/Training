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

  return buildAssistantProposal(state, response);
}

function buildAssistantProposal(state, response) {
  const mergedProposal = response.proposedState && typeof response.proposedState === "object"
    ? deepMerge(state, response.proposedState)
    : null;
  const diffText = mergedProposal ? buildDiffText(state, mergedProposal) : "";
  const proposedState = diffText && diffText !== "No state changes proposed."
    ? mergedProposal
    : null;

  return {
    reply: response.reply,
    stateChanged: false,
    proposedState,
    diffText: proposedState ? diffText : "",
    intent: proposedState ? "proposal" : "chat"
  };
}

async function applyStateProposal(proposedState) {
  if (!proposedState || typeof proposedState !== "object") {
    throw new Error("Proposed state must be a JSON object.");
  }

  await saveCurrentState(proposedState);

  return {
    ok: true,
    state: proposedState
  };
}

function buildDiffText(currentState, proposedState) {
  const changes = [];
  collectDiffs(currentState, proposedState, [], changes);

  if (!changes.length) {
    return "No state changes proposed.";
  }

  return changes
    .slice(0, 200)
    .map((change) => `${change.path || "root"}: ${formatDiffValue(change.before)} -> ${formatDiffValue(change.after)}`)
    .join("\n");
}

function collectDiffs(currentValue, proposedValue, pathParts, changes) {
  if (currentValue === proposedValue) {
    return;
  }

  const currentIsObject = isPlainObject(currentValue);
  const proposedIsObject = isPlainObject(proposedValue);

  if (currentIsObject && proposedIsObject) {
    const keys = new Set([...Object.keys(currentValue), ...Object.keys(proposedValue)]);
    keys.forEach((key) => {
      collectDiffs(currentValue[key], proposedValue[key], [...pathParts, key], changes);
    });
    return;
  }

  if (Array.isArray(currentValue) && Array.isArray(proposedValue)) {
    if (JSON.stringify(currentValue) !== JSON.stringify(proposedValue)) {
      changes.push({
        path: pathParts.join("."),
        before: currentValue,
        after: proposedValue
      });
    }
    return;
  }

  changes.push({
    path: pathParts.join("."),
    before: currentValue,
    after: proposedValue
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(baseValue, patchValue) {
  if (Array.isArray(baseValue) || Array.isArray(patchValue)) {
    return patchValue;
  }

  if (!isPlainObject(baseValue) || !isPlainObject(patchValue)) {
    return patchValue;
  }

  const merged = { ...baseValue };
  Object.keys(patchValue).forEach((key) => {
    merged[key] = key in baseValue
      ? deepMerge(baseValue[key], patchValue[key])
      : patchValue[key];
  });

  return merged;
}

function formatDiffValue(value) {
  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value === null || typeof value !== "object") {
    return String(value);
  }

  const json = JSON.stringify(value);
  return json.length > 120 ? `${json.slice(0, 117)}...` : json;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

module.exports = {
  applyStateProposal,
  handleTrainerMessage
};