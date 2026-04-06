const mongoose = require('mongoose');

const stockItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    itemName: String,
    currentQty: {
      type: Number,
      required: true,
      min: 0
    },
    minQty: {
      type: Number,
      required: true,
      min: 0
    },
    maxQty: {
      type: Number,
      required: true,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['low_stock', 'good', 'over_stock'],
      default: 'good'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockItem', stockItemSchema);
