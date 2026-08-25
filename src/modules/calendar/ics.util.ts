export const formatDateUTC = (date: Date): string => {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
};

export const escapeText = (s: string): string =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');

interface VEventOptions {
  uid: string;
  dtstart: string;
  dtend: string;
  summary: string;
  description?: string;
  location?: string;
}

export const buildVEvent = ({ uid, dtstart, dtend, summary, description, location }: VEventOptions): string => {
  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${escapeText(uid)}`,
    `DTSTAMP:${formatDateUTC(new Date())}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeText(summary)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  lines.push('END:VEVENT');
  return lines.join('\r\n');
};

export const buildCalendar = (events: string[]): string => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vitaria//Clinic Calendar//ES',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
};
