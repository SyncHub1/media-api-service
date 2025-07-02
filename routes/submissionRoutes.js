import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware from '../middleware/auth.js';
import { submitMedia, getSubmissionStatus, getUserSubmissions, deleteSubmission } from '../controllers/submissionController.js';
import { addToQueue } from '../queue.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and audio files
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Health check endpoint (no auth required)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'media-api-service'
    }
  });
});

// Apply authentication middleware to all routes below this point
router.use(authMiddleware);

// Submit media for processing
router.post('/submit', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No file provided',
          code: 'NO_FILE'
        }
      });
    }

    // Extract user info from authenticated request
    const userId = req.user._id;
    const username = req.user.username;

    // Create submission data
    const submissionData = {
      id: uuidv4(),
      userId: userId,
      username: username,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer,
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
      processingOptions: {
        resize: req.body.resize ? JSON.parse(req.body.resize) : null,
        format: req.body.format || null,
        quality: req.body.quality ? parseInt(req.body.quality) : null,
        generateThumbnail: req.body.generateThumbnail === 'true'
      },
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    // Save submission to database
    const submission = await submitMedia(submissionData);
    
    // Add to processing queue
    const job = await addToQueue('media-processing', submissionData);
    
    // Update submission with job ID
    submission.jobId = job.id;
    await submission.save();
    
    console.log(`📤 Added media processing job: ${job.id} for user: ${userId}`);

    // Return submission info
    res.status(201).json({
      success: true,
      data: {
        submissionId: submissionData.id,
        jobId: job.id,
        status: 'pending',
        message: 'Media submitted for processing'
      }
    });

  } catch (error) {
    console.error('❌ Error submitting media:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to submit media for processing',
        code: 'SUBMISSION_ERROR'
      }
    });
  }
});

// Get submission status
router.get('/status/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user._id;

    const status = await getSubmissionStatus(submissionId, userId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Submission not found',
          code: 'NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('❌ Error getting submission status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get submission status',
        code: 'STATUS_ERROR'
      }
    });
  }
});

// Get user submissions
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user._id;
    
    // Users can only access their own submissions (unless admin)
    if (userId !== requestingUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'FORBIDDEN'
        }
      });
    }

    const { page = 1, limit = 10, status } = req.query;
    const submissions = await getUserSubmissions(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json({
      success: true,
      data: submissions
    });

  } catch (error) {
    console.error('❌ Error getting user submissions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get user submissions',
        code: 'SUBMISSIONS_ERROR'
      }
    });
  }
});

// Delete submission
router.delete('/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user._id;

    const result = await deleteSubmission(submissionId, userId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Submission not found',
          code: 'NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Submission deleted successfully'
      }
    });

  } catch (error) {
    console.error('❌ Error deleting submission:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete submission',
        code: 'DELETE_ERROR'
      }
    });
  }
});

export default router; 