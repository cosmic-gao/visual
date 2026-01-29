import type { HandlerParams } from "@mspbots/runtime";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

type McpTransport = "streamable-http" | "sse";

interface McpServer {
  name: string;
  url: string;
  transport?: McpTransport;
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

const servers = new Map<string, McpServer>();

function normalizeServer(url: string) {
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
  let value = (url ?? "").trim();
  if ((value.startsWith("`") && value.endsWith("`")) || (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isHttp(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function ok<T>(data: T) {
  return { ok: true as const, data };
}

function fail(message: string) {
  return { ok: false as const, message };
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

function buildUrl(server: McpServer) {
  const base = new URL(normalizeServer(server.url));
  if (base.hostname === "server.smithery.ai") {
    const path = base.pathname.replace(/\/$/, "");
    if (!path.endsWith("/mcp")) {
      base.pathname = `${path}/mcp`;
    }
    const token = readBearer(server.headers);
    if (token) {
      base.searchParams.set("api_key", token);
    }
    if (server.config !== undefined) {
      base.searchParams.set("config", JSON.stringify(server.config));
    }
  } else if (server.config !== undefined) {
    base.searchParams.set("config", JSON.stringify(server.config));
  }
  return base;
}

function buildHeaders(server: McpServer) {
  const headers: Record<string, string> = { ...(server.headers ?? {}) };
  return Object.keys(headers).length ? headers : undefined;
}

function appendPath(url: URL, suffix: string) {
  const next = new URL(url.toString());
  const path = next.pathname.replace(/\/$/, "");
  const extra = suffix.replace(/^\//, "");
  next.pathname = `${path}/${extra}`;
  return next;
}

function parseTools(payload: any) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.tools)) return payload.tools;
  if (payload.result && Array.isArray(payload.result.tools)) return payload.result.tools;
  return [];
}

function readBearer(headers?: Record<string, string>) {
  if (!headers) return "";
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== "authorization") continue;
    const text = readString(value).trim();
    if (!text) return "";
    const match = text.match(/^Bearer\s+(.+)$/i);
    return readString(match?.[1]).trim();
  }
  return "";
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

async function fetchTimed(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function listTools(server: McpServer): Promise<McpTool[]> {
  const url = buildUrl(server);
  const headers = buildHeaders(server);

  const listSdk = async () => {
    const client = new Client({ name: "visual-agent-mcp-proxy", version: "0.0.0" });
    try {
      const transport = new StreamableHTTPClientTransport(url, {
        requestInit: headers ? { headers } : undefined,
      });
      await client.connect(transport as any);
      const res = await client.request({ method: "tools/list" } as any, ListToolsResultSchema as any);
      const items = (res as any)?.tools ?? [];
      return items.map((raw: any) => mapTool(raw, server)).filter(Boolean) as McpTool[];
    } finally {
      try {
        await client.close();
      } catch {
      }
    }
  };

  const listGet = async () => {
    const link = appendPath(url, "tools/list").toString();
    const res = await fetchTimed(
      link,
      {
        method: "GET",
        headers: {
          ...(headers ?? {}),
          accept: "application/json",
        },
      },
      8000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json().catch(() => null);
    const items = parseTools(body);
    return items.map((raw: any) => mapTool(raw, server)).filter(Boolean) as McpTool[];
  };

  const listRpc = async () => {
    const res = await fetchTimed(
      url.toString(),
      {
        method: "POST",
        headers: {
          ...(headers ?? {}),
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json().catch(() => null);
    const items = parseTools(body);
    return items.map((raw: any) => mapTool(raw, server)).filter(Boolean) as McpTool[];
  };

  const steps = [listSdk, listGet, listRpc];
  let last: unknown = null;
  for (const step of steps) {
    try {
      return await step();
    } catch (e) {
      last = e;
    }
  }
  const message = last instanceof Error ? last.message : "Request failed";
  throw new Error(message);
}

const routes = {
  "GET /api/mcp/servers"(params: HandlerParams) {
    return ok(Array.from(servers.values()));
  },

  "POST /api/mcp/servers"(params: HandlerParams) {
    const body = (params as any).body ?? {};
    const name = readString(body.name).trim();
    const url = normalizeServer(readString(body.url));
    const transport = readTransport(body.transport);
    const config = body.config;
    const headers = readHeaders(body.headers);

    if (!name) {
      return fail("Server name is required");
    }
    if (!url) {
      return fail("Server URL is required");
    }
    if (!isHttp(url)) {
      return fail("Server URL must be http/https");
    }
    if (servers.has(url)) {
      return fail("MCP server URL must be unique");
    }

    const server: McpServer = { name, url, transport, config, headers };
    servers.set(url, server);
    return ok(server);
  },

  "PUT /api/mcp/servers"(params: HandlerParams) {
    const body = (params as any).body ?? {};
    const url = normalizeServer(readString(body.url));
    const nextUrl = normalizeServer(readString(body.nextUrl || body.newUrl || body.next_url));
    const name = readString(body.name).trim();
    const transport = readTransport(body.transport);
    const config = body.config;
    const headers = readHeaders(body.headers);

    if (!url) {
      return fail("url is required");
    }
    const existing = servers.get(url);
    if (!existing) {
      return fail("Server not found");
    }

    const finalUrl = nextUrl || url;
    if (!isHttp(finalUrl)) {
      return fail("Server URL must be http/https");
    }
    if (finalUrl !== url && servers.has(finalUrl)) {
      return fail("MCP server URL must be unique");
    }
    const next: McpServer = {
      name: name || existing.name,
      url: finalUrl,
      transport: transport ?? existing.transport,
      config: config ?? existing.config,
      headers: headers ?? existing.headers,
    };
    if (finalUrl !== url) {
      servers.delete(url);
      servers.set(finalUrl, next);
    } else {
      servers.set(url, next);
    }
    return ok(next);
  },

  "DELETE /api/mcp/servers"(params: HandlerParams) {
    const query = (params as any).query ?? {};
    const body = (params as any).body ?? {};
    const url = normalizeUrl(readString(query.url || body.url));
    if (!url) {
      return fail("url is required");
    }
    const existed = servers.delete(url);
    if (!existed) {
      return fail("Server not found");
    }
    return ok({ ok: true });
  },

  "POST /api/mcp/tools"(params: HandlerParams) {
    return (async () => {
      const body = (params as any).body ?? {};
      // Use normalizeServerUrl to ensure consistent key lookup
      const url = normalizeServer(readString(body.url));
      if (!url) {
        return fail("url is required");
      }
      if (!isHttp(url)) {
        return fail("Server URL must be http/https");
      }

      const saved = servers.get(url);
      const headers = readHeaders(body.headers) ?? saved?.headers;
      const config = body.config ?? saved?.config;

      const server: McpServer = {
        name: readString(body.name).trim() || saved?.name || "MCP Server",
        url,
        transport: saved?.transport,
        config,
        headers,
      };

      try {
        const tools = await listTools(server);
        return ok({ tools });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Request failed";
        return fail(message);
      }
    })();
  },

  /**
   * Batch query tools from all configured MCP servers
   * Returns aggregated tools from all servers, with per-server error handling
   */
  "GET /api/mcp/tools/all"(params: HandlerParams) {
    return (async () => {
      const allTools: McpTool[] = [];
      const errors: { url: string; message: string }[] = [];

      const list = Array.from(servers.values());
      const res = await Promise.all(
        list.map(async (server) => {
          try {
            const tools = await listTools(server);
            return { server, tools, err: "" };
          } catch (e) {
            const err = e instanceof Error ? e.message : "Request failed";
            return { server, tools: [] as McpTool[], err };
          }
        })
      );

      for (const item of res) {
        allTools.push(...item.tools);
        if (item.err) {
          errors.push({ url: item.server.url, message: item.err });
        }
      }

      return ok({
        tools: allTools,
        errors: errors.length ? errors : undefined,
        serverCount: servers.size,
      });
    })();
  },
};

export default routes;
