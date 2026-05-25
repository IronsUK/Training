const { app } = require("@azure/functions");
const { getCurrentState, saveCurrentState } = require("../shared/stateStore");

app.http("stateCurrent", {
  methods: ["GET", "PUT"],
  authLevel: "anonymous",
  route: "state/current",
  handler: async (request) => {
    try {
      if (request.method === "GET") {
        const result = await getCurrentState();
        return jsonResponse(200, result.state);
      }

      const payload = await request.json();
      const result = await saveCurrentState(payload);

      return jsonResponse(200, {
        ok: true,
        ...result
      });
    } catch (error) {
      return jsonResponse(500, {
        error: error.message
      });
    }
  }
});

function jsonResponse(status, body) {
  return {
    status,
    jsonBody: body
  };
}