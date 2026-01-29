import type {
    TopologyConfig,
    ValidationResult,
    ValidationError,
    ValidationWarning,
    TopologyNode,
    TopologyEdge
} from '../types';

/**
 * Validates topology configuration
 * 
 * Checks nodes, edges, and references for errors and warnings.
 * Ensures referential integrity between edges and nodes.
 * 
 * @param config - Topology configuration to validate
 * @returns Validation result with errors and warnings
 * 
 * @example
 * ```ts
 * const config = { nodes: [...], edges: [...] };
 * const result = validate(config);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validate(config: TopologyConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!config.nodes || config.nodes.length === 0) {
        errors.push({
            type: 'error',
            field: 'nodes',
            message: 'Configuration must contain at least one node'
        });
    }

    const nodeIds = checkNodes(config.nodes || [], errors);
    checkEdges(config.edges || [], nodeIds, errors);
    checkBestPractices(config.nodes || [], warnings);

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Normalizes configuration with defaults
 * 
 * Adds missing positions, labels, edge types, and layout settings.
 * Safe to call multiple times - idempotent operation.
 * 
 * @param config - Raw topology configuration
 * @returns Normalized configuration with all defaults applied
 * 
 * @example
 * ```ts
 * const raw = { nodes: [{ id: '1', type: 'AGENT', data: {} }], edges: [] };
 * const normalized = normalize(raw);
 * // normalized.nodes[0].position is now set
 * // normalized.layout has default values
 * ```
 */
export function normalize(config: TopologyConfig): TopologyConfig {
    return {
        ...config,
        nodes: config.nodes.map((node, index) => ({
            ...node,
            position: node.position || { x: 0, y: index * 200 },
            data: {
                ...node.data,
                label: node.data.label || `Node ${index + 1}`
            }
        })),
        edges: (config.edges || []).map((edge, index) => ({
            ...edge,
            type: edge.type || 'dashed',
            id: edge.id || `edge-${index}`
        })),
        layout: config.layout || {
            type: 'auto',
            direction: 'vertical',
            spacing: { horizontal: 250, vertical: 150 }
        }
    };
}

/**
 * Creates default topology configuration
 * 
 * Provides a complete starting configuration with all 5 node types
 * and standard connections. Useful as a template or starting point.
 * 
 * @returns Complete default configuration ready to use
 * 
 * @example
 * ```ts
 * const config = create();
 * // Modify as needed
 * config.nodes[0].data.triggers.push({ id: 't2', schedule: '...' });
 * ```
 */
export function create(): TopologyConfig {
    return {
        nodes: buildDefaultNodes(),
        edges: buildDefaultEdges(),
        layout: {
            type: 'auto',
            direction: 'vertical'
        }
    };
}

function checkNodes(
    nodes: TopologyNode[],
    errors: ValidationError[]
): Set<string> {
    const nodeIds = new Set<string>();

    nodes.forEach((node, index) => {
        if (!node.id) {
            errors.push({
                type: 'error',
                field: `nodes[${index}].id`,
                message: 'Node must have an id'
            });
        } else if (nodeIds.has(node.id)) {
            errors.push({
                type: 'error',
                field: `nodes[${index}].id`,
                message: `Duplicate node id: ${node.id}`
            });
        } else {
            nodeIds.add(node.id);
        }

        if (!node.type) {
            errors.push({
                type: 'error',
                field: `nodes[${index}].type`,
                message: 'Node must have a type'
            });
        }

        if (!node.data) {
            errors.push({
                type: 'error',
                field: `nodes[${index}].data`,
                message: 'Node must have data'
            });
        }
    });

    return nodeIds;
}

function checkEdges(
    edges: TopologyEdge[],
    nodeIds: Set<string>,
    errors: ValidationError[]
): void {
    edges.forEach((edge, index) => {
        if (!edge.id) {
            errors.push({
                type: 'error',
                field: `edges[${index}].id`,
                message: 'Edge must have an id'
            });
        }

        if (!edge.source) {
            errors.push({
                type: 'error',
                field: `edges[${index}].source`,
                message: 'Edge must have a source node id'
            });
        } else if (!nodeIds.has(edge.source)) {
            errors.push({
                type: 'error',
                field: `edges[${index}].source`,
                message: `Edge source node \"${edge.source}\" does not exist`
            });
        }

        if (!edge.target) {
            errors.push({
                type: 'error',
                field: `edges[${index}].target`,
                message: 'Edge must have a target node id'
            });
        } else if (!nodeIds.has(edge.target)) {
            errors.push({
                type: 'error',
                field: `edges[${index}].target`,
                message: `Edge target node \"${edge.target}\" does not exist`
            });
        }
    });
}

function checkBestPractices(
    nodes: TopologyNode[],
    warnings: ValidationWarning[]
): void {
    const agentNodes = nodes.filter(n => n.type === 'AGENT');

    if (agentNodes.length === 0) {
        warnings.push({
            type: 'warning',
            field: 'nodes',
            message: 'No AGENT node found. Topology should typically have a main AGENT node.'
        });
    }

    if (agentNodes.length > 1) {
        warnings.push({
            type: 'warning',
            field: 'nodes',
            message: 'Multiple AGENT nodes found. Consider using SUB-AGENTS for additional agents.'
        });
    }
}

function buildDefaultNodes(): TopologyNode[] {
    return [
        {
            id: 'triggers-1',
            type: 'TRIGGERS',
            data: {
                label: 'TRIGGERS',
                triggers: []
            },
            position: { x: 0, y: 0 }
        },
        {
            id: 'agent-1',
            type: 'AGENT',
            data: {
                label: 'AGENT',
                title: 'New Agent',
                description: 'Agent description',
                instructions: ''
            },
            position: { x: 0, y: 200 }
        },
        {
            id: 'toolbox-1',
            type: 'TOOLBOX',
            data: {
                label: 'TOOLBOX',
                tools: []
            },
            position: { x: 300, y: 200 }
        },
        {
            id: 'subagents-1',
            type: 'SUB-AGENTS',
            data: {
                label: 'SUB-AGENTS',
                subAgents: []
            },
            position: { x: 300, y: 400 }
        },
        {
            id: 'skills-1',
            type: 'SKILLS',
            data: {
                label: 'SKILLS',
                skills: []
            },
            position: { x: 300, y: 600 }
        }
    ];
}

function buildDefaultEdges(): TopologyEdge[] {
    return [
        {
            id: 'e-triggers-agent',
            source: 'triggers-1',
            target: 'agent-1',
            type: 'dashed'
        },
        {
            id: 'e-agent-toolbox',
            source: 'agent-1',
            target: 'toolbox-1',
            type: 'dashed'
        },
        {
            id: 'e-agent-subagents',
            source: 'agent-1',
            target: 'subagents-1',
            type: 'dashed'
        },
        {
            id: 'e-agent-skills',
            source: 'agent-1',
            target: 'skills-1',
            type: 'dashed'
        }
    ];
}
