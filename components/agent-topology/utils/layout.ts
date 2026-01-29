import type { TopologyNode, LayoutConfig } from '../types';

const DEFAULT_HORIZONTAL_SPACING = 280;
const DEFAULT_VERTICAL_SPACING = 190;
const MIN_DISTANCE = 72;
const MAX_ADJUST_ITERATIONS = 12;

type NodeSize = { width: number; height: number };

const NODE_SIZE_BY_TYPE: Record<TopologyNode['type'], NodeSize> = {
    TRIGGERS: { width: 360, height: 180 },
    AGENT: { width: 360, height: 360 },
    TOOLBOX: { width: 360, height: 260 },
    'SUB-AGENTS': { width: 360, height: 220 },
    SKILLS: { width: 360, height: 220 },
};

function getSize(node: TopologyNode): NodeSize {
    return NODE_SIZE_BY_TYPE[node.type] ?? { width: 360, height: 240 };
}

/**
 * Calculates automatic layout for topology nodes
 * 
 * Implements hierarchical layout with TRIGGERS at top, AGENT in center,
 * and other nodes distributed. Supports vertical and horizontal directions.
 * 
 * @param nodes - Topology nodes to position
 * @param config - Layout configuration with type, direction, and spacing
 * @returns Nodes with calculated positions
 * 
 * @example
 * ```ts
 * const positioned = layout(nodes, {
 *   type: 'auto',
 *   direction: 'vertical',
 *   spacing: { horizontal: 300, vertical: 180 }
 * });
 * ```
 */
export function layout(
    nodes: TopologyNode[],
    config: LayoutConfig = { type: 'auto', direction: 'vertical' }
): TopologyNode[] {
    if (config.type === 'manual') {
        return nodes;
    }

    const spacing = {
        horizontal: Math.max(config.spacing?.horizontal ?? DEFAULT_HORIZONTAL_SPACING, 160),
        vertical: Math.max(config.spacing?.vertical ?? DEFAULT_VERTICAL_SPACING, 120)
    };

    const isVertical = config.direction === 'vertical';
    const grouped = groupByType(nodes);

    const layoutedNodes = isVertical
        ? layoutVertical(grouped, spacing)
        : layoutHorizontal(grouped, spacing);

    return adjust(layoutedNodes);
}

/**
 * Centers graph in viewport
 * 
 * Calculates the center point of all nodes for viewport positioning.
 * 
 * @param nodes - Nodes to calculate center for
 * @returns Center coordinates {x, y}
 */
export function center(nodes: TopologyNode[]): { x: number; y: number } {
    if (nodes.length === 0) {
        return { x: 0, y: 0 };
    }

    const positions = nodes.map(n => n.position);
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));

    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2
    };
}

/**
 * Adjusts positions to prevent overlapping
 * 
 * Moves overlapping nodes apart to ensure minimum distance.
 * Modifies positions in-place for performance.
 * 
 * @param nodes - Nodes to adjust
 * @param minDistance - Minimum distance between nodes (default: 50)
 * @returns Adjusted nodes with no overlaps
 */
export function adjust(
    nodes: TopologyNode[],
    minDistance: number | undefined = MIN_DISTANCE,
    fixedNodeIds?: ReadonlySet<string>
): TopologyNode[] {
    const distance = minDistance ?? MIN_DISTANCE;
    const adjusted = nodes.map((node) => ({ ...node, position: { ...node.position } }));

    for (let iteration = 0; iteration < MAX_ADJUST_ITERATIONS; iteration++) {
        let changed = false;

        for (let i = 0; i < adjusted.length; i++) {
            for (let j = i + 1; j < adjusted.length; j++) {
                const node1 = adjusted[i];
                const node2 = adjusted[j];

                const node1Fixed = fixedNodeIds?.has(String(node1.id)) ?? false;
                const node2Fixed = fixedNodeIds?.has(String(node2.id)) ?? false;

                const size1 = getSize(node1);
                const size2 = getSize(node2);

                const center1 = {
                    x: node1.position.x + size1.width / 2,
                    y: node1.position.y + size1.height / 2,
                };
                const center2 = {
                    x: node2.position.x + size2.width / 2,
                    y: node2.position.y + size2.height / 2,
                };

                const dx = center2.x - center1.x;
                const dy = center2.y - center1.y;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);

                const limitX = size1.width / 2 + size2.width / 2 + distance;
                const limitY = size1.height / 2 + size2.height / 2 + distance;

                if (absDx >= limitX || absDy >= limitY) {
                    continue;
                }

                const pushX = limitX - absDx;
                const pushY = limitY - absDy;

                const shouldMoveNode1 = node2Fixed && !node1Fixed;
                const movedNode = shouldMoveNode1 ? node1 : node2;

                if (pushX < pushY) {
                    movedNode.position.x += (dx >= 0 ? 1 : -1) * pushX * (shouldMoveNode1 ? -1 : 1);
                } else {
                    movedNode.position.y += (dy >= 0 ? 1 : -1) * pushY * (shouldMoveNode1 ? -1 : 1);
                }
                changed = true;
            }
        }

        if (!changed) {
            break;
        }
    }

    return adjusted;
}

// Internal helpers - not exported

type NodeGroup = Record<string, TopologyNode[]>;

function groupByType(nodes: TopologyNode[]): NodeGroup {
    const grouped: NodeGroup = {
        TRIGGERS: [],
        AGENT: [],
        TOOLBOX: [],
        'SUB-AGENTS': [],
        SKILLS: []
    };

    nodes.forEach(node => {
        if (grouped[node.type]) {
            grouped[node.type].push(node);
        }
    });

    return grouped;
}

interface Spacing {
    horizontal: number;
    vertical: number;
}

function layoutVertical(
    grouped: NodeGroup,
    spacing: Spacing
): TopologyNode[] {
    const result: TopologyNode[] = [];
    let currentY = 0;
    const currentX = 0;

    if (grouped.TRIGGERS.length > 0) {
        const trigger = grouped.TRIGGERS[0];
        const size = getSize(trigger);
        result.push({
            ...trigger,
            position: { x: currentX, y: currentY }
        });
        currentY += size.height + spacing.vertical;
    }

    if (grouped.AGENT.length > 0) {
        const agent = grouped.AGENT[0];
        const agentSize = getSize(agent);
        result.push({
            ...agent,
            position: { x: currentX, y: currentY }
        });

        const rightX = currentX + agentSize.width + spacing.horizontal;
        let rightY = currentY;

        if (grouped.TOOLBOX.length > 0) {
            const toolbox = grouped.TOOLBOX[0];
            const toolboxSize = getSize(toolbox);
            result.push({
                ...toolbox,
                position: { x: rightX, y: rightY }
            });
            rightY += toolboxSize.height + spacing.vertical;
        }

        grouped['SUB-AGENTS'].forEach(node => {
            const size = getSize(node);
            result.push({
                ...node,
                position: { x: rightX, y: rightY }
            });
            rightY += size.height + spacing.vertical;
        });

        grouped.SKILLS.forEach(node => {
            const size = getSize(node);
            result.push({
                ...node,
                position: { x: rightX, y: rightY }
            });
            rightY += size.height + spacing.vertical;
        });
    }

    return result;
}

function layoutHorizontal(
    grouped: NodeGroup,
    spacing: Spacing
): TopologyNode[] {
    const result: TopologyNode[] = [];
    let currentX = 0;
    const currentY = 0;

    if (grouped.TRIGGERS.length > 0) {
        const trigger = grouped.TRIGGERS[0];
        const size = getSize(trigger);
        result.push({
            ...trigger,
            position: { x: currentX, y: currentY }
        });
        currentX += size.width + spacing.horizontal;
    }

    if (grouped.AGENT.length > 0) {
        const agent = grouped.AGENT[0];
        const size = getSize(agent);
        result.push({
            ...agent,
            position: { x: currentX, y: currentY }
        });
        currentX += size.width + spacing.horizontal;
    }

    let verticalOffset = 0;
    ['TOOLBOX', 'SUB-AGENTS', 'SKILLS'].forEach(type => {
        grouped[type].forEach(node => {
            const size = getSize(node);
            result.push({
                ...node,
                position: { x: currentX, y: currentY + verticalOffset }
            });
            verticalOffset += size.height + spacing.vertical;
        });
    });

    return result;
}
