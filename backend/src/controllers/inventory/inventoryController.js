const StockItem = require('../../models/StockItem');
const MenuItem = require('../../models/MenuItem');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');

// Get stock dashboard
exports.getDashboard = async (req, res) => {
  try {
    const totalItems = await StockItem.countDocuments();
    const lowStockItems = await StockItem.countDocuments({ status: 'low_stock' });
    const overStockItems = await StockItem.countDocuments({ status: 'over_stock' });
    
    const totalValue = await StockItem.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$currentQty', '$unitPrice'] } }
        }
      }
    ]);

    const lowStockList = await StockItem.find({ status: 'low_stock' }).limit(5);

    res.json({
      totalItems,
      lowStockItems,
      overStockItems,
      totalInventoryValue: totalValue[0]?.total || 0,
      lowStockList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all stock items with search/filter
exports.getStock = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    const items = await StockItem.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single stock item
exports.getStockItem = async (req, res) => {
  try {
    const item = await StockItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Stock item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new stock item
exports.createStockItem = async (req, res) => {
  try {
    const { itemName, currentQty, minQty, maxQty, unitPrice } = req.body;

    // Validation
    if (!itemName || itemName.trim().length === 0) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    if (currentQty === undefined || isNaN(currentQty) || currentQty < 0) {
      return res.status(400).json({ message: 'Valid current quantity is required' });
    }

    if (minQty === undefined || isNaN(minQty) || minQty < 0) {
      return res.status(400).json({ message: 'Valid minimum quantity is required' });
    }

    if (maxQty === undefined || isNaN(maxQty) || maxQty < 0) {
      return res.status(400).json({ message: 'Valid maximum quantity is required' });
    }

    if (!unitPrice || isNaN(unitPrice) || unitPrice < 0) {
      return res.status(400).json({ message: 'Valid unit price is required' });
    }

    // Determine status based on quantities
    let status = 'good';
    if (parseInt(currentQty) < parseInt(minQty)) status = 'low_stock';
    if (parseInt(currentQty) > parseInt(maxQty)) status = 'over_stock';

    const newItem = new StockItem({
      itemName,
      currentQty: parseInt(currentQty),
      minQty: parseInt(minQty),
      maxQty: parseInt(maxQty),
      unitPrice: parseFloat(unitPrice),
      status
    });

    await newItem.save();
    res.status(201).json({
      message: 'Stock item created successfully',
      item: newItem
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update stock item
exports.updateStockItem = async (req, res) => {
  try {
    const { itemName, currentQty, minQty, maxQty, unitPrice } = req.body;
    const item = await StockItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    if (itemName) item.itemName = itemName;
    if (currentQty !== undefined) item.currentQty = parseInt(currentQty);
    if (minQty !== undefined) item.minQty = parseInt(minQty);
    if (maxQty !== undefined) item.maxQty = parseInt(maxQty);
    if (unitPrice !== undefined) item.unitPrice = parseFloat(unitPrice);

    // Auto-update status
    let status = 'good';
    if (item.currentQty < item.minQty) status = 'low_stock';
    if (item.currentQty > item.maxQty) status = 'over_stock';
    item.status = status;

    await item.save();
    res.json({
      message: 'Stock item updated successfully',
      item
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete stock item
exports.deleteStockItem = async (req, res) => {
  try {
    const item = await StockItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    await item.deleteOne();
    res.json({ message: 'Stock item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone, address, dateOfBirth } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;

    await user.save();
    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters with letters and numbers'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload profile photo
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.profilePhoto) {
      const oldPhotoPath = path.join(__dirname, '../../..', user.profilePhoto);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    user.profilePhoto = `/uploads/profile-pictures/${req.file.filename}`;
    await user.save();

    res.json({
      message: 'Photo uploaded successfully',
      photoPath: user.profilePhoto
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete profile photo
exports.deleteProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.profilePhoto) {
      const photoPath = path.join(__dirname, '../../..', user.profilePhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    user.profilePhoto = null;
    await user.save();

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
