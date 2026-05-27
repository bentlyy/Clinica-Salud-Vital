import { Request, Response } from 'express';
import * as specialtiesService from './specialties.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const getSpecialties = asyncHandler(async (_req: Request, res: Response) => {
  const specialties = await specialtiesService.getAllSpecialties();
  res.json(specialties);
});

export const createSpecialty = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  const specialty = await specialtiesService.createSpecialty(name);
  res.status(201).json(specialty);
});
