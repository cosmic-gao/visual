import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Boxes, Cable, CheckCircle2, Database, FileText, Loader2, Plus, RefreshCw, Terminal, Trash2, X } from 'lucide-react';
import type { McpServer } from './types';
import { normalizeUrl } from './export';
import type { McpController } from './state';

interface McpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    controller: McpController;
}

type HeaderRow = { key: string; value: string };

function readRows(headers?: Record<string, string>): HeaderRow[] {
    const rows = Object.entries(headers ?? {}).map(([key, value]) => ({ key, value }));
    if (rows.length) {
        return rows;
    }
    return [{ key: 'Authorization', value: 'Bearer ' }];
}

function readHeaders(rows: HeaderRow[]) {
    const headers: Record<string, string> = {};
    for (const row of rows) {
        const key = row.key.trim();
        const value = row.value.trim();
        if (!key || !value) continue;
        headers[key] = value;
    }
    return Object.keys(headers).length ? headers : undefined;
}

export function McpDialog({ open, onOpenChange, controller }: McpDialogProps) {
    const [tab, setTab] = useState<'connection' | 'tools' | 'resources' | 'prompts' | 'notifications'>('connection');
    const [nameText, setNameText] = useState('');
    const [urlText, setUrlText] = useState('');
    const [headRows, setHeadRows] = useState<HeaderRow[]>(() => readRows());
    const [confText, setConfText] = useState('');
    const [transport, setTransport] = useState<'streamable-http' | 'sse'>('streamable-http');
    const [error, setError] = useState<string | null>(null);

    const activeUrl = controller.activeUrl ? normalizeUrl(controller.activeUrl) : '';
    const activeServer = useMemo(() => {
        if (!activeUrl) return null;
        return controller.servers.find((server) => normalizeUrl(server.url) === activeUrl) ?? null;
    }, [activeUrl, controller.servers]);
    const activeTools = activeUrl ? controller.toolsByUrl[activeUrl] ?? [] : [];
    const activeLoading = activeUrl ? controller.toolLoadingByUrl[activeUrl] : false;
    const activeError = activeUrl ? controller.toolErrorByUrl[activeUrl] : undefined;

    if (!open) {
        return null;
    }

    const close = () => {
        setTab('connection');
        setNameText('');
        setUrlText('');
        setHeadRows(readRows());
        setConfText('');
        setTransport('streamable-http');
        setError(null);
        onOpenChange(false);
    };

    const selectServer = (server: McpServer) => {
        const nextUrl = normalizeUrl(server.url);
        controller.setActiveUrl(nextUrl);
        setNameText(server.name);
        setUrlText(server.url);
        setHeadRows(readRows(server.headers));
        setConfText(server.config !== undefined ? JSON.stringify(server.config, null, 2) : '');
        setTransport(server.transport ?? 'streamable-http');
        setError(null);
    };

    const newServer = () => {
        controller.setActiveUrl(null);
        setNameText('Playwright MCP');
        setUrlText('https://server.smithery.ai/@enriquedlh97/playwright-mcp');
        setHeadRows(readRows());
        setConfText('');
        setTransport('streamable-http');
        setError(null);
    };

    const save = async () => {
        setError(null);

        let config: unknown = undefined;
        const conf = confText.trim();
        if (conf) {
            try {
                config = JSON.parse(conf);
            } catch {
                setError('Config must be valid JSON');
                return;
            }
        }

        const next: McpServer = {
            name: nameText.trim(),
            url: urlText.trim(),
            transport,
            headers: readHeaders(headRows),
            config,
        };
        if (!next.name) {
            setError('Server name is required');
            return;
        }
        if (!next.url) {
            setError('Server URL is required');
            return;
        }

        try {
            if (activeServer) {
                await controller.updateServer(activeServer.url, next);
            } else {
                await controller.addServer(next);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Save failed';
            setError(message);
        }
    };

    const removeActive = async () => {
        if (!activeServer) return;
        setError(null);
        try {
            await controller.removeServer(activeServer.url);
            setNameText('');
            setUrlText('');
            setHeadRows(readRows());
            setConfText('');
            setTransport('streamable-http');
            setTab('connection');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Delete failed';
            setError(message);
        }
    };

    const refreshTools = async () => {
        setError(null);
        if (!activeServer) {
            setError('Select a server first');
            return;
        }
        try {
            await controller.fetchTools(activeServer);
            setTab('tools');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Request failed';
            setError(message);
            setTab('notifications');
        }
    };

    const tabClass = (value: typeof tab) =>
        `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === value ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
        }`;

    const connectView = (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div className="text-xs font-semibold text-slate-600">Servers</div>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        onClick={newServer}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                    </button>
                </div>
                <div className="max-h-[520px] overflow-auto p-2">
                    {controller.servers.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400">No servers</div>
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
                                        className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${selected
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                            }`}
                                        onClick={() => selectServer(server)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold">{server.name}</div>
                                                <div className={`truncate text-xs ${selected ? 'text-slate-200' : 'text-slate-500'}`}>{url}</div>
                                                <div className={`mt-2 text-xs ${selected ? 'text-slate-200' : 'text-slate-500'}`}>
                                                    {loading ? 'Loading…' : err ? 'Error' : `${count} tools`}
                                                </div>
                                            </div>
                                            {loading ? (
                                                <Loader2 className={`h-4 w-4 ${selected ? 'text-slate-200' : 'text-slate-400'} animate-spin`} />
                                            ) : err ? (
                                                <AlertCircle className={`h-4 w-4 ${selected ? 'text-slate-200' : 'text-rose-500'}`} />
                                            ) : (
                                                <CheckCircle2 className={`h-4 w-4 ${selected ? 'text-slate-200' : 'text-emerald-500'}`} />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                    <div className="text-xs font-semibold text-slate-600">Server connection</div>
                    <div className="mt-1 text-xs text-slate-500">Inspired by MCP Inspector: configure connection and inspect Tools/Resources/Prompts</div>
                </div>
                <div className="space-y-4 p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <div className="text-xs font-medium text-slate-600">Transport</div>
                            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                                <Cable className="h-4 w-4 text-slate-400" />
                                <select
                                    value={transport}
                                    onChange={(e) => setTransport(e.target.value as any)}
                                    className="w-full bg-transparent text-sm text-slate-800 outline-none"
                                >
                                    <option value="streamable-http">Streamable HTTP</option>
                                    <option value="sse">SSE</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-slate-600">Server name</div>
                            <input
                                value={nameText}
                                onChange={(e) => setNameText(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                                placeholder="Playwright MCP"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-medium text-slate-600">Server URL</div>
                        <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                            <Terminal className="h-4 w-4 text-slate-400" />
                            <input
                                value={urlText}
                                onChange={(e) => setUrlText(e.target.value)}
                                className="w-full bg-transparent text-sm text-slate-800 outline-none"
                                placeholder="https://server.smithery.ai/@enriquedlh97/playwright-mcp"
                            />
                        </div>
                        <div className="mt-1 text-xs text-slate-400">Enter MCP server URL (Smithery, remote, or local)</div>
                    </div>

                    <div>
                        <div className="text-xs font-medium text-slate-600">Headers (optional)</div>
                        <div className="mt-2 space-y-2">
                            {headRows.map((row, idx) => (
                                <div key={`${idx}-${row.key}`} className="flex items-center gap-2">
                                    <input
                                        value={row.key}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setHeadRows((list) => list.map((item, i) => (i === idx ? { ...item, key: value } : item)));
                                        }}
                                        className="w-[220px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                                        placeholder="Authorization"
                                    />
                                    <input
                                        value={row.value}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setHeadRows((list) => list.map((item, i) => (i === idx ? { ...item, value } : item)));
                                        }}
                                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                                        placeholder="Bearer <token>"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                        onClick={() => setHeadRows((list) => list.filter((_, i) => i !== idx))}
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setHeadRows((list) => [...list, { key: '', value: '' }])}
                            >
                                Add header
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-medium text-slate-600">Config (optional)</div>
                        <textarea
                            value={confText}
                            onChange={(e) => setConfText(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-blue-400"
                            placeholder="{ }"
                            rows={6}
                        />
                        <div className="mt-1 text-xs text-slate-400">JSON only. Empty means no config.</div>
                    </div>

                    {error ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                            {error}
                        </div>
                    ) : null}

                    {activeError ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                            {activeError}
                        </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                        {activeServer ? (
                            <button
                                type="button"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={removeActive}
                            >
                                Delete
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            onClick={close}
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                            onClick={save}
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                            onClick={refreshTools}
                        >
                            {activeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Fetch tools
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const toolsView = (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                    <div className="text-xs font-semibold text-slate-600">Servers</div>
                </div>
                <div className="max-h-[520px] overflow-auto p-2">
                    {controller.servers.map((server) => {
                        const url = normalizeUrl(server.url);
                        const selected = url === activeUrl;
                        return (
                            <button
                                key={url}
                                type="button"
                                className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                onClick={() => selectServer(server)}
                            >
                                <div className="truncate text-sm font-semibold">{server.name}</div>
                                <div className={`truncate text-xs ${selected ? 'text-slate-200' : 'text-slate-500'}`}>{url}</div>
                            </button>
                        );
                    })}
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
                        onClick={refreshTools}
                    >
                        {activeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Refresh
                    </button>
                </div>
                <div className="p-4">
                    {!activeServer ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">Select a server first</div>
                    ) : activeError ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{activeError}</div>
                    ) : activeTools.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">No tools (click Refresh)</div>
                    ) : (
                        <div className="space-y-2">
                            {activeTools.map((tool) => (
                                <div key={`${tool.mcp_server_url}::${tool.name}`} className="rounded-lg border border-slate-200 px-3 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-slate-800">{tool.display_name || tool.name}</div>
                                            <div className="truncate text-xs text-slate-500">{tool.name}</div>
                                        </div>
                                        <div className="text-xs text-slate-400">{tool.mcp_server_name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const emptyView = (title: string, icon: React.ReactNode) => (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {icon}
                {title}
            </div>
            <div className="mt-2 text-sm text-slate-500">Not implemented in this phase.</div>
        </div>
    );

    const notificationsView = (
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
                                className={`rounded-lg border px-3 py-2 text-sm ${item.level === 'error'
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
    );

    const view = (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={close} />
            <div
                className="absolute left-1/2 top-1/2 w-[1040px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                            <Boxes className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-900">MCP Inspector</div>
                            <div className="mt-0.5 text-xs text-slate-500">Server connection / Tools / Resources / Prompts / Notifications</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" className={tabClass('connection')} onClick={() => setTab('connection')}>
                            <Cable className="h-4 w-4" />
                            Connection
                        </button>
                        <button type="button" className={tabClass('tools')} onClick={() => setTab('tools')}>
                            <Boxes className="h-4 w-4" />
                            Tools
                        </button>
                        <button type="button" className={tabClass('resources')} onClick={() => setTab('resources')}>
                            <FileText className="h-4 w-4" />
                            Resources
                        </button>
                        <button type="button" className={tabClass('prompts')} onClick={() => setTab('prompts')}>
                            <Terminal className="h-4 w-4" />
                            Prompts
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
                    {tab === 'connection' ? connectView : null}
                    {tab === 'tools' ? toolsView : null}
                    {tab === 'resources' ? emptyView('Resources', <FileText className="h-4 w-4 text-slate-500" />) : null}
                    {tab === 'prompts' ? emptyView('Prompts', <Terminal className="h-4 w-4 text-slate-500" />) : null}
                    {tab === 'notifications' ? notificationsView : null}
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return view;
    }

    return createPortal(view, document.body);
}
