import api from './axiosConfig';

/**
 * Authentication Services
 */
export const authService = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  registerCustomer: (data) => api.post('/auth/register', data),
  verify: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
};

/**
 * Customer Services
 */
export const customerService = {
  browseMenu: (search, category) =>
    api.get('/customer/menu', { params: { search, category } }),
  getMyOrders: () => api.get('/customer/orders'),
  getProfile: () => api.get('/customer/profile'),
  updateProfile: (data) => api.put('/customer/profile', data),
  changePassword: (currentPassword, newPassword, confirmPassword) =>
    api.put('/customer/change-password', { currentPassword, newPassword, confirmPassword }),
};

/**
 * Order Services
 */
export const orderService = {
  getOrders: (status, search) =>
    api.get('/order', { params: { status, search } }),
  getOrderById: (id) => api.get(`/order/${id}`),
  createOrder: (items, seasonalPromoDiscount) =>
    api.post('/order', { items, seasonalPromoDiscount }),
  updateOrderStatus: (id, status) =>
    api.put(`/order/${id}/status`, { status }),
};

/**
 * Finance Services
 */
export const financeService = {
  getDashboard: () => api.get('/finance/dashboard'),
  getTransactions: (status, paymentType) =>
    api.get('/finance/transactions', { params: { status, paymentType } }),
  getTransactionById: (id) => api.get(`/finance/transactions/${id}`),
  createTransaction: (orderId, paymentType, amountReceived, cardDetails) =>
    api.post('/finance/transactions', { orderId, paymentType, amountReceived, cardDetails }),
  refundTransaction: (id) => api.post(`/finance/transactions/${id}/refund`),
};

/**
 * Feedback Services
 */
export const feedbackService = {
  getFeedback: (type, status, userId) =>
    api.get('/feedback', { params: { type, status, userId } }),
  getFeedbackById: (id) => api.get(`/feedback/${id}`),
  createFeedback: (data, imageFile) => {
    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('rating', data.rating);
    formData.append('comment', data.comment);
    formData.append('orderId', data.orderId);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return api.post('/feedback', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateFeedbackStatus: (id, status) =>
    api.put(`/feedback/${id}/status`, { status }),
};

/**
 * Inventory Services
 */
export const inventoryService = {
  getStock: (search, status) =>
    api.get('/inventory/stock', { params: { search, status } }),
  getStockById: (id) => api.get(`/inventory/stock/${id}`),
  createStockItem: (data) => api.post('/inventory/stock', data),
  updateStockItem: (id, data) => api.put(`/inventory/stock/${id}`, data),
  deleteStockItem: (id) => api.delete(`/inventory/stock/${id}`),
};

/**
 * FoodMaster Services
 */
export const foodmasterService = {
  getMenu: (search, isActive) =>
    api.get('/foodmaster/menu', { params: { search, isActive } }),
  getMenuItemById: (id) => api.get(`/foodmaster/menu/${id}`),
  createMenuItem: (data, imageFile) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('price', data.price);
    formData.append('category', data.category);
    formData.append('isActive', data.isActive);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return api.post('/foodmaster/menu', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateMenuItem: (id, data, imageFile) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('price', data.price);
    formData.append('category', data.category);
    formData.append('isActive', data.isActive);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return api.put(`/foodmaster/menu/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteMenuItem: (id) => api.delete(`/foodmaster/menu/${id}`),
};

/**
 * Promotion Services
 */
export const promotionService = {
  getDailyDiscounts: (active) =>
    api.get('/promotion/daily', { params: { active } }),
  getDailyDiscountById: (id) => api.get(`/promotion/daily/${id}`),
  createDailyDiscount: (menuItemId, discountPercentage, maxQuantity) =>
    api.post('/promotion/daily', { menuItemId, discountPercentage, maxQuantity }),
  updateDailyDiscount: (id, data) => api.put(`/promotion/daily/${id}`, data),
  deleteDailyDiscount: (id) => api.delete(`/promotion/daily/${id}`),

  getPromos: (active) => api.get('/promotion/seasonal', { params: { active } }),
  getPromoById: (id) => api.get(`/promotion/seasonal/${id}`),
  createPromo: (data) => api.post('/promotion/seasonal', data),
  updatePromo: (id, data) => api.put(`/promotion/seasonal/${id}`, data),
  deletePromo: (id) => api.delete(`/promotion/seasonal/${id}`),
};

/**
 * Admin Services
 */
export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getStaff: (role, search) =>
    api.get('/admin/staff', { params: { role, search } }),
  createStaff: (data) => api.post('/admin/staff', data),
  updateStaff: (id, data) => api.put(`/admin/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/admin/staff/${id}`),

  getCustomers: (search) => api.get('/admin/customers', { params: { search } }),
  updateCustomer: (id, data) => api.put(`/admin/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/admin/customers/${id}`),
};

/**
 * Shared Services (Profile, Auth)
 */
export const sharedService = {
  getProfile: (userRole) => api.get(`/${userRole}/profile`),
  updateProfile: (userRole, data) => api.put(`/${userRole}/profile`, data),
  changePassword: (userRole, data) =>
    api.put(`/${userRole}/change-password`, data),
  uploadProfilePhoto: (userRole, imageFile) => {
    const formData = new FormData();
    formData.append('photo', imageFile);
    return api.post(`/${userRole}/profile/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteProfilePhoto: (userRole) => api.delete(`/${userRole}/profile/photo`),
};

export default {
  authService,
  customerService,
  orderService,
  financeService,
  feedbackService,
  inventoryService,
  foodmasterService,
  promotionService,
  adminService,
  sharedService,
};
