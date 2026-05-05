export const formatRut = (rut) => {
  const cleaned = rut.replace(/[^0-9kK]/g, '');
  if (cleaned.length < 2) return cleaned;
  const dv = cleaned.slice(-1).toUpperCase();
  const body = cleaned.slice(0, -1);
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
};

export const cleanRut = (rut) => rut.replace(/[^0-9kK]/g, '').toUpperCase();

export const validateRut = (rut) => {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return false;

  const dv = cleaned.slice(-1);
  const body = cleaned.slice(0, -1);
  const numBody = parseInt(body, 10);
  if (isNaN(numBody) || numBody === 0) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const expectedDv = 11 - remainder;

  let computedDv;
  if (expectedDv === 11) computedDv = '0';
  else if (expectedDv === 10) computedDv = 'K';
  else computedDv = String(expectedDv);

  return dv === computedDv;
};
