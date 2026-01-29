import React, { useState } from 'react';
import { Clock, Edit, Trash2, Wrench, Users, Zap, Copy, Plus, X, FileText, Link2 } from 'lucide-react';
import type {
    TriggerNodeData,
    TriggerItem,
    AgentNodeData,
    ToolboxNodeData,
    ToolItem,
    SubAgentsNodeData,
    SubAgentItem,
    SkillsNodeData,
    SkillItem,
    SlotFunction
} from '../types';
import type { McpTool } from '../../mcp-service/types';
import { createToolKey } from '../../mcp-service/export';
import { useMcpController } from '../../mcp-service/state';
import { McpServiceDialog } from '../../mcp-service/service';
import { McpToolDialog } from '../../mcp-service/picker';
import { useTopology } from '../context';
import {
    badgeClassName,
    warningBadgeClassName,
    ghostIconButtonClassName,
    headerLabelClassName,
    pillButtonClassName
} from '../theme';

/**
 * Default slots for TRIGGERS node
 */
export const defaultTriggersHeader: SlotFunction<TriggerNodeData> = ({ data }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <span className={headerLabelClassName}>{data.label || 'TRIGGERS'}</span>
        <button className={pillButtonClassName}>
            <Plus className="w-3.5 h-3.5" />
            Add
        </button>
    </div>
);

export const defaultTriggersItem: SlotFunction<TriggerItem> = ({ data }) => (
    <div className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
        <Clock className="w-4 h-4 text-slate-400" />
        <span className="flex-1 text-sm text-slate-700">{data.schedule}</span>
        <button className={`opacity-0 group-hover:opacity-100 ${ghostIconButtonClassName}`}>
            <Trash2 className="w-4 h-4" />
        </button>
    </div>
);

export const defaultTriggersEmpty: SlotFunction<TriggerNodeData> = () => (
    <div className="p-5 text-center text-sm text-slate-400">
        No triggers configured
    </div>
);

/**
 * Default slots for AGENT node
 */
export const defaultAgentHeader: SlotFunction<AgentNodeData> = ({ data }) => (
    <div className="px-4 py-3 border-b border-slate-200">
        <span className={headerLabelClassName}>{data.label || 'AGENT'}</span>
        <h3 className="mt-2 text-[15px] font-semibold text-slate-900">{data.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{data.description}</p>
    </div>
);

export const defaultAgentInstructions: SlotFunction<AgentNodeData> = ({ data }) => (
    <div className="px-4 py-3">
        <div className="flex items-center justify-between">
            <span className={headerLabelClassName}>Instructions</span>
            <button className={pillButtonClassName}>
                <Edit className="w-3.5 h-3.5" />
                Edit
            </button>
        </div>
        <div className="mt-3 max-h-[190px] overflow-auto pr-2 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
            {data.instructions || 'No instructions provided'}
        </div>
    </div>
);

/**
 * Default slots for TOOLBOX node
 */
export const defaultToolboxHeader: SlotFunction<ToolboxNodeData> = ({ data, nodeId }) => (
    <ToolboxHeader data={data} nodeId={nodeId} />
);

function ToolboxHeader({ data, nodeId }: { data: ToolboxNodeData; nodeId: string }) {
    const { updateNodeData } = useTopology();
    const controller = useMcpController();
    const [isServiceOpen, setIsServiceOpen] = useState(false);
    const [isToolOpen, setIsToolOpen] = useState(false);

    const addTools = (tools: McpTool[]) => {
        updateNodeData(nodeId, (nodeData) => {
            const currentTools = ((nodeData as any)?.tools ?? []) as any[];
            const existingIds = new Set(currentTools.map((tool) => String(tool.id)));

            const nextTools = [...currentTools];
            for (const tool of tools) {
                const id = createToolKey(tool);
                if (existingIds.has(id)) {
                    continue;
                }
                nextTools.push({
                    id,
                    name: tool.display_name || tool.name,
                    source: tool.mcp_server_name,
                    status: 'active',
                });
                existingIds.add(id);
            }

            return {
                ...(nodeData as any),
                tools: nextTools,
            };
        });

        controller.clearSelection();
        setIsToolOpen(false);
    };

    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <span className={headerLabelClassName}>{data.label || 'TOOLBOX'}</span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className={pillButtonClassName}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsToolOpen(true);
                    }}
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                </button>
                {data.mcpEnabled && (
                    <button
                        type="button"
                        className={`${badgeClassName} !border-slate-200 !bg-white !text-slate-700`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsServiceOpen(true);
                        }}
                    >
                        MCP
                    </button>
                )}
            </div>

            <McpServiceDialog open={isServiceOpen} onOpenChange={setIsServiceOpen} controller={controller} />
            <McpToolDialog
                open={isToolOpen}
                onOpenChange={setIsToolOpen}
                controller={controller}
                onAdd={(tools) => addTools(tools)}
            />
        </div>
    );
}

export const defaultToolboxItem: SlotFunction<ToolItem> = ({ data }) => {
    const statusColors: Record<string, string> = {
        active: 'bg-green-100 text-green-700',
        review: 'bg-purple-100 text-purple-700',
        draft: 'bg-gray-100 text-gray-700',
        missing_key: 'bg-amber-100 text-amber-700'
    };

    const name = data.name.toLowerCase();
    const ItemIcon =
        data.icon === 'link' || name.includes('url') || name.includes('image') || name.includes('web') ? Link2 : name.includes('read') ? FileText : Wrench;

    const getStatusClass = (status: string) => {
        if (status === 'review') return badgeClassName;
        if (status === 'missing_key') return warningBadgeClassName;
        return `text-[11px] px-2 py-0.5 rounded-full ${statusColors[status] || statusColors.draft}`;
    };

    const getStatusText = (status: string) => {
        if (status === 'review') return 'Review Required';
        if (status === 'missing_key') return 'API Key Missing';
        return status;
    };

    return (
        <div className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
            <ItemIcon className="w-4 h-4 text-slate-400" />
            <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-800 truncate">{data.name}</div>
                {data.source && (
                    <div className="text-xs text-slate-500">{data.source}</div>
                )}
            </div>
            {data.status && (
                <span className={getStatusClass(data.status)}>
                    <span>{getStatusText(data.status)}</span>
                    {data.status === 'review' && (
                        <button className="ml-1 inline-flex items-center text-violet-600 hover:text-violet-800">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </span>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <button className={ghostIconButtonClassName}>
                    <Copy className="w-4 h-4" />
                </button>
                <button className={ghostIconButtonClassName}>
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export const defaultToolboxEmpty: SlotFunction<ToolboxNodeData> = () => (
    <div className="p-5 text-center text-sm text-slate-400">
        No tools configured
    </div>
);

/**
 * Default slots for SUB-AGENTS node
 */
export const defaultSubAgentsHeader: SlotFunction<SubAgentsNodeData> = ({ data }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <span className={headerLabelClassName}>{data.label || 'SUB-AGENTS'}</span>
        <button className={pillButtonClassName}>
            <Plus className="w-3.5 h-3.5" />
            Add
        </button>
    </div>
);

export const defaultSubAgentsItem: SlotFunction<SubAgentItem> = ({ data }) => (
    <div className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
        <Users className="w-4 h-4 text-slate-400" />
        <span className="flex-1 text-sm text-slate-800">{data.name}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <button className={ghostIconButtonClassName}>
                <Edit className="w-4 h-4" />
            </button>
            <button className={ghostIconButtonClassName}>
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    </div>
);

export const defaultSubAgentsEmpty: SlotFunction<SubAgentsNodeData> = () => (
    <div className="p-5 text-center text-sm text-slate-400">
        No sub-agents configured
    </div>
);

/**
 * Default slots for SKILLS node
 */
export const defaultSkillsHeader: SlotFunction<SkillsNodeData> = ({ data }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <span className={headerLabelClassName}>{data.label || 'SKILLS'}</span>
        <button className={pillButtonClassName}>
            <Plus className="w-3.5 h-3.5" />
            Add
        </button>
    </div>
);

export const defaultSkillsItem: SlotFunction<SkillItem> = ({ data }) => (
    <div className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
        <Zap className="w-4 h-4 text-slate-400" />
        <span className="flex-1 text-sm text-slate-800">{data.name}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <button className={ghostIconButtonClassName}>
                <Edit className="w-4 h-4" />
            </button>
            <button className={ghostIconButtonClassName}>
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    </div>
);

export const defaultSkillsEmpty: SlotFunction<SkillsNodeData> = () => (
    <div className="p-5 text-center text-sm text-slate-400">
        No skills configured
    </div>
);
