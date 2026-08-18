/**
 * Process ESSL attendance logs from GymBuddy attendance_logs table
 * - Matches users by phone, email, or ESSL enroll number
 * - Creates users if not found
 * - Populates attendance table
 * - Marks records as processed
 * 
 * Usage: node process-attendance.js
 * Schedule: Run every 5 minutes via Windows Task Scheduler or cron
 */

const prisma = require('../backend/src/lib/prisma');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Default password for auto-created users
const DEFAULT_PASSWORD = 'GymBuddy@123';

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'GymBuddy System <noreply@gymbuddy.com>';
const EMAIL_BASE_URL = process.env.EMAIL_BASE_URL || 'http://localhost:3000';

/**
 * Send welcome email with login credentials
 */
async function sendWelcomeEmail(email, name, password) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log(`  Email not configured - skipping welcome email to ${email}`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const mailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'Welcome to GymBuddy - Your Account Details',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to GymBuddy!</h2>
          <p>Hello ${name},</p>
          <p>Your account has been automatically created based on your ESSL biometric attendance data.</p>
          <p><strong>Your login details:</strong></p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Password:</strong> ${password}</li>
          </ul>
          <p>Please log in at <a href="${EMAIL_BASE_URL}">${EMAIL_BASE_URL}</a> and change your password immediately.</p>
          <p>If you have any questions, please contact your gym administrator.</p>
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`  Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`  Failed to send email to ${email}:`, error.message);
    return false;
  }
}

/**
 * Find or create user based on ESSL record data
 */
async function findOrCreateUser(record) {
  const { email, phone, esslEnrollNumber, employee } = record;
  
  // Try to find existing user by multiple criteria
  let user = null;
  
  // Priority 1: ESSL enroll number
  if (esslEnrollNumber) {
    user = await prisma.user.findFirst({
      where: {
        esslEnrollNumber: esslEnrollNumber,
        isActive: true
      }
    });
    if (user) {
      console.log(`  Found user by ESSL enroll number: ${user.name} (${esslEnrollNumber})`);
      return user;
    }
  }
  
  // Priority 2: Phone number
  if (phone) {
    user = await prisma.user.findFirst({
      where: {
        phone: phone,
        isActive: true
      }
    });
    if (user) {
      console.log(`  Found user by phone: ${user.name} (${phone})`);
      // Update ESSL enroll number if missing
      if (!user.esslEnrollNumber && esslEnrollNumber) {
        await prisma.user.update({
          where: { id: user.id },
          data: { esslEnrollNumber: esslEnrollNumber }
        });
        console.log(`  Updated ESSL enroll number for user`);
      }
      return user;
    }
  }
  
  // Priority 3: Email
  if (email) {
    user = await prisma.user.findFirst({
      where: {
        email: email,
        isActive: true
      }
    });
    if (user) {
      console.log(`  Found user by email: ${user.name} (${email})`);
      // Update ESSL enroll number if missing
      if (!user.esslEnrollNumber && esslEnrollNumber) {
        await prisma.user.update({
          where: { id: user.id },
          data: { esslEnrollNumber: esslEnrollNumber }
        });
        console.log(`  Updated ESSL enroll number for user`);
      }
      return user;
    }
  }
  
  // User not found - create new user
  if (phone || email) {
    const employeeName = employee?.employeeName || 'Unknown';
    const name = employeeName.split(' ')[0]; // Use first name as name
    
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    
    user = await prisma.user.create({
      data: {
        name: employeeName,
        phone: phone || null,
        email: email || null,
        passwordHash: passwordHash,
        esslEnrollNumber: esslEnrollNumber || null,
        role: 'member',
        isActive: true,
        membershipStart: new Date(),
        membershipEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      }
    });
    
    console.log(`  Created new user: ${user.name} (phone: ${phone}, email: ${email})`);
    console.log(`  Default password: ${DEFAULT_PASSWORD} (should be changed)`);
    
    // Send welcome email if email is available
    if (email) {
      await sendWelcomeEmail(email, user.name, DEFAULT_PASSWORD);
    }
    
    return user;
  }
  
  console.log(`  Cannot create user - no phone or email available`);
  return null;
}

/**
 * Process individual ESSL record
 */
async function processRecord(record, batchSourceLogId) {
  try {
    // Extract fields from record (handle both old and new formats)
    const sourceId = record.sourceId || record.sourceLogId;
    const logDate = record.logDate;
    const direction = record.direction || record.C1;
    const deviceId = record.deviceId;
    const employee = record.employee || {};
    
    // Extract email and phone from multiple possible locations
    const email = record.email || employee.email;
    const phone = record.phone || employee.phone;
    
    // Extract ESSL enroll number
    const esslEnrollNumber = record.esslEnrollNumber || (employee.employeeCodeInDevice ? parseInt(employee.employeeCodeInDevice) : null);
    
    // Build record object for user matching
    const userRecord = {
      sourceId,
      logDate,
      direction,
      deviceId,
      employee,
      esslEnrollNumber,
      email,
      phone
    };
    
    // Find or create user
    const user = await findOrCreateUser(userRecord);
    
    if (!user) {
      console.log(`  Skipping ${sourceId}: No user found and cannot create (missing phone/email)`);
      return { skipped: true, reason: 'No user found and cannot create' };
    }
    
    // Check if attendance already exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        externalLogId: sourceId
      }
    });
    
    if (existingAttendance) {
      console.log(`  Skipping ${sourceId}: Attendance already exists`);
      return { skipped: true, reason: 'Attendance already exists' };
    }
    
    // Determine punch in/out based on direction
    const directionValue = direction || '';
    const isIn = directionValue.toLowerCase().includes('in') || directionValue.toLowerCase() === 'i';
    
    // Create attendance record
    await prisma.attendance.create({
      data: {
        userId: user.id,
        gymId: user.gymId,
        punchInTime: isIn ? new Date(logDate) : null,
        punchOutTime: !isIn ? new Date(logDate) : null,
        method: 'essl',
        externalLogId: sourceId,
        deviceInfo: deviceId ? `Device ID: ${deviceId}` : null,
        notes: `ESSL Batch: ${batchSourceLogId}`
      }
    });
    
    console.log(`  Created attendance for ${user.name} - ${isIn ? 'IN' : 'OUT'} at ${logDate}`);
    return { created: true };
    
  } catch (error) {
    console.error(`  Error processing record:`, error.message);
    return { error: true, reason: error.message };
  }
}

/**
 * Main processing function
 */
async function processAttendanceLogs() {
  console.log('='.repeat(70));
  console.log('ESSL Attendance Log Processor');
  console.log('Started at:', new Date().toISOString());
  console.log('='.repeat(70));
  
  try {
    // Get unprocessed attendance logs
    const unprocessedLogs = await prisma.attendanceLog.findMany({
      where: {
        isProcessed: false
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 50 // Process in batches
    });
    
    console.log(`Found ${unprocessedLogs.length} unprocessed batches`);
    
    if (unprocessedLogs.length === 0) {
      console.log('No unprocessed logs found');
      return;
    }
    
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalRecordsProcessed = 0;
    
    for (const log of unprocessedLogs) {
      try {
        console.log(`\nProcessing batch: ${log.sourceLogId}`);
        console.log(`Created at: ${log.createdAt.toISOString()}`);
        
        // Parse rawJson to get individual records
        let rawJson = log.rawJson;
        if (typeof rawJson === 'string') {
          rawJson = JSON.parse(rawJson);
        }
        
        
        // Handle both old format (individual record) and new format (batched records)
        let records = [];
        
        if (rawJson.records && Array.isArray(rawJson.records)) {
          // New batched format from push_to_gymbuddy-1.py
          records = rawJson.records;
          console.log(`Records in batch (new format): ${records.length}`);
        } else if (rawJson.source && (rawJson.sourceId || rawJson.sourceLogId)) {
          // Old individual record format from push_to_gymbuddy.py
          records = [rawJson];
          console.log(`Records in batch (old format): 1`);
        } else {
          console.log('No recognizable record format, marking as processed');
          await markAsProcessed(log.id, 'No recognizable record format');
          totalProcessed++;
          continue;
        }
        
        if (records.length === 0) {
          console.log('No records in this batch, marking as processed');
          await markAsProcessed(log.id);
          totalProcessed++;
          continue;
        }
        
        let batchCreated = 0;
        let batchSkipped = 0;
        let batchErrors = 0;
        
        // Process each record
        for (const record of records) {
          const result = await processRecord(record, log.sourceLogId);
          totalRecordsProcessed++;
          
          if (result.created) {
            batchCreated++;
          } else if (result.skipped) {
            batchSkipped++;
          } else if (result.error) {
            batchErrors++;
          }
        }
        
        console.log(`Batch complete: ${batchCreated} created, ${batchSkipped} skipped, ${batchErrors} errors`);
        
        // Mark batch as processed
        await markAsProcessed(log.id);
        totalProcessed++;
        totalSkipped += batchSkipped;
        totalErrors += batchErrors;
        
      } catch (error) {
        console.error(`Error processing batch ${log.sourceLogId}:`, error.message);
        await markAsProcessed(log.id, error.message);
        totalErrors++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('Processing Summary');
    console.log('='.repeat(70));
    console.log(`Batches processed: ${totalProcessed}`);
    console.log(`Total records processed: ${totalRecordsProcessed}`);
    console.log(`Records skipped: ${totalSkipped}`);
    console.log(`Errors: ${totalErrors}`);
    console.log('Completed at:', new Date().toISOString());
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  }
}

/**
 * Mark attendance log as processed
 */
async function markAsProcessed(logId, error = null) {
  await prisma.attendanceLog.update({
    where: { id: logId },
    data: {
      isProcessed: true,
      processedAt: new Date(),
      error: error
    }
  });
}

// Run if called directly
if (require.main === module) {
  processAttendanceLogs()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { processAttendanceLogs };

