const Feedback = require('../../models/Feedback');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');
const { createProfileHandlers } = require('../../utils/profileHandlers');

const profileHandlers = createProfileHandlers({ minAge: 16 });

// Generate unique feedbackId
const generateFeedbackId = async () => {
  const count = await Feedback.countDocuments();
  return `FBK${String(count + 1).padStart(6, '0')}`;
};

// Get all feedback
exports.getFeedback = async (req, res) => {
  try {
    const { type, status, userId } = req.query;
    let query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (userId) query.userId = userId;

    const feedback = await Feedback.find(query).populate('userId', 'fullName username email').sort({ createdAt: -1 });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single feedback
exports.getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id).populate('userId', 'fullName username email');
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create feedback
exports.createFeedback = async (req, res) => {
  try {
    const { type, rating, comment, orderId } = req.body;
    const userId = req.user.id;

    if (!type || !['complaint', 'review'].includes(type)) {
      return res.status(400).json({ message: 'Valid feedback type (complaint/review) is required' });
    }

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    if (type === 'review' && (!rating || rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Valid rating (1-5) is required for reviews' });
    }

    const feedbackId = await generateFeedbackId();
    const imageUrl = req.file ? `/uploads/complaints/${req.file.filename}` : null;

    const newFeedback = new Feedback({
      feedbackId,
      userId,
      orderId: orderId || null,
      type,
      rating: type === 'review' ? rating : null,
      comment,
      imageUrl,
      status: 'pending'
    });

    await newFeedback.save();
    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: newFeedback
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update feedback status
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    if (!['pending', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    feedback.status = status;
    await feedback.save();

    res.json({
      message: 'Feedback status updated',
      feedback
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProfile = profileHandlers.getProfile;
exports.updateProfile = profileHandlers.updateProfile;
exports.changePassword = profileHandlers.changePassword;
exports.uploadProfilePhoto = profileHandlers.uploadProfilePhoto;
exports.deleteProfilePhoto = profileHandlers.deleteProfilePhoto;
