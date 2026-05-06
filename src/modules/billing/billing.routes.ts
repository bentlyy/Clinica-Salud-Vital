import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createInvoiceSchema, updateInvoiceStatusSchema, invoiceIdSchema } from './billing.schema';
import { getInvoices, getInvoiceById, createInvoice, updateInvoiceStatus, deleteInvoice, getBillingStats } from './billing.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', authorize('admin', 'doctor', 'user'), getInvoices);
router.get('/stats', authorize('admin', 'doctor'), getBillingStats);
router.get('/:id', authorize('admin', 'doctor', 'user'), validate(invoiceIdSchema, 'params'), getInvoiceById);
router.post('/', authorize('admin', 'doctor'), validate(createInvoiceSchema), createInvoice);
router.patch('/:id/status', authorize('admin'), validate(invoiceIdSchema, 'params'), validate(updateInvoiceStatusSchema), updateInvoiceStatus);
router.delete('/:id', authorize('admin', 'doctor'), validate(invoiceIdSchema, 'params'), deleteInvoice);

export default router;

