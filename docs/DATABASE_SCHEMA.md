# Database Schema Documentation

## Collections Overview

### 1. User Collection
Stores all system users (staff and customers)

```javascript
{
  _id: ObjectId,
  staffId: String (unique, auto-generated for staff),
  username: String (unique, required),
  email: String (required, validated),
  phone: String (10 digits, required),
  password: String (hashed, required),
  fullName: String (required),
  role: String (enum: admin, foodmaster, inventory, promotion, order, finance, feedback, customer),
  nic: String (unique for staff, validated format),
  address: String,
  dateOfBirth: Date,
  profilePhoto: String (path to uploaded image),
  isActive: Boolean (default: true),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. MenuItem Collection
Stores menu items/products

```javascript
{
  _id: ObjectId,
  itemId: String (unique),
  name: String (unique, required),
  price: Number (min: 0, required),
  description: String,
  image: String (path to uploaded image),
  isActive: Boolean (default: true),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3. StockItem Collection
Tracks inventory for each menu item

```javascript
{
  _id: ObjectId,
  itemId: ObjectId (ref: MenuItem),
  itemName: String (synced with MenuItem name),
  currentQty: Number (min: 0, required),
  minQty: Number (min: 0, required),
  maxQty: Number (min: 0, required),
  unitPrice: Number (min: 0, required),
  status: String (enum: low_stock, good, over_stock),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Status Logic:**
- `low_stock`: currentQty <= minQty
- `good`: minQty < currentQty < maxQty
- `over_stock`: currentQty >= maxQty

### 4. Promo Collection
Seasonal/month-long promotions

```javascript
{
  _id: ObjectId,
  promoId: String (unique),
  title: String (required),
  discountPercentage: Number (1-99, required),
  startDate: Date (required),
  endDate: Date (required, must be after startDate),
  status: String (enum: scheduled, active, paused, expired),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Status Rules:**
- `scheduled`: startDate > today
- `active`: startDate <= today <= endDate
- `expired`: today > endDate
- `paused`: manually paused by manager

### 5. DailyDiscount Collection
Daily item-level discounts

```javascript
{
  _id: ObjectId,
  discountId: String (unique),
  menuItemId: ObjectId (ref: MenuItem, required),
  productName: String (synced with MenuItem name),
  originalPrice: Number (required),
  discountPercentage: Number (1-99, required),
  newPrice: Number (auto-calculated),
  status: String (enum: active, paused, expired),
  validDate: Date (default: today),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**newPrice Calculation:**
```
newPrice = originalPrice - (originalPrice * discountPercentage / 100)
```

### 6. Order Collection
Pending and completed orders

```javascript
{
  _id: ObjectId,
  orderId: String (unique),
  items: [
    {
      menuItemId: ObjectId (ref: MenuItem),
      itemName: String,
      quantity: Number,
      unitPrice: Number,
      dailyDiscount: Number (percentage applied),
      lineTotal: Number (quantity * unitPrice * (1 - dailyDiscount/100))
    }
  ],
  subtotal: Number,
  seasonalPromoDiscount: Number (amount, not percentage),
  totalDiscount: Number (daily + seasonal),
  payableAmount: Number,
  status: String (enum: pending, completed, void, refunded),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Calculation Flow:**
1. Each item: lineTotal = qty × unitPrice × (1 - dailyDiscount%)
2. Subtotal = sum of all lineTotal
3. SeasonalPromoDiscount = Subtotal × promoPercentage%
4. TotalDiscount = (daily savings) + seasonalPromoDiscount
5. PayableAmount = Subtotal - seasonalPromoDiscount

### 7. Transaction Collection
Payment records

```javascript
{
  _id: ObjectId,
  transactionId: String (unique),
  orderId: ObjectId (ref: Order),
  paymentType: String (enum: card, cash, required),
  amountReceived: Number,
  change: Number (amountReceived - payableAmount),
  cardDetails: {
    cardNumber: String (masked),
    cardHolderName: String,
    expiryDate: String (MM/YY)
  },
  status: String (enum: completed, refunded, cancelled),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 8. Feedback Collection
Customer feedback and complaints

```javascript
{
  _id: ObjectId,
  feedbackId: String (unique),
  userId: ObjectId (ref: User, required),
  orderId: ObjectId (ref: Order),
  type: String (enum: complaint, review, required),
  rating: Number (1-5, optional for complaints),
  comment: String (required),
  imageUrl: String (path to uploaded image),
  status: String (enum: pending, resolved, default: pending),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Relationships & Constraints

```
User (1) ---- (*) Order
User (1) ---- (*) Feedback
MenuItem (1) ---- (*) StockItem
MenuItem (1) ---- (*) DailyDiscount
Order (1) ---- (*) Transaction
Order (1) ---- (*) Feedback
```

## Indexes

For optimal query performance, create these indexes:

```javascript
// User indexes
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 });
db.users.createIndex({ role: 1 });

// MenuItem indexes
db.menuItems.createIndex({ name: 1 }, { unique: true });
db.menuItems.createIndex({ isActive: 1 });

// StockItem indexes
db.stockItems.createIndex({ itemId: 1 });
db.stockItems.createIndex({ status: 1 });

// Promo indexes
db.promos.createIndex({ startDate: 1, endDate: 1 });
db.promos.createIndex({ status: 1 });

// DailyDiscount indexes
db.dailyDiscounts.createIndex({ menuItemId: 1 });
db.dailyDiscounts.createIndex({ validDate: 1 });

// Order indexes
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });

// Transaction indexes
db.transactions.createIndex({ orderId: 1 });
db.transactions.createIndex({ status: 1 });

// Feedback indexes
db.feedbacks.createIndex({ userId: 1 });
db.feedbacks.createIndex({ status: 1 });
```

## Data Validation Rules

| Field | Validation | Error Message |
|-------|-----------|----------------|
| email | Regex pattern | Invalid email format |
| phone | Exactly 10 digits | Phone must be 10 digits |
| nic | 9V or 12 digits | Invalid NIC format |
| price | > 0 | Price must be greater than 0 |
| discount | 1-99 | Discount must be 1-99% |
| dateOfBirth | Valid date, age >= 16 | Invalid age or DOB |
| password | Min 6 chars | Password too short |
| quantity | >= 0 | Quantity cannot be negative |
| min/max qty | min <= max | Min qty must be <= max qty |

---

**Last Updated**: April 6, 2026
