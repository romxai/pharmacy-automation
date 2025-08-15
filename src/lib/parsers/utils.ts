// This helper function can be shared by parsers
export const parseDate = (dateStr: string): Date => {
  // This regex handles both dd-mm-yyyy and dd/mm/yyyy
  const [day, month, year] = dateStr.split(/[\/-]/);
  // Create date in UTC to avoid timezone issues
  return new Date(`${year}-${month}-${day}T12:00:00.000Z`);
};
