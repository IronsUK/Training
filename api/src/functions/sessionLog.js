const { app } = require("@azure/functions");
const { listSessionLogs, saveSessionLog, searchSessionLogs } = require("../shared/logStore");

app.http("sessionLog", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "session-log",
  handler: async (request) => {
    try {
      if (request.method === "GET") {
        const url = new URL(request.url);
        const logs = await listSessionLogs({
          session: url.searchParams.get("session") || "",
          query: url.searchParams.get("query") || "",
          limit: url.searchParams.get("limit") || ""
        });

        return {
          status: 200,
          jsonBody: {
            items: logs
          }
        };
      }

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

app.http("sessionLogSearch", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "session-log/search",
  handler: async (request) => {
    try {
      const url = new URL(request.url);
      const logs = await searchSessionLogs({
        session: url.searchParams.get("session") || "",
        query: url.searchParams.get("query") || "",
        limit: url.searchParams.get("limit") || ""
      });

      return {
        status: 200,
        jsonBody: {
          items: logs
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