import { Request, Response } from 'express';
import * as attachmentsService from './attachments.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { createReadStream, existsSync } from 'fs';
import { NotFoundError } from '../../utils/errors.js';

export const uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
  const attachment = await attachmentsService.uploadAttachment(req.user!.id, req.tenant_id, req.body);
  res.status(201).json(attachment);
});

export const listAttachments = asyncHandler(async (req: Request, res: Response) => {
  const entityType = String(req.query.entity_type);
  const entityId = Number(req.query.entity_id);
  const items = await attachmentsService.listAttachments(entityType, entityId, req.tenant_id);
  res.json({ data: items });
});

export const downloadAttachment = asyncHandler(async (req: Request, res: Response) => {
  const { record, filePath } = await attachmentsService.getAttachment(Number(req.params.id), req.tenant_id);
  if (!existsSync(filePath)) throw new NotFoundError('El archivo no existe en disco');
  res.setHeader('Content-Type', record.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(record.original_name)}"`);
  createReadStream(filePath).pipe(res);
});

export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
  await attachmentsService.deleteAttachment(Number(req.params.id), req.tenant_id, req.user!.id, req.user!.role);
  res.json({ message: 'Attachment deleted' });
});
