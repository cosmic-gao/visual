import type { NodeType } from './types';

/**
 * 获取边的默认颜色。
 *
 * @param sourceType 边起点节点类型
 * @param targetType 边终点节点类型
 * @returns 十六进制颜色值
 * @throws 当节点类型为空时抛出错误
 * @example
 * ```ts
 * const color = getEdgeColor('AGENT', 'TOOLBOX')
 * ```
 */
export function getEdgeColor(sourceType: NodeType, targetType: NodeType): string {
    if (!sourceType || !targetType) {
        throw new Error('Node type is required');
    }

    if (sourceType === 'TRIGGERS' && targetType === 'AGENT') return '#f59e0b';
    if (sourceType === 'AGENT' && targetType === 'TOOLBOX') return '#3b82f6';
    if (sourceType === 'AGENT' && targetType === 'SKILLS') return '#22c55e';
    if (sourceType === 'AGENT' && targetType === 'SUB-AGENTS') return '#a855f7';

    return '#94a3b8';
}

export const cardClassName =
    'font-sans bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.06)] w-[360px] overflow-hidden transition-shadow duration-200 hover:shadow-[0_6px_18px_rgba(15,23,42,0.10)]';

export const cardSelectedClassName =
    'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-[0_10px_28px_rgba(37,99,235,0.18)]';

export const headerLabelClassName = 'text-[11px] font-semibold tracking-wider text-slate-600 uppercase';

export const pillButtonClassName =
    'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100';

export const ghostIconButtonClassName =
    'inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200';

export const badgeClassName = 'rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700';

export const warningBadgeClassName = 'rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700';
