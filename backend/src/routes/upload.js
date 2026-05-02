const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Tesseract = require('tesseract.js');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage so we can pass buffer to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder, resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `gymbuddy/${folder}`, resource_type: resourceType },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// POST /api/upload/image - Upload image (admin)
router.post('/image', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const folder = req.body.folder || 'general';
    const result = await uploadToCloudinary(req.file.buffer, folder, 'image');
    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// POST /api/upload/video - Upload video (admin)
router.post('/video', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const folder = req.body.folder || 'videos';
    const result = await uploadToCloudinary(req.file.buffer, folder, 'video');
    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err) {
    console.error('Cloudinary video upload error:', err);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// POST /api/upload/ocr - Upload form image and extract text (admin)
router.post('/ocr', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Run OCR on the uploaded image
    const { data } = await Tesseract.recognize(req.file.buffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          // Could stream progress
        }
      },
    });

    const rawText = data.text;

    // Simple extraction heuristics from typical gym registration forms
    const extracted = extractFormData(rawText);

    // Also upload the form image to Cloudinary for record keeping
    let formImageUrl = null;
    try {
      const result = await uploadToCloudinary(req.file.buffer, 'forms', 'image');
      formImageUrl = result.secure_url;
    } catch (uploadErr) {
      console.error('Form image upload error:', uploadErr);
    }

    res.json({
      rawText,
      extracted,
      formImageUrl,
    });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'OCR processing failed' });
  }
});

function extractFormData(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const data = {};

  const nameMatch = text.match(/(?:name|full name|candidate name)[:\s]+([A-Za-z\s]+)/i);
  if (nameMatch) data.name = nameMatch[1].trim();

  const phoneMatch = text.match(/(?:phone|mobile|contact|ph)[:\s]+([6-9]\d{9})/i);
  if (phoneMatch) data.phone = phoneMatch[1];

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) data.email = emailMatch[0];

  const ageMatch = text.match(/(?:age|dob|date of birth)[:\s]+(\d{1,3})/i);
  if (ageMatch) data.age = parseInt(ageMatch[1]);

  const weightMatch = text.match(/(?:weight)[:\s]+(\d{2,3}(?:\.\d)?)\s*(?:kg)?/i);
  if (weightMatch) data.weight = parseFloat(weightMatch[1]);

  const heightMatch = text.match(/(?:height)[:\s]+(\d{3}(?:\.\d)?)\s*(?:cm)?/i);
  if (heightMatch) data.height = parseFloat(heightMatch[1]);

  const goalMatch = text.match(/(?:goal|objective|target)[:\s]+(.+?)(?:\n|$)/i);
  if (goalMatch) data.goal = goalMatch[1].trim();

  return data;
}

module.exports = router;
