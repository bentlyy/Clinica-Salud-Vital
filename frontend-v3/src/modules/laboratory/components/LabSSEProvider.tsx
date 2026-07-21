import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { labService } from '../services/lab.service';
import type { LabSSEEvent } from '../hooks/useLab';

interface LabSSEContextType {
  events: LabSSEEvent[];
  isConnected: boolean;
  clearEvents: () => void;
}

const LabSSEContext = createContext<LabSSEContextType>({
  events: [],
  isConnected: false,
  clearEvents: () => {},
});

export function LabSSEProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<LabSSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventsRef = useRef<LabSSEEvent[]>([]);

  const handleEvent = useCallback((event: string, data: unknown) => {
    const newEvent: LabSSEEvent = { type: event, payload: data };
    eventsRef.current = [newEvent, ...eventsRef.current].slice(0, 50);
    setEvents([...eventsRef.current]);
  }, []);

  useEffect(() => {
    const disconnect = labService.connectSSE(handleEvent);
    setIsConnected(true);

    return () => {
      disconnect();
      setIsConnected(false);
    };
  }, [handleEvent]);

  const clearEvents = useCallback(() => {
    eventsRef.current = [];
    setEvents([]);
  }, []);

  const value = useMemo(
    () => ({ events, isConnected, clearEvents }),
    [events, isConnected, clearEvents],
  );

  return <LabSSEContext.Provider value={value}>{children}</LabSSEContext.Provider>;
}

export function useLabSSEContext(): LabSSEContextType {
  const ctx = useContext(LabSSEContext);
  return ctx;
}
