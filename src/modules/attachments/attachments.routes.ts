import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { uploadAttachment, listAttachments, downloadAttachment, deleteAttachment } from './attachments.controller.js';
import { uploadAttachmentSchema, listAttachmentsSchema, attachmentIdSchema } from './attachments.schema.js';

const router = Router();

router.use(authMiddleware);
router.post('/', authorize('doctor', 'admin', 'superadmin', 'patient', 'user'), validateZod(uploadAttachmentSchema), uploadAttachment);
router.get('/', authorize('doctor', 'admin', 'superadmin', 'patient', 'user'), validateZod(listAttachmentsSchema, 'query'), listAttachments);
router.get('/:id/download', authorize('doctor', 'admin', 'superadmin', 'patient', 'user'), validateZod(attachmentIdSchema, 'params'), downloadAttachment);
router.delete('/:id', authorize('doctor', 'admin', 'superadmin', 'patient', 'user'), validateZod(attachmentIdSchema, 'params'), deleteAttachment);

export default router;
