const Order = require('../../models/Order');
const Transaction = require('../../models/Transaction');
const MenuItem = require('../../models/MenuItem');
const DailyDiscount = require('../../models/DailyDiscount');
const Promo = require('../../models/Promo');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');
const { createProfileHandlers } = require('../../utils/profileHandlers');
const {
  roundCurrency,
  calculateDailyDiscountAmount,
  calculateDiscountedPrice,
  isDailyDiscountExpired,
  deriveSeasonalStatus
} = require('../../utils/promotionEngine');

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
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }

    const itemIds = items.map((item) => item.menuItemId).filter(Boolean);
    const menuItems = await MenuItem.find({ _id: { $in: itemIds }, isActive: true }).select('_id name price');
    const menuMap = new Map(menuItems.map((item) => [String(item._id), item]));

    const dailyDiscounts = await DailyDiscount.find({
      menuItemId: { $in: itemIds },
      status: { $in: ['active', 'paused', 'expired'] }
    });

    const activeDailyDiscountMap = new Map();
    for (const discount of dailyDiscounts) {
      if (discount.status === 'active' && !isDailyDiscountExpired(discount)) {
        activeDailyDiscountMap.set(String(discount.menuItemId), discount);
      }
    }

    const promos = await Promo.find({});
    const activeSeasonalPromo = promos
      .map((promo) => ({ promo, derivedStatus: deriveSeasonalStatus(promo) }))
      .find(({ derivedStatus }) => derivedStatus === 'active')?.promo || null;

    let subtotal = 0;
    let dailyDiscountTotal = 0;

    const normalizedItems = items.map((item) => {
      const menuItem = menuMap.get(String(item.menuItemId));
      if (!menuItem) {
        throw new Error(`Menu item not found for ${item.menuItemId}`);
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for ${menuItem.name}`);
      }

      const unitPrice = roundCurrency(menuItem.price);
      const lineSubtotal = roundCurrency(unitPrice * quantity);
      const dailyDiscount = activeDailyDiscountMap.get(String(menuItem._id));
      const dailyDiscountPercentage = dailyDiscount?.discountPercentage || 0;
      const discountedUnitPrice = dailyDiscount
        ? calculateDiscountedPrice(unitPrice, dailyDiscountPercentage)
        : unitPrice;
      const dailyDiscountAmount = dailyDiscount
        ? calculateDailyDiscountAmount(unitPrice, dailyDiscountPercentage, quantity)
        : 0;
      const lineTotal = roundCurrency(lineSubtotal - dailyDiscountAmount);

      subtotal += lineSubtotal;
      dailyDiscountTotal += dailyDiscountAmount;

      return {
        menuItemId: menuItem._id,
        itemName: menuItem.name,
        quantity,
        unitPrice,
        discountedUnitPrice,
        dailyDiscountPercentage,
        dailyDiscountAmount,
        lineSubtotal,
        lineTotal
      };
    });

    subtotal = roundCurrency(subtotal);
    dailyDiscountTotal = roundCurrency(dailyDiscountTotal);
    const subtotalAfterDaily = roundCurrency(subtotal - dailyDiscountTotal);
    const seasonalPromoDiscountPercentage = activeSeasonalPromo?.discountPercentage || 0;
    const seasonalPromoDiscount = activeSeasonalPromo
      ? roundCurrency((subtotalAfterDaily * seasonalPromoDiscountPercentage) / 100)
      : 0;
    const totalDiscountAmount = roundCurrency(dailyDiscountTotal + seasonalPromoDiscount);
    const payableAmount = roundCurrency(subtotal - totalDiscountAmount);

    const orderId = await generateOrderId();

    const newOrder = new Order({
      orderId,
      items: normalizedItems,
      subtotal,
      dailyDiscountTotal,
      subtotalAfterDaily,
      seasonalPromoId: activeSeasonalPromo?.promoId,
      seasonalPromoTitle: activeSeasonalPromo?.title,
      seasonalPromoDiscountPercentage,
      seasonalPromoDiscount,
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
