export const getJWTSecret = (): string => {
  return process.env.JWT_SECRET || 'dev-secret';
};
