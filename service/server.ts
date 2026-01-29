import type { HandlerParams } from "@mspbots/runtime";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

type McpTransport = "streamable-http" | "sse";

interface McpServer {
  name: string;
  url: string;
  transport?: McpTransport;
  apiKey?: string;
  config?: unknown;
  headers?: Record<string, string>;
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

serversByUrl.set("https://server.smithery.ai/enriquedlh97/playwright-mcp", {
  name: "Playwright MCP",
  url: "https://server.smithery.ai/enriquedlh97/playwright-mcp",
  transport: "streamable-http",
});

function readOrigin(params: HandlerParams) {
  try {
    return new URL((params as any)?.requestUrl ?? "").origin;
  } catch {
    const headers = ((params as any)?.headers ?? {}) as Record<string, string>;
    const host = readString(headers["host"]);
    const proto = readString(headers["x-forwarded-proto"]) || "http";
    if (!host) return "";
    return `${proto}://${host}`;
  }
}

function ensureTestServer(params: HandlerParams) {
  const origin = readOrigin(params);
  if (!origin) return;
  const url = new URL("/api/mcp-test", origin).toString();
  if (serversByUrl.has(url)) return;
  serversByUrl.set(url, { name: "Test MCP", url, transport: "streamable-http" });
}

function normalizeServerUrl(url: string) {
  const value = normalizeUrl(url);
  try {
    const u = new URL(value);
    if (u.hostname === "smithery.ai" && u.pathname.startsWith("/server/")) {
      const qualifiedName = u.pathname.slice("/server/".length);
      return `https://server.smithery.ai/${qualifiedName}`.replace(/\/$/, "");
    }
  } catch {
  }
  return value;
}

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

function readHeaders(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== "object") return undefined;
  if (Array.isArray(input)) return undefined;
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const name = readString(key).trim();
    const text = readString(value).trim();
    if (!name || !text) continue;
    headers[name] = text;
  }
  return Object.keys(headers).length ? headers : undefined;
}

function createEndpoint(server: McpServer) {
  const base = new URL(normalizeServerUrl(server.url));
  if (base.hostname === "server.smithery.ai") {
    const path = base.pathname.replace(/\/$/, "");
    if (!path.endsWith("/mcp")) {
      base.pathname = `${path}/mcp`;
    }
    if (server.config !== undefined) {
      base.searchParams.set("config", JSON.stringify(server.config));
    }
  }
  return base;
}

function createRequestHeaders(server: McpServer) {
  const headers: Record<string, string> = { ...(server.headers ?? {}) };
  if (server.apiKey) {
    const hasAuthorization = Object.keys(headers).some((key) => key.toLowerCase() === "authorization");
    if (!hasAuthorization) {
      headers["Authorization"] = `Bearer ${server.apiKey}`;
    }
  }
  return Object.keys(headers).length ? headers : undefined;
}

function appendPath(url: URL, suffix: string) {
  const next = new URL(url.toString());
  const path = next.pathname.replace(/\/$/, "");
  const extra = suffix.replace(/^\//, "");
  next.pathname = `${path}/${extra}`;
  return next;
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
  const url = createEndpoint(server);
  const requestHeaders = createRequestHeaders(server);

  const listViaSdk = async () => {
    const client = new Client({ name: "visual-agent-mcp-proxy", version: "0.0.0" });
    try {
      const transport = new StreamableHTTPClientTransport(url, {
        requestInit: requestHeaders ? { headers: requestHeaders } : undefined,
      });
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
    const toolsListUrl = appendPath(url, "tools/list").toString();
    try {
      const res = await fetchWithTimeout(
        toolsListUrl,
        {
          method: "GET",
          headers: {
            ...(requestHeaders ?? {}),
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
        url.toString(),
        {
          method: "POST",
          headers: {
            ...(requestHeaders ?? {}),
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

function createTextContent(text: string) {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

function readNumber(input: unknown) {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const value = Number(input);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function listTestTools() {
  return [
    {
      name: "echo",
      display_name: "echo",
      description: "Return the input text.",
      input_schema: {
        type: "object",
        properties: {
          text: { type: "string" },
        },
        required: ["text"],
      },
    },
    {
      name: "add",
      display_name: "add",
      description: "Add two numbers.",
      input_schema: {
        type: "object",
        properties: {
          a: { type: "number" },
          b: { type: "number" },
        },
        required: ["a", "b"],
      },
    },
  ];
}

function callTestTool(name: string, args: any) {
  if (name === "echo") {
    return createTextContent(readString(args?.text));
  }
  if (name === "add") {
    const a = readNumber(args?.a);
    const b = readNumber(args?.b);
    return createTextContent(String(a + b));
  }
  return createTextContent(`Unknown tool: ${name}`);
}

const routes = {
  "GET /api/mcp/servers"(params: HandlerParams) {
    ensureTestServer(params);
    return json(Array.from(serversByUrl.values()));
  },

  "POST /api/mcp/servers"(params: HandlerParams) {
    const body = (params as any).body ?? {};
    const name = readString(body.name).trim();
    const url = normalizeServerUrl(readString(body.url));
    const transport = readTransport(body.transport);
    const apiKey = readString(body.apiKey).trim() || undefined;
    const config = body.config;
    const headers = readHeaders(body.headers);

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

    const server: McpServer = { name, url, transport, apiKey, config, headers };
    serversByUrl.set(url, server);
    return json(server, 201);
  },

  "PUT /api/mcp/servers"(params: HandlerParams) {
    const body = (params as any).body ?? {};
    const url = normalizeServerUrl(readString(body.url));
    const nextUrl = normalizeServerUrl(readString(body.nextUrl || body.newUrl || body.next_url));
    const name = readString(body.name).trim();
    const transport = readTransport(body.transport);
    const apiKey = readString(body.apiKey).trim() || undefined;
    const config = body.config;
    const headers = readHeaders(body.headers);

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
      apiKey: apiKey ?? existing.apiKey,
      config: config ?? existing.config,
      headers: headers ?? existing.headers,
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
      ensureTestServer(params);
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

  "GET /api/mcp-test/tools/list"() {
    return json({ tools: listTestTools() });
  },

  "POST /api/mcp-test"(params: HandlerParams) {
    const body = (params as any).body ?? {};
    const id = body?.id ?? 1;
    const method = readString(body?.method);
    const rpcParams = body?.params ?? {};

    if (method === "tools/list") {
      return json({ jsonrpc: "2.0", id, result: { tools: listTestTools() } });
    }

    if (method === "tools/call") {
      const name = readString(rpcParams?.name);
      const args = rpcParams?.arguments ?? {};
      return json({ jsonrpc: "2.0", id, result: callTestTool(name, args) });
    }

    return json(
      {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found" },
      },
      404
    );
  },
};

export default routes;
