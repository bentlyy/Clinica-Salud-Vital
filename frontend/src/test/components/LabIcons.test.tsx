import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  BloodTestIcon,
  GlucoseIcon,
  LipidIcon,
  KidneyIcon,
  ThyroidIcon,
  UrineIcon,
  HbA1cIcon,
  InflammationIcon,
  LiverIcon,
  LabIcon,
  getLabIcon,
  getLabColor,
  LAB_COLORS,
} from '@/shared/components/lab-icons/LabIcons';

describe('LabIcons', () => {
  const icons = [
    ['BloodTestIcon', BloodTestIcon],
    ['GlucoseIcon', GlucoseIcon],
    ['LipidIcon', LipidIcon],
    ['KidneyIcon', KidneyIcon],
    ['ThyroidIcon', ThyroidIcon],
    ['UrineIcon', UrineIcon],
    ['HbA1cIcon', HbA1cIcon],
    ['InflammationIcon', InflammationIcon],
    ['LiverIcon', LiverIcon],
    ['LabIcon', LabIcon],
  ] as const;

  it.each(icons)('renders %s as an svg with default size', (_name, Icon) => {
    const { container } = render(<Icon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
    expect(svg).toHaveAttribute('viewBox', '0 0 48 48');
  });

  it('applies a custom size', () => {
    const { container } = render(<GlucoseIcon size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('applies a custom color to the svg root', () => {
    const { container } = render(<KidneyIcon color="#ff0000" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('color', '#ff0000');
  });

  it('omits the color attribute when no color is provided', () => {
    const { container } = render(<KidneyIcon />);
    const svg = container.querySelector('svg');
    expect(svg).not.toHaveAttribute('color');
  });
});

describe('getLabIcon', () => {
  it('returns the matching icon for known names', () => {
    expect(getLabIcon('Hemograma completo')).toBe(BloodTestIcon);
    expect(getLabIcon('Glucosa')).toBe(GlucoseIcon);
    expect(getLabIcon('Creatinina')).toBe(KidneyIcon);
    expect(getLabIcon('TSH')).toBe(ThyroidIcon);
    expect(getLabIcon('Urocultivo')).toBe(UrineIcon);
    expect(getLabIcon('PCR')).toBe(InflammationIcon);
    expect(getLabIcon('Transaminasas')).toBe(LiverIcon);
    expect(getLabIcon('HbA1c')).toBe(HbA1cIcon);
  });

  it('normalizes accents before matching', () => {
    expect(getLabIcon('Perfil Lipídico')).toBe(LipidIcon);
    expect(getLabIcon('perfil')).toBe(LipidIcon);
  });

  it('matches by substring', () => {
    expect(getLabIcon('Hemoglobina glicosilada')).toBe(HbA1cIcon);
    expect(getLabIcon('Urocultivo con antibiograma')).toBe(UrineIcon);
  });

  it('falls back to the generic LabIcon for unknown names', () => {
    expect(getLabIcon('algo desconocido')).toBe(LabIcon);
    expect(getLabIcon('')).toBe(LabIcon);
    expect(getLabIcon(undefined as unknown as string)).toBe(LabIcon);
  });
});

describe('getLabColor', () => {
  it('returns the configured color for known names', () => {
    expect(getLabColor('hemograma')).toBe(LAB_COLORS.hemograma);
    expect(getLabColor('Glucosa')).toBe(LAB_COLORS.glucosa);
    expect(getLabColor('Creatinina')).toBe(LAB_COLORS.creatinina);
  });

  it('normalizes accents and matches by substring', () => {
    expect(getLabColor('Perfil Lipídico')).toBe('#f59e0b');
    expect(getLabColor('hemoglobina')).toBe('#ef4444');
  });

  it('falls back to the default color for unknown names', () => {
    expect(getLabColor('nada')).toBe('#06b6d4');
    expect(getLabColor('')).toBe('#06b6d4');
  });
});
