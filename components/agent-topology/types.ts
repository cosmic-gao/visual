import type { Node, Edge } from '@xyflow/react';

/**
 * Node type definitions matching the 5 core Agent topology components
 */
export type NodeType = 'TRIGGERS' | 'AGENT' | 'TOOLBOX' | 'SUB-AGENTS' | 'SKILLS';

/**
 * Base data structure for all nodes
 */
export interface BaseNodeData {
    label: string;
    description?: string;
    items?: any[];
    [key: string]: any;
}

/**
 * Trigger-specific data
 */
export interface TriggerNodeData extends BaseNodeData {
    triggers: TriggerItem[];
}

export interface TriggerItem {
    id: string;
    schedule: string;
    icon?: string;
}

/**
 * Agent-specific data
 */
export interface AgentNodeData extends BaseNodeData {
    title: string;
    description: string;
    instructions?: string;
}

/**
 * Toolbox-specific data
 */
export interface ToolboxNodeData extends BaseNodeData {
    tools: ToolItem[];
    mcpEnabled?: boolean;
    /** Loading state for MCP tools */
    isLoading?: boolean;
    /** Error message from MCP tool fetch */
    error?: string;
    /** List of connected MCP server URLs */
    mcpServers?: string[];
}

export interface ToolItem {
    id: string;
    name: string;
    icon?: string;
    status?: 'active' | 'review' | 'draft' | 'missing_key';
    source?: string;
    /** MCP server display name */
    mcp_server_name?: string;
    /** MCP server URL */
    mcp_server_url?: string;
    /** Tool description from MCP */
    description?: string;
    /** JSON Schema for tool input parameters */
    input_schema?: unknown;
}

/**
 * Sub-agents-specific data
 */
export interface SubAgentsNodeData extends BaseNodeData {
    subAgents: SubAgentItem[];
}

export interface SubAgentItem {
    id: string;
    name: string;
    description?: string;
}

/**
 * Skills-specific data
 */
export interface SkillsNodeData extends BaseNodeData {
    skills: SkillItem[];
}

export interface SkillItem {
    id: string;
    name: string;
    description?: string;
    type?: 'prompt' | 'capability';
}

/**
 * Union type for all node data types
 */
export type NodeData =
    | TriggerNodeData
    | AgentNodeData
    | ToolboxNodeData
    | SubAgentsNodeData
    | SkillsNodeData;

/**
 * Custom node type extending xyflow Node
 */
export interface TopologyNode extends Node {
    type: NodeType;
    data: NodeData;
}

/**
 * Edge configuration with custom styling options
 */
export interface TopologyEdge extends Edge {
    type?: 'dashed' | 'solid' | 'animated';
    animated?: boolean;
    label?: string;
}

/**
 * Main topology configuration
 */
export interface TopologyConfig {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
    layout?: LayoutConfig;
}

/**
 * Layout configuration options
 */
export interface LayoutConfig {
    type: 'auto' | 'manual' | 'hierarchical';
    direction?: 'vertical' | 'horizontal';
    spacing?: {
        horizontal?: number;
        vertical?: number;
    };
    align?: 'start' | 'center' | 'end';
}

/**
 * Slot system - Vue 2 style slots for extensibility
 */
export interface SlotProps<T = any> {
    data: T;
    nodeId: string;
    nodeType: NodeType;
    index?: number;
}

/**
 * Slot function signature
 */
export type SlotFunction<T = any> = (props: SlotProps<T>) => React.ReactNode;

/**
 * Available slot names for each node type
 */
export interface SlotRegistry {
    // TRIGGERS slots
    'triggers.header'?: SlotFunction<TriggerNodeData>;
    'triggers.item'?: SlotFunction<TriggerItem>;
    'triggers.footer'?: SlotFunction<TriggerNodeData>;
    'triggers.empty'?: SlotFunction<TriggerNodeData>;

    // AGENT slots
    'agent.header'?: SlotFunction<AgentNodeData>;
    'agent.description'?: SlotFunction<AgentNodeData>;
    'agent.instructions'?: SlotFunction<AgentNodeData>;
    'agent.footer'?: SlotFunction<AgentNodeData>;

    // TOOLBOX slots
    'toolbox.header'?: SlotFunction<ToolboxNodeData>;
    'toolbox.item'?: SlotFunction<ToolItem>;
    'toolbox.footer'?: SlotFunction<ToolboxNodeData>;
    'toolbox.empty'?: SlotFunction<ToolboxNodeData>;

    // SUB-AGENTS slots
    'subAgents.header'?: SlotFunction<SubAgentsNodeData>;
    'subAgents.item'?: SlotFunction<SubAgentItem>;
    'subAgents.footer'?: SlotFunction<SubAgentsNodeData>;
    'subAgents.empty'?: SlotFunction<SubAgentsNodeData>;

    // SKILLS slots
    'skills.header'?: SlotFunction<SkillsNodeData>;
    'skills.item'?: SlotFunction<SkillItem>;
    'skills.footer'?: SlotFunction<SkillsNodeData>;
    'skills.empty'?: SlotFunction<SkillsNodeData>;

    // Generic/fallback slots
    'node.header'?: SlotFunction<BaseNodeData>;
    'node.content'?: SlotFunction<BaseNodeData>;
    'node.footer'?: SlotFunction<BaseNodeData>;
}

/**
 * Props for the main AgentTopology component
 */
export interface AgentTopologyProps {
    config: TopologyConfig;
    slots?: Partial<SlotRegistry>;
    className?: string;
    fitView?: boolean;
    interactive?: boolean;
    showMiniMap?: boolean;
    onNodeClick?: (node: TopologyNode) => void;
    onEdgeClick?: (edge: TopologyEdge) => void;
    onChange?: (nodes: TopologyNode[], edges: TopologyEdge[]) => void;
}

/**
 * Event handlers for node actions
 */
export interface NodeActionHandlers {
    onAdd?: (nodeType: NodeType, nodeId: string) => void;
    onEdit?: (nodeType: NodeType, nodeId: string, itemId?: string) => void;
    onDelete?: (nodeType: NodeType, nodeId: string, itemId?: string) => void;
    onDuplicate?: (nodeType: NodeType, nodeId: string, itemId?: string) => void;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    type: 'error';
    field: string;
    message: string;
}

export interface ValidationWarning {
    type: 'warning';
    field: string;
    message: string;
}
