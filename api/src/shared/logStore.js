const { getContainerClient, getStorageConfig } = require("./storage");

function slugify(value) {
  return String(value || "session")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "session";
}

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
  const dateStamp = new Date().toISOString().slice(0, 10);
  const blobName = `${dateStamp}-${slugify(payload.sessionName)}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const body = JSON.stringify(
    {
      ...payload,
      savedAt: new Date().toISOString()
    },
    null,
    2
  );

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

module.exports = {
  saveSessionLog
};