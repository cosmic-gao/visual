import type { McpConfig, McpTool } from './types';

export function createConfig(tools: McpTool[]): McpConfig {
    const normalizedTools = tools.map((tool) => ({
        name: tool.name,
        display_name: tool.display_name || tool.name,
        mcp_server_name: tool.mcp_server_name,
        mcp_server_url: normalizeUrl(tool.mcp_server_url),
    }));

    const interrupt_config: Record<string, boolean> = {};
    for (const tool of normalizedTools) {
        if (!tool.name) {
            throw new Error('tool.name is required');
        }
        if (!tool.mcp_server_url) {
            throw new Error('tool.mcp_server_url is required');
        }
        const key = `${tool.mcp_server_url}::${tool.name}::${tool.mcp_server_name}`;
        interrupt_config[key] = true;
    }

    return {
        tools: normalizedTools,
        interrupt_config,
    };
}

export function normalizeUrl(url: string): string {
    if (!url) {
        return '';
    }

    return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function createToolKey(tool: Pick<McpTool, 'mcp_server_url' | 'name'>): string {
    if (!tool.mcp_server_url) {
        throw new Error('tool.mcp_server_url is required');
    }
    if (!tool.name) {
        throw new Error('tool.name is required');
    }
    const url = normalizeUrl(tool.mcp_server_url);
    return `${url}::${tool.name}`;
}
