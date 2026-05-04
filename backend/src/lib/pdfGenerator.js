const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * Generate PDF for an exercise
 */
async function generateExercisePDF(exercise) {
  const doc = new PDFDocument();
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));

  doc.fontSize(20).text(exercise.title, { align: 'center' });
  doc.moveDown();

  if (exercise.description) {
    doc.fontSize(12).text('Description:');
    doc.fontSize(10).text(exercise.description);
    doc.moveDown();
  }

  doc.fontSize(12).text('Category: ' + exercise.category);
  doc.text('Focus Area: ' + exercise.focusArea);
  doc.text('Level: ' + exercise.level);
  doc.moveDown();

  if (exercise.videoUrl) {
    doc.fontSize(12).text('Video URL:');
    doc.fontSize(10).text(exercise.videoUrl, { link: exercise.videoUrl });
    doc.moveDown();
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);
  });
}

/**
 * Generate PDF for a diet plan
 */
async function generateDietPlanPDF(dietPlan, member) {
  const doc = new PDFDocument();
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));

  doc.fontSize(20).text('Diet Plan', { align: 'center' });
  doc.moveDown();

  doc.fontSize(14).text('Member: ' + member.name);
  doc.fontSize(12).text('Title: ' + dietPlan.title);
  doc.moveDown();

  if (dietPlan.notes) {
    doc.fontSize(12).text('Notes:');
    doc.fontSize(10).text(dietPlan.notes);
    doc.moveDown();
  }

  doc.fontSize(12).text('Plan Details:');
  doc.fontSize(10).text(dietPlan.content);
  doc.moveDown();

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);
  });
}

/**
 * Generate PDF for member's assigned exercises
 */
async function generateMemberExercisesPDF(member, exercises) {
  const doc = new PDFDocument();
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));

  doc.fontSize(20).text('Exercise Plan', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text('Member: ' + member.name);
  doc.moveDown();

  if (exercises.length === 0) {
    doc.fontSize(12).text('No exercises assigned.');
  } else {
    exercises.forEach((item, index) => {
      const exercise = item.exercise;
      doc.fontSize(14).text(`${index + 1}. ${exercise.title}`);
      doc.fontSize(10).text(`Category: ${exercise.category}`);
      doc.text(`Focus Area: ${exercise.focusArea}`);
      doc.text(`Level: ${exercise.level}`);
      
      if (exercise.description) {
        doc.text(`Description: ${exercise.description}`);
      }
      
      if (item.notes) {
        doc.text(`Notes: ${item.notes}`);
      }
      
      doc.moveDown();
    });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);
  });
}

module.exports = {
  generateExercisePDF,
  generateDietPlanPDF,
  generateMemberExercisesPDF,
};
