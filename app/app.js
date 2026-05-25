const appState = {
  rawState: null,
  sessionName: null,
  exercises: [],
  betweenExerciseRest: 75,
  restEndBeepEnabled: true,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  results: {},
  restTimerId: null,
  restSecondsLeft: 0,
  lastRestType: null,
  lastLogOutput: "",
  audioContext: null,
  pendingProposal: null
};

const API_STATE_PATH = "/api/state/current";
const API_SESSION_LOG_PATH = "/api/session-log";
const API_ASSISTANT_CHAT_PATH = "/api/assistant/chat";
const API_ASSISTANT_APPLY_PROPOSAL_PATH = "/api/assistant/apply-proposal";
const DEFAULT_STATE_PATHS = [API_STATE_PATH, "./data/current-state.json", "../state/current-state.json"];

const refs = {
  sessionMeta: document.getElementById("sessionMeta"),
  setupCard: document.getElementById("setupCard"),
  previewCard: document.getElementById("previewCard"),
  workoutCard: document.getElementById("workoutCard"),
  finishCard: document.getElementById("finishCard"),
  setupMessage: document.getElementById("setupMessage"),
  assistantHistory: document.getElementById("assistantHistory"),
  assistantInput: document.getElementById("assistantInput"),
  sendAssistantBtn: document.getElementById("sendAssistantBtn"),
  assistantStatus: document.getElementById("assistantStatus"),
  proposalCard: document.getElementById("proposalCard"),
  proposalDiff: document.getElementById("proposalDiff"),
  applyProposalBtn: document.getElementById("applyProposalBtn"),
  discardProposalBtn: document.getElementById("discardProposalBtn"),
  betweenExerciseRest: document.getElementById("betweenExerciseRest"),
  beepToggle: document.getElementById("beepToggle"),
  autoLoadBtn: document.getElementById("autoLoadBtn"),
  saveStateBtn: document.getElementById("saveStateBtn"),
  stateFileInput: document.getElementById("stateFileInput"),
  previewSummary: document.getElementById("previewSummary"),
  previewList: document.getElementById("previewList"),
  startBtn: document.getElementById("startBtn"),
  currentExerciseName: document.getElementById("currentExerciseName"),
  currentExerciseDetails: document.getElementById("currentExerciseDetails"),
  nextExerciseName: document.getElementById("nextExerciseName"),
  nextExerciseDetails: document.getElementById("nextExerciseDetails"),
  currentTempoGuide: document.getElementById("currentTempoGuide"),
  setProgress: document.getElementById("setProgress"),
  actualRepsInput: document.getElementById("actualRepsInput"),
  setNotesInput: document.getElementById("setNotesInput"),
  completeSetBtn: document.getElementById("completeSetBtn"),
  setInputBlock: document.getElementById("setInputBlock"),
  restBlock: document.getElementById("restBlock"),
  sessionHistory: document.getElementById("sessionHistory"),
  restLabel: document.getElementById("restLabel"),
  restCountdown: document.getElementById("restCountdown"),
  skipRestBtn: document.getElementById("skipRestBtn"),
  finishEarlyBtn: document.getElementById("finishEarlyBtn"),
  resultSummary: document.getElementById("resultSummary"),
  overallFeel: document.getElementById("overallFeel"),
  sessionNotes: document.getElementById("sessionNotes"),
  generateLogBtn: document.getElementById("generateLogBtn"),
  downloadLogBtn: document.getElementById("downloadLogBtn"),
  copyLogBtn: document.getElementById("copyLogBtn"),
  saveLogBtn: document.getElementById("saveLogBtn"),
  logSaveMessage: document.getElementById("logSaveMessage"),
  logOutput: document.getElementById("logOutput")
};

function setStatusMessage(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#7a1f35" : "#1f7a6c";
}

function titleize(key) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseExercisesFromState(stateObj) {
  const sessionName = stateObj?.status?.next_session;
  const sessionTargets = stateObj?.next_targets?.[sessionName];

  if (!sessionName || !sessionTargets) {
    throw new Error("Could not find next_session or next_targets in the state file.");
  }

  const exercises = Object.entries(sessionTargets).map(([key, cfg]) => ({
    key,
    name: titleize(key),
    load: cfg.load ?? "n/a",
    sets: Number(cfg.sets ?? 0),
    repTarget: cfg.rep_target ?? "n/a",
    tempo: cfg.tempo ?? "n/a",
    rest: Number(cfg.rest_seconds ?? 0),
    note: cfg.note ?? ""
  }));

  if (!exercises.length) {
    throw new Error("The selected session has no exercises.");
  }

  exercises.forEach((exercise) => {
    if (!exercise.sets || Number.isNaN(exercise.sets)) {
      throw new Error(`Exercise ${exercise.name} has an invalid set count.`);
    }
  });

  return { sessionName, exercises };
}

function renderPreview() {
  refs.previewList.innerHTML = "";
  refs.previewSummary.innerHTML =
    `<strong>Session:</strong> ${appState.sessionName} &nbsp;|&nbsp; ` +
    `<strong>Exercises:</strong> ${appState.exercises.length} &nbsp;|&nbsp; ` +
    `<strong>Current week:</strong> ${appState.rawState?.cycle?.current_week ?? "n/a"}`;

  appState.exercises.forEach((exercise) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${exercise.name}</strong> - ${exercise.sets} sets, ` +
      `${exercise.repTarget}, ${exercise.load}, tempo ${exercise.tempo}, rest ${exercise.rest}s`;
    refs.previewList.appendChild(li);
  });

  refs.sessionMeta.textContent =
    `${appState.sessionName} is ready. Preview first, then press Start Workout.`;
  refs.previewCard.classList.remove("hidden");
}

function getCurrentExercise() {
  return appState.exercises[appState.currentExerciseIndex] || null;
}

function getNextExercise() {
  return appState.exercises[appState.currentExerciseIndex + 1] || null;
}

function describeTempo(tempo) {
  if (!tempo || tempo === "n/a") {
    return "No tempo guidance listed for this movement.";
  }

  if (tempo.toLowerCase() === "hold") {
    return "Hold: maintain a steady brace and position for the full duration.";
  }

  const parts = tempo.split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return `${tempo}: follow the listed cadence for this movement.`;
  }

  const [lowering, pause, lifting] = parts;
  return `${tempo}: lower for ${lowering}s, pause for ${pause}s, lift for ${lifting}s.`;
}

function renderLiveState() {
  const current = getCurrentExercise();
  const next = getNextExercise();

  if (!current) {
    finishSession();
    return;
  }

  refs.currentExerciseName.textContent = current.name;
  refs.currentExerciseDetails.textContent =
    `${current.load} | target ${current.repTarget} | tempo ${current.tempo} | rest ${current.rest}s`;
  refs.setProgress.textContent = `Set ${appState.currentSetIndex + 1} of ${current.sets}`;

  refs.nextExerciseName.textContent = next ? next.name : "Session complete after this exercise";
  refs.nextExerciseDetails.textContent = next
    ? `${next.load} | target ${next.repTarget} | tempo ${next.tempo}`
    : "No more exercises";
  refs.currentTempoGuide.textContent = describeTempo(current.tempo);

  refs.actualRepsInput.value = "";
  refs.setNotesInput.value = "";
  refs.actualRepsInput.focus();
}

function buildHistoryEntries() {
  const entries = [];

  appState.exercises.forEach((exercise) => {
    const setResults = (appState.results[exercise.key] || []).map(normalizeSetResult);
    setResults.forEach((setResult, idx) => {
      entries.push({
        exerciseName: exercise.name,
        setNumber: idx + 1,
        reps: setResult.reps,
        note: setResult.note
      });
    });
  });

  return entries;
}

function renderSessionHistory() {
  const entries = buildHistoryEntries();
  refs.sessionHistory.innerHTML = "";

  if (!entries.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "historyEmpty";
    emptyItem.textContent = "No sets logged yet.";
    refs.sessionHistory.appendChild(emptyItem);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "historyItem";

    const headline = document.createElement("p");
    headline.className = "historyHeadline";
    headline.textContent = `${entry.exerciseName} - Set ${entry.setNumber}: ${entry.reps} reps`;
    item.appendChild(headline);

    if (entry.note) {
      const note = document.createElement("p");
      note.className = "historyNote";
      note.textContent = `Note: ${entry.note}`;
      item.appendChild(note);
    }

    refs.sessionHistory.appendChild(item);
  });
}

function stopRestTimer() {
  if (appState.restTimerId) {
    clearInterval(appState.restTimerId);
    appState.restTimerId = null;
  }
}

async function requestJson(url, options = {}) {
  const resp = await fetch(url, options);
  const text = await resp.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!resp.ok) {
    const message = typeof body === "object" && body?.error
      ? body.error
      : `Request failed with status ${resp.status}.`;
    throw new Error(message);
  }

  return body;
}

function playRestEndBeep() {
  if (!appState.restEndBeepEnabled) {
    return;
  }

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) {
    return;
  }

  if (!appState.audioContext) {
    appState.audioContext = new Ctx();
  }

  const ctx = appState.audioContext;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.25);
}

function startRest(seconds, label, restType) {
  stopRestTimer();
  refs.setInputBlock.classList.add("hidden");
  refs.restBlock.classList.remove("hidden");
  refs.restLabel.textContent = label;
  appState.restSecondsLeft = Math.max(0, seconds);
  appState.lastRestType = restType;
  refs.restCountdown.textContent = `${appState.restSecondsLeft}s`;

  if (appState.restSecondsLeft === 0) {
    endRestPhase();
    return;
  }

  appState.restTimerId = setInterval(() => {
    appState.restSecondsLeft -= 1;
    refs.restCountdown.textContent = `${Math.max(0, appState.restSecondsLeft)}s`;

    if (appState.restSecondsLeft <= 0) {
      stopRestTimer();
      playRestEndBeep();
      endRestPhase();
    }
  }, 1000);
}

function endRestPhase() {
  refs.restBlock.classList.add("hidden");
  refs.setInputBlock.classList.remove("hidden");

  if (appState.lastRestType === "betweenExercise") {
    appState.currentExerciseIndex += 1;
    appState.currentSetIndex = 0;
  }

  renderLiveState();
}

function registerSetResult() {
  const repsValue = Number(refs.actualRepsInput.value);
  const setNote = refs.setNotesInput.value.trim();
  const current = getCurrentExercise();

  if (!current) {
    finishSession();
    return;
  }

  if (Number.isNaN(repsValue) || repsValue < 0) {
    window.alert("Enter a valid reps number before completing the set.");
    return;
  }

  if (!appState.results[current.key]) {
    appState.results[current.key] = [];
  }
  appState.results[current.key].push({ reps: repsValue, note: setNote });
  renderSessionHistory();
  refs.actualRepsInput.value = "";
  refs.setNotesInput.value = "";

  const isLastSetOfExercise = appState.currentSetIndex + 1 >= current.sets;
  const isLastExercise = appState.currentExerciseIndex + 1 >= appState.exercises.length;

  if (!isLastSetOfExercise) {
    appState.currentSetIndex += 1;
    startRest(current.rest, "Rest between sets", "betweenSet");
    return;
  }

  if (isLastExercise) {
    finishSession();
    return;
  }

  startRest(appState.betweenExerciseRest, "Rest between exercises", "betweenExercise");
}

function normalizeSetResult(rawSetResult) {
  if (typeof rawSetResult === "number") {
    return { reps: rawSetResult, note: "" };
  }

  return {
    reps: rawSetResult?.reps ?? "",
    note: rawSetResult?.note ?? ""
  };
}

function summarizeResults() {
  const lines = [];
  appState.exercises.forEach((exercise) => {
    const setResults = (appState.results[exercise.key] || []).map(normalizeSetResult);
    if (!setResults.length) {
      lines.push(`${exercise.name}: not completed`);
      return;
    }

    const repsSummary = setResults
      .map((setResult, idx) => {
        const noteSuffix = setResult.note ? ` [${setResult.note}]` : "";
        return `S${idx + 1} ${setResult.reps}${noteSuffix}`;
      })
      .join(" | ");
    lines.push(`${exercise.name}: ${repsSummary}`);
  });
  return lines.join("\n");
}

function finishSession() {
  stopRestTimer();
  refs.workoutCard.classList.add("hidden");
  refs.finishCard.classList.remove("hidden");
  refs.resultSummary.textContent = summarizeResults();
}

function buildMarkdownLog() {
  const date = new Date();
  const dateStamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const week = appState.rawState?.cycle?.current_week ?? "";
  const feel = refs.overallFeel.value;
  const notes = refs.sessionNotes.value.trim();

  const lines = [
    "# Session Log",
    "",
    `- Date: ${dateStamp}`,
    `- Session: ${appState.sessionName}`,
    `- Week of cycle: ${week}`,
    "- Session duration:",
    "",
    "## Actual results"
  ];

  appState.exercises.forEach((exercise) => {
    const setResults = (appState.results[exercise.key] || []).map(normalizeSetResult);
    lines.push("");
    lines.push(`- ${exercise.name}:`);
    lines.push(`  - Target: ${exercise.sets} sets, ${exercise.repTarget}, ${exercise.load}, tempo ${exercise.tempo}`);
    setResults.forEach((setResult, idx) => {
      lines.push(`  - Set ${idx + 1}: ${setResult.reps}`);
      if (setResult.note) {
        lines.push(`    - Note: ${setResult.note}`);
      }
    });
    if (!setResults.length) {
      lines.push("  - Not completed");
    }
  });

  lines.push("");
  lines.push("## Session outcome");
  lines.push(`- Overall feel: ${feel}`);
  lines.push(`- Notes: ${notes || ""}`);
  lines.push("");
  lines.push("## Agent update request");
  lines.push("Please log this, preserve the set notes and session notes as written, and update the next-session targets conservatively.");

  return lines.join("\n");
}

function downloadLog(markdownText) {
  const date = new Date();
  const dateStamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const safeSession = appState.sessionName.toLowerCase().replace(/\s+/g, "-");
  const filename = `${dateStamp}-${safeSession}.md`;
  const blob = new Blob([markdownText], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function setSetupMessage(message, isError = false) {
  setStatusMessage(refs.setupMessage, message, isError);
}

function setLogSaveMessage(message, isError = false) {
  setStatusMessage(refs.logSaveMessage, message, isError);
}

function setAssistantStatus(message, isError = false) {
  setStatusMessage(refs.assistantStatus, message, isError);
}

function showProposal(diffText, proposedState) {
  appState.pendingProposal = proposedState;
  refs.proposalDiff.textContent = diffText || "No diff returned.";
  refs.proposalCard.classList.remove("hidden");
}

function clearProposal() {
  appState.pendingProposal = null;
  refs.proposalDiff.textContent = "";
  refs.proposalCard.classList.add("hidden");
}

function ingestStateObject(stateObj) {
  const parsed = parseExercisesFromState(stateObj);
  appState.rawState = stateObj;
  appState.sessionName = parsed.sessionName;
  appState.exercises = parsed.exercises;
  appState.currentExerciseIndex = 0;
  appState.currentSetIndex = 0;
  appState.results = {};
  appState.betweenExerciseRest = Math.max(0, Number(refs.betweenExerciseRest.value) || 0);
  appState.restEndBeepEnabled = refs.beepToggle.checked;
  appState.lastLogOutput = "";
  refs.logOutput.value = "";
  refs.downloadLogBtn.disabled = true;
  refs.copyLogBtn.disabled = true;
  refs.saveLogBtn.disabled = true;
  refs.saveStateBtn.disabled = false;
  setLogSaveMessage("");
  renderSessionHistory();

  renderPreview();
}

async function autoLoadState() {
  let lastError = null;

  for (const statePath of DEFAULT_STATE_PATHS) {
    try {
      const stateObj = await requestJson(statePath, { cache: "no-store" });
      ingestStateObject(stateObj);
      setSetupMessage(`State loaded from ${statePath}.`);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  setSetupMessage(`${lastError?.message || "Automatic state load failed."} Use 'Choose State File' instead.`, true);
}

async function loadFromFileInput(file) {
  const text = await file.text();
  const stateObj = JSON.parse(text);
  ingestStateObject(stateObj);
  setSetupMessage(`State loaded from ${file.name}.`);
}

async function saveCurrentStateToCloud() {
  if (!appState.rawState) {
    window.alert("Load a state file first.");
    return;
  }

  refs.saveStateBtn.disabled = true;

  try {
    const response = await requestJson(API_STATE_PATH, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(appState.rawState)
    });

    setSetupMessage(`Current state saved to cloud (${response.blobName}).`);
  } catch (err) {
    setSetupMessage(err.message, true);
  } finally {
    refs.saveStateBtn.disabled = false;
  }
}

function buildSessionLogPayload() {
  const generatedAt = new Date().toISOString();

  return {
    date: generatedAt.slice(0, 10),
    sessionName: appState.sessionName,
    weekOfCycle: appState.rawState?.cycle?.current_week ?? null,
    overallFeel: refs.overallFeel.value,
    sessionNotes: refs.sessionNotes.value.trim(),
    results: appState.results,
    exercises: appState.exercises.map((exercise) => ({
      exerciseName: exercise.name,
      target: `${exercise.sets} sets, ${exercise.repTarget}, ${exercise.load}, tempo ${exercise.tempo}`,
      sets: (appState.results[exercise.key] || []).map((setResult, idx) => ({
        setNumber: idx + 1,
        value: String(normalizeSetResult(setResult).reps),
        note: normalizeSetResult(setResult).note
      }))
    })),
    markdown: appState.lastLogOutput,
    generatedAt
  };
}

function appendAssistantMessage(role, text) {
  const article = document.createElement("article");
  article.className = `assistantMessage ${role === "user" ? "assistantMessageUser" : "assistantMessageAssistant"}`;

  const roleLine = document.createElement("p");
  roleLine.className = "assistantRole";
  roleLine.textContent = role === "user" ? "You" : "Trainer";

  const bodyLine = document.createElement("p");
  bodyLine.className = "assistantText";
  bodyLine.textContent = text;

  article.appendChild(roleLine);
  article.appendChild(bodyLine);
  refs.assistantHistory.appendChild(article);
  refs.assistantHistory.scrollTop = refs.assistantHistory.scrollHeight;
}

function applyAssistantState(stateObj) {
  if (!stateObj) {
    return;
  }

  ingestStateObject(stateObj);
}

async function sendAssistantMessage() {
  const message = refs.assistantInput.value.trim();
  if (!message) {
    return;
  }

  appendAssistantMessage("user", message);
  refs.assistantInput.value = "";
  refs.sendAssistantBtn.disabled = true;
  setAssistantStatus("Trainer is thinking...");

  try {
    const response = await requestJson(API_ASSISTANT_CHAT_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    appendAssistantMessage("assistant", response.reply || "No reply returned.");
    if (response.proposedState) {
      showProposal(response.diffText, response.proposedState);
      setAssistantStatus("Trainer proposed a state update. Review the diff below.");
    } else {
      clearProposal();
      setAssistantStatus("");
    }
  } catch (err) {
    appendAssistantMessage("assistant", `I hit a problem: ${err.message}`);
    setAssistantStatus(err.message, true);
  } finally {
    refs.sendAssistantBtn.disabled = false;
    refs.assistantInput.focus();
  }
}

async function applyPendingProposal() {
  if (!appState.pendingProposal) {
    return;
  }

  refs.applyProposalBtn.disabled = true;
  setAssistantStatus("Applying proposed update...");

  try {
    const response = await requestJson(API_ASSISTANT_APPLY_PROPOSAL_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ proposedState: appState.pendingProposal })
    });

    applyAssistantState(response.state);
    clearProposal();
    appendAssistantMessage("assistant", "I applied the proposed workout update.");
    setSetupMessage("Training state updated from the approved proposal.");
    setAssistantStatus("");
  } catch (err) {
    appendAssistantMessage("assistant", `I could not apply that update: ${err.message}`);
    setAssistantStatus(err.message, true);
  } finally {
    refs.applyProposalBtn.disabled = false;
  }
}

async function saveLogToCloud() {
  if (!appState.lastLogOutput) {
    window.alert("Generate the log before saving it to cloud storage.");
    return;
  }

  refs.saveLogBtn.disabled = true;
  setLogSaveMessage("Saving log to cloud...");

  try {
    const response = await requestJson(API_SESSION_LOG_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildSessionLogPayload())
    });

    setLogSaveMessage(`Log saved to cloud (${response.blobName}).`);
  } catch (err) {
    setLogSaveMessage(err.message, true);
  } finally {
    refs.saveLogBtn.disabled = false;
  }
}

refs.autoLoadBtn.addEventListener("click", autoLoadState);
refs.saveStateBtn.addEventListener("click", saveCurrentStateToCloud);

refs.beepToggle.addEventListener("change", () => {
  appState.restEndBeepEnabled = refs.beepToggle.checked;
});

refs.stateFileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  try {
    await loadFromFileInput(file);
  } catch (err) {
    setSetupMessage("Could not parse that file. Please select a valid state JSON file.", true);
  }
});

refs.startBtn.addEventListener("click", () => {
  if (!appState.exercises.length) {
    window.alert("Load the state first.");
    return;
  }
  refs.previewCard.classList.add("hidden");
  refs.finishCard.classList.add("hidden");
  refs.workoutCard.classList.remove("hidden");
  renderLiveState();
});

refs.completeSetBtn.addEventListener("click", registerSetResult);

refs.skipRestBtn.addEventListener("click", () => {
  stopRestTimer();
  endRestPhase();
});

refs.finishEarlyBtn.addEventListener("click", () => {
  const shouldFinish = window.confirm("Finish now and move to session summary?");
  if (shouldFinish) {
    finishSession();
  }
});

refs.generateLogBtn.addEventListener("click", () => {
  const markdown = buildMarkdownLog();
  appState.lastLogOutput = markdown;
  refs.logOutput.value = markdown;
  refs.downloadLogBtn.disabled = false;
  refs.copyLogBtn.disabled = false;
  refs.saveLogBtn.disabled = false;
  setLogSaveMessage("");
});

refs.downloadLogBtn.addEventListener("click", () => {
  if (!appState.lastLogOutput) {
    return;
  }
  downloadLog(appState.lastLogOutput);
});

refs.copyLogBtn.addEventListener("click", async () => {
  if (!appState.lastLogOutput) {
    return;
  }
  try {
    await navigator.clipboard.writeText(appState.lastLogOutput);
  } catch (err) {
    window.alert("Clipboard copy failed. You can still copy from the log output box.");
  }
});

refs.saveLogBtn.addEventListener("click", saveLogToCloud);
refs.sendAssistantBtn.addEventListener("click", sendAssistantMessage);
refs.applyProposalBtn.addEventListener("click", applyPendingProposal);
refs.discardProposalBtn.addEventListener("click", () => {
  clearProposal();
  setAssistantStatus("Proposed update discarded.");
});
refs.assistantInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendAssistantMessage();
  }
});