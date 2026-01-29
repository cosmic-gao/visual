import React from 'react';
import type { SlotRegistry, SlotProps, SlotFunction } from '../types';

/**
 * Slot renderer utility - implements Vue 2-style slot system
 * Checks for custom slot override, falls back to default slot
 */
export function useSlot<T = any>(
    slotName: keyof SlotRegistry,
    customSlots?: Partial<SlotRegistry>,
    defaultSlot?: SlotFunction<T>
): SlotFunction<T> | undefined {
    if (customSlots?.[slotName]) {
        return customSlots[slotName] as SlotFunction<T>;
    }

    return defaultSlot;
}

/**
 * Renders a slot with proper props
 */
export function renderSlot<T = any>(
    slot: SlotFunction<T> | undefined,
    props: SlotProps<T>
): React.ReactNode {
    if (!slot) {
        return null;
    }

    return slot(props);
}

/**
 * Higher-order component for slot rendering
 */
interface SlotRendererProps<T = any> {
    slotName: keyof SlotRegistry;
    customSlots?: Partial<SlotRegistry>;
    defaultSlot?: SlotFunction<T>;
    slotProps: SlotProps<T>;
}

export function SlotRenderer<T = any>({
    slotName,
    customSlots,
    defaultSlot,
    slotProps
}: SlotRendererProps<T>) {
    const slot = useSlot<T>(slotName, customSlots, defaultSlot);
    return <>{renderSlot(slot, slotProps)}</>;
}
