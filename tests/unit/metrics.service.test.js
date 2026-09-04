import { describe, it, expect } from 'vitest';

describe('metrics.service', () => {
  it('exposes counters through the Prometheus registry', async () => {
    const { httpRequestsTotal, emailsTotal, jobsTotal, registry } = await import('../../src/shared/metrics.service.js');

    httpRequestsTotal.inc({ method: 'GET', path: '/api/bookings/1', status: '200' });
    emailsTotal.inc({ provider: 'sendgrid', status: 'sent' });
    jobsTotal.inc({ type: 'email:send', status: 'completed' });

    const text = await registry.metrics();
    expect(text).toContain('vitaria_http_requests_total');
    expect(text).toContain('vitaria_emails_total');
    expect(text).toContain('vitaria_jobs_total');
  });

  it('normalizes numeric path segments to keep cardinality bounded', async () => {
    const { normalizePath } = await import('../../src/shared/metrics.service.js');
    expect(normalizePath('/api/bookings/123/status')).toBe('/api/bookings/:id/status');
    expect(normalizePath('/api/clinical-records/42')).toBe('/api/clinical-records/:id');
  });

  it('records HTTP duration histogram with numeric buckets', async () => {
    const { httpRequestDurationSeconds, registry } = await import('../../src/shared/metrics.service.js');
    httpRequestDurationSeconds.observe({ method: 'GET', path: '/api/x', status: '200' }, 0.25);

    const text = await registry.metrics();
    expect(text).toContain('vitaria_http_request_duration_seconds_bucket');
  });
});