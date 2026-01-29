import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Boxes, Check, Copy, Database, Download, Loader2, RefreshCw, Search, X } from 'lucide-react';
import type { McpConfig, McpTool } from './types';
import { createConfig, createToolKey, normalizeUrl } from './export';
import type { McpController } from './state';

interface ToolDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    controller: McpController;
    onAdd: (tools: McpTool[], config: McpConfig) => void;
}

function downloadJson(name: string, data: unknown) {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
}

export function ToolDialog({ open, onOpenChange, controller, onAdd }: ToolDialogProps) {
    const [tab, setTab] = useState<'tools' | 'export' | 'notifications'>('tools');
    const [message, setMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [focusedKey, setFocusedKey] = useState<string | null>(null);

    const config = useMemo(() => {
        try {
            return createConfig(controller.selectedTools);
        } catch {
            return null;
        }
    }, [controller.selectedTools]);

    const activeUrl = controller.activeUrl ? normalizeUrl(controller.activeUrl) : '';
    const activeServer = useMemo(() => {
        if (!activeUrl) return null;
        return controller.servers.find((s) => normalizeUrl(s.url) === activeUrl) ?? null;
    }, [activeUrl, controller.servers]);
    const activeTools = activeUrl ? controller.toolsByUrl[activeUrl] ?? [] : [];
    const activeLoading = activeUrl ? controller.toolLoadingByUrl[activeUrl] : false;
    const activeError = activeUrl ? controller.toolErrorByUrl[activeUrl] : undefined;

    const close = () => {
        setMessage(null);
        setTab('tools');
        onOpenChange(false);
    };

    const tabClass = (value: typeof tab) =>
        `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            tab === value ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
        }`;

    const copy = async () => {
        if (!config) {
            setMessage('Select tools first');
            return;
        }
        try {
            await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
            setMessage('Copied');
        } catch {
            setMessage('Copy failed');
        }
    };

    const copyText = async (text: string, okMessage: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setMessage(okMessage);
        } catch {
            setMessage('Copy failed');
        }
    };

    const download = () => {
        if (!config) {
            setMessage('Select tools first');
            return;
        }
        downloadJson('mcp-config.json', config);
        setMessage('Downloaded');
    };

    const add = () => {
        if (!config) {
            setMessage('Select tools first');
            return;
        }
        onAdd(controller.selectedTools, config);
        setMessage('Added to Toolbox');
    };

    const refresh = async () => {
        if (!activeServer) {
            setMessage('Select a server first');
            return;
        }
        try {
            await controller.fetchTools(activeServer);
        } catch {
            setTab('notifications');
        }
    };

    const filteredTools = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return activeTools;
        return activeTools.filter((tool) => {
            const a = (tool.display_name || '').toLowerCase();
            const b = (tool.name || '').toLowerCase();
            return a.includes(query) || b.includes(query);
        });
    }, [activeTools, search]);

    const focusedTool = useMemo(() => {
        if (!focusedKey) return null;
        return activeTools.find((tool) => createToolKey(tool) === focusedKey) ?? null;
    }, [activeTools, focusedKey]);

    useEffect(() => {
        if (!activeTools.length) {
            setFocusedKey(null);
            return;
        }
        const has = focusedKey ? activeTools.some((tool) => createToolKey(tool) === focusedKey) : false;
        if (!has) {
            setFocusedKey(createToolKey(activeTools[0]));
        }
    }, [activeTools, focusedKey]);

    const safeSchema = useMemo(() => {
        if (!focusedTool?.input_schema) return null;
        try {
            return JSON.stringify(focusedTool.input_schema, null, 2);
        } catch {
            return null;
        }
    }, [focusedTool]);

    const safeToolJson = useMemo(() => {
        if (!focusedTool) return null;
        const toolView = {
            name: focusedTool.name,
            display_name: focusedTool.display_name || focusedTool.name,
            description: focusedTool.description,
            mcp_server_name: focusedTool.mcp_server_name,
            mcp_server_url: focusedTool.mcp_server_url,
            input_schema: focusedTool.input_schema,
        };
        try {
            return JSON.stringify(toolView, null, 2);
        } catch {
            return null;
        }
    }, [focusedTool]);

    if (!open) {
        return null;
    }

    const view = (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={close} />
            <div
                className="absolute left-1/2 top-1/2 w-[1120px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                            <Boxes className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-900">Tools</div>
                            <div className="mt-0.5 text-xs text-slate-500">Inspired by MCP Inspector: select tools and export config</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" className={tabClass('tools')} onClick={() => setTab('tools')}>
                            <Boxes className="h-4 w-4" />
                            Tools
                        </button>
                        <button type="button" className={tabClass('export')} onClick={() => setTab('export')}>
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                        <button type="button" className={tabClass('notifications')} onClick={() => setTab('notifications')}>
                            <Database className="h-4 w-4" />
                            Notifications
                        </button>
                        <button
                            type="button"
                            className="ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            onClick={close}
                            title="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    {tab === 'tools' ? (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
                            <div className="rounded-xl border border-slate-200 bg-white">
                                <div className="border-b border-slate-200 px-4 py-3">
                                    <div className="text-xs font-semibold text-slate-600">Servers</div>
                                </div>
                                <div className="max-h-[520px] overflow-auto p-2">
                                    {controller.servers.length === 0 ? (
                                        <div className="p-6 text-center text-sm text-slate-400">Configure MCP servers first</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {controller.servers.map((server) => {
                                                const url = normalizeUrl(server.url);
                                                const selected = url === activeUrl;
                                                const count = (controller.toolsByUrl[url] ?? []).length;
                                                const loading = controller.toolLoadingByUrl[url];
                                                const err = controller.toolErrorByUrl[url];
                                                return (
                                                    <button
                                                        key={url}
                                                        type="button"
                                                        className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                                                            selected
                                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                                        }`}
                                                        onClick={() => controller.setActiveUrl(url)}
                                                    >
                                                        <div className="truncate text-sm font-semibold">{server.name}</div>
                                                        <div className={`truncate text-xs ${selected ? 'text-slate-200' : 'text-slate-500'}`}>{url}</div>
                                                        <div className={`mt-2 text-xs ${selected ? 'text-slate-200' : 'text-slate-500'}`}>
                                                            {loading ? 'Loading…' : err ? 'Error' : `${count} tools`}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white">
                                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Boxes className="h-4 w-4 text-slate-500" />
                                        <div className="text-xs font-semibold text-slate-600">Tools</div>
                                    </div>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                        onClick={refresh}
                                    >
                                        {activeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                        Refresh
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_360px]">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                                            <Search className="h-4 w-4 text-slate-400" />
                                            <input
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="w-full bg-transparent text-sm text-slate-800 outline-none"
                                                placeholder="Search tools…"
                                            />
                                        </div>

                                        {!activeServer ? (
                                            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                                                Select a server
                                            </div>
                                        ) : activeError ? (
                                            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                                {activeError}
                                            </div>
                                        ) : activeTools.length === 0 ? (
                                            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                                                No tools (click Refresh)
                                            </div>
                                        ) : (
                                            <div className="mt-3 space-y-2 max-h-[430px] overflow-auto pr-1">
                                                {filteredTools.map((tool) => {
                                                    const key = createToolKey(tool);
                                                    const checked = controller.selectedKeys.has(key);
                                                    const focused = key === focusedKey;
                                                    return (
                                                        <div
                                                            key={key}
                                                            className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                                                                focused ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                                                            }`}
                                                            onClick={() => setFocusedKey(key)}
                                                        >
                                                            <button type="button" className="min-w-0 flex-1 text-left">
                                                                <div className="truncate text-sm font-medium text-slate-800">{tool.display_name || tool.name}</div>
                                                                <div className="truncate text-xs text-slate-500">{tool.name}</div>
                                                            </button>
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => controller.toggleTool(tool)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="h-4 w-4 accent-slate-900"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-semibold text-slate-600">Tool details</div>
                                            {focusedTool ? (
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                    onClick={() => {
                                                        if (!safeToolJson) return;
                                                        copyText(safeToolJson, 'Details copied');
                                                    }}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                    Copy
                                                </button>
                                            ) : null}
                                        </div>
                                        {!focusedTool ? (
                                            <div className="mt-2 text-sm text-slate-500">Select a tool to view details</div>
                                        ) : (
                                            <div className="mt-3 space-y-2 text-sm max-h-[520px] overflow-auto pr-1">
                                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                    <div className="text-xs text-slate-500">Display name</div>
                                                    <div className="truncate font-medium text-slate-800">{focusedTool.display_name || focusedTool.name}</div>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                    <div className="text-xs text-slate-500">Name</div>
                                                    <div className="truncate font-medium text-slate-800">{focusedTool.name}</div>
                                                </div>
                                                {focusedTool.description ? (
                                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                        <div className="text-xs text-slate-500">Description</div>
                                                        <div className="text-sm text-slate-700 whitespace-pre-wrap">{focusedTool.description}</div>
                                                    </div>
                                                ) : null}
                                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                    <div className="text-xs text-slate-500">Server</div>
                                                    <div className="truncate font-medium text-slate-800">{focusedTool.mcp_server_name}</div>
                                                    <div className="truncate text-xs text-slate-500">{focusedTool.mcp_server_url}</div>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-xs text-slate-500">Input schema</div>
                                                        {safeSchema ? (
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                                onClick={() => copyText(safeSchema, 'Schema copied')}
                                                            >
                                                                <Copy className="h-3.5 w-3.5" />
                                                                Copy
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                    <pre className="mt-2 max-h-[220px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs leading-5 text-slate-700">
                                                        {safeSchema ?? '{ }'}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                                    <div className="text-sm font-medium text-slate-800">Selected: {controller.selectedTools.length}</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                            onClick={() => setTab('export')}
                                        >
                                            Next: Export
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={add}
                                            disabled={!config}
                                        >
                                            <Check className="h-4 w-4" />
                                            Add to Toolbox
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {tab === 'export' ? (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
                            <div className="rounded-xl border border-slate-200 bg-white">
                                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                                    <div className="text-xs font-semibold text-slate-600">MCP JSON</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                            onClick={copy}
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            Copy
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                            onClick={download}
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            Download
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <pre className="max-h-[520px] overflow-auto text-xs leading-5 text-slate-700">
                                            {config ? JSON.stringify(config, null, 2) : 'Select tools to generate JSON'}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="text-xs font-semibold text-slate-600">Actions</div>
                                <div className="mt-3 space-y-2">
                                    <button
                                        type="button"
                                        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={add}
                                        disabled={!config}
                                    >
                                        Add to Toolbox
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                        onClick={() => setTab('tools')}
                                    >
                                        Back to Tools
                                    </button>
                                </div>
                                {message ? (
                                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                        {message}
                                    </div>
                                ) : null}
                                {!config ? (
                                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            Select at least one tool
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    {tab === 'notifications' ? (
                        <div className="rounded-xl border border-slate-200 bg-white">
                            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                                <Database className="h-4 w-4 text-slate-500" />
                                <div className="text-xs font-semibold text-slate-600">Notifications</div>
                            </div>
                            <div className="max-h-[560px] overflow-auto p-3">
                                {controller.logs.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-slate-400">No notifications</div>
                                ) : (
                                    <div className="space-y-2">
                                        {controller.logs.map((item, idx) => (
                                            <div
                                                key={`${item.ts}-${idx}`}
                                                className={`rounded-lg border px-3 py-2 text-sm ${
                                                    item.level === 'error'
                                                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                        : 'border-slate-200 bg-white text-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="truncate font-medium">{item.message}</div>
                                                    <div className="shrink-0 text-xs text-slate-400">{new Date(item.ts).toLocaleTimeString()}</div>
                                                </div>
                                                {item.serverUrl ? <div className="mt-1 truncate text-xs text-slate-400">{item.serverUrl}</div> : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return view;
    }

    return createPortal(view, document.body);
}
