import type { McpServer, McpTool } from "./types";
import { $fetch } from "@mspbots/fetch";

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await $fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers ?? {}),
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = (errorData as any)?.message ||
            `HTTP error! status: ${response.status}`;
        throw new Error(message);
    }

    return (await response.json()) as T;
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
        apiKey?: string;
        config?: unknown;
        headers?: Record<string, string>;
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
    url: string,
    name?: string,
): Promise<McpTool[]> {
    const encodedUrl = encodeURIComponent(url);
    const encodedName = name ? `&name=${encodeURIComponent(name)}` : "";
    const result = await request<{ tools: McpTool[] }>(
        `/api/mcp/tools?url=${encodedUrl}${encodedName}`,
    );
    return result.tools ?? [];
}
