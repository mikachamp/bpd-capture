import type { Order, OrderItem, Stage, StageEvent } from '../types/models';
import type { ReportExtras } from '../services/reportPdf';

/**
 * What a report is for. The client gets the pack for where the job is now
 * (sample approval, progress, installation proof) with that stage's sign-offs;
 * the office record has every stage, sign-off and work ticket line.
 */
export function reportExtras(kind: 'client' | 'internal', order: Order, history: StageEvent[], items: OrderItem[]): ReportExtras {
  const completed = order.status === 'completed';
  if (kind === 'internal') return { title: 'Office record', history, items };
  const stage: Stage = completed ? 3 : order.stage;
  const title = stage === 0 ? 'Sample approval' : stage === 3 ? 'Installation proof' : 'Progress report';
  return { title, history: history.filter((e) => e.stage === stage), items: stage === 0 ? [] : items };
}
