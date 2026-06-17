import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createInvoiceSchema, updateInvoiceStatusSchema, invoiceIdSchema } from './billing.schema.js';
import { getInvoices, getInvoiceById, createInvoice, updateInvoiceStatus, deleteInvoice, getBillingStats } from './billing.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', authorize('admin', 'doctor', 'user', 'patient'), getInvoices);
router.get('/stats', authorize('admin', 'doctor'), getBillingStats);
router.get('/:id', authorize('admin', 'doctor', 'user', 'patient'), validateZod(invoiceIdSchema, 'params'), getInvoiceById);
router.post('/', authorize('admin', 'doctor'), validateZod(createInvoiceSchema), createInvoice);
router.patch('/:id/status', authorize('admin'), validateZod(invoiceIdSchema, 'params'), validateZod(updateInvoiceStatusSchema), updateInvoiceStatus);
router.delete('/:id', authorize('admin', 'doctor'), validateZod(invoiceIdSchema, 'params'), deleteInvoice);

export default router;

