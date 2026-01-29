import React, { useCallback, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { AgentTopologyProps, TopologyNode, TopologyEdge, NodeType } from './types';
import { nodeTypes, edgeTypes } from './registry';
import { adjust, layout } from './utils/layout';
import { validate, normalize } from './utils/validator';
import { getEdgeColor } from './theme';
import { TopologyProvider } from './context';

/**
 * Agent Topology Visualization Component
 * 
 * Configuration-first, slot-based extensible topology diagram.
 * Renders agent dependency graphs with 5 node types: TRIGGERS, AGENT,
 * TOOLBOX, SUB-AGENTS, and SKILLS.
 * 
 * @param props - Component configuration and event handlers
 * @param props.config - Topology configuration with nodes and edges
 * @param props.slots - Optional custom slot implementations
 * @param props.className - Additional CSS classes
 * @param props.fitView - Auto-fit view to content (default: true)
 * @param props.interactive - Enable zoom/pan/drag (default: true)
 * @param props.showMiniMap - Render the minimap (default: false)
 * @param props.onNodeClick - Node click handler
 * @param props.onEdgeClick - Edge click handler
 * @param props.onChange - Change handler for nodes/edges
 * 
 * @example
 * ```tsx
 * import { AgentTopology, create } from './agent-topology';
 * 
 * function MyApp() {
 *   const config = create();
 *   return <AgentTopology config={config} />;
 * }
 * ```
 */
export function AgentTopology({
    config,
    slots,
    className = '',
    fitView = true,
    interactive = true,
    onNodeClick,
    onEdgeClick,
    onChange,
    showMiniMap
}: AgentTopologyProps) {
    const validatedConfig = useMemo(() => {
        const validation = validate(config);
        if (!validation.valid) {
            console.error('Topology configuration validation failed:', validation.errors);
        }
        if (validation.warnings.length > 0) {
            console.warn('Topology configuration warnings:', validation.warnings);
        }
        return normalize(config);
    }, [config]);

    const layoutedNodes = useMemo(() => {
        const nodes = validatedConfig.nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                customSlots: slots
            },
            targetPosition:
                node.type === 'AGENT' || node.type === 'TRIGGERS' ? Position.Top : Position.Left,
            sourcePosition:
                node.type === 'AGENT' ? Position.Right : node.type === 'TRIGGERS' ? Position.Bottom : Position.Right,
        }));

        if (validatedConfig.layout?.type === 'auto') {
            return adjust(layout(nodes, validatedConfig.layout) as any) as any;
        }
        return adjust(nodes as any) as any;
    }, [validatedConfig, slots]);

    const styledEdges = useMemo(() => {
        const nodeTypeById = new Map<string, NodeType>();
        for (const node of layoutedNodes) {
            if (typeof node.id === 'string' && typeof node.type === 'string') {
                nodeTypeById.set(node.id, node.type as NodeType);
            }
        }
        return validatedConfig.edges.map((edge) => {
            const sourceType = nodeTypeById.get(edge.source);
            const targetType = nodeTypeById.get(edge.target);
            const color = sourceType && targetType ? getEdgeColor(sourceType, targetType) : '#94a3b8';
            return {
                ...edge,
                type: edge.type ?? 'dashed',
                data: {
                    ...(edge.data ?? {}),
                    color,
                },
            };
        });
    }, [layoutedNodes, validatedConfig.edges]);

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(styledEdges);

    useEffect(() => {
        setNodes(layoutedNodes);
    }, [layoutedNodes, setNodes]);

    useEffect(() => {
        setEdges(styledEdges);
    }, [styledEdges, setEdges]);

    const emitNodeClick = useCallback(
        (_event: React.MouseEvent, node: any) => {
            if (onNodeClick) {
                onNodeClick(node as TopologyNode);
            }
        },
        [onNodeClick]
    );

    const emitEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: any) => {
            if (onEdgeClick) {
                onEdgeClick(edge as TopologyEdge);
            }
        },
        [onEdgeClick]
    );

    const emitChange = useCallback(() => {
        if (onChange) {
            onChange(nodes as TopologyNode[], edges as TopologyEdge[]);
        }
    }, [nodes, edges, onChange]);

    useEffect(() => {
        emitChange();
    }, [nodes, edges, emitChange]);

    return (
        <div
            className={`w-full h-full bg-slate-50 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.28)_1px,transparent_0)] [background-size:24px_24px] ${className}`}
        >
            <TopologyProvider
                value={{
                    updateNodeData: (nodeId, updater) => {
                        setNodes((items) =>
                            items.map((node) => {
                                if (String(node.id) !== String(nodeId)) {
                                    return node;
                                }
                                const nextData = updater(node.data);
                                return {
                                    ...node,
                                    data: nextData,
                                };
                            })
                        );
                    },
                }}
            >
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={interactive ? onNodesChange : undefined}
                    onEdgesChange={interactive ? onEdgesChange : undefined}
                    onNodeClick={emitNodeClick}
                    onEdgeClick={emitEdgeClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView={fitView}
                    nodesDraggable={interactive}
                    nodesConnectable={false}
                    elementsSelectable={interactive}
                    snapToGrid={interactive}
                    snapGrid={[12, 12]}
                    minZoom={0.2}
                    maxZoom={2}
                    defaultEdgeOptions={{
                        type: 'dashed',
                        animated: false
                    }}
                >
                    <Background color="#e2e8f0" gap={16} />
                    <Controls showInteractive={false} position="bottom-left" />
                    {showMiniMap && (
                        <MiniMap
                            nodeStrokeWidth={3}
                            pannable
                            zoomable
                            className="!bg-white/90 !border-slate-200 !rounded-lg !shadow-sm"
                        />
                    )}
                </ReactFlow>
            </TopologyProvider>
        </div>
    );
}
