import React from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode } from './base';
import { SlotRenderer } from '../slots/renderer';
import {
    defaultAgentHeader,
    defaultAgentInstructions
} from '../slots/defaults';
import type { AgentNodeData, SlotRegistry } from '../types';

interface AgentNodeProps extends NodeProps {
    data: AgentNodeData & {
        customSlots?: Partial<SlotRegistry>;
    };
}

export function AgentNode({ id, type, data, selected }: AgentNodeProps) {
    const { customSlots } = data;

    return (
        <BaseNode
            id={id}
            type="AGENT"
            data={data}
            selected={selected}
            customSlots={customSlots}
        >
            <SlotRenderer
                slotName="agent.header"
                customSlots={customSlots}
                defaultSlot={defaultAgentHeader}
                slotProps={{ data, nodeId: id, nodeType: 'AGENT' }}
            />

            <SlotRenderer
                slotName="agent.instructions"
                customSlots={customSlots}
                defaultSlot={defaultAgentInstructions}
                slotProps={{ data, nodeId: id, nodeType: 'AGENT' }}
            />
        </BaseNode>
    );
}
