export const getDayOfWeek = (dateStr: string): number => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
};

export const isValidDate = (dateStr: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

export const isValidTime = (timeStr: string): boolean => /^\d{2}:\d{2}$/.test(timeStr);
