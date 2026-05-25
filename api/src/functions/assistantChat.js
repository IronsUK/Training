const { app } = require("@azure/functions");
const { applyStateProposal, handleTrainerMessage } = require("../shared/trainerAssistant");

app.http("assistantChat", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "assistant/chat",
  handler: async (request) => {
    try {
      const body = await request.json();
      const result = await handleTrainerMessage(body?.message || "");

      return {
        status: 200,
        jsonBody: result
      };
    } catch (error) {
      return {
        status: 500,
        jsonBody: {
          error: error.message
        }
      };
    }
  }
});

app.http("assistantApplyProposal", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "assistant/apply-proposal",
  handler: async (request) => {
    try {
      const body = await request.json();
      const result = await applyStateProposal(body?.proposedState);

      return {
        status: 200,
        jsonBody: result
      };
    } catch (error) {
      return {
        status: 500,
        jsonBody: {
          error: error.message
        }
      };
    }
  }
});