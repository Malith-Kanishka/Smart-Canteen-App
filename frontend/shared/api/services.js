import api from './axiosConfig';

/**
 * Authentication Services
 */
export const authService = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  registerCustomer: (fullName, username, email, phone, password) =>
    api.post('/auth/register', { fullName, username, email, phone, password }),
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
export const financeService = {\n  getDashboard: () => api.get('/finance/dashboard'),\n  getTransactions: (status, paymentType) =>\n    api.get('/finance/transactions', { params: { status, paymentType } }),\n  getTransactionById: (id) => api.get(`/finance/transactions/${id}`),\n  createTransaction: (orderId, paymentType, amountReceived, cardDetails) =>\n    api.post('/finance/transactions', { orderId, paymentType, amountReceived, cardDetails }),\n  refundTransaction: (id) => api.post(`/finance/transactions/${id}/refund`),\n};

/**\n * Feedback Services\n */\nexport const feedbackService = {\n  getFeedback: (type, status, userId) =>\n    api.get('/feedback', { params: { type, status, userId } }),\n  getFeedbackById: (id) => api.get(`/feedback/${id}`),\n  createFeedback: (data, imageFile) => {\n    const formData = new FormData();\n    formData.append('type', data.type);\n    formData.append('rating', data.rating);\n    formData.append('comment', data.comment);\n    formData.append('orderId', data.orderId);\n    if (imageFile) {\n      formData.append('image', imageFile);\n    }\n    return api.post('/feedback', formData, {\n      headers: { 'Content-Type': 'multipart/form-data' },\n    });\n  },\n  updateFeedbackStatus: (id, status) =>\n    api.put(`/feedback/${id}/status`, { status }),\n};

/**\n * Inventory Services\n */\nexport const inventoryService = {\n  getStock: (search, status) =>\n    api.get('/inventory/stock', { params: { search, status } }),\n  getStockById: (id) => api.get(`/inventory/stock/${id}`),\n  createStockItem: (data) => api.post('/inventory/stock', data),\n  updateStockItem: (id, data) => api.put(`/inventory/stock/${id}`, data),\n  deleteStockItem: (id) => api.delete(`/inventory/stock/${id}`),\n};

/**\n * FoodMaster Services\n */\nexport const foodmasterService = {\n  getMenu: (search, isActive) =>\n    api.get('/foodmaster/menu', { params: { search, isActive } }),\n  getMenuItemById: (id) => api.get(`/foodmaster/menu/${id}`),\n  createMenuItem: (data, imageFile) => {\n    const formData = new FormData();\n    formData.append('name', data.name);\n    formData.append('description', data.description);\n    formData.append('price', data.price);\n    formData.append('category', data.category);\n    formData.append('isActive', data.isActive);\n    if (imageFile) {\n      formData.append('image', imageFile);\n    }\n    return api.post('/foodmaster/menu', formData, {\n      headers: { 'Content-Type': 'multipart/form-data' },\n    });\n  },\n  updateMenuItem: (id, data, imageFile) => {\n    const formData = new FormData();\n    formData.append('name', data.name);\n    formData.append('description', data.description);\n    formData.append('price', data.price);\n    formData.append('category', data.category);\n    formData.append('isActive', data.isActive);\n    if (imageFile) {\n      formData.append('image', imageFile);\n    }\n    return api.put(`/foodmaster/menu/${id}`, formData, {\n      headers: { 'Content-Type': 'multipart/form-data' },\n    });\n  },\n  deleteMenuItem: (id) => api.delete(`/foodmaster/menu/${id}`),\n};

/**\n * Promotion Services\n */\nexport const promotionService = {\n  getDailyDiscounts: (active) =>\n    api.get('/promotion/daily', { params: { active } }),\n  getDailyDiscountById: (id) => api.get(`/promotion/daily/${id}`),\n  createDailyDiscount: (menuItemId, discountPercentage, maxQuantity) =>\n    api.post('/promotion/daily', { menuItemId, discountPercentage, maxQuantity }),\n  updateDailyDiscount: (id, data) => api.put(`/promotion/daily/${id}`, data),\n  deleteDailyDiscount: (id) => api.delete(`/promotion/daily/${id}`),\n\n  getPromos: (active) => api.get('/promotion/seasonal', { params: { active } }),\n  getPromoById: (id) => api.get(`/promotion/seasonal/${id}`),\n  createPromo: (data) => api.post('/promotion/seasonal', data),\n  updatePromo: (id, data) => api.put(`/promotion/seasonal/${id}`, data),\n  deletePromo: (id) => api.delete(`/promotion/seasonal/${id}`),\n};

/**\n * Admin Services\n */\nexport const adminService = {\n  getDashboard: () => api.get('/admin/dashboard'),\n  getStaff: (role, search) =>\n    api.get('/admin/staff', { params: { role, search } }),\n  createStaff: (data) => api.post('/admin/staff', data),\n  updateStaff: (id, data) => api.put(`/admin/staff/${id}`, data),\n  deleteStaff: (id) => api.delete(`/admin/staff/${id}`),\n\n  getCustomers: (search) => api.get('/admin/customers', { params: { search } }),\n  deleteCustomer: (id) => api.delete(`/admin/customers/${id}`),\n};

/**\n * Shared Services (Profile, Auth)\n */\nexport const sharedService = {\n  getProfile: (userRole) => api.get(`/${userRole}/profile`),\n  updateProfile: (userRole, data) => api.put(`/${userRole}/profile`, data),\n  changePassword: (userRole, data) =>\n    api.put(`/${userRole}/change-password`, data),\n  uploadProfilePhoto: (userRole, imageFile) => {\n    const formData = new FormData();\n    formData.append('photo', imageFile);\n    return api.post(`/${userRole}/profile/photo`, formData, {\n      headers: { 'Content-Type': 'multipart/form-data' },\n    });\n  },\n  deleteProfilePhoto: (userRole) => api.delete(`/${userRole}/profile/photo`),\n};

export default {\n  authService,\n  customerService,\n  orderService,\n  financeService,\n  feedbackService,\n  inventoryService,\n  foodmasterService,\n  promotionService,\n  adminService,\n  sharedService,\n};
