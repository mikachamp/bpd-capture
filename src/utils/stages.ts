import type { Stage } from '../types/models';

/** The four stages every Blueprint Digital order moves through. */
export const STAGES: { key: Stage; label: string; hint: string }[] = [
  { key: 0, label: 'Sample', hint: 'Prototype or sample for the client. Ends when the client approves.' },
  { key: 1, label: 'Production', hint: 'Printing, cutting and finishing. Photograph each finished piece.' },
  { key: 2, label: 'Packed', hint: 'What left the workshop, and how it was packed.' },
  { key: 3, label: 'Installed', hint: 'Before and after in store: the proof the client needs.' },
];

export const stageLabel = (stage: number) => STAGES[stage]?.label ?? 'Sample';

/** The wording on the "move on" button for an order at this stage. */
export function nextStepLabel(stage: Stage, hasPhotos: boolean, completed: boolean): string {
  if (completed) return 'Reopen order';
  if (stage === 0) return hasPhotos ? 'Client approved' : 'Sample ready';
  if (stage === 3) return 'Mark installed';
  return `${stageLabel(stage)} done → ${stageLabel(stage + 1)}`;
}
