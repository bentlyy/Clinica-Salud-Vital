import * as specialtiesService from './specialties.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const getSpecialties = asyncHandler(async (req, res) => {
  const specialties = await specialtiesService.getAllSpecialties();
  res.json(specialties);
});

export const createSpecialty = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const specialty = await specialtiesService.createSpecialty(name);
  res.status(201).json(specialty);
});
