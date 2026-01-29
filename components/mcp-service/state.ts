import { useCallback, useEffect, useMemo, useState } from 'react';
import type { McpServer, McpTool } from './types';
import { createToolKey, normalizeUrl } from './export';
import * as api from './api';

type ToolCache = Record<string, McpTool[]>;
type ToolError = Record<string, string | undefined>;
type ToolLoading = Record<string, boolean | undefined>;

export type McpLogLevel = 'info' | 'error';
export interface McpLogItem {
    ts: string;
    level: McpLogLevel;
    message: string;
    serverUrl?: string;
}

export interface McpController {
    servers: McpServer[];
    activeUrl: string | null;
    toolsByUrl: ToolCache;
    toolErrorByUrl: ToolError;
    toolLoadingByUrl: ToolLoading;
    logs: McpLogItem[];
    selectedKeys: Set<string>;
    selectedTools: McpTool[];
    setActiveUrl: (url: string | null) => void;
    refreshServers: () => Promise<void>;
    addServer: (server: McpServer) => Promise<void>;
    updateServer: (url: string, next: McpServer) => Promise<void>;
    removeServer: (url: string) => Promise<void>;
    fetchTools: (server: McpServer) => Promise<McpTool[]>;
    toggleTool: (tool: Pick<McpTool, 'mcp_server_url' | 'name'>) => void;
    clearSelection: () => void;
}

export function useMcpController(): McpController {
    const [servers, setServers] = useState<McpServer[]>([]);
    const [toolsByUrl, setToolsByUrl] = useState<ToolCache>({});
    const [toolErrorByUrl, setToolErrorByUrl] = useState<ToolError>({});
    const [toolLoadingByUrl, setToolLoadingByUrl] = useState<ToolLoading>({});
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
    const [activeUrl, setActiveUrl] = useState<string | null>(null);
    const [logs, setLogs] = useState<McpLogItem[]>([]);

    const log = useCallback((level: McpLogLevel, message: string, serverUrl?: string) => {
        setLogs((items) => [{ ts: new Date().toISOString(), level, message, serverUrl }, ...items]);
    }, []);

    const refreshServers = useCallback(async () => {
        const list = await api.listServers();
        const normalized = list.map((s) => ({ ...s, url: normalizeUrl(s.url) }));
        setServers(normalized);
        setActiveUrl((current) => current ?? (normalized[0]?.url ?? null));
    }, []);

    useEffect(() => {
        refreshServers().catch((e) => {
            const message = e instanceof Error ? e.message : 'Request failed';
            log('error', `Failed to load servers: ${message}`);
        });
    }, [log, refreshServers]);

    const serverUrls = useMemo(() => new Set(servers.map((server) => normalizeUrl(server.url))), [servers]);

    const addServer = useCallback(
        async (server: McpServer) => {
            const url = normalizeUrl(server.url);
            const name = server.name.trim();
            const payload: McpServer = { ...server, name, url };
            if (serverUrls.has(url)) {
                throw new Error('MCP server URL must be unique');
            }
            const created = await api.createServer(payload);
            const next = { ...created, url: normalizeUrl(created.url) };
            setServers((items) => [...items, next]);
            setActiveUrl(next.url);
            log('info', `Server added: ${next.name}`, next.url);
        },
        [log, serverUrls]
    );

    const updateServer = useCallback(
        async (url: string, next: McpServer) => {
            const currentUrl = normalizeUrl(url);
            const nextUrl = normalizeUrl(next.url);
            if (currentUrl !== nextUrl && serverUrls.has(nextUrl)) {
                throw new Error('MCP server URL must be unique');
            }
            const updated = await api.updateServer({
                url: currentUrl,
                nextUrl,
                name: next.name,
                transport: next.transport,
                apiKey: next.apiKey,
                config: next.config,
                headers: next.headers,
            });
            const normalized = { ...updated, url: normalizeUrl(updated.url) };

            setServers((items) => items.map((s) => (normalizeUrl(s.url) === currentUrl ? normalized : s)));
            setActiveUrl((current) => (current === currentUrl ? normalized.url : current));

            if (currentUrl !== normalized.url) {
                setToolsByUrl((cache) => {
                    const nextCache = { ...cache };
                    nextCache[normalized.url] = nextCache[currentUrl] ?? [];
                    delete nextCache[currentUrl];
                    return nextCache;
                });
                setToolErrorByUrl((errors) => {
                    const nextErrors = { ...errors };
                    nextErrors[normalized.url] = nextErrors[currentUrl];
                    delete nextErrors[currentUrl];
                    return nextErrors;
                });
                setToolLoadingByUrl((loading) => {
                    const nextLoading = { ...loading };
                    nextLoading[normalized.url] = nextLoading[currentUrl];
                    delete nextLoading[currentUrl];
                    return nextLoading;
                });
                setSelectedKeys((keys) => {
                    const nextKeys = new Set<string>();
                    for (const key of keys) {
                        nextKeys.add(key.startsWith(`${currentUrl}::`) ? `${normalized.url}${key.slice(currentUrl.length)}` : key);
                    }
                    return nextKeys;
                });
            }

            log('info', `Server updated: ${normalized.name}`, normalized.url);
        },
        [log, serverUrls]
    );

    const removeServer = useCallback(
        async (url: string) => {
            const currentUrl = normalizeUrl(url);
            await api.deleteServer(currentUrl);
            setServers((items) => {
                const nextServers = items.filter((item) => normalizeUrl(item.url) !== currentUrl);
                setActiveUrl((current) => {
                    if (current !== currentUrl) return current;
                    return nextServers[0]?.url ? normalizeUrl(nextServers[0].url) : null;
                });
                return nextServers;
            });
            setToolsByUrl((cache) => {
                const next = { ...cache };
                delete next[currentUrl];
                return next;
            });
            setToolErrorByUrl((errors) => {
                const next = { ...errors };
                delete next[currentUrl];
                return next;
            });
            setToolLoadingByUrl((loading) => {
                const next = { ...loading };
                delete next[currentUrl];
                return next;
            });
            setSelectedKeys((keys) => {
                const next = new Set(keys);
                for (const key of keys) {
                    if (key.startsWith(`${currentUrl}::`)) {
                        next.delete(key);
                    }
                }
                return next;
            });
            log('info', 'Server deleted', currentUrl);
        },
        [log]
    );

    const fetchTools = useCallback(
        async (server: McpServer) => {
            const url = normalizeUrl(server.url);
            setToolLoadingByUrl((map) => ({ ...map, [url]: true }));
            setToolErrorByUrl((map) => ({ ...map, [url]: undefined }));
            log('info', 'Fetching tools/list', url);
            try {
                const tools = await api.listTools(url, server.name);
                setToolsByUrl((cache) => ({ ...cache, [url]: tools }));
                log('info', `Tools loaded: ${tools.length}`, url);
                return tools;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Request failed';
                setToolErrorByUrl((map) => ({ ...map, [url]: message }));
                setToolsByUrl((cache) => ({ ...cache, [url]: [] }));
                log('error', `tools/list failed: ${message}`, url);
                throw error;
            } finally {
                setToolLoadingByUrl((map) => ({ ...map, [url]: false }));
            }
        },
        [log]
    );

    const toggleTool = useCallback((tool: Pick<McpTool, 'mcp_server_url' | 'name'>) => {
        const key = createToolKey(tool as any);
        setSelectedKeys((keys) => {
            const next = new Set(keys);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedKeys(new Set());
    }, []);

    const selectedTools = useMemo(() => {
        const tools: McpTool[] = [];
        for (const server of servers) {
            const url = normalizeUrl(server.url);
            const list = toolsByUrl[url] ?? [];
            for (const tool of list) {
                if (selectedKeys.has(createToolKey(tool as any))) {
                    tools.push(tool);
                }
            }
        }
        return tools;
    }, [servers, selectedKeys, toolsByUrl]);

    return {
        servers,
        activeUrl,
        toolsByUrl,
        toolErrorByUrl,
        toolLoadingByUrl,
        logs,
        selectedKeys,
        selectedTools,
        setActiveUrl,
        refreshServers,
        addServer,
        updateServer,
        removeServer,
        fetchTools,
        toggleTool,
        clearSelection,
    };
}
