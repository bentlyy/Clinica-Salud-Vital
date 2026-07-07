interface TimelineEvent {
  status: string;
  label: string;
  timestamp: string | null;
  user?: string;
  active?: boolean;
}

interface SampleTimelineProps {
  events: TimelineEvent[];
}

export default function SampleTimeline({ events }: SampleTimelineProps) {
  const validEvents = events.filter(e => e.timestamp);

  return (
    <div style={{ padding: '12px 0' }}>
      {validEvents.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin eventos registrados</p>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <div style={{
            position: 'absolute', left: 8, top: 4, bottom: 4,
            width: 2, background: '#e5e7eb',
          }} />
          {validEvents.map((event, idx) => (
            <div key={idx} style={{ position: 'relative', paddingBottom: 12 }}>
              <div style={{
                position: 'absolute', left: -20, top: 4,
                width: 12, height: 12, borderRadius: '50%',
                background: event.active ? '#22c55e' : '#d1d5db',
                border: `2px solid ${event.active ? '#16a34a' : '#e5e7eb'}`,
                zIndex: 1,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{event.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}
                  {event.user && ` — por ${event.user}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
