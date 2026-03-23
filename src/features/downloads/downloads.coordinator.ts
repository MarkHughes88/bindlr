import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { downloadsRepository } from '@/src/lib/repositories';
import { processDownloadQueue } from './downloads.worker';

export function useDownloadsQueueCoordinator(options?: {
  enabled?: boolean;
  intervalMs?: number;
  maxJobsPerTick?: number;
}) {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? 1500;
  const maxJobsPerTick = options?.maxJobsPerTick ?? 8;
  const isTickRunningRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let appState = AppState.currentState;

    const runTick = async () => {
      if (cancelled || appState !== 'active' || isTickRunningRef.current) {
        return;
      }

      isTickRunningRef.current = true;
      try {
        await processDownloadQueue({
          repository: downloadsRepository,
          maxJobs: maxJobsPerTick,
        });
      } finally {
        isTickRunningRef.current = false;
      }
    };

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      appState = nextState;
      if (nextState === 'active') {
        void runTick();
      }
    });

    const intervalId = setInterval(() => {
      void runTick();
    }, intervalMs);

    void runTick();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [enabled, intervalMs, maxJobsPerTick]);
}
