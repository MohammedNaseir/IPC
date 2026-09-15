'use client';

import { useCallback, useTransition } from 'react';
import type { ActionResult } from '@/lib/action-result';

// Runs a Server Action, surfaces its user-facing error, and calls onSuccess when it succeeds.
// The action itself refreshes server data via `refresh()`.
export function useActionRunner() {
  const [isPending, startTransition] = useTransition();

  const run = useCallback(<T,>(action: () => Promise<ActionResult<T>>, onSuccess?: (data: T) => void) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      onSuccess?.(result.data);
    });
  }, []);

  return { run, isPending };
}
