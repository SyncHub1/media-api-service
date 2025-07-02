import { Submission } from '../models/Submission.js';
import { deleteFromCloudinary } from '../utils/cloudinary.js';

// Submit media for processing
export const submitMedia = async (submissionData) => {
  try {
    // Create new submission
    const submission = new Submission(submissionData);
    await submission.save();
    
    console.log(`📝 Created submission: ${submission.id}`);
    return submission;
  } catch (error) {
    console.error('❌ Error creating submission:', error);
    throw error;
  }
};

// Get submission status
export const getSubmissionStatus = async (submissionId, userId) => {
  try {
    const submission = await Submission.findOne({
      id: submissionId,
      userId: userId
    });
    
    if (!submission) {
      return null;
    }
    
    return {
      id: submission.id,
      status: submission.status,
      progress: submission.progress,
      message: submission.message,
      result: submission.result,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt
    };
  } catch (error) {
    console.error('❌ Error getting submission status:', error);
    throw error;
  }
};

// Get user submissions
export const getUserSubmissions = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 10, status } = options;
    const skip = (page - 1) * limit;
    
    const query = { userId };
    if (status) {
      query.status = status;
    }
    
    const submissions = await Submission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-buffer'); // Don't return file buffer
    
    const total = await Submission.countDocuments(query);
    
    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error getting user submissions:', error);
    throw error;
  }
};

// Delete submission
export const deleteSubmission = async (submissionId, userId) => {
  try {
    const submission = await Submission.findOneAndDelete({
      id: submissionId,
      userId: userId
    });
    
    if (submission && submission.result && submission.result.publicId) {
      // Delete from Cloudinary if exists
      try {
        await deleteFromCloudinary(submission.result.publicId);
      } catch (cloudinaryError) {
        console.warn('⚠️ Failed to delete from Cloudinary:', cloudinaryError);
      }
    }
    
    return submission;
  } catch (error) {
    console.error('❌ Error deleting submission:', error);
    throw error;
  }
};

// Update submission status
export const updateSubmissionStatus = async (submissionId, updateData) => {
  try {
    const submission = await Submission.findOneAndUpdate(
      { id: submissionId },
      { 
        $set: updateData,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    return submission;
  } catch (error) {
    console.error('❌ Error updating submission status:', error);
    throw error;
  }
}; 