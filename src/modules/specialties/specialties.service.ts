import { BadRequestError } from '../../utils/errors.js';

export const SPECIALTIES = [
  'Medicina General',
  'Pediatría',
  'Cardiología',
  'Dermatología',
  'Ginecología',
  'Obstetricia',
  'Traumatología',
  'Oftalmología',
  'Otorrinolaringología',
  'Neurología',
  'Psiquiatría',
  'Psicología',
  'Nutrición',
  'Fonoaudiología',
  'Kinesiología',
  'Medicina Interna',
  'Cirugía General',
  'Urología',
  'Endocrinología',
  'Reumatología',
  'Gastroenterología',
  'Neumología',
  'Nefrología',
  'Oncología',
  'Hematología',
  'Medicina Deportiva',
  'Medicina Familiar',
  'Geriatría',
  'Alergología',
  'Infectología',
  'Medicina del Trabajo',
  'Medicina Estética',
  'Dolor y Cuidados Paliativos',
  'Radiología',
  'Anestesiología',
  'Medicina de Urgencia',
  'Dentista',
  'Cirugía Plástica',
  'Medicina Nuclear',
  'Patología',
  'Otra',
];

const SPECIALTIES_MAP = SPECIALTIES.map((name, i) => ({ id: i + 1, name }));

export const getAllSpecialties = async (): Promise<{ id: number; name: string }[]> => {
  return SPECIALTIES_MAP;
};

export const createSpecialty = async (name: string): Promise<{ id: number; name: string }> => {
  if (!name || name.trim().length === 0) throw new BadRequestError('Name is required');
  const trimmed = name.trim();
  const idx = SPECIALTIES.indexOf(trimmed);
  if (idx === -1) throw new BadRequestError('La especialidad no es válida');
  return { id: idx + 1, name: trimmed };
};

export const ensureSpecialty = async (name: string): Promise<{ id: number; name: string }> => {
  const trimmed = name.trim();
  if (!trimmed) throw new BadRequestError('Name is required');
  const idx = SPECIALTIES.indexOf(trimmed);
  if (idx === -1) throw new BadRequestError(`Invalid specialty: ${trimmed}`);
  return { id: idx + 1, name: trimmed };
};
