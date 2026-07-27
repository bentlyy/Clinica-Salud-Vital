import { useQuery } from '@tanstack/react-query';
import { patientService } from '../services/patient.service';
import type { PatientListParams } from '../types/patient.types';

export const patientKeys = {
  all: ['patients'] as const,
  list: (params?: PatientListParams) => ['patients', 'list', params] as const,
};

export function usePatientList(params?: PatientListParams) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: ({ signal }) => patientService.list(params, { signal }),
    placeholderData: (prev) => prev,
  });
}
