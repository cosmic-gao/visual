import { useCallback, useMemo, useState } from 'react';
import type { McpServer, McpTool } from './types';
import { createToolKey, normalizeUrl } from './export';
import { listTools } from './provider';

type ToolCache = Record<string, McpTool[]>;
type ToolError = Record<string, string | undefined>;
type ToolLoading = Record<string, boolean | undefined>;

export type McpState = ReturnType<typeof useMcpState>;

export type McpLogLevel = 'info' | 'error';
export interface McpLogItem {
    ts: string;
    level: McpLogLevel;
    message: string;
    serverUrl?: string;
}

export function useMcpState(initialServers?: McpServer[]) {
    const [servers, setServers] = useState<McpServer[]>(() => initialServers ?? []);
    const [toolsByUrl, setToolsByUrl] = useState<ToolCache>({});
    const [toolErrorByUrl, setToolErrorByUrl] = useState<ToolError>({});
    const [toolLoadingByUrl, setToolLoadingByUrl] = useState<ToolLoading>({});
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
    const [activeUrl, setActiveUrl] = useState<string | null>(() => {
        const first = (initialServers ?? [])[0]?.url;
        return first ? normalizeUrl(first) : null;
    });
    const [logs, setLogs] = useState<McpLogItem[]>([]);

    const serverUrls = useMemo(() => new Set(servers.map((server) => normalizeUrl(server.url))), [servers]);

    const addServer = useCallback((server: McpServer) => {
        const url = normalizeUrl(server.url);
        if (serverUrls.has(url)) {
            throw new Error('MCP 服务 URL 必须唯一');
        }
        setServers((items) => [...items, { ...server, url }]);
        setActiveUrl((current) => current ?? url);
        setLogs((items) => [
            { ts: new Date().toISOString(), level: 'info', message: `已新增服务：${server.name}`, serverUrl: url },
            ...items,
        ]);
    }, [serverUrls]);

    const updateServer = useCallback((url: string, next: McpServer) => {
        const currentUrl = normalizeUrl(url);
        const nextUrl = normalizeUrl(next.url);
        if (currentUrl !== nextUrl && serverUrls.has(nextUrl)) {
            throw new Error('MCP 服务 URL 必须唯一');
        }

        setServers((items) => items.map((item) => (normalizeUrl(item.url) === currentUrl ? { ...next, url: nextUrl } : item)));
        setActiveUrl((current) => (current === currentUrl ? nextUrl : current));
        setToolsByUrl((cache) => {
            if (currentUrl === nextUrl) return cache;
            const nextCache = { ...cache };
            nextCache[nextUrl] = nextCache[currentUrl] ?? [];
            delete nextCache[currentUrl];
            return nextCache;
        });
        setToolErrorByUrl((errors) => {
            if (currentUrl === nextUrl) return errors;
            const nextErrors = { ...errors };
            nextErrors[nextUrl] = nextErrors[currentUrl];
            delete nextErrors[currentUrl];
            return nextErrors;
        });
        setToolLoadingByUrl((loading) => {
            if (currentUrl === nextUrl) return loading;
            const nextLoading = { ...loading };
            nextLoading[nextUrl] = nextLoading[currentUrl];
            delete nextLoading[currentUrl];
            return nextLoading;
        });
        setSelectedKeys((keys) => {
            if (currentUrl === nextUrl) return keys;
            const nextKeys = new Set<string>();
            for (const key of keys) {
                nextKeys.add(key.startsWith(`${currentUrl}::`) ? `${nextUrl}${key.slice(currentUrl.length)}` : key);
            }
            return nextKeys;
        });
        setLogs((items) => [
            { ts: new Date().toISOString(), level: 'info', message: `已更新服务：${next.name}`, serverUrl: nextUrl },
            ...items,
        ]);
    }, [serverUrls]);

    const removeServer = useCallback((url: string) => {
        const currentUrl = normalizeUrl(url);
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
        setLogs((items) => [
            { ts: new Date().toISOString(), level: 'info', message: '已删除服务', serverUrl: currentUrl },
            ...items,
        ]);
    }, []);

    const fetchTools = useCallback(async (server: McpServer) => {
        const url = normalizeUrl(server.url);
        setToolLoadingByUrl((map) => ({ ...map, [url]: true }));
        setToolErrorByUrl((map) => ({ ...map, [url]: undefined }));
        setLogs((items) => [
            { ts: new Date().toISOString(), level: 'info', message: '正在查询 tools/list', serverUrl: url },
            ...items,
        ]);
        try {
            const tools = await listTools({ ...server, url });
            setToolsByUrl((cache) => ({ ...cache, [url]: tools }));
            setLogs((items) => [
                { ts: new Date().toISOString(), level: 'info', message: `已加载工具：${tools.length}`, serverUrl: url },
                ...items,
            ]);
            return tools;
        } catch (error) {
            const message = error instanceof Error ? error.message : '查询失败';
            setToolErrorByUrl((map) => ({ ...map, [url]: message }));
            setToolsByUrl((cache) => ({ ...cache, [url]: [] }));
            setLogs((items) => [
                { ts: new Date().toISOString(), level: 'error', message: `tools/list 查询失败：${message}`, serverUrl: url },
                ...items,
            ]);
            throw error;
        } finally {
            setToolLoadingByUrl((map) => ({ ...map, [url]: false }));
        }
    }, []);

    const toggleTool = useCallback((tool: Pick<McpTool, 'mcp_server_url' | 'name'>) => {
        const key = createToolKey(tool);
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
                if (selectedKeys.has(createToolKey(tool))) {
                    tools.push(tool);
                }
            }
        }
        return tools;
    }, [servers, selectedKeys, toolsByUrl]);

    return {
        servers,
        toolsByUrl,
        toolErrorByUrl,
        toolLoadingByUrl,
        activeUrl,
        logs,
        selectedKeys,
        selectedTools,
        setActiveUrl,
        addServer,
        updateServer,
        removeServer,
        fetchTools,
        toggleTool,
        clearSelection,
    };
}
