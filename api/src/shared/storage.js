const { BlobServiceClient } = require("@azure/storage-blob");

function getStorageConfig() {
  return {
    connectionString: process.env.TRAINING_STORAGE_CONNECTION_STRING || "",
    stateContainer: process.env.TRAINING_STATE_CONTAINER || "training-state",
    stateBlobName: process.env.TRAINING_STATE_BLOB || "current-state.json",
    logsContainer: process.env.TRAINING_LOGS_CONTAINER || "training-logs"
  };
}

function getBlobServiceClient() {
  const { connectionString } = getStorageConfig();

  if (!connectionString) {
    return null;
  }

  return BlobServiceClient.fromConnectionString(connectionString);
}

async function getContainerClient(containerName) {
  const blobServiceClient = getBlobServiceClient();

  if (!blobServiceClient) {
    throw new Error("Blob storage is not configured. Set TRAINING_STORAGE_CONNECTION_STRING first.");
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  return containerClient;
}

module.exports = {
  getBlobServiceClient,
  getContainerClient,
  getStorageConfig
};