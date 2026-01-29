import React from 'react';
import type { NodeProps } from '@xyflow/react';
import { Loader2, AlertCircle } from 'lucide-react';
import { BaseNode } from './base';
import { SlotRenderer } from '../slots/renderer';
import {
    defaultToolboxHeader,
    defaultToolboxItem,
    defaultToolboxEmpty
} from '../slots/defaults';
import type { ToolboxNodeData, SlotRegistry } from '../types';

interface ToolboxNodeProps extends NodeProps {
    data: ToolboxNodeData & {
        customSlots?: Partial<SlotRegistry>;
    };
}

export function ToolboxNode({ id, type, data, selected }: ToolboxNodeProps) {
    const { tools = [], customSlots, isLoading, error, mcpServers } = data;

    // Loading state
    if (isLoading) {
        return (
            <BaseNode
                id={id}
                type="TOOLBOX"
                data={data}
                selected={selected}
                customSlots={customSlots}
            >
                <SlotRenderer
                    slotName="toolbox.header"
                    customSlots={customSlots}
                    defaultSlot={defaultToolboxHeader}
                    slotProps={{ data, nodeId: id, nodeType: 'TOOLBOX' }}
                />
                <div className="px-4 py-8 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-sm text-slate-500">Loading tools...</span>
                    {mcpServers && mcpServers.length > 0 && (
                        <span className="text-xs text-slate-400">
                            {mcpServers.length} server{mcpServers.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </BaseNode>
        );
    }

    // Error state
    if (error) {
        return (
            <BaseNode
                id={id}
                type="TOOLBOX"
                data={data}
                selected={selected}
                customSlots={customSlots}
            >
                <SlotRenderer
                    slotName="toolbox.header"
                    customSlots={customSlots}
                    defaultSlot={defaultToolboxHeader}
                    slotProps={{ data, nodeId: id, nodeType: 'TOOLBOX' }}
                />
                <div className="px-4 py-4">
                    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-rose-700 break-words">{error}</div>
                    </div>
                </div>
                {/* Still show tools if any are available despite error */}
                {tools.length > 0 && (
                    <div className="px-2 py-2 space-y-1 max-h-[180px] overflow-auto pr-1 border-t border-slate-200">
                        {tools.map((tool, index) => (
                            <SlotRenderer
                                key={tool.id}
                                slotName="toolbox.item"
                                customSlots={customSlots}
                                defaultSlot={defaultToolboxItem}
                                slotProps={{
                                    data: tool,
                                    nodeId: id,
                                    nodeType: 'TOOLBOX',
                                    index
                                }}
                            />
                        ))}
                    </div>
                )}
            </BaseNode>
        );
    }

    // Normal state
    return (
        <BaseNode
            id={id}
            type="TOOLBOX"
            data={data}
            selected={selected}
            customSlots={customSlots}
        >
            <SlotRenderer
                slotName="toolbox.header"
                customSlots={customSlots}
                defaultSlot={defaultToolboxHeader}
                slotProps={{ data, nodeId: id, nodeType: 'TOOLBOX' }}
            />

            <div className="px-2 py-2 space-y-1 max-h-[220px] overflow-auto pr-1">
                {tools.length > 0 ? (
                    tools.map((tool, index) => (
                        <SlotRenderer
                            key={tool.id}
                            slotName="toolbox.item"
                            customSlots={customSlots}
                            defaultSlot={defaultToolboxItem}
                            slotProps={{
                                data: tool,
                                nodeId: id,
                                nodeType: 'TOOLBOX',
                                index
                            }}
                        />
                    ))
                ) : (
                    <SlotRenderer
                        slotName="toolbox.empty"
                        customSlots={customSlots}
                        defaultSlot={defaultToolboxEmpty}
                        slotProps={{ data, nodeId: id, nodeType: 'TOOLBOX' }}
                    />
                )}
            </div>

            {/* MCP servers indicator */}
            {mcpServers && mcpServers.length > 0 && (
                <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-400">
                    {mcpServers.length} MCP server{mcpServers.length > 1 ? 's' : ''} connected
                </div>
            )}
        </BaseNode>
    );
}
