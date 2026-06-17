import { Request, Response } from 'express';
import * as specialtiesService from './specialties.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { BadRequestError } from '../../utils/errors.js';

export const getSpecialties = asyncHandler(async (_req: Request, res: Response) => {
  const specialties = await specialtiesService.getAllSpecialties();
  res.json(specialties);
});

export const getSpecialtyById = asyncHandler(async (req: Request, res: Response) => {
  const specialty = await specialtiesService.getSpecialtyById(Number(req.params.id));
  res.json(specialty);
});

export const createSpecialty = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) throw new BadRequestError('Name is required');
  const specialty = await specialtiesService.createSpecialty(name);
  res.status(201).json(specialty);
});

export const updateSpecialty = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body;
  const specialty = await specialtiesService.updateSpecialty(id, data);
  res.json(specialty);
});

export const deleteSpecialty = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await specialtiesService.deleteSpecialty(id);
  res.json({ message: 'Specialty deleted' });
});
