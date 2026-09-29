'use client';

import type { ListViewState } from '@/lib/table';

/**
 * Where a list's place is kept while the user is off looking at one record.
 *
 * A record page unmounts the list, so the list's search, sort, page and filter selections have to
 * survive somewhere. The address is not that somewhere — feature 003 decided deliberately that a list
 * URL stays constant, so filtered lists are not bookmarkable or shareable. This module is the
 * alternative: a plain map in the client bundle, keyed per table instance.
 *
 * Two properties make it safe:
 *
 * 1. **Client only.** Module state on the server is shared across every request that server handles, so
 *    a write there would leak one user's view state into another user's page. Every entry point below
 *    returns early when there is no `window`, which means the map stays permanently empty on the server.
 * 2. **No hydration mismatch.** On a full page load the module is fresh in both places and the map is
 *    empty, so server and client render the same default state. On a client-side back-navigation there
 *    is no hydration comparison at all, because the page's client components mount rather than hydrate.
 *
 * State lives for the tab's current page session. A hard reload or a new tab starts empty; restoring
 * across reloads was not asked for and would need real storage.
 */
const store = new Map<string, Partial<ListViewState>>();

const isClient = () => typeof window !== 'undefined';

/** The stored state for a key, or `undefined` when nothing has been stored yet. */
export function readListState(key: string | undefined): Partial<ListViewState> | undefined {
  if (!key || !isClient()) return undefined;
  return store.get(key);
}

/**
 * Merges a patch into the stored state. Call only from event handlers — never during a render, where it
 * would be a side effect on the server as well as the client.
 */
export function writeListState(key: string | undefined, patch: Partial<ListViewState>): void {
  if (!key || !isClient()) return;
  store.set(key, { ...store.get(key), ...patch });
}

/** The screen-level filter selections for a key. The table never touches these; the list view owns them. */
export function readListFilters(key: string | undefined): Record<string, string> | undefined {
  return readListState(key)?.filters;
}

export function writeListFilters(key: string | undefined, filters: Record<string, string>): void {
  writeListState(key, { filters });
}

/** Test and diagnostic use only. Not called by the product. */
export function clearListState(key?: string): void {
  if (!isClient()) return;
  if (key) store.delete(key);
  else store.clear();
}
