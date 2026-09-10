import { Request, Response } from 'express';
import * as attachmentsService from './attachments.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { createReadStream, existsSync } from 'fs';
import { NotFoundError } from '../../utils/errors.js';
import { getDoctorByUserId } from '../doctor/doctor.service.js';

const resolveDoctorId = async (req: Request): Promise<number | undefined> => {
  if (req.user?.role !== 'doctor') return undefined;
  const doctor = await getDoctorByUserId(req.user!.id, req.tenant_id);
  return doctor?.id;
};

export const uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = await resolveDoctorId(req);
  const attachment = await attachmentsService.uploadAttachment(
    req.user!.id,
    req.tenant_id,
    req.body,
    req.user!.role,
    doctorId,
  );
  res.status(201).json(attachment);
});

export const listAttachments = asyncHandler(async (req: Request, res: Response) => {
  const entityType = String(req.query.entity_type);
  const entityId = Number(req.query.entity_id);
  const doctorId = await resolveDoctorId(req);
  const items = await attachmentsService.listAttachments(
    entityType,
    entityId,
    req.tenant_id,
    req.user!.id,
    req.user!.role,
    doctorId,
  );
  res.json({ data: items });
});

export const downloadAttachment = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = await resolveDoctorId(req);
  const { record, filePath } = await attachmentsService.getAttachment(
    Number(req.params.id),
    req.tenant_id,
    req.user!.id,
    req.user!.role,
    doctorId,
  );
  if (!existsSync(filePath)) throw new NotFoundError('El archivo no existe en disco');
  res.setHeader('Content-Type', record.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(record.original_name)}"`);
  createReadStream(filePath).pipe(res);
});

export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = await resolveDoctorId(req);
  await attachmentsService.deleteAttachment(
    Number(req.params.id),
    req.tenant_id,
    req.user!.id,
    req.user!.role,
    doctorId,
  );
  res.json({ message: 'Attachment deleted' });
});