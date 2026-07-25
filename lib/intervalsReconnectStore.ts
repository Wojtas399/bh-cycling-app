type Listener = () => void;

let needsReconnect = false;
const listeners = new Set<Listener>();

export function getNeedsReconnect(): boolean {
  return needsReconnect;
}

export function setNeedsReconnect(value: boolean): void {
  if (needsReconnect === value) return;

  needsReconnect = value;
  listeners.forEach(listener => listener());
}

export function subscribeNeedsReconnect(listener: Listener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}
