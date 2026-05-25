const { app } = require("@azure/functions");
const { saveSessionLog } = require("../shared/logStore");

app.http("sessionLog", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "session-log",
  handler: async (request) => {
    try {
      const payload = await request.json();
      const result = await saveSessionLog(payload);

      return {
        status: 200,
        jsonBody: {
          ok: true,
          ...result
        }
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