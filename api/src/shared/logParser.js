function slugify(value) {
  return String(value || "session")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "session";
}

function parseSessionLogMarkdown(markdown, options = {}) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const metadata = {};
  const exercises = [];
  const sessionOutcome = {};

  let currentSection = "";
  let currentExercise = null;
  let currentSet = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("## ")) {
      currentSection = trimmed.slice(3).trim().toLowerCase();
      currentExercise = null;
      currentSet = null;
      continue;
    }

    if (currentSection === "" && trimmed.startsWith("- ")) {
      const field = parseKeyValue(trimmed);
      if (field) {
        metadata[field.key] = field.value;
      }
      continue;
    }

    if (currentSection === "actual results") {
      if (/^- [^-].*:$/.test(trimmed)) {
        currentExercise = {
          exerciseName: trimmed.slice(2, -1).trim(),
          target: "",
          sets: []
        };
        exercises.push(currentExercise);
        currentSet = null;
        continue;
      }

      if (!currentExercise) {
        continue;
      }

      const targetMatch = trimmed.match(/^- Target:\s*(.+)$/i);
      if (targetMatch) {
        currentExercise.target = targetMatch[1].trim();
        continue;
      }

      const setMatch = trimmed.match(/^- Set\s+(\d+):\s*(.+)$/i);
      if (setMatch) {
        currentSet = {
          setNumber: Number(setMatch[1]),
          value: setMatch[2].trim(),
          note: ""
        };
        currentExercise.sets.push(currentSet);
        continue;
      }

      const setNoteMatch = trimmed.match(/^- Note:\s*(.+)$/i);
      if (setNoteMatch && currentSet) {
        currentSet.note = setNoteMatch[1].trim();
      }
      continue;
    }

    if (currentSection === "session outcome") {
      const field = parseKeyValue(trimmed);
      if (field) {
        sessionOutcome[field.key] = field.value;
      }
    }
  }

  const date = metadata.date || deriveDateFromFileName(options.fileName);
  const sessionName = metadata.session || deriveSessionFromFileName(options.fileName);
  const weekOfCycle = parseNullableNumber(metadata["week of cycle"]);

  if (!date || !sessionName) {
    throw new Error("Session log must include Date and Session metadata.");
  }

  return {
    schemaVersion: 1,
    kind: "training-session-log",
    source: options.source || "markdown-import",
    originalFileName: options.fileName || null,
    date,
    sessionName,
    weekOfCycle,
    sessionDuration: metadata["session duration"] || "",
    overallFeel: sessionOutcome["overall feel"] || "",
    sessionNotes: sessionOutcome.notes || sessionOutcome["overall note"] || "",
    exercises,
    markdown,
    importedAt: options.importedAt || null
  };
}

function parseKeyValue(line) {
  const match = line.match(/^-\s*([^:]+):\s*(.*)$/);
  if (!match) {
    return null;
  }

  return {
    key: match[1].trim().toLowerCase(),
    value: match[2].trim()
  };
}

function deriveDateFromFileName(fileName = "") {
  const match = fileName.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function deriveSessionFromFileName(fileName = "") {
  const match = fileName.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/i);
  if (!match) {
    return "";
  }

  return match[1]
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

module.exports = {
  parseSessionLogMarkdown,
  slugify
};