/**
 * MCP Tool Adapter
 * 
 * Converts MCP tool data to TOOLBOX node data format for topology visualization.
 */

import type { ToolItem } from '../types';
import type {
    McpTool,
    McpToolItem,
    McpToolAdapterOptions,
    McpToolboxNodeData,
} from './types';

/**
 * Generate a unique ID for a tool
 */
function createToolId(tool: McpTool): string {
    return `${tool.mcp_server_url}::${tool.name}`;
}

/**
 * Determine tool status based on MCP data
 */
function determineToolStatus(tool: McpTool): ToolItem['status'] {
    // All MCP tools are considered active by default
    return 'active';
}

/**
 * Get an appropriate icon for the tool based on its name or description
 */
function getToolIcon(tool: McpTool): string | undefined {
    const name = tool.name.toLowerCase();

    // Common tool type icons
    if (name.includes('search') || name.includes('find')) return '🔍';
    if (name.includes('read') || name.includes('get')) return '📖';
    if (name.includes('write') || name.includes('create') || name.includes('add')) return '✏️';
    if (name.includes('delete') || name.includes('remove')) return '🗑️';
    if (name.includes('file') || name.includes('document')) return '📄';
    if (name.includes('database') || name.includes('sql')) return '🗃️';
    if (name.includes('api') || name.includes('http') || name.includes('request')) return '🌐';
    if (name.includes('email') || name.includes('mail')) return '📧';
    if (name.includes('image') || name.includes('photo')) return '🖼️';
    if (name.includes('code') || name.includes('script')) return '💻';
    if (name.includes('browser') || name.includes('web')) return '🌍';
    if (name.includes('navigate') || name.includes('click')) return '🖱️';
    if (name.includes('screenshot')) return '📸';

    // Default icon
    return '🔧';
}

/**
 * Adapt a single MCP tool to ToolItem format
 */
export function adaptMcpTool(tool: McpTool): McpToolItem {
    return {
        id: createToolId(tool),
        name: tool.display_name || tool.name,
        icon: getToolIcon(tool),
        status: determineToolStatus(tool),
        source: tool.mcp_server_name,
        mcp_server_name: tool.mcp_server_name,
        mcp_server_url: tool.mcp_server_url,
        description: tool.description,
        input_schema: tool.input_schema,
    };
}

/**
 * Adapt multiple MCP tools to ToolItem array
 */
export function adaptMcpToolsToTopology(
    tools: McpTool[],
    options?: McpToolAdapterOptions
): McpToolItem[] {
    const { maxToolsPerNode } = options ?? {};

    let adapted = tools.map(adaptMcpTool);

    // Apply max tools limit if specified
    if (maxToolsPerNode && adapted.length > maxToolsPerNode) {
        adapted = adapted.slice(0, maxToolsPerNode);
    }

    return adapted;
}

/**
 * Group tools by MCP server
 */
export function groupToolsByServer(
    tools: McpToolItem[]
): Record<string, McpToolItem[]> {
    const groups: Record<string, McpToolItem[]> = {};

    for (const tool of tools) {
        const serverName = tool.mcp_server_name ?? 'Unknown Server';
        if (!groups[serverName]) {
            groups[serverName] = [];
        }
        groups[serverName].push(tool);
    }

    return groups;
}

/**
 * Create ToolboxNodeData from MCP tools
 */
export function createToolboxFromMcp(
    tools: McpTool[],
    options?: McpToolAdapterOptions & {
        isLoading?: boolean;
        error?: string;
    }
): McpToolboxNodeData {
    const adaptedTools = adaptMcpToolsToTopology(tools, options);
    const serverUrls = [...new Set(tools.map(t => t.mcp_server_url))];

    return {
        label: 'TOOLBOX',
        tools: adaptedTools,
        mcpEnabled: true,
        isLoading: options?.isLoading ?? false,
        error: options?.error,
        mcpServers: serverUrls,
    };
}

/**
 * Merge existing tools with MCP tools
 */
export function mergeWithMcpTools(
    existingTools: ToolItem[],
    mcpTools: McpTool[],
    options?: McpToolAdapterOptions
): McpToolItem[] {
    const adaptedMcpTools = adaptMcpToolsToTopology(mcpTools, options);

    // Convert existing tools to McpToolItem format
    const existingAsMcp: McpToolItem[] = existingTools.map(tool => ({
        ...tool,
        mcp_server_name: undefined,
        mcp_server_url: undefined,
    }));

    // Merge, avoiding duplicates by ID
    const toolMap = new Map<string, McpToolItem>();

    for (const tool of existingAsMcp) {
        toolMap.set(tool.id, tool);
    }

    for (const tool of adaptedMcpTools) {
        toolMap.set(tool.id, tool);
    }

    return Array.from(toolMap.values());
}
