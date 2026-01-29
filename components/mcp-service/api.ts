import type { McpServer, McpTool } from "./types";
import { $fetch } from "@mspbots/fetch";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; message: string };
type ApiRes<T> = ApiOk<T> | ApiFail;

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await $fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers ?? {}),
        },
    });

    const body = (await response.json().catch(() => null)) as ApiRes<T> | null;
    if (!body) {
        throw new Error("Empty response");
    }
    if (body.ok === false) {
        throw new Error(body.message || "Request failed");
    }
    return body.data;
}

export async function listServers(): Promise<McpServer[]> {
    return request<McpServer[]>("/api/mcp/servers");
}

export async function createServer(server: McpServer): Promise<McpServer> {
    return request<McpServer>("/api/mcp/servers", {
        method: "POST",
        body: JSON.stringify(server),
    });
}

export async function updateServer(
    payload: {
        url: string;
        nextUrl?: string;
        name?: string;
        transport?: McpServer["transport"];
        headers?: McpServer["headers"];
        config?: McpServer["config"];
    },
): Promise<McpServer> {
    return request<McpServer>("/api/mcp/servers", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export async function deleteServer(url: string): Promise<{ ok: boolean }> {
    const encoded = encodeURIComponent(url);
    return request<{ ok: boolean }>(`/api/mcp/servers?url=${encoded}`, {
        method: "DELETE",
    });
}

export async function listTools(
    server: Pick<McpServer, "url" | "name" | "headers" | "config">,
): Promise<McpTool[]> {
    const result = await request<{ tools: McpTool[] }>(
        "/api/mcp/tools",
        {
            method: "POST",
            body: JSON.stringify({
                url: server.url,
                name: server.name,
                headers: server.headers,
                config: server.config,
            }),
        }
    );
    return result.tools ?? [];
}

/**
 * Batch query tools from all configured MCP servers
 */
export interface ListAllToolsResult {
    tools: McpTool[];
    errors?: { url: string; message: string }[];
    serverCount: number;
}

export async function listAllTools(): Promise<ListAllToolsResult> {
    return request<ListAllToolsResult>("/api/mcp/tools/all");
}
