const Order = require('../../models/Order');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');

// Generate unique transactionId
const generateTransactionId = async () => {
  const count = await Transaction.countDocuments();
  return `TXN${String(count + 1).padStart(6, '0')}`;
};

// Get finance dashboard stats
exports.getDashboard = async (req, res) => {
  try {
    const totalRevenue = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amountReceived' } } }
    ]);

    const totalOrders = await Order.countDocuments({ status: 'completed' });
    const totalTransactions = await Transaction.countDocuments({ status: 'completed' });
    const refundedAmount = await Transaction.aggregate([
      { $match: { status: 'refunded' } },
      { $group: { _id: null, total: { $sum: '$amountReceived' } } }
    ]);

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOrders,
      totalTransactions,
      refundedAmount: refundedAmount[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all transactions
exports.getTransactions = async (req, res) => {
  try {
    const { status, paymentType } = req.query;
    let query = {};

    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single transaction
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('orderId');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create transaction
exports.createTransaction = async (req, res) => {
  try {
    const { orderId, paymentType, amountReceived, cardDetails } = req.body;

    if (!orderId || !paymentType || !amountReceived) {
      return res.status(400).json({ message: 'Order ID, payment type and amount are required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const change = amountReceived - order.payableAmount;

    if (change < 0) {
      return res.status(400).json({ message: 'Amount received is less than payable amount' });
    }

    const transactionId = await generateTransactionId();

    const newTransaction = new Transaction({
      transactionId,
      orderId,
      paymentType,
      amountReceived: parseFloat(amountReceived),
      change,
      cardDetails: paymentType === 'card' ? cardDetails : null,
      status: 'completed'
    });

    await newTransaction.save();

    // Update order status
    order.status = 'completed';
    await order.save();

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: newTransaction,
      change
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Refund transaction
exports.refundTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status === 'refunded') {
      return res.status(400).json({ message: 'Transaction already refunded' });
    }

    transaction.status = 'refunded';
    await transaction.save();

    // Update order status
    const order = await Order.findById(transaction.orderId);
    if (order) {
      order.status = 'refunded';
      await order.save();
    }

    res.json({
      message: 'Transaction refunded successfully',
      transaction
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
