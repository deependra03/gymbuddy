const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send WhatsApp message with PDF attachment
 */
async function sendWhatsAppWithPDF(to, message, pdfBuffer, filename) {
  try {
    // First, upload the PDF to Cloudinary or a temporary storage
    // For now, we'll send just the text message
    // PDF attachment via WhatsApp requires additional setup
    
    const response = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message,
    });

    return response;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    throw error;
  }
}

/**
 * Send simple WhatsApp message
 */
async function sendWhatsAppMessage(to, message) {
  try {
    const response = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message,
    });

    return response;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    throw error;
  }
}

/**
 * Format exercise data for WhatsApp message
 */
function formatExerciseMessage(exercise) {
  let message = `*Exercise: ${exercise.title}*\n\n`;
  message += `Category: ${exercise.category}\n`;
  message += `Focus Area: ${exercise.focusArea}\n`;
  message += `Level: ${exercise.level}\n`;
  
  if (exercise.description) {
    message += `\nDescription:\n${exercise.description}\n`;
  }
  
  if (exercise.videoUrl) {
    message += `\nVideo: ${exercise.videoUrl}\n`;
  }
  
  return message;
}

/**
 * Format diet plan data for WhatsApp message
 */
function formatDietPlanMessage(dietPlan, member) {
  let message = `*Diet Plan for ${member.name}*\n\n`;
  message += `Title: ${dietPlan.title}\n\n`;
  
  if (dietPlan.notes) {
    message += `Notes:\n${dietPlan.notes}\n\n`;
  }
  
  message += `Plan Details:\n${dietPlan.content}\n`;
  
  return message;
}

/**
 * Format member exercises for WhatsApp message
 */
function formatMemberExercisesMessage(member, exercises) {
  let message = `*Exercise Plan for ${member.name}*\n\n`;
  
  if (exercises.length === 0) {
    message += 'No exercises assigned.';
  } else {
    exercises.forEach((item, index) => {
      const exercise = item.exercise;
      message += `${index + 1}. ${exercise.title}\n`;
      message += `   Category: ${exercise.category}\n`;
      message += `   Focus Area: ${exercise.focusArea}\n`;
      message += `   Level: ${exercise.level}\n`;
      
      if (exercise.description) {
        message += `   Description: ${exercise.description}\n`;
      }
      
      if (item.notes) {
        message += `   Notes: ${item.notes}\n`;
      }
      
      message += '\n';
    });
  }
  
  return message;
}

module.exports = {
  sendWhatsAppWithPDF,
  sendWhatsAppMessage,
  formatExerciseMessage,
  formatDietPlanMessage,
  formatMemberExercisesMessage,
};
