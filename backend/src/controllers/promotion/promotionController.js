const Promo = require('../../models/Promo');
const DailyDiscount = require('../../models/DailyDiscount');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');

// Generate unique promoId
const generatePromoId = async () => {
  const count = await Promo.countDocuments();
  return `PROMO${String(count + 1).padStart(4, '0')}`;
};

// Get all seasonal promotions
exports.getSeasonalPromos = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    const promos = await Promo.find(query).sort({ startDate: -1 });
    res.json(promos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single seasonal promo
exports.getSeasonalPromoById = async (req, res) => {
  try {
    const promo = await Promo.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: 'Promo not found' });
    }
    res.json(promo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create seasonal promo
exports.createSeasonalPromo = async (req, res) => {
  try {
    const { title, discountPercentage, startDate, endDate } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!discountPercentage || isNaN(discountPercentage) || discountPercentage < 1 || discountPercentage > 99) {
      return res.status(400).json({ message: 'Discount percentage must be between 1-99' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const promoId = await generatePromoId();

    const newPromo = new Promo({
      promoId,
      title,
      discountPercentage: parseInt(discountPercentage),
      startDate: start,
      endDate: end,
      status: 'scheduled'
    });

    await newPromo.save();
    res.status(201).json({
      message: 'Seasonal promo created successfully',
      promo: newPromo
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update seasonal promo
exports.updateSeasonalPromo = async (req, res) => {
  try {
    const { title, discountPercentage, startDate, endDate, status } = req.body;
    const promo = await Promo.findById(req.params.id);

    if (!promo) {
      return res.status(404).json({ message: 'Promo not found' });
    }

    if (title) promo.title = title;
    if (discountPercentage) promo.discountPercentage = parseInt(discountPercentage);
    if (startDate) promo.startDate = new Date(startDate);
    if (endDate) promo.endDate = new Date(endDate);
    if (status && ['scheduled', 'active', 'paused', 'expired'].includes(status)) promo.status = status;

    await promo.save();
    res.json({
      message: 'Promo updated successfully',
      promo
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete seasonal promo
exports.deleteSeasonalPromo = async (req, res) => {
  try {
    const promo = await Promo.findById(req.params.id);

    if (!promo) {
      return res.status(404).json({ message: 'Promo not found' });
    }

    await promo.deleteOne();
    res.json({ message: 'Promo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all daily discounts
exports.getDailyDiscounts = async (req, res) => {
  try {
    const { search, itemName } = req.query;
    let query = {};

    if (search) {
      query.itemName = { $regex: search, $options: 'i' };
    }

    if (itemName) {
      query.itemName = itemName;
    }

    const discounts = await DailyDiscount.find(query).sort({ createdAt: -1 });
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single daily discount
exports.getDailyDiscountById = async (req, res) => {
  try {
    const discount = await DailyDiscount.findById(req.params.id);
    if (!discount) {
      return res.status(404).json({ message: 'Daily discount not found' });
    }
    res.json(discount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create daily discount
exports.createDailyDiscount = async (req, res) => {
  try {
    const { itemName, originalPrice, discountedPrice, discountPercentage } = req.body;

    if (!itemName || itemName.trim().length === 0) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    if (!originalPrice || isNaN(originalPrice) || originalPrice <= 0) {
      return res.status(400).json({ message: 'Valid original price is required' });
    }

    if (!discountedPrice || isNaN(discountedPrice) || discountedPrice <= 0) {
      return res.status(400).json({ message: 'Valid discounted price is required' });
    }

    if (discountedPrice >= originalPrice) {
      return res.status(400).json({ message: 'Discounted price must be less than original price' });
    }

    const discount = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);

    const newDiscount = new DailyDiscount({
      itemName,
      originalPrice: parseFloat(originalPrice),
      discountedPrice: parseFloat(discountedPrice),
      discountPercentage: discount,
      isActive: true
    });

    await newDiscount.save();
    res.status(201).json({
      message: 'Daily discount created successfully',
      discount: newDiscount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update daily discount
exports.updateDailyDiscount = async (req, res) => {
  try {
    const { itemName, originalPrice, discountedPrice, isActive } = req.body;
    const discount = await DailyDiscount.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({ message: 'Daily discount not found' });
    }

    if (itemName) discount.itemName = itemName;
    if (originalPrice !== undefined) discount.originalPrice = parseFloat(originalPrice);
    if (discountedPrice !== undefined) discount.discountedPrice = parseFloat(discountedPrice);
    if (isActive !== undefined) discount.isActive = isActive;

    if (discount.originalPrice && discount.discountedPrice) {
      const newDiscount = Math.round(((discount.originalPrice - discount.discountedPrice) / discount.originalPrice) * 100);
      discount.discountPercentage = newDiscount;
    }

    await discount.save();
    res.json({
      message: 'Daily discount updated successfully',
      discount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete daily discount
exports.deleteDailyDiscount = async (req, res) => {
  try {
    const discount = await DailyDiscount.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({ message: 'Daily discount not found' });
    }

    await discount.deleteOne();
    res.json({ message: 'Daily discount deleted successfully' });
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
