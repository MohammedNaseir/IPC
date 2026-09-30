'use client';

import { useCallback, useTransition } from 'react';
import type { ActionResult } from '@/lib/action-result';
import { notify } from '@/lib/notify';

// Runs a Server Action, surfaces its user-facing error, and calls onSuccess when it succeeds.
// The action itself refreshes server data via `refresh()`. This is the shared error path every
// Server Action failure in the product flows through — one of the eight sites replaced by item 3.
export function useActionRunner() {
  const [isPending, startTransition] = useTransition();

  const run = useCallback(<T,>(action: () => Promise<ActionResult<T>>, onSuccess?: (data: T) => void) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        void notify.error(result.error);
        return;
      }
      onSuccess?.(result.data);
    });
  }, []);

  return { run, isPending };
}
