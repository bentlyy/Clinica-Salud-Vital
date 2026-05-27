interface ValidationError {
  field?: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[] | ValidationError[];
  days?: number;
}

interface NoShowPredictionData {
  doctorId?: number;
  userId?: number;
  date?: string;
  time?: string;
}

interface DiagnosisClassificationData {
  chiefComplaint?: string;
}

interface VitalSignsData {
  pressure?: string;
  heartRate?: string | number;
  temperature?: string | number;
}

interface VitalSignsAnalysisData {
  vitalSigns?: VitalSignsData;
}

interface SanitizedMLInput {
  chiefComplaint?: string;
  vitalSigns?: {
    pressure?: string;
    heartRate?: string | number;
    temperature?: string | number;
  };
}

const sanitizeString = (str: unknown): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>\"'&]/g, '').trim().substring(0, 1000);
};

const isValidDate = (date: unknown): boolean => {
  const d = new Date(String(date));
  return d instanceof Date && !isNaN(d.getTime());
};

const isValidTime = (time: unknown): boolean => {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(String(time));
};

export const validateNoShowPrediction = (data: NoShowPredictionData): ValidationResult => {
  const errors: string[] = [];

  if (data.doctorId !== undefined) {
    if (typeof data.doctorId !== 'number' || data.doctorId < 1) {
      errors.push('doctorId debe ser un n�mero positivo');
    }
  }

  if (data.userId !== undefined) {
    if (typeof data.userId !== 'number' || data.userId < 1) {
      errors.push('userId debe ser un n�mero positivo');
    }
  }

  if (!data.date) {
    errors.push('date es requerido');
  } else if (!isValidDate(data.date)) {
    errors.push('date debe ser una fecha v�lida');
  }

  if (data.time) {
    if (!isValidTime(data.time)) {
      errors.push('time debe tener formato HH:mm');
    }
  }

  return { valid: errors.length === 0, errors };
};

export const validateDiagnosisClassification = (data: DiagnosisClassificationData): ValidationResult => {
  const errors: string[] = [];

  if (!data.chiefComplaint) {
    errors.push('chiefComplaint es requerido');
  } else if (typeof data.chiefComplaint !== 'string') {
    errors.push('chiefComplaint debe ser texto');
  } else if (data.chiefComplaint.length < 2) {
    errors.push('chiefComplaint debe tener al menos 2 caracteres');
  } else if (data.chiefComplaint.length > 1000) {
    errors.push('chiefComplaint debe tener m�ximo 1000 caracteres');
  }

  return { valid: errors.length === 0, errors: errors.map(e => ({ field: 'chiefComplaint', message: e })) };
};

export const validateDemandForecast = (query: Record<string, unknown>): ValidationResult => {
  const errors: string[] = [];
  let days = 7;

  if (query.days) {
    days = parseInt(String(query.days));
    if (isNaN(days) || days < 1 || days > 30) {
      errors.push('days debe estar entre 1 y 30');
    }
  }

  return { valid: errors.length === 0, errors, days };
};

export const validateVitalSignsAnalysis = (data: VitalSignsAnalysisData): ValidationResult => {
  const errors: string[] = [];

  if (!data.vitalSigns) {
    errors.push('vitalSigns es requerido');
  } else {
    const vs = data.vitalSigns;

    if (vs.pressure) {
      const pressureRegex = /^(\d{2,3})\/(\d{2,3})$/;
      if (!pressureRegex.test(String(vs.pressure))) {
        errors.push('pressure debe tener formato sistólica/diastólica');
      } else {
        const [sys, dia] = String(vs.pressure).split('/').map(Number);
        if (sys < 60 || sys > 250) {
          errors.push('presión sistólica fuera de rango (60-250)');
        }
        if (dia < 40 || dia > 150) {
          errors.push('presión diastólica fuera de rango (40-150)');
        }
      }
    }

    if (vs.heartRate !== undefined) {
      const hr = parseInt(String(vs.heartRate));
      if (isNaN(hr) || hr < 30 || hr > 220) {
        errors.push('heartRate debe estar entre 30 y 220');
      }
    }

    if (vs.temperature !== undefined) {
      const temp = parseFloat(String(vs.temperature));
      if (isNaN(temp) || temp < 30 || temp > 45) {
        errors.push('temperature debe estar entre 30 y 45');
      }
    }
  }

  return { valid: errors.length === 0, errors };
};

export const sanitizeMLInput = (data: Record<string, unknown>): SanitizedMLInput => {
  if (!data || typeof data !== 'object') return {};

  const sanitized: SanitizedMLInput = {};

  if (data.chiefComplaint) {
    sanitized.chiefComplaint = sanitizeString(data.chiefComplaint);
  }

  if (data.vitalSigns && typeof data.vitalSigns === 'object') {
    const vs = data.vitalSigns as Record<string, unknown>;
    sanitized.vitalSigns = {
      pressure: vs.pressure ? sanitizeString(String(vs.pressure)) : undefined,
      heartRate: vs.heartRate as string | number | undefined,
      temperature: vs.temperature as string | number | undefined,
    };
  }

  return sanitized;
};
