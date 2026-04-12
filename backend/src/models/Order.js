const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true
    },
    items: [
      {
        menuItemId: mongoose.Schema.Types.ObjectId,
        itemName: String,
        quantity: Number,
        unitPrice: Number,
        discountedUnitPrice: Number,
        dailyDiscountPercentage: Number,
        dailyDiscountAmount: Number,
        lineSubtotal: Number,
        lineTotal: Number
      }
    ],
    subtotal: Number,
    dailyDiscountTotal: Number,
    subtotalAfterDaily: Number,
    seasonalPromoId: String,
    seasonalPromoTitle: String,
    seasonalPromoDiscountPercentage: Number,
    seasonalPromoDiscount: Number,
    totalDiscount: Number,
    payableAmount: Number,
    status: {
      type: String,
      enum: ['pending', 'completed', 'void', 'refunded'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
