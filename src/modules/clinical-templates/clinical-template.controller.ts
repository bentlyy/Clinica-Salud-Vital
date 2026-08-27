import type { Request, Response } from 'express';
import * as templateService from './clinical-template.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const getTemplates = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit)) || 100;
  const offset = parseInt(String(req.query.offset)) || 0;
  const templates = await templateService.getAllTemplates(req.tenant_id, limit, offset);
  res.json(templates);
});

export const getTemplateById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const template = await templateService.getTemplateById(id, req.tenant_id);
  res.json(template);
});

export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await templateService.createTemplate(req.body, req.tenant_id);
  res.status(201).json(template);
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const template = await templateService.updateTemplate(id, req.body, req.user!.id, req.tenant_id);
  res.json(template);
});

export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const result = await templateService.deleteTemplate(id, req.tenant_id);
  res.json(result);
});
