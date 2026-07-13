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

  it("initializes a stateless Streamable HTTP session on /sse", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      }),
    });

    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).toContain("evaix-mcp-server");
  });

  it("lists tools over the stateless /sse endpoint", async () => {
    const initRes = await fetch(`http://127.0.0.1:${port}/sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      }),
    });
    // Swallow the init response; the session is stateless so tools/list is its own call.
    await initRes.text();

    const listRes = await fetch(`http://127.0.0.1:${port}/sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    });

    expect(listRes.status).toBe(200);
    const listText = await listRes.text();
    const dataLine = listText
      .split("\n")
      .find((l) => l.startsWith("data:"));
    expect(dataLine).toBeDefined();
    const body = JSON.parse(dataLine!.slice(5).trim());
    expect(Array.isArray(body.result?.tools)).toBe(true);
    expect(body.result.tools.length).toBeGreaterThan(0);
  });
});
