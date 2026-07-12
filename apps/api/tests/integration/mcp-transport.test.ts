import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startMcpServer } from "../../src/mcp-server.js";

describe("MCP transport compatibility", () => {
  let server: Awaited<ReturnType<typeof startMcpServer>> | undefined;
  let port = 0;

  beforeAll(async () => {
    server = await startMcpServer({ host: "127.0.0.1", port: 0 });
    const address = server.address();
    if (typeof address === "object" && address) {
      port = address.port;
    }
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it("accepts the legacy SSE handshake for MCP clients", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/sse`, {
      headers: { Accept: "text/event-stream" },
    });

    expect(response.status).toBe(200);
  });
});
