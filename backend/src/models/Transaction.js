const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    paymentType: {
      type: String,
      enum: ['card', 'cash'],
      required: true
    },
    amountReceived: Number,
    change: Number,
    cardDetails: {
      cardNumber: String,
      cardHolderName: String,
      expiryDate: String
    },
    status: {
      type: String,
      enum: ['completed', 'refunded', 'cancelled'],
      default: 'completed'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
