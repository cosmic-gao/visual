import React, { createContext, useContext } from 'react';

export interface TopologyActions {
    updateNodeData: (nodeId: string, updater: (data: any) => any) => void;
}

const TopologyContext = createContext<TopologyActions | null>(null);

export function TopologyProvider({
    value,
    children,
}: {
    value: TopologyActions;
    children: React.ReactNode;
}) {
    return React.createElement(TopologyContext.Provider, { value }, children);
}

export function useTopology() {
    const ctx = useContext(TopologyContext);
    if (!ctx) {
        throw new Error('useTopology must be used within TopologyProvider');
    }
    return ctx;
}
