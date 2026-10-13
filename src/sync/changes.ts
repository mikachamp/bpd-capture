/**
 * Tiny change feed: the db layer calls notifyLocalChange() after every write,
 * and the sync service subscribes to push changes soon after they happen.
 * Kept dependency-free so the db layer can import it without import cycles.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function notifyLocalChange(): void {
  for (const listener of listeners) listener();
}

export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
