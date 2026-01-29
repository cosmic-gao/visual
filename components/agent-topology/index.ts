/**
 * Agent Topology Visualization Component
 * 
 * Configuration-first, slot-based extensible topology diagram.
 * 配置优先，插槽提供默认值的可视化拓扑图组件。
 */

export { AgentTopology } from './topology';

export type {
    AgentTopologyProps,

    TopologyConfig,
    LayoutConfig,

    NodeType,
    TopologyNode,
    TopologyEdge,

    TriggerNodeData,
    TriggerItem,
    AgentNodeData,
    ToolboxNodeData,
    ToolItem,
    SubAgentsNodeData,
    SubAgentItem,
    SkillsNodeData,
    SkillItem,

    SlotRegistry,
    SlotProps,
    SlotFunction,
    ValidationResult
} from './types';

export { create, validate, normalize } from './utils/validator';
