import React from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode } from './base';
import { SlotRenderer } from '../slots/renderer';
import {
    defaultTriggersHeader,
    defaultTriggersItem,
    defaultTriggersEmpty
} from '../slots/defaults';
import type { TriggerNodeData, SlotRegistry } from '../types';

interface TriggersNodeProps extends NodeProps {
    data: TriggerNodeData & {
        customSlots?: Partial<SlotRegistry>;
    };
}

export function TriggersNode({ id, type, data, selected }: TriggersNodeProps) {
    const { triggers = [], customSlots } = data;

    return (
        <BaseNode
            id={id}
            type="TRIGGERS"
            data={data}
            selected={selected}
            customSlots={customSlots}
        >
            <SlotRenderer
                slotName="triggers.header"
                customSlots={customSlots}
                defaultSlot={defaultTriggersHeader}
                slotProps={{ data, nodeId: id, nodeType: 'TRIGGERS' }}
            />

            <div className="px-2 py-2 space-y-1 max-h-[220px] overflow-auto pr-1">
                {triggers.length > 0 ? (
                    triggers.map((trigger, index) => (
                        <SlotRenderer
                            key={trigger.id}
                            slotName="triggers.item"
                            customSlots={customSlots}
                            defaultSlot={defaultTriggersItem}
                            slotProps={{
                                data: trigger,
                                nodeId: id,
                                nodeType: 'TRIGGERS',
                                index
                            }}
                        />
                    ))
                ) : (
                    <SlotRenderer
                        slotName="triggers.empty"
                        customSlots={customSlots}
                        defaultSlot={defaultTriggersEmpty}
                        slotProps={{ data, nodeId: id, nodeType: 'TRIGGERS' }}
                    />
                )}
            </div>
        </BaseNode>
    );
}
