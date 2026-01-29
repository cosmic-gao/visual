export interface McpServer {
    name: string;
    url: string;
    transport?: 'streamable-http' | 'sse';
    /** API key for authentication (sent as Bearer token) */
    apiKey?: string;
}

export interface McpTool {
    name: string;
    display_name: string;
    mcp_server_name: string;
    mcp_server_url: string;
    description?: string;
    input_schema?: unknown;
}

export interface McpConfig {
    tools: Pick<McpTool, 'name' | 'display_name' | 'mcp_server_name' | 'mcp_server_url'>[];
    interrupt_config: Record<string, boolean>;
}
