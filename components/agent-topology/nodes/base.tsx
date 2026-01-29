import React, { type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeType, BaseNodeData, SlotRegistry } from '../types';
import { cardClassName, cardSelectedClassName } from '../theme';

interface BaseNodeProps {
    id: string;
    type: NodeType;
    data: BaseNodeData;
    selected?: boolean;
    customSlots?: Partial<SlotRegistry>;
    children?: ReactNode;
}

/**
 * Base node component with consistent styling and structure
 * All specific node types extend this component
 */
export function BaseNode({
    id,
    type,
    data,
    selected = false,
    customSlots,
    children
}: BaseNodeProps) {
    const targetPosition = type === 'AGENT' || type === 'TRIGGERS' ? Position.Top : Position.Left;
    const sourcePosition = type === 'TRIGGERS' ? Position.Bottom : type === 'AGENT' ? Position.Right : undefined;

    return (
        <div
            className={`${cardClassName} ${selected ? cardSelectedClassName : ''}`}
        >
            <Handle
                type="target"
                position={targetPosition}
                className="w-2.5 h-2.5 !bg-slate-600 !border-2 !border-white"
            />

            <div className="relative">
                {children}
            </div>

            {sourcePosition ? (
                <Handle
                    type="source"
                    position={sourcePosition}
                    className="w-2.5 h-2.5 !bg-slate-600 !border-2 !border-white"
                />
            ) : null}
        </div>
    );
}
