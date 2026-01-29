export interface McpServer {
    name: string;
    url: string;
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
    tools: McpTool[];
    interrupt_config: Record<string, boolean>;
}
