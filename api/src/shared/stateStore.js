const fs = require("fs/promises");
const path = require("path");
const { getBlobServiceClient, getContainerClient, getStorageConfig } = require("./storage");

const LOCAL_STATE_PATH = path.resolve(__dirname, "../../../state/current-state.json");

async function readLocalState() {
  const stateText = await fs.readFile(LOCAL_STATE_PATH, "utf8");
  return JSON.parse(stateText);
}

function validateStatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("State payload must be a JSON object.");
  }

  if (!payload.status?.next_session || !payload.next_targets) {
    throw new Error("State payload must include status.next_session and next_targets.");
  }
}

async function getCurrentState() {
  const blobServiceClient = getBlobServiceClient();

  if (!blobServiceClient) {
    return {
      state: await readLocalState(),
      source: "local-file"
    };
  }

  const { stateContainer, stateBlobName } = getStorageConfig();
  const containerClient = blobServiceClient.getContainerClient(stateContainer);
  const blobClient = containerClient.getBlobClient(stateBlobName);

  if (!(await blobClient.exists())) {
    return {
      state: await readLocalState(),
      source: "local-file"
    };
  }

  const download = await blobClient.download();
  const stateText = await streamToText(download.readableStreamBody);

  return {
    state: JSON.parse(stateText),
    source: "blob",
    blobName: stateBlobName
  };
}

async function saveCurrentState(stateObj) {
  validateStatePayload(stateObj);

  const { stateContainer, stateBlobName } = getStorageConfig();
  const containerClient = await getContainerClient(stateContainer);
  const blockBlobClient = containerClient.getBlockBlobClient(stateBlobName);
  const payload = JSON.stringify(stateObj, null, 2);

  await blockBlobClient.upload(payload, Buffer.byteLength(payload), {
    blobHTTPHeaders: {
      blobContentType: "application/json"
    }
  });

  return {
    source: "blob",
    blobName: stateBlobName
  };
}

async function streamToText(readableStream) {
  const chunks = [];

  for await (const chunk of readableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

module.exports = {
  getCurrentState,
  saveCurrentState
};