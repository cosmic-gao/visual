/**
 * MCP Adapter Types
 * 
 * Extended type definitions for MCP tool integration with topology visualization.
 */

import type { ToolItem, ToolboxNodeData } from '../types';

/**
 * Extended ToolItem with MCP metadata
 */
export interface McpToolItem extends ToolItem {
    /** MCP server display name */
    mcp_server_name?: string;
    /** MCP server URL */
    mcp_server_url?: string;
    /** Tool description from MCP */
    description?: string;
    /** JSON Schema for tool input parameters */
    input_schema?: unknown;
}

/**
 * MCP Tool from backend API response
 */
export interface McpTool {
    name: string;
    display_name: string;
    mcp_server_name: string;
    mcp_server_url: string;
    description?: string;
    input_schema?: unknown;
}

/**
 * MCP Server configuration
 */
export interface McpServer {
    name: string;
    url: string;
    transport?: 'streamable-http' | 'sse';
    apiKey?: string;
    config?: unknown;
    headers?: Record<string, string>;
}

/**
 * Options for MCP tool adaptation
 */
export interface McpToolAdapterOptions {
    /** Group tools by server (default: false) */
    groupByServer?: boolean;
    /** Show server name badge on tools (default: true) */
    showServerBadge?: boolean;
    /** Maximum tools per node before truncation */
    maxToolsPerNode?: number;
}

/**
 * Extended ToolboxNodeData with MCP support
 */
export interface McpToolboxNodeData extends ToolboxNodeData {
    /** List of tools including MCP tools */
    tools: McpToolItem[];
    /** Whether MCP integration is enabled */
    mcpEnabled?: boolean;
    /** Loading state */
    isLoading?: boolean;
    /** Error message if any */
    error?: string;
    /** List of connected MCP server URLs */
    mcpServers?: string[];
}
