export const getDayOfWeek = (dateStr: string): number => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const jsDay = new Date(year, month - 1, day).getDay();
  return jsDay === 0 ? 7 : jsDay;
};

export const isValidDate = (dateStr: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

export const isValidTime = (timeStr: string): boolean => /^\d{2}:\d{2}$/.test(timeStr);
