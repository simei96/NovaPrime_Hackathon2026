type Callback = (eventName: string, payload?: any) => void;

const listeners = new Set<Callback>();

export function subscribe(cb: Callback) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function trigger(eventName: string, payload?: any) {
  for (const cb of Array.from(listeners)) cb(eventName, payload);
}

export default { subscribe, trigger };
