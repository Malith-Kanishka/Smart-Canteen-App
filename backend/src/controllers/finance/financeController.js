const Order = require('../../models/Order');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');
const { createProfileHandlers } = require('../../utils/profileHandlers');

const profileHandlers = createProfileHandlers({ minAge: 16 });

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

exports.getProfile = profileHandlers.getProfile;
exports.updateProfile = profileHandlers.updateProfile;
exports.changePassword = profileHandlers.changePassword;
exports.uploadProfilePhoto = profileHandlers.uploadProfilePhoto;
exports.deleteProfilePhoto = profileHandlers.deleteProfilePhoto;
