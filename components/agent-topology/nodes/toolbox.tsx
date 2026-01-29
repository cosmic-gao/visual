import React from 'react';
import type { NodeProps } from '@xyflow/react';
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
    const { tools = [], customSlots } = data;

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
        </BaseNode>
    );
}
