const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF for invoice
 * @param {Object} invoice - Invoice data with payroll, user, and gym details
 * @returns {Buffer} - PDF buffer
 */
function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Invoice details
      doc.fontSize(12).font('Helvetica');
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' });
      doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString('en-IN')}`, { align: 'right' });
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, { align: 'right' });
      doc.text(`Status: ${invoice.status.toUpperCase()}`, { align: 'right' });
      doc.moveDown();

      // Gym details
      if (invoice.payroll?.gym) {
        doc.fontSize(14).font('Helvetica-Bold').text('From:');
        doc.fontSize(11).font('Helvetica');
        doc.text(invoice.payroll.gym.name);
        if (invoice.payroll.gym.address) doc.text(invoice.payroll.gym.address);
        if (invoice.payroll.gym.phone) doc.text(`Phone: ${invoice.payroll.gym.phone}`);
        if (invoice.payroll.gym.email) doc.text(`Email: ${invoice.payroll.gym.email}`);
        doc.moveDown();
      }

      // Employee details
      doc.fontSize(14).font('Helvetica-Bold').text('Bill To:');
      doc.fontSize(11).font('Helvetica');
      doc.text(invoice.payroll?.user?.name || 'N/A');
      if (invoice.payroll?.user?.phone) doc.text(`Phone: ${invoice.payroll.user.phone}`);
      if (invoice.payroll?.user?.email) doc.text(`Email: ${invoice.payroll.user.email}`);
      doc.moveDown();

      // Line separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      // Payroll period
      doc.fontSize(12).font('Helvetica-Bold').text('Pay Period:');
      doc.fontSize(11).font('Helvetica');
      doc.text(
        `${new Date(invoice.payroll.periodStart).toLocaleDateString('en-IN')} - ${new Date(invoice.payroll.periodEnd).toLocaleDateString('en-IN')}`
      );
      doc.moveDown();

      // Salary breakdown table
      doc.fontSize(12).font('Helvetica-Bold').text('Salary Breakdown:');
      doc.moveDown();

      const tableTop = doc.y;
      const itemCode = 50;
      const description = 150;
      const amount = 450;

      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item', itemCode, tableTop);
      doc.text('Description', description, tableTop);
      doc.text('Amount (₹)', amount, tableTop, { align: 'right' });

      // Table line
      doc.moveTo(itemCode, tableTop + 15).lineTo(545, tableTop + 15).stroke();

      // Table content
      let y = tableTop + 25;
      doc.fontSize(10).font('Helvetica');

      // Base salary
      doc.text('1', itemCode, y);
      doc.text('Base Salary', description, y);
      doc.text(formatCurrency(invoice.payroll.baseSalary), amount, y, { align: 'right' });
      y += 20;

      // Session earnings
      if (invoice.payroll.sessionEarnings > 0) {
        doc.text('2', itemCode, y);
        doc.text('Training Session Earnings', description, y);
        doc.text(formatCurrency(invoice.payroll.sessionEarnings), amount, y, { align: 'right' });
        y += 20;
      }

      // Bonus
      if (invoice.payroll.bonus > 0) {
        doc.text('3', itemCode, y);
        doc.text('Bonus', description, y);
        doc.text(formatCurrency(invoice.payroll.bonus), amount, y, { align: 'right' });
        y += 20;
      }

      // Deductions
      if (invoice.payroll.deductions > 0) {
        doc.text('4', itemCode, y);
        doc.text('Deductions', description, y);
        doc.text(`-${formatCurrency(invoice.payroll.deductions)}`, amount, y, { align: 'right' });
        y += 20;
      }

      // Pro-rata indicator
      if (invoice.payroll.isProRata) {
        y += 10;
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('orange');
        const proRataText = invoice.payroll.proRataDays
          ? `* Pro-rata calculation based on ${invoice.payroll.proRataDays} days`
          : invoice.payroll.proRataMonths
          ? `* Pro-rata calculation based on ${invoice.payroll.proRataMonths} months`
          : '* Pro-rata calculation applied';
        doc.text(proRataText, itemCode, y);
        doc.fillColor('black');
        y += 20;
      }

      // Total line
      y += 10;
      doc.moveTo(itemCode, y).lineTo(545, y).stroke();
      y += 10;
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total Amount:', description, y);
      doc.text(formatCurrency(invoice.amount), amount, y, { align: 'right' });

      // Payment details
      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica-Bold').text('Payment Details:');
      doc.fontSize(11).font('Helvetica');
      if (invoice.paymentMethod) {
        doc.text(`Payment Method: ${invoice.paymentMethod}`);
      }
      if (invoice.paymentReference) {
        doc.text(`Payment Reference: ${invoice.paymentReference}`);
      }
      if (invoice.paidDate) {
        doc.text(`Paid On: ${new Date(invoice.paidDate).toLocaleDateString('en-IN')}`);
      }

      // Notes
      if (invoice.notes) {
        doc.moveDown();
        doc.fontSize(12).font('Helvetica-Bold').text('Notes:');
        doc.fontSize(11).font('Helvetica');
        doc.text(invoice.notes);
      }

      // Footer
      doc.moveDown(3);
      doc.fontSize(9).font('Helvetica-Oblique').text(
        'This is a computer-generated invoice. No signature required.',
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate PDF for salary slip
 * @param {Object} payroll - Payroll data with user and gym details
 * @returns {Buffer} - PDF buffer
 */
function generateSalarySlipPDF(payroll) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('SALARY SLIP', { align: 'center' });
      doc.moveDown();

      // Gym details
      if (payroll.gym) {
        doc.fontSize(16).font('Helvetica-Bold').text(payroll.gym.name, { align: 'center' });
        if (payroll.gym.address) {
          doc.fontSize(10).font('Helvetica').text(payroll.gym.address, { align: 'center' });
        }
        doc.moveDown();
      }

      // Line separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      // Employee details
      doc.fontSize(14).font('Helvetica-Bold').text('Employee Details:');
      doc.fontSize(11).font('Helvetica');
      doc.text(`Name: ${payroll.user?.name || 'N/A'}`);
      doc.text(`Role: ${payroll.user?.role || 'N/A'}`);
      if (payroll.user?.phone) doc.text(`Phone: ${payroll.user.phone}`);
      if (payroll.user?.email) doc.text(`Email: ${payroll.user.email}`);
      doc.moveDown();

      // Pay period
      doc.fontSize(14).font('Helvetica-Bold').text('Pay Period:');
      doc.fontSize(11).font('Helvetica');
      doc.text(
        `${new Date(payroll.periodStart).toLocaleDateString('en-IN')} - ${new Date(payroll.periodEnd).toLocaleDateString('en-IN')}`
      );
      doc.text(`Payment Date: ${new Date(payroll.paymentDate).toLocaleDateString('en-IN')}`);
      doc.text(`Status: ${payroll.status.toUpperCase()}`);
      doc.moveDown();

      // Line separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      // Earnings section
      doc.fontSize(14).font('Helvetica-Bold').text('Earnings:');
      doc.moveDown();

      const earningsTop = doc.y;
      const itemCode = 50;
      const description = 150;
      const amount = 450;

      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item', itemCode, earningsTop);
      doc.text('Description', description, earningsTop);
      doc.text('Amount (₹)', amount, earningsTop, { align: 'right' });

      // Table line
      doc.moveTo(itemCode, earningsTop + 15).lineTo(545, earningsTop + 15).stroke();

      // Table content
      let y = earningsTop + 25;
      doc.fontSize(11).font('Helvetica');

      // Base salary
      doc.text('1', itemCode, y);
      doc.text('Base Salary', description, y);
      doc.text(formatCurrency(payroll.baseSalary), amount, y, { align: 'right' });
      y += 20;

      // Session earnings
      if (payroll.sessionEarnings > 0) {
        doc.text('2', itemCode, y);
        doc.text('Training Session Earnings', description, y);
        doc.text(formatCurrency(payroll.sessionEarnings), amount, y, { align: 'right' });
        y += 20;
      }

      // Bonus
      if (payroll.bonus > 0) {
        doc.text('3', itemCode, y);
        doc.text('Bonus', description, y);
        doc.text(formatCurrency(payroll.bonus), amount, y, { align: 'right' });
        y += 20;
      }

      // Pro-rata indicator
      if (payroll.isProRata) {
        y += 10;
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('orange');
        const proRataText = payroll.proRataDays
          ? `* Pro-rata calculation based on ${payroll.proRataDays} days worked`
          : payroll.proRataMonths
          ? `* Pro-rata calculation based on ${payroll.proRataMonths} months`
          : '* Pro-rata calculation applied';
        doc.text(proRataText, itemCode, y);
        doc.fillColor('black');
        y += 20;
      }

      // Deductions section
      if (payroll.deductions > 0) {
        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').text('Deductions:');
        doc.moveDown();

        doc.fontSize(11).font('Helvetica');
        doc.text('1', itemCode, y);
        doc.text('Deductions', description, y);
        doc.text(`-${formatCurrency(payroll.deductions)}`, amount, y, { align: 'right' });
        y += 20;
      }

      // Total
      y += 10;
      doc.moveTo(itemCode, y).lineTo(545, y).stroke();
      y += 10;
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Net Payable Amount:', description, y);
      doc.text(formatCurrency(payroll.totalAmount), amount, y, { align: 'right' });

      // Work summary
      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica-Bold').text('Work Summary:');
      doc.fontSize(11).font('Helvetica');
      if (payroll.hoursWorked != null) {
        doc.text(`Hours Worked: ${Number(payroll.hoursWorked).toFixed(1)} hours`);
      }
      if (payroll.overtimeHours > 0) {
        doc.text(`Overtime Hours: ${payroll.overtimeHours} hours`);
      }

      // Payment details
      doc.moveDown();
      doc.fontSize(14).font('Helvetica-Bold').text('Payment Details:');
      doc.fontSize(11).font('Helvetica');
      if (payroll.paymentMethod) {
        doc.text(`Payment Method: ${payroll.paymentMethod}`);
      }
      if (payroll.paymentReference) {
        doc.text(`Payment Reference: ${payroll.paymentReference}`);
      }

      // Notes
      if (payroll.notes) {
        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').text('Notes:');
        doc.fontSize(11).font('Helvetica');
        doc.text(payroll.notes);
      }

      // Footer
      doc.moveDown(3);
      doc.fontSize(9).font('Helvetica-Oblique').text(
        'This is a computer-generated salary slip. No signature required.',
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format currency in Indian format
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

module.exports = {
  generateInvoicePDF,
  generateSalarySlipPDF,
  formatCurrency,
};
