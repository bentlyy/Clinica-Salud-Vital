import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendMail = vi.fn();
const mockVerify = vi.fn();
const mockSetApiKey = vi.fn();
const mockSgSend = vi.fn();

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
      verify: mockVerify,
    })),
  },
  createTransport: vi.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  })),
}));

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: mockSetApiKey,
    send: mockSgSend,
  },
  setApiKey: mockSetApiKey,
  send: mockSgSend,
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/shared/multi-tenant.service.js', () => ({
  tenantService: { getById: vi.fn() },
}));

const OLD_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = { ...OLD_ENV };
  delete process.env.SENDGRID_API_KEY;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
});

describe('email.service', () => {
  describe('validateEmailConfig', () => {
    it('configures SendGrid when SENDGRID_API_KEY is set', async () => {
      process.env.SENDGRID_API_KEY = 'sg_key';
      const { validateEmailConfig } = await import('../../src/shared/email.service.js');
      validateEmailConfig();
      expect(mockSetApiKey).toHaveBeenCalledWith('sg_key');
    });

    it('handles SendGrid init failure', async () => {
      process.env.SENDGRID_API_KEY = 'sg_key';
      mockSetApiKey.mockImplementationOnce(() => { throw new Error('SendGrid config error'); });

      const { validateEmailConfig } = await import('../../src/shared/email.service.js');
      const logger = (await import('../../src/utils/logger.js')).logger;
      validateEmailConfig();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error al configurar SendGrid'), expect.any(Object));
    });

    it('configures SMTP when EMAIL_USER and EMAIL_PASS are set', async () => {
      process.env.EMAIL_USER = 'user@gmail.com';
      process.env.EMAIL_PASS = 'pass';
      const { validateEmailConfig } = await import('../../src/shared/email.service.js');
      validateEmailConfig();
      const nodemailer = await import('nodemailer');
      expect(nodemailer.default.createTransport).toHaveBeenCalled();
    });

    it('logs warning when no provider configured', async () => {
      const { validateEmailConfig } = await import('../../src/shared/email.service.js');
      const logger = (await import('../../src/utils/logger.js')).logger;
      validateEmailConfig();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Sin proveedor'));
    });

    it('calls transporter.verify on SMTP config and logs success', async () => {
      process.env.EMAIL_USER = 'user@gmail.com';
      process.env.EMAIL_PASS = 'pass';
      mockVerify.mockImplementation((cb) => cb(null));

      const { validateEmailConfig } = await import('../../src/shared/email.service.js');
      const logger = (await import('../../src/utils/logger.js')).logger;
      validateEmailConfig();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('SMTP verificada'));
    });

    it('calls transporter.verify on SMTP config and logs failure', async () => {
      process.env.EMAIL_USER = 'user@gmail.com';
      process.env.EMAIL_PASS = 'pass';
      mockVerify.mockImplementation((cb) => cb(new Error('Connection failed')));

      const { validateEmailConfig } = await import('../../src/shared/email.service.js');
      const logger = (await import('../../src/utils/logger.js')).logger;
      validateEmailConfig();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Falló verificación'), expect.any(Object));
    });
  });

  describe('sendEmail', () => {
    it('handles SMTP init failure', async () => {
      process.env.EMAIL_USER = 'user@gmail.com';
      process.env.EMAIL_PASS = 'pass';

      const nodemailer = await import('nodemailer');
      nodemailer.default.createTransport.mockImplementationOnce(() => { throw new Error('SMTP init failed'); });

      const { validateEmailConfig } = await import('../../src/shared/email.service.js');
      const logger = (await import('../../src/utils/logger.js')).logger;
      validateEmailConfig();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error al crear transporte SMTP'), expect.any(Object));
    });

    it('returns sent=true in log mode', async () => {
      const { sendEmail } = await import('../../src/shared/email.service.js');
      const logger = (await import('../../src/utils/logger.js')).logger;
      const result = await sendEmail({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>' });
      expect(result.sent).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Modo log'));
    });

    it('sends via SendGrid when provider is sendgrid', async () => {
      process.env.SENDGRID_API_KEY = 'sg_key';
      process.env.EMAIL_USER = 'from@test.com';
      mockSgSend.mockResolvedValue([{ statusCode: 202 }]);

      const { validateEmailConfig, sendEmail } = await import('../../src/shared/email.service.js');
      validateEmailConfig();

      const result = await sendEmail({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>' });
      expect(result.sent).toBe(true);
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('handles SendGrid error gracefully', async () => {
      process.env.SENDGRID_API_KEY = 'sg_key';
      mockSgSend.mockRejectedValue(new Error('SendGrid error'));

      const { validateEmailConfig, sendEmail } = await import('../../src/shared/email.service.js');
      validateEmailConfig();

      const result = await sendEmail({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>' });
      expect(result.sent).toBe(false);
      expect(result.error).toBe('SendGrid error');
    });

    it('sends via SMTP when provider is smtp', async () => {
      process.env.EMAIL_USER = 'user@gmail.com';
      process.env.EMAIL_PASS = 'pass';
      mockSendMail.mockResolvedValue({ accepted: ['test@test.com'] });

      const { validateEmailConfig, sendEmail } = await import('../../src/shared/email.service.js');
      validateEmailConfig();

      const result = await sendEmail({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>' });
      expect(result.sent).toBe(true);
    });

    it('handles SMTP error gracefully', async () => {
      process.env.EMAIL_USER = 'user@gmail.com';
      process.env.EMAIL_PASS = 'pass';
      mockSendMail.mockRejectedValue(new Error('SMTP error'));

      const { validateEmailConfig, sendEmail } = await import('../../src/shared/email.service.js');
      validateEmailConfig();

      const result = await sendEmail({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>' });
      expect(result.sent).toBe(false);
      expect(result.error).toBe('SMTP error');
    });

    it('uses tenant sender name and address when provided', async () => {
      process.env.SENDGRID_API_KEY = 'sg_key';
      const { tenantService } = await import('../../src/shared/multi-tenant.service.js');
      vi.mocked(tenantService.getById).mockReturnValue({
        id: 't1',
        config: { email_from_name: 'Clinic X', email_from_address: 'noreply@clinicx.com' },
      });

      const { validateEmailConfig, sendEmail } = await import('../../src/shared/email.service.js');
      validateEmailConfig();
      mockSgSend.mockResolvedValue([{ statusCode: 202 }]);

      await sendEmail({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>', tenantId: 't1' });

      expect(mockSgSend).toHaveBeenCalledWith(expect.objectContaining({
        from: { email: 'noreply@clinicx.com', name: 'Clinic X' },
      }));
    });

    it('falls back to the default sender when tenant config is missing', async () => {
      process.env.SENDGRID_API_KEY = 'sg_key';
      process.env.EMAIL_USER = 'fallback@test.com';
      const { tenantService } = await import('../../src/shared/multi-tenant.service.js');
      vi.mocked(tenantService.getById).mockReturnValue({ id: 't1', config: undefined });

      const { validateEmailConfig, sendEmail } = await import('../../src/shared/email.service.js');
      validateEmailConfig();
      mockSgSend.mockResolvedValue([{ statusCode: 202 }]);

      await sendEmail({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>', tenantId: 't1' });

      expect(mockSgSend).toHaveBeenCalledWith(expect.objectContaining({
        from: { email: 'fallback@test.com', name: 'Clinic App' },
      }));
    });

    it('uses tenant sender for SMTP too', async () => {
      process.env.EMAIL_USER = 'user@gmail.com';
      process.env.EMAIL_PASS = 'pass';
      const { tenantService } = await import('../../src/shared/multi-tenant.service.js');
      vi.mocked(tenantService.getById).mockReturnValue({
        id: 't1',
        config: { email_from_name: 'Clinic Y', email_from_address: 'y@clinic.com' },
      });
      mockSendMail.mockResolvedValue({ accepted: ['test@test.com'] });

      const { validateEmailConfig, sendEmail } = await import('../../src/shared/email.service.js');
      validateEmailConfig();

      await sendEmail({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>', tenantId: 't1' });

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        from: '"Clinic Y" <y@clinic.com>',
      }));
    });
  });
});
