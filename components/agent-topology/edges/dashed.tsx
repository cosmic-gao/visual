import React from 'react';
import { BaseEdge, type EdgeProps, getBezierPath } from '@xyflow/react';

/**
 * Custom dashed edge component matching the reference design
 */
export function DashedEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
    data
}: EdgeProps) {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.28,
    });

    const color = (data as any)?.color ?? (style as any)?.stroke ?? '#94a3b8';
    const strokeWidth = selected ? 2.25 : 1.75;

    return (
        <g>
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeDasharray: '4 6',
                    strokeLinecap: 'round',
                    strokeWidth,
                    stroke: color,
                }}
            />
            <circle cx={sourceX} cy={sourceY} r={4} fill={color} stroke="#ffffff" strokeWidth={2} />
            <circle cx={targetX} cy={targetY} r={4} fill={color} stroke="#ffffff" strokeWidth={2} />
        </g>
    );
}
