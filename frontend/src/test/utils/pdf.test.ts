import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());
const mockLoggerError = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock('@/shared/services/api-client', () => ({
  apiClient: { get: mockGet },
}));

vi.mock('@/shared/utils/logger', () => ({
  logger: { error: mockLoggerError },
}));

vi.mock('react-hot-toast', () => ({
  default: { error: mockToastError },
}));

vi.mock('@/i18n/i18n', () => ({
  default: { t: (key: string) => key },
}));

import {
  downloadPdf,
  downloadLabOrderPdf,
  downloadClinicalRecordPdf,
  downloadPrescriptionPdf,
} from '@/shared/utils/pdf';

describe('pdf', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { writable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: revokeObjectURL });
  });

  it('downloads a PDF from the API and triggers the browser download', async () => {
    mockGet.mockResolvedValue({ data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }) });

    await downloadPdf('/documents/1/pdf', 'reporte.pdf');

    expect(mockGet).toHaveBeenCalledWith('/documents/1/pdf', { responseType: 'blob' });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg.type).toBe('application/pdf');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('builds the URL and filename for lab orders', async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    mockGet.mockResolvedValue({ data: new Blob(['x']) });
    await downloadLabOrderPdf(7);
    expect(mockGet).toHaveBeenCalledWith('/laboratory/7/pdf', { responseType: 'blob' });
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor).toBeDefined();
    expect(anchor.download).toBe('orden-7.pdf');
    expect(anchor.href).toContain('blob:');
    clickSpy.mockRestore();
  });

  it('builds the URL and filename for clinical records', async () => {
    mockGet.mockResolvedValue({ data: new Blob(['x']) });
    await downloadClinicalRecordPdf(3);
    expect(mockGet).toHaveBeenCalledWith('/clinical-records/3/pdf', { responseType: 'blob' });
  });

  it('builds the URL and filename for prescriptions', async () => {
    mockGet.mockResolvedValue({ data: new Blob(['x']) });
    await downloadPrescriptionPdf(9);
    expect(mockGet).toHaveBeenCalledWith('/prescriptions/9/pdf', { responseType: 'blob' });
  });

  it('removes the temporary anchor element from the DOM', async () => {
    mockGet.mockResolvedValue({ data: new Blob(['x']) });
    await downloadPdf('/a', 'a.pdf');
    expect(document.querySelector('a[download="a.pdf"]')).toBeNull();
  });

  it('logs the error, shows a toast and rethrows when the request fails', async () => {
    const error = new Error('network down');
    mockGet.mockRejectedValue(error);

    await expect(downloadPdf('/a', 'a.pdf')).rejects.toBe(error);
    expect(mockLoggerError).toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith('errors:pdfDownloadError');
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
