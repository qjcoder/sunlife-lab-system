/**
 * Calculate warranty status based on sale date, model warranty,
 * and service visit date.
 *
 * Warranty is ALWAYS derived — never trusted from user input.
 */

export const calculateWarrantyStatus = (
    saleDate,
    modelWarranty,
    visitDate = new Date()
  ) => {
    const start = new Date(saleDate);
    const end = new Date(visitDate);
  
    const monthsBetween = (d1, d2) =>
      d2.getFullYear() * 12 +
      d2.getMonth() -
      (d1.getFullYear() * 12 + d1.getMonth());
  
    const monthsUsed = monthsBetween(start, end);
  
    return {
      parts: monthsUsed <= modelWarranty.partsMonths,
      service: monthsUsed <= modelWarranty.serviceMonths
    };
  };