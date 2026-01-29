import type { HandlerParams } from "@mspbots/runtime";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

type McpTransport = "streamable-http" | "sse";

interface McpServer {
  name: string;
  url: string;
  transport?: McpTransport;
}

interface McpTool {
  name: string;
  display_name: string;
  mcp_server_name: string;
  mcp_server_url: string;
  description?: string;
  input_schema?: unknown;
}

const serversByUrl = new Map<string, McpServer>();

function normalizeUrl(url: string) {
  const value = (url ?? "").trim();
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isHttpUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function readString(input: unknown) {
  return typeof input === "string" ? input : "";
}

function readTransport(input: unknown): McpTransport | undefined {
  const value = typeof input === "string" ? input : "";
  if (value === "streamable-http" || value === "sse") return value;
  return undefined;
}

function parseToolsPayload(payload: any) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.tools)) return payload.tools;
  if (payload.result && Array.isArray(payload.result.tools)) return payload.result.tools;
  return [];
}

function mapTool(raw: any, server: McpServer): McpTool | null {
  const name = readString(raw?.name);
  if (!name) return null;
  const display = readString(raw?.display_name) || readString(raw?.displayName) || name;
  const description = readString(raw?.description);
  const input_schema = raw?.input_schema ?? raw?.inputSchema ?? raw?.inputSchemaJson ?? raw?.parameters;
  return {
    name,
    display_name: display,
    mcp_server_name: server.name,
    mcp_server_url: server.url,
    description: description || undefined,
    input_schema: input_schema ?? undefined,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function listToolsFromServer(server: McpServer): Promise<McpTool[]> {
  const url = new URL(normalizeUrl(server.url));

  const listViaSdk = async () => {
    const client = new Client({ name: "visual-agent-mcp-proxy", version: "0.0.0" });
    try {
      const transport = new StreamableHTTPClientTransport(url);
      await client.connect(transport as any);
      const result = await client.request({ method: "tools/list" } as any, ListToolsResultSchema as any);
      const rawTools = (result as any)?.tools ?? [];
      return rawTools.map((raw: any) => mapTool(raw, server)).filter(Boolean) as McpTool[];
    } finally {
      try {
        await client.close();
      } catch {
      }
    }
  };

  try {
    return await listViaSdk();
  } catch {
    const baseUrl = normalizeUrl(server.url);
    const toolsListUrl = `${baseUrl}/tools/list`;
    try {
      const res = await fetchWithTimeout(
        toolsListUrl,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        },
        8000
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = await res.json().catch(() => null);
      const rawTools = parseToolsPayload(payload);
      return rawTools.map((t: any) => mapTool(t, server)).filter(Boolean) as McpTool[];
    } catch {
      const res = await fetchWithTimeout(
        baseUrl,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: {},
          }),
        },
        8000
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = await res.json().catch(() => null);
      const rawTools = parseToolsPayload(payload);
      return rawTools.map((t: any) => mapTool(t, server)).filter(Boolean) as McpTool[];
    }
  }
}

const routes = {
  "GET /api/mcp/servers"() {
    return json(Array.from(serversByUrl.values()));
  },

  "POST /api/mcp/servers"(params: HandlerParams) {
    const body = (params as any).body ?? {};
    const name = readString(body.name).trim();
    const url = normalizeUrl(readString(body.url));
    const transport = readTransport(body.transport);

    if (!name) {
      return json({ message: "Server name is required" }, 400);
    }
    if (!url) {
      return json({ message: "Server URL is required" }, 400);
    }
    if (!isHttpUrl(url)) {
      return json({ message: "Server URL must be http/https" }, 400);
    }
    if (serversByUrl.has(url)) {
      return json({ message: "MCP server URL must be unique" }, 409);
    }

    const server: McpServer = { name, url, transport };
    serversByUrl.set(url, server);
    return json(server, 201);
  },

  "PUT /api/mcp/servers"(params: HandlerParams) {
    const body = (params as any).body ?? {};
    const url = normalizeUrl(readString(body.url));
    const nextUrl = normalizeUrl(readString(body.nextUrl || body.newUrl || body.next_url));
    const name = readString(body.name).trim();
    const transport = readTransport(body.transport);

    if (!url) {
      return json({ message: "url is required" }, 400);
    }
    const existing = serversByUrl.get(url);
    if (!existing) {
      return json({ message: "Server not found" }, 404);
    }

    const finalUrl = nextUrl || url;
    if (!isHttpUrl(finalUrl)) {
      return json({ message: "Server URL must be http/https" }, 400);
    }
    if (finalUrl !== url && serversByUrl.has(finalUrl)) {
      return json({ message: "MCP server URL must be unique" }, 409);
    }
    const next: McpServer = {
      name: name || existing.name,
      url: finalUrl,
      transport: transport ?? existing.transport,
    };
    if (finalUrl !== url) {
      serversByUrl.delete(url);
      serversByUrl.set(finalUrl, next);
    } else {
      serversByUrl.set(url, next);
    }
    return json(next);
  },

  "DELETE /api/mcp/servers"(params: HandlerParams) {
    const query = (params as any).query ?? {};
    const body = (params as any).body ?? {};
    const url = normalizeUrl(readString(query.url || body.url));
    if (!url) {
      return json({ message: "url is required" }, 400);
    }
    const existed = serversByUrl.delete(url);
    if (!existed) {
      return json({ message: "Server not found" }, 404);
    }
    return json({ ok: true });
  },

  "GET /api/mcp/tools"(params: HandlerParams) {
    return (async () => {
      const query = (params as any).query ?? {};
      const url = normalizeUrl(readString(query.url));
      if (!url) {
        return json({ message: "url is required" }, 400);
      }
      if (!isHttpUrl(url)) {
        return json({ message: "Server URL must be http/https" }, 400);
      }

      const server = serversByUrl.get(url) ?? { name: readString(query.name).trim() || "MCP Server", url };
      try {
        const tools = await listToolsFromServer(server);
        return json({ tools });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Request failed";
        return json({ message, url }, 502);
      }
    })();
  },
};

export default routes;
