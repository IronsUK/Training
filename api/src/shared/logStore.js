const { getContainerClient, getStorageConfig } = require("./storage");
const { slugify } = require("./logParser");

function validateSessionLogPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Session log payload must be a JSON object.");
  }

  if (!payload.sessionName) {
    throw new Error("Session log payload must include sessionName.");
  }

  if (!payload.markdown) {
    throw new Error("Session log payload must include markdown.");
  }
}

async function saveSessionLog(payload) {
  validateSessionLogPayload(payload);

  const { logsContainer } = getStorageConfig();
  const containerClient = await getContainerClient(logsContainer);
  const normalized = normalizeSessionLogPayload(payload);
  const dateStamp = normalized.date || new Date().toISOString().slice(0, 10);
  const blobName = `${dateStamp}-${slugify(payload.sessionName)}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const body = JSON.stringify(normalized, null, 2);

  await blockBlobClient.upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: {
      blobContentType: "application/json"
    }
  });

  return {
    blobName,
    containerName: logsContainer
  };
}

async function listSessionLogs(filters = {}) {
  const { logsContainer } = getStorageConfig();
  const containerClient = await getContainerClient(logsContainer);
  const items = [];
  const limit = normalizeLimit(filters.limit);
  const searchText = String(filters.query || "").trim().toLowerCase();
  const sessionFilter = String(filters.session || "").trim().toLowerCase();

  for await (const blob of containerClient.listBlobsFlat()) {
    if (items.length >= limit) {
      break;
    }

    if (!blob.name.endsWith(".json")) {
      continue;
    }

    const document = await readLogDocument(containerClient, blob.name);
    if (!matchesFilters(document, sessionFilter, searchText)) {
      continue;
    }

    items.push(toLogSummary(document, blob.name));
  }

  items.sort((left, right) => String(right.date).localeCompare(String(left.date)));
  return items.slice(0, limit);
}

async function searchSessionLogs(filters = {}) {
  return listSessionLogs(filters);
}

async function readLogDocument(containerClient, blobName) {
  const blobClient = containerClient.getBlobClient(blobName);
  const download = await blobClient.download();
  const body = await streamToText(download.readableStreamBody);
  return JSON.parse(body);
}

function normalizeSessionLogPayload(payload) {
  const generatedAt = payload.generatedAt || new Date().toISOString();
  return {
    schemaVersion: 1,
    kind: "training-session-log",
    source: payload.source || "app",
    sessionName: payload.sessionName,
    date: payload.date || generatedAt.slice(0, 10),
    weekOfCycle: payload.weekOfCycle ?? null,
    overallFeel: payload.overallFeel || "",
    sessionNotes: payload.sessionNotes || "",
    results: payload.results || {},
    exercises: payload.exercises || [],
    markdown: payload.markdown,
    generatedAt,
    savedAt: new Date().toISOString(),
    originalFileName: payload.originalFileName || null
  };
}

function matchesFilters(document, sessionFilter, searchText) {
  if (sessionFilter && String(document.sessionName || "").toLowerCase() !== sessionFilter) {
    return false;
  }

  if (!searchText) {
    return true;
  }

  const haystack = JSON.stringify({
    sessionName: document.sessionName,
    markdown: document.markdown,
    overallFeel: document.overallFeel,
    sessionNotes: document.sessionNotes,
    exercises: document.exercises,
    results: document.results
  }).toLowerCase();

  return haystack.includes(searchText);
}

function toLogSummary(document, blobName) {
  return {
    blobName,
    date: document.date || "",
    sessionName: document.sessionName || "",
    weekOfCycle: document.weekOfCycle ?? null,
    overallFeel: document.overallFeel || "",
    exerciseCount: Array.isArray(document.exercises)
      ? document.exercises.length
      : Object.keys(document.results || {}).length,
    source: document.source || "unknown",
    originalFileName: document.originalFileName || null,
    savedAt: document.savedAt || document.importedAt || ""
  };
}

function normalizeLimit(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, 100);
}

async function streamToText(readableStream) {
  const chunks = [];

  for await (const chunk of readableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

module.exports = {
  listSessionLogs,
  saveSessionLog,
  searchSessionLogs
};