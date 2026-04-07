const Order = require('../../models/Order');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');
const { createProfileHandlers } = require('../../utils/profileHandlers');

const profileHandlers = createProfileHandlers({ minAge: 16 });

// Generate unique orderId
const generateOrderId = async () => {
  const count = await Order.countDocuments();
  return `ORD${String(count + 1).padStart(6, '0')}`;
};

// Get all orders (with filters)
exports.getOrders = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single order
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { items, seasonalPromoDiscount } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }

    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = item.dailyDiscount || 0;
      subtotal += lineTotal;
      totalDiscount += discount * item.quantity;
    });

    const promoDiscount = seasonalPromoDiscount || 0;
    const totalDiscountAmount = totalDiscount + promoDiscount;
    const payableAmount = subtotal - totalDiscountAmount;

    const orderId = await generateOrderId();

    const newOrder = new Order({
      orderId,
      items,
      subtotal,
      seasonalPromoDiscount: promoDiscount,
      totalDiscount: totalDiscountAmount,
      payableAmount,
      status: 'pending'
    });

    await newOrder.save();
    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!['pending', 'completed', 'void', 'refunded'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    order.status = status;
    await order.save();

    res.json({
      message: 'Order status updated',
      order
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
