import type { Order, Stage } from '../types/models';

/**
 * The four stages every Blueprint Digital order moves through. Production is
 * broken into the manufacturing steps the order needs (see PRODUCTION_STEPS).
 */
export const STAGES: { key: Stage; label: string; hint: string }[] = [
  { key: 0, label: 'Sample', hint: 'Prototype or sample for the client. Ends when the client approves.' },
  { key: 1, label: 'Production', hint: 'Making the order. Photograph each step and every finished piece.' },
  { key: 2, label: 'Dispatch', hint: 'Packed and sent out: what left the workshop, and how it was packed.' },
  { key: 3, label: 'Installed', hint: 'Before and after in store: the proof the client needs.' },
];

export type ProductionStepKey = 'machining' | 'fabricating' | 'finishing';

/** Manufacturing steps inside Production, in workshop order. Each order picks the ones it needs. */
export const PRODUCTION_STEPS: { key: ProductionStepKey; label: string; hint: string }[] = [
  { key: 'machining', label: 'Machining', hint: 'Cutting the parts: laser, CNC or 3D printing.' },
  { key: 'fabricating', label: 'Fabricating', hint: 'Assembling and joining the parts.' },
  { key: 'finishing', label: 'Finishing', hint: 'Sanding, painting, vinyl and final QC.' },
];

export const ALL_PRODUCTION_STEPS = PRODUCTION_STEPS.map((s) => s.key).join(',');

export const stageLabel = (stage: number) => STAGES[stage]?.label ?? 'Sample';
export const stepLabel = (key: string | null | undefined) => PRODUCTION_STEPS.find((s) => s.key === key)?.label ?? '';

/** The production steps this order needs, in workshop order. */
export function stepsFor(order: Pick<Order, 'productionSteps'>): ProductionStepKey[] {
  const wanted = new Set((order.productionSteps ?? ALL_PRODUCTION_STEPS).split(',').map((s) => s.trim()));
  return PRODUCTION_STEPS.map((s) => s.key).filter((k) => wanted.has(k));
}

/** The production step the order is on now, or null when it isn't in Production (or needs no steps). */
export function currentStep(order: Pick<Order, 'stage' | 'productionStep' | 'productionSteps' | 'status'>): ProductionStepKey | null {
  if (order.stage !== 1 || order.status === 'completed') return null;
  const steps = stepsFor(order);
  return steps[Math.min(order.productionStep ?? 0, steps.length - 1)] ?? null;
}

/** e.g. "Production · Fabricating" for lists. */
export function whereLabel(order: Pick<Order, 'stage' | 'productionStep' | 'productionSteps' | 'status'>): string {
  if (order.status === 'completed') return 'Completed';
  const step = currentStep(order);
  return step ? `${stageLabel(order.stage)} · ${stepLabel(step)}` : stageLabel(order.stage);
}

/** The wording on the "move on" button for where the order is now. */
export function nextStepLabel(order: Pick<Order, 'stage' | 'productionStep' | 'productionSteps' | 'status'>, hasPhotos: boolean): string {
  if (order.status === 'completed') return 'Reopen order';
  if (order.stage === 0) return hasPhotos ? 'Client approved' : 'Sample ready';
  if (order.stage === 3) return 'Mark installed';
  if (order.stage === 1) {
    const steps = stepsFor(order);
    const i = Math.min(order.productionStep ?? 0, steps.length - 1);
    if (steps.length > 0 && i < steps.length - 1) return `${stepLabel(steps[i])} done → ${stepLabel(steps[i + 1])}`;
    return steps.length > 0 ? `${stepLabel(steps[i])} done → Dispatch` : 'Production done → Dispatch';
  }
  return 'Dispatched → Installed';
}
