import { useEffect, useRef, useCallback } from 'react';

interface RealtimeOptions {
  url?: string;
  onMetricsUpdate?: (data: unknown) => void;
  onNewRequest?: (data: unknown) => void;
  onStatusChange?: (data: unknown) => void;
  onNotification?: (data: unknown) => void;
  enabled?: boolean;
}

export function useLabRealtime(options: RealtimeOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { enabled = true } = options;

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return;

    const url = options.url || '/api/laboratory/events';
    const es = new EventSource(url);

    es.addEventListener('metrics', (event) => {
      try { options.onMetricsUpdate?.(JSON.parse(event.data)); } catch { /* ignore */ }
    });

    es.addEventListener('new-request', (event) => {
      try { options.onNewRequest?.(JSON.parse(event.data)); } catch { /* ignore */ }
    });

    es.addEventListener('status-change', (event) => {
      try { options.onStatusChange?.(JSON.parse(event.data)); } catch { /* ignore */ }
    });

    es.addEventListener('notification', (event) => {
      try { options.onNotification?.(JSON.parse(event.data)); } catch { /* ignore */ }
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setTimeout(connect, 5000);
    };

    eventSourceRef.current = es;
  }, [enabled, options]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [connect]);

  return {
    disconnect: () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    },
    reconnect: connect,
  };
}
