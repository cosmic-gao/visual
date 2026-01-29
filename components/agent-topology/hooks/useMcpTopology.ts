/**
 * MCP Topology Integration Hook
 * 
 * Automatically syncs MCP Controller state to topology configuration.
 * Provides a bridge between mcp-service state and agent-topology visualization.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ToolboxNodeData, ToolItem } from '../types';
import type { McpTool, McpServer } from '../../mcp-service/types';
import { adaptMcpToolsToTopology } from '../adapters/mcp-adapter';
import * as api from '../../mcp-service/api';

/**
 * Options for useMcpTopology hook
 */
export interface UseMcpTopologyOptions {
    /** Initial MCP servers to fetch tools from */
    servers?: McpServer[];
    /** Auto-refresh tools on mount (default: true) */
    autoRefresh?: boolean;
    /** Auto-refresh interval in milliseconds (default: disabled) */
    refreshInterval?: number;
    /** Maximum tools to display per node */
    maxToolsPerNode?: number;
}

/**
 * Return type for useMcpTopology hook
 */
export interface UseMcpTopologyResult {
    /** ToolboxNodeData ready to use in topology */
    toolboxData: ToolboxNodeData;
    /** All fetched MCP tools */
    tools: ToolItem[];
    /** Loading state */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Number of connected servers */
    serverCount: number;
    /** Manually refresh tools */
    refresh: () => Promise<void>;
}

/**
 * Hook to integrate MCP tools with Agent Topology
 * 
 * @example
 * ```tsx
 * function MyTopology() {
 *   const { toolboxData, isLoading, refresh } = useMcpTopology({
 *     autoRefresh: true,
 *   });
 *   
 *   const config = useMemo(() => ({
 *     nodes: [
 *       { id: 'toolbox', type: 'TOOLBOX', data: toolboxData, position: { x: 0, y: 0 } },
 *     ],
 *     edges: [],
 *   }), [toolboxData]);
 *   
 *   return <AgentTopology config={config} />;
 * }
 * ```
 */
export function useMcpTopology(options?: UseMcpTopologyOptions): UseMcpTopologyResult {
    const {
        autoRefresh = true,
        refreshInterval,
        maxToolsPerNode,
    } = options ?? {};

    const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [serverCount, setServerCount] = useState(0);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await api.listAllTools();
            setMcpTools(result.tools);
            setServerCount(result.serverCount);

            if (result.errors && result.errors.length > 0) {
                const errorMessages = result.errors.map(e => e.message).join(', ');
                setError(`Some servers failed: ${errorMessages}`);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to fetch tools';
            setError(message);
            setMcpTools([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Auto-refresh on mount
    useEffect(() => {
        if (autoRefresh) {
            refresh();
        }
    }, [autoRefresh, refresh]);

    // Optional interval refresh
    useEffect(() => {
        if (!refreshInterval || refreshInterval <= 0) return;

        const intervalId = setInterval(refresh, refreshInterval);
        return () => clearInterval(intervalId);
    }, [refreshInterval, refresh]);

    // Adapt MCP tools to ToolItem format
    const tools = useMemo(() => {
        return adaptMcpToolsToTopology(mcpTools, { maxToolsPerNode });
    }, [mcpTools, maxToolsPerNode]);

    // Create ToolboxNodeData
    const toolboxData = useMemo((): ToolboxNodeData => {
        const serverUrls = [...new Set(mcpTools.map(t => t.mcp_server_url))];
        return {
            label: 'TOOLBOX',
            tools,
            mcpEnabled: true,
            isLoading,
            error: error ?? undefined,
            mcpServers: serverUrls,
        };
    }, [tools, isLoading, error, mcpTools]);

    return {
        toolboxData,
        tools,
        isLoading,
        error,
        serverCount,
        refresh,
    };
}
