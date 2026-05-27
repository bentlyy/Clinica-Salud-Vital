import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/billing/billing.service.js', () => ({
  getInvoices: vi.fn(),
  getInvoiceById: vi.fn(),
  createInvoice: vi.fn(),
  updateInvoiceStatus: vi.fn(),
  deleteInvoice: vi.fn(),
  getBillingStats: vi.fn(),
}));

vi.mock('../../src/modules/doctor/doctor.service.js', () => ({
  getDoctorByUserId: vi.fn(),
}));

import * as billingService from '../../src/modules/billing/billing.service.js';
import * as doctorService from '../../src/modules/doctor/doctor.service.js';
import * as billingController from '../../src/modules/billing/billing.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('billingController.getInvoices', () => {
  it('returns invoices for admin with filters', async () => {
    vi.mocked(billingService.getInvoices).mockResolvedValue([{ id: 1, total: 100 }]);
    const req = { user: { role: 'admin' }, tenant_id: 'test', query: { limit: '10', offset: '0' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.getInvoices(req, res, next);
    await flush();
    expect(billingService.getInvoices).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([{ id: 1, total: 100 }]);
  });

  it('returns invoices for user', async () => {
    vi.mocked(billingService.getInvoices).mockResolvedValue([{ id: 1, total: 50 }]);
    const req = { user: { role: 'user', id: 5 }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.getInvoices(req, res, next);
    await flush();
    expect(billingService.getInvoices).toHaveBeenCalledWith({ patient_id: 5, limit: 50, offset: 0 }, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, total: 50 }]);
  });

  it('returns invoices for doctor', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 10 });
    vi.mocked(billingService.getInvoices).mockResolvedValue([{ id: 1, total: 75 }]);
    const req = { user: { role: 'doctor', id: 2 }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.getInvoices(req, res, next);
    await flush();
    expect(billingService.getInvoices).toHaveBeenCalledWith({ doctor_id: 10, limit: 50, offset: 0 }, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, total: 75 }]);
  });

  it('calls next with error if doctor not found for doctor role', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { role: 'doctor', id: 2 }, query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.getInvoices(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('billingController.getInvoiceById', () => {
  it('returns invoice', async () => {
    vi.mocked(billingService.getInvoiceById).mockResolvedValue({ id: 1, patient_id: 5, doctor_id: 10 });
    const req = { params: { id: '1' }, user: { role: 'admin' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.getInvoiceById(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ id: 1, patient_id: 5, doctor_id: 10 });
  });

  it('calls next with error for invalid id', async () => {
    const req = { params: { id: '-1' }, user: { role: 'admin' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.getInvoiceById(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next with error for wrong user', async () => {
    vi.mocked(billingService.getInvoiceById).mockResolvedValue({ id: 1, patient_id: 99, doctor_id: 10 });
    const req = { params: { id: '1' }, user: { role: 'user', id: 5 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.getInvoiceById(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next with error for wrong doctor', async () => {
    vi.mocked(billingService.getInvoiceById).mockResolvedValue({ id: 1, patient_id: 5, doctor_id: 99 });
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 10 });
    const req = { params: { id: '1' }, user: { role: 'doctor', id: 2 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.getInvoiceById(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('billingController.createInvoice', () => {
  it('creates and returns 201', async () => {
    vi.mocked(billingService.createInvoice).mockResolvedValue({ id: 1 });
    const req = { tenant_id: 'test', body: { patient_id: 1, total: 100 } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    billingController.createInvoice(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });
});

describe('billingController.updateInvoiceStatus', () => {
  it('updates status', async () => {
    vi.mocked(billingService.updateInvoiceStatus).mockResolvedValue({ id: 1, status: 'paid' });
    const req = { params: { id: '1' }, tenant_id: 'test', body: { status: 'paid', payment_data: {} } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.updateInvoiceStatus(req, res, next);
    await flush();
    expect(billingService.updateInvoiceStatus).toHaveBeenCalledWith(1, 'paid', {}, 'test');
    expect(res.json).toHaveBeenCalledWith({ id: 1, status: 'paid' });
  });
});

describe('billingController.deleteInvoice', () => {
  it('deletes invoice', async () => {
    vi.mocked(billingService.deleteInvoice).mockResolvedValue({ message: 'Deleted' });
    const req = { params: { id: '1' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.deleteInvoice(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' });
  });
});

describe('billingController.getBillingStats', () => {
  it('returns stats', async () => {
    vi.mocked(billingService.getBillingStats).mockResolvedValue({ total: 1000 });
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    billingController.getBillingStats(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ total: 1000 });
  });
});
