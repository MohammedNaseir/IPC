'use client';

/**
 * Whether the sidebar is collapsed to its icon rail (item 5, direction S1) — a per-viewer UI
 * preference, not shared or durable data, so `localStorage` is the right tool rather than a Server
 * Action. Exposed through `useSyncExternalStore` rather than a `useEffect` + `setState` pair: the
 * effect version calls `setState` synchronously inside the effect body specifically to avoid a
 * hydration mismatch (server renders `false` because there is no `window`; a naive `useState`
 * lazy initializer would read the real value on the client's first render instead, producing output
 * that disagrees with the server-rendered HTML) — but that is exactly the shape
 * `react-hooks/set-state-in-effect` flags. `useSyncExternalStore` is the hook React ships for this
 * exact case: an external mutable source, read safely during render via its own `getServerSnapshot`.
 *
 * Same client-only discipline as `src/components/table/listStateStore.ts`: module state on the
 * server is shared across every request that server handles, so every entry point below returns a
 * safe default when there is no `window`, and the listener set stays permanently empty server-side.
 */

export const SIDEBAR_COLLAPSE_KEY = 'ipc.sidebar.collapsed';

const isClient = () => typeof window !== 'undefined';

const listeners = new Set<() => void>();

export function subscribeToCollapsed(callback: () => void): () => void {
  if (!isClient()) return () => {};
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getCollapsedSnapshot(): boolean {
  if (!isClient()) return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
  } catch {
    return false; // private window or blocked storage: default to expanded
  }
}

export function getCollapsedServerSnapshot(): boolean {
  return false;
}

/** Call only from an event handler, matching listStateStore's convention — never during render. */
export function setCollapsed(next: boolean): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0');
  } catch {
    /* ignore: the toggle still works this session, it just will not be remembered */
  }
  for (const callback of listeners) callback();
}
