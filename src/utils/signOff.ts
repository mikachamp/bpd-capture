import { addStageEvent, updateOrderProductionStep, updateOrderStage } from '../db/orders';
import type { Order, Stage } from '../types/models';
import { stepLabel, stepsFor } from './stages';

/** What the "move on" sign-off records and where it moves the order. */
export type SignOffPrompt = {
  title: string;
  subtitle: string;
  action: string;
  stage: Stage;
  step: string | null;
  /** Prefilled "signed off by": the client for a sample approval, otherwise this phone's user. */
  defaultActor: string;
  defaultNotes: string;
  isReopen?: boolean;
  isProductionStepAdvance?: boolean;
  nextStepIndex?: number;
  nextStage?: Stage;
  isComplete?: boolean;
};

export const clientActor = (order: Order) => (order.clientName ? `${order.clientName} (client)` : 'Client');

/**
 * The sign-off for where the order is now: client approval of the sample,
 * each production step, dispatch, and the installation sign-off. Shared by the
 * Ink & ember and Floor order screens so both record the same history.
 */
export function signOffFor(order: Order, operator: string | null): SignOffPrompt {
  const me = operator ?? '';
  if (order.status === 'completed') {
    return { title: 'Reopen order', subtitle: 'Moves the order back to Installed so it can be worked on again.', action: 'Reopened order', stage: 3, step: null, defaultActor: me, defaultNotes: '', isReopen: true };
  }
  const steps = stepsFor(order);
  const index = Math.min(order.productionStep ?? 0, Math.max(steps.length - 1, 0));
  switch (order.stage) {
    case 0:
      return { title: 'Client approved the sample', subtitle: 'Record who approved it and how, then start Production.', action: 'Sample approved', stage: 0, step: null, defaultActor: clientActor(order), defaultNotes: '', nextStage: 1 };
    case 1: {
      const cur = steps[index];
      if (steps.length > 0 && index < steps.length - 1) {
        const next = steps[index + 1];
        return { title: `${stepLabel(cur)} done`, subtitle: `Hands the job on to ${stepLabel(next)}.`, action: `${stepLabel(cur)} completed`, stage: 1, step: cur, defaultActor: me, defaultNotes: '', isProductionStepAdvance: true, nextStepIndex: index + 1 };
      }
      return { title: cur ? `${stepLabel(cur)} done` : 'Production done', subtitle: 'Everything is made. The job moves to Dispatch.', action: cur ? `${stepLabel(cur)} completed` : 'Production completed', stage: 1, step: cur ?? null, defaultActor: me, defaultNotes: '', nextStage: 2 };
    }
    case 2:
      return { title: 'Dispatched', subtitle: 'Packed and left the workshop. The job moves to Installed.', action: 'Dispatched', stage: 2, step: null, defaultActor: me, defaultNotes: '', nextStage: 3 };
    default:
      return { title: 'Installed and signed off', subtitle: 'Fitted in store and accepted. This completes the order.', action: 'Installed & signed off', stage: 3, step: null, defaultActor: me, defaultNotes: '', isComplete: true };
  }
}

/** Records the sign-off in the order's history and moves the order on. */
export async function applySignOff(order: Order, prompt: SignOffPrompt, actor: string, notes: string | null): Promise<void> {
  await addStageEvent(order.id, prompt.stage, prompt.step, prompt.action, actor.trim() || prompt.defaultActor || 'Unknown', notes?.trim() || null);
  if (prompt.isReopen) {
    await updateOrderStage(order.id, 3, false);
  } else if (prompt.isProductionStepAdvance && prompt.nextStepIndex !== undefined) {
    await updateOrderProductionStep(order.id, prompt.nextStepIndex);
  } else if (prompt.isComplete) {
    await updateOrderStage(order.id, 3, true);
  } else if (prompt.nextStage !== undefined) {
    await updateOrderStage(order.id, prompt.nextStage);
    if (prompt.nextStage === 1) await updateOrderProductionStep(order.id, 0);
  }
}
