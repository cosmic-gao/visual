/**
 * MCP Adapter Module
 * 
 * Provides utilities for integrating MCP tools with Agent Topology visualization.
 */

export type {
    McpTool,
    McpServer,
    McpToolItem,
    McpToolAdapterOptions,
    McpToolboxNodeData,
} from './types';

export {
    adaptMcpTool,
    adaptMcpToolsToTopology,
    groupToolsByServer,
    createToolboxFromMcp,
    mergeWithMcpTools,
} from './mcp-adapter';
