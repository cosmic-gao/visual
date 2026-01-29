import React from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode } from './base';
import { SlotRenderer } from '../slots/renderer';
import {
    defaultSkillsHeader,
    defaultSkillsItem,
    defaultSkillsEmpty
} from '../slots/defaults';
import type { SkillsNodeData, SlotRegistry } from '../types';

interface SkillsNodeProps extends NodeProps {
    data: SkillsNodeData & {
        customSlots?: Partial<SlotRegistry>;
    };
}

export function SkillsNode({ id, type, data, selected }: SkillsNodeProps) {
    const { skills = [], customSlots } = data;

    return (
        <BaseNode
            id={id}
            type="SKILLS"
            data={data}
            selected={selected}
            customSlots={customSlots}
        >
            <SlotRenderer
                slotName="skills.header"
                customSlots={customSlots}
                defaultSlot={defaultSkillsHeader}
                slotProps={{ data, nodeId: id, nodeType: 'SKILLS' }}
            />

            <div className="px-2 py-2 space-y-1 max-h-[220px] overflow-auto pr-1">
                {skills.length > 0 ? (
                    skills.map((skill, index) => (
                        <SlotRenderer
                            key={skill.id}
                            slotName="skills.item"
                            customSlots={customSlots}
                            defaultSlot={defaultSkillsItem}
                            slotProps={{
                                data: skill,
                                nodeId: id,
                                nodeType: 'SKILLS',
                                index
                            }}
                        />
                    ))
                ) : (
                    <SlotRenderer
                        slotName="skills.empty"
                        customSlots={customSlots}
                        defaultSlot={defaultSkillsEmpty}
                        slotProps={{ data, nodeId: id, nodeType: 'SKILLS' }}
                    />
                )}
            </div>
        </BaseNode>
    );
}
