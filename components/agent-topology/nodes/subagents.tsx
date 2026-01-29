import React from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode } from './base';
import { SlotRenderer } from '../slots/renderer';
import {
    defaultSubAgentsHeader,
    defaultSubAgentsItem,
    defaultSubAgentsEmpty
} from '../slots/defaults';
import type { SubAgentsNodeData, SlotRegistry } from '../types';

interface SubAgentsNodeProps extends NodeProps {
    data: SubAgentsNodeData & {
        customSlots?: Partial<SlotRegistry>;
    };
}

export function SubAgentsNode({ id, type, data, selected }: SubAgentsNodeProps) {
    const { subAgents = [], customSlots } = data;

    return (
        <BaseNode
            id={id}
            type="SUB-AGENTS"
            data={data}
            selected={selected}
            customSlots={customSlots}
        >
            <SlotRenderer
                slotName="subAgents.header"
                customSlots={customSlots}
                defaultSlot={defaultSubAgentsHeader}
                slotProps={{ data, nodeId: id, nodeType: 'SUB-AGENTS' }}
            />

            <div className="px-2 py-2 space-y-1 max-h-[220px] overflow-auto pr-1">
                {subAgents.length > 0 ? (
                    subAgents.map((subAgent, index) => (
                        <SlotRenderer
                            key={subAgent.id}
                            slotName="subAgents.item"
                            customSlots={customSlots}
                            defaultSlot={defaultSubAgentsItem}
                            slotProps={{
                                data: subAgent,
                                nodeId: id,
                                nodeType: 'SUB-AGENTS',
                                index
                            }}
                        />
                    ))
                ) : (
                    <SlotRenderer
                        slotName="subAgents.empty"
                        customSlots={customSlots}
                        defaultSlot={defaultSubAgentsEmpty}
                        slotProps={{ data, nodeId: id, nodeType: 'SUB-AGENTS' }}
                    />
                )}
            </div>
        </BaseNode>
    );
}
