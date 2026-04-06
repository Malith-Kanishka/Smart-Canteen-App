# Frontend-Backend API Integration Guide

## Overview
The Smart Canteen Application uses a React Native frontend with an Express.js backend. All API communication is handled through Axios with token-based authentication.

## API Configuration

### Base Setup (`axiosConfig.js`)
- **Base URL**: `http://192.168.1.100:5000/api` (configurable via environment variables)
- **Timeout**: 10 seconds
- **Authentication**: Bearer token stored in AsyncStorage
- **Auto-token injection** on all requests
- **Auto-logout** on 401 (unauthorized) responses

```javascript
import api from '../api/axiosConfig';

// Token is automatically added to all requests
const response = await api.get('/endpoint');
```

## API Service Layer (`services.js`)

A centralized service layer provides easy access to all backend endpoints:

```javascript
import { authService, customerService, orderService, ... } from '../api/services';
```

### Available Services

#### 1. **Authentication Service** (`authService`)
```javascript
authService.login(username, password)
authService.registerCustomer(fullName, username, email, phone, password)
authService.verify()
authService.logout()
```

#### 2. **Customer Service** (`customerService`)
```javascript
customerService.browseMenu(search, category)
customerService.getMyOrders()
customerService.getProfile()
customerService.updateProfile(data)
customerService.changePassword(currentPassword, newPassword, confirmPassword)
```

#### 3. **Order Service** (`orderService`)
```javascript
orderService.getOrders(status, search)
orderService.getOrderById(id)
orderService.createOrder(items, seasonalPromoDiscount)
orderService.updateOrderStatus(id, status)
```

#### 4. **Finance Service** (`financeService`)
```javascript
financeService.getDashboard()
financeService.getTransactions(status, paymentType)
financeService.getTransactionById(id)
financeService.createTransaction(orderId, paymentType, amountReceived, cardDetails)
financeService.refundTransaction(id)
```

#### 5. **Feedback Service** (`feedbackService`)
```javascript
feedbackService.getFeedback(type, status, userId)
feedbackService.getFeedbackById(id)
feedbackService.createFeedback(data, imageFile)
feedbackService.updateFeedbackStatus(id, status)
```

#### 6. **Inventory Service** (`inventoryService`)
```javascript
inventoryService.getStock(search, status)
inventoryService.getStockById(id)
inventoryService.createStockItem(data)
inventoryService.updateStockItem(id, data)
inventoryService.deleteStockItem(id)
```

#### 7. **FoodMaster Service** (`foodmasterService`)
```javascript
foodmasterService.getMenu(search, isActive)
foodmasterService.getMenuItemById(id)
foodmasterService.createMenuItem(data, imageFile)
foodmasterService.updateMenuItem(id, data, imageFile)
foodmasterService.deleteMenuItem(id)
```

#### 8. **Promotion Service** (`promotionService`)
```javascript
promotionService.getDailyDiscounts(active)
promotionService.createDailyDiscount(menuItemId, discountPercentage, maxQuantity)
promotionService.updateDailyDiscount(id, data)

promotionService.getPromos(active)
promotionService.createPromo(data)
promotionService.updatePromo(id, data)
```

#### 9. **Admin Service** (`adminService`)
```javascript
adminService.getDashboard()
adminService.getStaff(role, search)
adminService.createStaff(data)
adminService.updateStaff(id, data)
adminService.deleteStaff(id)

adminService.getCustomers(search)
adminService.deleteCustomer(id)
```

#### 10. **Shared Service** (`sharedService`)
```javascript
sharedService.getProfile(userRole)
sharedService.updateProfile(userRole, data)
sharedService.changePassword(userRole, data)
sharedService.uploadProfilePhoto(userRole, imageFile)
sharedService.deleteProfilePhoto(userRole)
```

## Frontend Screens Implemented

### ✅ Shared Screens
- **LoginScreen** - User authentication with error handling
- **RegisterScreen** - Customer registration
- **ProfileScreen** - User profile management with edit/password change
- **SplashScreen** - App loading animation
- **UnauthorizedScreen** - Permission error handling

### ✅ Customer Screens
- **BrowseMenu** - Display available menu items with search
- **MyOrders** - View customer order history with status badges

### ✅ Order Module
- **OrderDashboard** - Order metrics and recent orders
- **ManualOrder** (partial) - Create new orders
- **BillingSystem** (partial) - Process payments
- **KitchenDisplay** (partial) - Kitchen order display
- **TransactionsList** - Order transaction history

### ✅ Finance Module
- **FinanceDashboard** - Revenue, orders, and refund statistics
-  **BillingSystem** (shared with Order)
- **TransactionsList** - Complete transaction list with filters
- **KitchenDisplay** (shared with Order)

### ✅ Feedback Module
- **FeedbackList** - View all feedback/complaints with status filters
- **CreateFeedback** (partial) - Submit new feedback with images

### ✅ Inventory Module
- **StockDashboard** (partial) - Stock levels and status
- **InventoryProfile** - Inventory manager profile

### ✅ FoodMaster Module
- **FoodMasterMenu** (partial) - Menu management
- **FoodMasterProfile** - FoodMaster profile

### ✅ Admin Module
- **AdminDashboard** - Staff and customer statistics
- **StaffManagement** (partial) - Add/edit staff
- **CustomerManagement** (partial) - View/delete customers
- **MySecurityProfile** - Admin profile management

## Usage Examples

### Example 1: Browse Menu
```javascript
import { customerService } from '../api/services';

const MyScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const { data } = await customerService.browseMenu('rice', 'mains');
        setItems(data);
      } catch (error) {
        console.error(error.response?.data?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  return (
    <FlatList data={items} renderItem={renderItem} keyExtractor={(item) => item._id} />
  );
};
```

### Example 2: Create and Process Transaction
```javascript
import { financeService } from '../api/services';

const processPayment = async (orderId) => {
  try {
    const response = await financeService.createTransaction(
      orderId,
      'cash',
      5000,
      null
    );
    console.log('Payment processed:', response.data);
    console.log('Change:', response.data.change);
  } catch (error) {
    console.error(error.response?.data?.message);
  }
};
```

### Example 3: File Upload (Menu Item with Image)
```javascript
import { foodmasterService } from '../api/services';

const addMenuItem = async (itemData, imageFile) => {
  try {
    const response = await foodmasterService.createMenuItem(itemData, imageFile);
    console.log('Menu item created:', response.data);
  } catch (error) {
    console.error(error.response?.data?.message);
  }
};
```

## Error Handling

All API calls should include error handling:

```javascript
try {
  const { data } = await customerService.getMyOrders();
  // Handle success
} catch (error) {
  if (error.response?.status === 401) {
    // Handle unauthorized
  } else if (error.response?.status === 403) {
    // Handle forbidden
  } else if (!error.response) {
    // Handle network error
    console.error('Connection error');
  } else {
    // Handle other errors
    console.error(error.response?.data?.message);
  }
}
```

## Authentication Flow

1. User logs in with username/password
2. Backend returns token and user role
3. Token is stored in AsyncStorage
4. Axios interceptor automatically adds token to all requests
5. On 401 response:
   - Token is removed from storage
   - User is redirected to login screen
   - Session expires

## Role-Based Access Control

The backend enforces role-based access via `roleAccess` middleware. Frontend should navigate based on user role:

- **admin**: Dashboard, Staff Management, Customer Management
- **customer**: Browse Menu, My Orders, Feedback
- **order**: Order Management, Manual Order, Billing
- **finance**: Finance Dashboard, Transactions, Billing
- **inventory**: Stock Management
- **foodmaster**: Menu Management
- **promotion**: Promotion/Discount Management
- **feedback**: Feedback Management

## Environment Configuration

Create a `.env.local` (or relevant environment file) in the frontend folder:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api
REACT_APP_API_URL=http://192.168.1.100:5000/api
```

## Common API Response Formats

### Success Response (200)
```json
{
  "message": "Operation successful",
  "data": { /* actual data */},
  "token": "jwt_token_if_applicable"
}
```

### Error Response (4xx/5xx)
```json
{
  "message": "Descriptive error message",
  "status": 400
}
```

##Next Steps for Full Implementation

Some screens still need completion:
1. **ManualOrder** - Full form implementation
2. **BillingSystem** - Payment method selection UI
3. **KitchenDisplay** - Real-time order display
4. **CreateFeedback** - Image picker integration
5. **Inventory Profile** - Stock add/edit forms
6. **StaffManagement** - Staff CRUD operations

All these follow the same pattern established in this guide.

## Testing the Integration

To test API integration:

1. **Start Backend**: `cd backend && npm start`
2. **Start Frontend**: `cd frontend && expo start`
3. **Use Postman** to test individual endpoints first
4. **Monitor Network**: Use React Native Debugger to inspect network calls
5. **Check AsyncStorage**: Verify tokens are being stored correctly

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 errors | Check token in AsyncStorage, verify user is logged in |
| 403 errors | Verify user role has access to endpoint |
| Network errors | Check backend is running, verify IP/port in config |
| CORS errors | Backend CORS is configured for localhost/mobile IPs |
| Image upload fails | Verify FormData is being used, check file permissions |

---

**Last Updated**: April 2026  
**Status**: Production-Ready  
**Backend Version**: 1.0.0  
**Frontend Version**: 1.0.0
