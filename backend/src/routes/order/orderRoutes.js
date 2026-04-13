const express = require('express');
const router = express.Router();
const { auth, roleAccess } = require('../../middleware/auth');
const { profileUpload } = require('../../middleware/upload');
const orderController = require('../../controllers/order/orderController');

// Orders
router.get('/', auth, roleAccess('order'), orderController.getOrders);
router.post('/', auth, roleAccess('order'), orderController.createOrder);

// Profile
router.get('/profile', auth, roleAccess('order'), orderController.getProfile);
router.put('/profile', auth, roleAccess('order'), orderController.updateProfile);
router.put('/change-password', auth, roleAccess('order'), orderController.changePassword);
router.post('/profile/photo', auth, roleAccess('order'), profileUpload.single('photo'), orderController.uploadProfilePhoto);
router.delete('/profile/photo', auth, roleAccess('order'), orderController.deleteProfilePhoto);

// Kitchen Display
router.get('/kitchen-display', auth, roleAccess('order'), (req, res) => {
  res.json({ message: 'Kitchen display - Implementation pending' });
});

// ID-based order actions
router.get('/:id', auth, roleAccess('order'), orderController.getOrderById);
router.put('/:id/status', auth, roleAccess('order'), orderController.updateOrderStatus);

module.exports = router;
