/**
 * Pro-rata salary calculation utility
 * Calculates salary based on months and days worked
 */

/**
 * Calculate the number of days between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} - Number of days
 */
function getDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate pro-rata salary based on days worked in a period
 * @param {number} baseSalary - Monthly base salary
 * @param {number} daysWorked - Number of days worked
 * @param {number} totalDaysInPeriod - Total days in the pay period
 * @returns {number} - Pro-rata salary
 */
function calculateProRataByDays(baseSalary, daysWorked, totalDaysInPeriod) {
  if (!baseSalary || !daysWorked || !totalDaysInPeriod) {
    return baseSalary || 0;
  }
  return (baseSalary / totalDaysInPeriod) * daysWorked;
}

/**
 * Calculate pro-rata salary based on months worked
 * @param {number} baseSalary - Monthly base salary
 * @param {number} monthsWorked - Number of months worked
 * @returns {number} - Pro-rata salary
 */
function calculateProRataByMonths(baseSalary, monthsWorked) {
  if (!baseSalary || !monthsWorked) {
    return baseSalary || 0;
  }
  return baseSalary * monthsWorked;
}

/**
 * Calculate pro-rata salary based on both months and days
 * @param {number} baseSalary - Monthly base salary
 * @param {number} monthsWorked - Number of full months worked
 * @param {number} daysWorked - Number of additional days worked
 * @param {number} daysInMonth - Number of days in the partial month (default: 30)
 * @returns {number} - Pro-rata salary
 */
function calculateProRataByMonthsAndDays(baseSalary, monthsWorked, daysWorked, daysInMonth = 30) {
  if (!baseSalary) return 0;
  
  const monthlySalary = calculateProRataByMonths(baseSalary, monthsWorked);
  const dailySalary = baseSalary / daysInMonth;
  const daysSalary = dailySalary * daysWorked;
  
  return monthlySalary + daysSalary;
}

/**
 * Calculate pro-rata salary for a pay period
 * @param {Object} params - Calculation parameters
 * @param {number} params.baseSalary - Monthly base salary
 * @param {Date} params.periodStart - Pay period start date
 * @param {Date} params.periodEnd - Pay period end date
 * @param {Date} params.employeeJoinDate - Employee join date (for partial periods)
 * @param {Date} params.employeeLeaveDate - Employee leave date (for partial periods)
 * @param {number} params.attendanceDays - Number of days attended (optional)
 * @returns {Object} - Calculation result with pro-rata salary and metadata
 */
function calculateProRataSalary({
  baseSalary,
  periodStart,
  periodEnd,
  employeeJoinDate,
  employeeLeaveDate,
  attendanceDays,
}) {
  if (!baseSalary) {
    return {
      calculatedSalary: 0,
      isProRata: false,
      proRataDays: null,
      proRataMonths: null,
      calculationMethod: 'none',
    };
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const totalDaysInPeriod = getDaysBetween(start, end);

  // Check if this is a partial period (employee joined or left during period)
  const joinDate = employeeJoinDate ? new Date(employeeJoinDate) : null;
  const leaveDate = employeeLeaveDate ? new Date(employeeLeaveDate) : null;

  // Employee joined during the period
  if (joinDate && joinDate > start) {
    const daysWorked = getDaysBetween(joinDate, end);
    const calculatedSalary = calculateProRataByDays(baseSalary, daysWorked, totalDaysInPeriod);
    
    return {
      calculatedSalary,
      isProRata: true,
      proRataDays: daysWorked,
      proRataMonths: null,
      calculationMethod: 'days_from_join_date',
      totalDaysInPeriod,
    };
  }

  // Employee left during the period
  if (leaveDate && leaveDate < end) {
    const daysWorked = getDaysBetween(start, leaveDate);
    const calculatedSalary = calculateProRataByDays(baseSalary, daysWorked, totalDaysInPeriod);
    
    return {
      calculatedSalary,
      isProRata: true,
      proRataDays: daysWorked,
      proRataMonths: null,
      calculationMethod: 'days_until_leave_date',
      totalDaysInPeriod,
    };
  }

  // If attendance days are provided and less than total period, use pro-rata by days
  if (attendanceDays && attendanceDays < totalDaysInPeriod) {
    const calculatedSalary = calculateProRataByDays(baseSalary, attendanceDays, totalDaysInPeriod);
    
    return {
      calculatedSalary,
      isProRata: true,
      proRataDays: attendanceDays,
      proRataMonths: null,
      calculationMethod: 'days_attended',
      totalDaysInPeriod,
    };
  }

  // Full period - no pro-rata needed
  return {
    calculatedSalary: baseSalary,
    isProRata: false,
    proRataDays: null,
    proRataMonths: null,
    calculationMethod: 'full_period',
    totalDaysInPeriod,
  };
}

/**
 * Generate invoice number
 * @param {string} gymId - Gym ID
 * @param {Date} date - Invoice date
 * @returns {string} - Invoice number
 */
function generateInvoiceNumber(gymId, date = new Date()) {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${dateStr}-${randomSuffix}`;
}

module.exports = {
  getDaysBetween,
  calculateProRataByDays,
  calculateProRataByMonths,
  calculateProRataByMonthsAndDays,
  calculateProRataSalary,
  generateInvoiceNumber,
};
