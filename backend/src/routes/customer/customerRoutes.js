const express = require('express');
const router = express.Router();
const { auth, roleAccess } = require('../../middleware/auth');
const customerController = require('../../controllers/customer/customerController');

router.get('/dashboard', auth, roleAccess('customer'), customerController.getCustomerDashboard);
router.get('/orders', auth, roleAccess('customer'), customerController.getMyOrders);
router.get('/profile', auth, roleAccess('customer'), customerController.getMyProfile);
router.put('/profile', auth, roleAccess('customer'), customerController.updateMyProfile);

module.exports = router;
