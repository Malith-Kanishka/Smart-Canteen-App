const User = require('../../models/User');
const Order = require('../../models/Order');
const MenuItem = require('../../models/MenuItem');
const StockItem = require('../../models/StockItem');
const { createProfileHandlers } = require('../../utils/profileHandlers');

const profileHandlers = createProfileHandlers({ minAge: 17 });

exports.getProfile = profileHandlers.getProfile;
exports.updateProfile = profileHandlers.updateProfile;
exports.changePassword = profileHandlers.changePassword;
exports.uploadProfilePhoto = profileHandlers.uploadProfilePhoto;
exports.deleteProfilePhoto = profileHandlers.deleteProfilePhoto;

// Browse menu
exports.browseMenu = async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (category) {
      query.category = category;
    }

    const menuItems = await MenuItem.find(query).sort({ createdAt: -1 });
    const stockItems = await StockItem.find({}).select('itemId itemName currentQty');

    const stockByItemId = new Map(
      stockItems
        .filter((stock) => stock.itemId)
        .map((stock) => [String(stock.itemId), stock.currentQty])
    );

    const stockByItemName = new Map(
      stockItems
        .filter((stock) => stock.itemName)
        .map((stock) => [String(stock.itemName).toLowerCase(), stock.currentQty])
    );

    const menuWithStock = menuItems.map((menu) => {
      const itemIdQty = stockByItemId.get(String(menu._id));
      const nameQty = stockByItemName.get(String(menu.name).toLowerCase());
      const quantity = Number.isFinite(itemIdQty) ? itemIdQty : (Number.isFinite(nameQty) ? nameQty : 0);

      return {
        ...menu.toObject(),
        quantity,
        isOutOfStock: quantity <= 0
      };
    });

    res.json(menuWithStock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get my orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
