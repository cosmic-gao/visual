import type { NodeTypes, EdgeTypes } from '@xyflow/react';

import { TriggersNode } from './nodes/triggers';
import { AgentNode } from './nodes/agent';
import { ToolboxNode } from './nodes/toolbox';
import { SubAgentsNode } from './nodes/subagents';
import { SkillsNode } from './nodes/skills';
import { DashedEdge } from './edges/dashed';

export const nodeTypes: NodeTypes = {
    TRIGGERS: TriggersNode,
    AGENT: AgentNode,
    TOOLBOX: ToolboxNode,
    'SUB-AGENTS': SubAgentsNode,
    SKILLS: SkillsNode,
};

export const edgeTypes: EdgeTypes = {
    dashed: DashedEdge,
    solid: DashedEdge,
    animated: DashedEdge,
};
