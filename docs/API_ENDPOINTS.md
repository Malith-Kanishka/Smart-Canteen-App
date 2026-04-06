# API Endpoints Documentation

## Base URL
```
https://your-deployed-backend-url/api
```

## Authentication
All endpoints (except login/register) require JWT token in header:
```
Authorization: Bearer <token>
```

---

## 1. Authentication Endpoints

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}

Response (200 OK):
{
  "token": "eyJhbGc...",
  "role": "admin",
  "message": "Login successful"
}

Response (401 Unauthorized):
{
  "message": "Invalid username or password"
}
```

### Register (Customers Only)
```http
POST /auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "0771234567",
  "password": "password123"
}

Response (201 Created):
{
  "token": "eyJhbGc...",
  "userId": "507f1f77bcf86cd799439011",
  "message": "Registration successful"
}
```

### Verify Token
```http
GET /auth/verify
Authorization: Bearer <token>

Response (200 OK):
{
  "userId": "507f1f77bcf86cd799439011",
  "role": "admin",
  "message": "Token verified"
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <token>

Response (200 OK):
{
  "message": "Logout successful"
}
```

---

## 2. Admin Endpoints

### Get Dashboard Stats
```http
GET /admin/dashboard
Authorization: Bearer <admin-token>

Response (200 OK):
{
  "totalStaff": 15,
  "totalCustomers": 234,
  "staffByRole": {
    "foodmaster": 2,
    "inventory": 1,
    "promotion": 1,
    "order": 3,
    "finance": 1,
    "feedback": 1
  }
}
```

### Create Staff Member
```http
POST /admin/staff
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "fullName": "Jane Smith",
  "nic": "123456789V",
  "phone": "0771234567",
  "email": "jane@restaurant.com",
  "address": "123 Main St",
  "dateOfBirth": "1995-05-15",
  "role": "foodmaster"
}

Response (201 Created):
{
  "staffId": "STAFF-2024-001",
  "username": "janesmith",
  "generatedPassword": "A1B2C3D4",
  "message": "Staff created successfully"
}
```

### Get All Staff
```http
GET /admin/staff?role=foodmaster&search=jane
Authorization: Bearer <admin-token>

Response (200 OK):
[
  {
    "staffId": "STAFF-2024-001",
    "fullName": "Jane Smith",
    "nic": "123456789V",
    "email": "jane@restaurant.com",
    "phone": "0771234567",
    "role": "foodmaster"
  }
]
```

### Update Staff
```http
PUT /admin/staff/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "fullName": "Jane Doe Smith",
  "phone": "0771234567",
  "address": "456 Oak Ave"
}

Response (200 OK):
{
  "message": "Staff updated successfully"
}
```

### Delete Staff
```http
DELETE /admin/staff/:id
Authorization: Bearer <admin-token>

Response (200 OK):
{
  "message": "Staff deleted successfully"
}
```

### Get All Customers
```http
GET /admin/customers?search=john
Authorization: Bearer <admin-token>

Response (200 OK):
[
  {
    "userId": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "0771234567"
  }
]
```

### Delete Customer
```http
DELETE /admin/customers/:id
Authorization: Bearer <admin-token>

Response (200 OK):
{
  "message": "Customer deleted successfully"
}
```

---

## 3. Food Master Endpoints

### Get Menu Items
```http
GET /foodmaster/menu
Authorization: Bearer <foodmaster-token>

Response (200 OK):
[
  {
    "itemId": "ITEM-001",
    "name": "Chicken Burger",
    "price": 450,
    "description": "Crispy fried chicken",
    "image": "/uploads/food-items/chicken-burger.jpg"
  }
]
```

### Create Menu Item
```http
POST /foodmaster/menu
Authorization: Bearer <foodmaster-token>
Content-Type: multipart/form-data

{
  "name": "Chicken Burger",
  "price": 450,
  "description": "Crispy fried chicken",
  "image": <file>
}

Response (201 Created):
{
  "itemId": "ITEM-001",
  "message": "Menu item created successfully"
}
```

### Update Menu Item
```http
PUT /foodmaster/menu/:id
Authorization: Bearer <foodmaster-token>
Content-Type: multipart/form-data

{
  "name": "Premium Chicken Burger",
  "price": 550,
  "image": <file> (optional)
}

Response (200 OK):
{
  "message": "Menu item updated successfully"
}
```

### Delete Menu Item
```http
DELETE /foodmaster/menu/:id
Authorization: Bearer <foodmaster-token>

Response (200 OK):
{
  "message": "Menu item and related stock deleted successfully"
}
```

---

## 4. Inventory Controller Endpoints

### Get Stock Dashboard
```http
GET /inventory/dashboard
Authorization: Bearer <inventory-token>

Response (200 OK):
{
  "totalItems": 25,
  "totalInventoryValue": 45000,
  "lowStockAlerts": 3
}
```

### Get Stock Items
```http
GET /inventory/stock
Authorization: Bearer <inventory-token>

Response (200 OK):
[
  {
    "stockId": "507f1f77bcf86cd799439011",
    "itemName": "Chicken Burger",
    "currentQty": 15,
    "minQty": 5,
    "maxQty": 50,
    "unitPrice": 200,
    "status": "good"
  }
]
```

### Add Stock Item
```http
POST /inventory/stock
Authorization: Bearer <inventory-token>
Content-Type: application/json

{
  "itemName": "Chicken Burger",
  "currentQty": 20,
  "minQty": 5,
  "maxQty": 50,
  "unitPrice": 200
}

Response (201 Created):
{
  "message": "Stock item created successfully"
}
```

### Update Stock Item
```http
PUT /inventory/stock/:id
Authorization: Bearer <inventory-token>
Content-Type: application/json

{
  "currentQty": 18,
  "minQty": 5,
  "maxQty": 60,
  "unitPrice": 220
}

Response (200 OK):
{
  "message": "Stock updated successfully",
  "newStatus": "good"
}
```

### Delete Stock Item
```http
DELETE /inventory/stock/:id
Authorization: Bearer <inventory-token>

Response (200 OK):
{
  "message": "Stock item deleted successfully"
}
```

---

## 5. Promotion Manager Endpoints

### Get Seasonal Promos
```http
GET /promotion/seasonal
Authorization: Bearer <promotion-token>

Response (200 OK):
[
  {
    "promoId": "PROMO-001",
    "title": "Holiday Special",
    "discountPercentage": 20,
    "startDate": "2024-12-01",
    "endDate": "2024-12-31",
    "status": "scheduled"
  }
]
```

### Create Seasonal Promo
```http
POST /promotion/seasonal
Authorization: Bearer <promotion-token>
Content-Type: application/json

{
  "title": "Summer Sale",
  "discountPercentage": 15,
  "startDate": "2024-06-01",
  "endDate": "2024-06-30"
}

Response (201 Created):
{
  "promoId": "PROMO-002",
  "message": "Promotion created successfully"
}
```

### Update Promo Status
```http
PUT /promotion/seasonal/:id
Authorization: Bearer <promotion-token>
Content-Type: application/json

{
  "status": "paused"
}

Response (200 OK):
{
  "message": "Promotion updated successfully"
}
```

### Get Daily Discounts
```http
GET /promotion/daily
Authorization: Bearer <promotion-token>

Response (200 OK):
[
  {
    "discountId": "DAILY-001",
    "productName": "Chicken Burger",
    "originalPrice": 450,
    "discountPercentage": 10,
    "newPrice": 405,
    "status": "active"
  }
]
```

### Create Daily Discount
```http
POST /promotion/daily
Authorization: Bearer <promotion-token>
Content-Type: application/json

{
  "menuItemId": "507f1f77bcf86cd799439011",
  "discountPercentage": 15
}

Response (201 Created):
{
  "discountId": "DAILY-002",
  "newPrice": 382.50,
  "message": "Daily discount created successfully"
}
```

---

## 6. Order Manager Endpoints

### Get Menu for Ordering
```http
GET /order/menu
Authorization: Bearer <order-token>

Response (200 OK):
[
  {
    "itemId": "ITEM-001",
    "name": "Chicken Burger",
    "price": 450,
    "dailyDiscount": 10,
    "newPrice": 405,
    "image": "/uploads/food-items/chicken-burger.jpg",
    "stock": 15,
    "outOfStock": false
  }
]
```

### Create Order
```http
POST /order/create
Authorization: Bearer <order-token>
Content-Type: application/json

{
  "items": [
    {
      "itemId": "ITEM-001",
      "quantity": 2
    },
    {
      "itemId": "ITEM-002",
      "quantity": 1
    }
  ]
}

Response (201 Created):
{
  "orderId": "ORD-2024-001",
  "subtotal": 1080,
  "seasonalPromoDiscount": 162,
  "payableAmount": 918,
  "message": "Order created successfully"
}
```

### Complete Order (Deduct Stock)
```http
POST /order/complete/:orderId
Authorization: Bearer <order-token>

Response (200 OK):
{
  "message": "Order completed, stock deducted"
}
```

### Process Payment
```http
POST /order/pay
Authorization: Bearer <order-token>
Content-Type: application/json

{
  "orderId": "ORD-2024-001",
  "paymentType": "cash",
  "amountReceived": 1000
}

Response (201 Created):
{
  "transactionId": "TXN-2024-001",
  "change": 82,
  "message": "Payment processed successfully"
}
```

### Process Card Payment
```http
POST /order/pay
Authorization: Bearer <order-token>
Content-Type: application/json

{
  "orderId": "ORD-2024-001",
  "paymentType": "card",
  "cardDetails": {
    "cardNumber": "4532-XXXX-XXXX-1234",
    "cardHolderName": "John Doe",
    "expiryDate": "12/25"
  }
}

Response (201 Created):
{
  "transactionId": "TXN-2024-001",
  "message": "Card payment processed successfully"
}
```

### Get Transactions
```http
GET /order/transactions?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <order-token>

Response (200 OK):
[
  {
    "transactionId": "TXN-2024-001",
    "orderId": "ORD-2024-001",
    "items": [...],
    "total": 918,
    "paymentType": "cash",
    "status": "completed",
    "date": "2024-04-06"
  }
]
```

### Refund Transaction
```http
POST /order/refund/:transactionId
Authorization: Bearer <order-token>

Response (200 OK):
{
  "message": "Transaction refunded, stock restored"
}
```

### Kitchen Display (Auto-refresh)
```http
GET /order/kitchen-display
Authorization: Bearer <order-token>

Response (200 OK):
[
  {
    "orderId": "ORD-2024-001",
    "items": ["Chicken Burger x2", "Fries x1"],
    "status": "pending",
    "receivedTime": "2024-04-06T10:30:00Z"
  }
]
```

---

## 7. Finance Officer Endpoints

Same as Order Manager endpoints, with billing as default tab:

### Get Transaction Reports
```http
GET /finance/dashboard
Authorization: Bearer <finance-token>

Response (200 OK):
{
  "totalTransactions": 125,
  "totalRevenue": 45000,
  "averageOrderValue": 360,
  "dailyRevenue": [
    {
      "date": "2024-04-06",
      "cardPayments": 15000,
      "cashPayments": 12000,
      "total": 27000
    }
  ]
}
```

---

## 8. Feedback Endpoints

### Create Feedback
```http
POST /feedback/create
Authorization: Bearer <user-token>
Content-Type: multipart/form-data

{
  "type": "complaint",
  "orderId": "ORD-2024-001",
  "rating": 2,
  "comment": "Food was cold when delivered",
  "image": <file>
}

Response (201 Created):
{
  "feedbackId": "FB-2024-001",
  "message": "Feedback submitted successfully"
}
```

### Get My Feedback
```http
GET /feedback/my-feedback
Authorization: Bearer <user-token>

Response (200 OK):
[
  {
    "feedbackId": "FB-2024-001",
    "type": "complaint",
    "rating": 2,
    "comment": "Food was cold",
    "status": "pending",
    "image": "/uploads/complaints/complaint-001.jpg",
    "createdAt": "2024-04-06T10:30:00Z"
  }
]
```

### Get All Feedback (Admin)
```http
GET /feedback/all?status=pending
Authorization: Bearer <feedback-manager-token>

Response (200 OK):
[
  {
    "feedbackId": "FB-2024-001",
    "userId": "507f1f77bcf86cd799439011",
    "userName": "John Doe",
    "type": "complaint",
    "comment": "Food was cold",
    "status": "pending",
    "image": "/uploads/complaints/complaint-001.jpg"
  }
]
```

### Update Feedback Status
```http
PUT /feedback/:id/status
Authorization: Bearer <feedback-manager-token>
Content-Type: application/json

{
  "status": "resolved"
}

Response (200 OK):
{
  "message": "Feedback status updated to resolved"
}
```

### Delete Feedback
```http
DELETE /feedback/:id
Authorization: Bearer <user-token>

Response (200 OK):
{
  "message": "Feedback deleted successfully"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Validation error",
  "errors": {
    "email": "Invalid email format",
    "price": "Price must be greater than 0"
  }
}
```

### 401 Unauthorized
```json
{
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "message": "Insufficient permissions for this action"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "error": "Error details (in development only)"
}
```

---

**Last Updated**: April 6, 2026  
**API Version**: 1.0.0
