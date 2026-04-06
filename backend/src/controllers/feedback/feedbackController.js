const Feedback = require('../../models/Feedback');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');

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

// Get profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone, address, dateOfBirth } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;

    await user.save();
    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters with letters and numbers'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload profile photo
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.profilePhoto) {
      const oldPhotoPath = path.join(__dirname, '../../..', user.profilePhoto);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    user.profilePhoto = `/uploads/profile-pictures/${req.file.filename}`;
    await user.save();

    res.json({
      message: 'Photo uploaded successfully',
      photoPath: user.profilePhoto
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete profile photo
exports.deleteProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.profilePhoto) {
      const photoPath = path.join(__dirname, '../../..', user.profilePhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    user.profilePhoto = null;
    await user.save();

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
