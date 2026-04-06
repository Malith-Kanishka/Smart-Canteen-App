const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const {
  validateNIC,
  validateEmail,
  validatePhone,
  validateAge,
  generateUsername,
  generatePassword
} = require('../../utils/validators');

const STAFF_ROLES = ['admin', 'foodmaster', 'inventory', 'promotion', 'order', 'finance', 'feedback'];

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const sanitizeUser = (user) => {
  const plain = user.toObject();
  delete plain.password;
  return plain;
};

const buildUniqueStaffId = async () => {
  let attempt;
  do {
    attempt = `STF-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  } while (await User.exists({ staffId: attempt }));
  return attempt;
};

const buildUniqueUsername = async (fullName) => {
  const base = generateUsername(fullName);
  let attempt = base;
  let counter = 1;

  while (await User.exists({ username: attempt })) {
    attempt = `${base}${counter}`;
    counter += 1;
  }

  return attempt;
};

exports.getDashboard = async (req, res) => {
  try {
    const [totalStaff, totalCustomers, roleGroups] = await Promise.all([
      User.countDocuments({ role: { $in: STAFF_ROLES }, isActive: true }),
      User.countDocuments({ role: 'customer', isActive: true }),
      User.aggregate([
        { $match: { role: { $in: STAFF_ROLES }, isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ])
    ]);

    const staffByRole = STAFF_ROLES.reduce((acc, role) => {
      acc[role] = 0;
      return acc;
    }, {});

    roleGroups.forEach((row) => {
      staffByRole[row._id] = row.count;
    });

    return res.status(200).json({
      totalStaff,
      totalCustomers,
      staffByRole
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load dashboard', error: error.message });
  }
};

exports.getStaff = async (req, res) => {
  try {
    const { search = '', role = '' } = req.query;
    const filter = {
      role: { $in: STAFF_ROLES },
      isActive: true
    };

    if (role && STAFF_ROLES.includes(role)) {
      filter.role = role;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ fullName: regex }, { staffId: regex }];
    }

    const staff = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json(staff);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load staff', error: error.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const { fullName, nic, phone, email, address, dateOfBirth, role } = req.body;

    if (!fullName || !nic || !phone || !email || !dateOfBirth || !role) {
      return res.status(400).json({ message: 'Full name, NIC, phone, email, DOB, and role are required' });
    }

    if (!STAFF_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid staff role' });
    }

    if (!validateNIC(nic)) {
      return res.status(400).json({ message: 'Invalid NIC format' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ message: 'Phone must be exactly 10 digits' });
    }

    if (!validateAge(dateOfBirth, 16)) {
      return res.status(400).json({ message: 'Staff age must be at least 16' });
    }

    const exists = await User.findOne({
      $or: [{ nic }, { email: email.toLowerCase().trim() }]
    });

    if (exists) {
      return res.status(409).json({ message: 'Staff with the same NIC or email already exists' });
    }

    const generatedPassword = generatePassword();
    const staffId = await buildUniqueStaffId();
    const username = await buildUniqueUsername(fullName);

    const staff = await User.create({
      fullName: fullName.trim(),
      nic,
      phone,
      email: email.toLowerCase().trim(),
      address: address || '',
      dateOfBirth,
      role,
      staffId,
      username,
      password: generatedPassword
    });

    return res.status(201).json({
      message: 'Staff created successfully',
      generatedCredentials: {
        staffId,
        username,
        password: generatedPassword
      },
      staff: sanitizeUser(staff)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create staff', error: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, nic, phone, email, address, dateOfBirth, role } = req.body;

    const staff = await User.findById(id);
    if (!staff || !STAFF_ROLES.includes(staff.role)) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    if (nic && !validateNIC(nic)) {
      return res.status(400).json({ message: 'Invalid NIC format' });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ message: 'Phone must be exactly 10 digits' });
    }

    if (dateOfBirth && !validateAge(dateOfBirth, 16)) {
      return res.status(400).json({ message: 'Staff age must be at least 16' });
    }

    if (role && !STAFF_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid staff role' });
    }

    if (nic || email) {
      const duplicate = await User.findOne({
        _id: { $ne: id },
        $or: [
          ...(nic ? [{ nic }] : []),
          ...(email ? [{ email: email.toLowerCase().trim() }] : [])
        ]
      });

      if (duplicate) {
        return res.status(409).json({ message: 'NIC or email already in use' });
      }
    }

    if (fullName !== undefined) staff.fullName = fullName.trim();
    if (nic !== undefined) staff.nic = nic;
    if (phone !== undefined) staff.phone = phone;
    if (email !== undefined) staff.email = email.toLowerCase().trim();
    if (address !== undefined) staff.address = address;
    if (dateOfBirth !== undefined) staff.dateOfBirth = dateOfBirth;
    if (role !== undefined) staff.role = role;

    await staff.save();
    return res.status(200).json({ message: 'Staff updated successfully', staff: sanitizeUser(staff) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update staff', error: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id);

    if (!staff || !STAFF_ROLES.includes(staff.role)) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    await User.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Staff deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete staff', error: error.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const filter = { role: 'customer', isActive: true };

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ fullName: regex }, { username: regex }];
    }

    const customers = await User.find(filter).select('-password').sort({ createdAt: -1 });
    return res.status(200).json(customers);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load customers', error: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await User.findById(id);

    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await User.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete customer', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    return res.status(200).json(admin);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load profile', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, email, address, dateOfBirth } = req.body;
    const admin = await User.findById(req.user.userId);

    if (!admin) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ message: 'Phone must be exactly 10 digits' });
    }

    if (dateOfBirth && !validateAge(dateOfBirth, 16)) {
      return res.status(400).json({ message: 'Age must be at least 16' });
    }

    if (email || phone) {
      const duplicate = await User.findOne({
        _id: { $ne: admin._id },
        $or: [
          ...(email ? [{ email: email.toLowerCase().trim() }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      });

      if (duplicate) {
        return res.status(409).json({ message: 'Email or phone already in use' });
      }
    }

    if (fullName !== undefined) admin.fullName = fullName.trim();
    if (phone !== undefined) admin.phone = phone;
    if (email !== undefined) admin.email = email.toLowerCase().trim();
    if (address !== undefined) admin.address = address;
    if (dateOfBirth !== undefined) admin.dateOfBirth = dateOfBirth;

    await admin.save();
    return res.status(200).json({ message: 'Profile updated successfully', profile: sanitizeUser(admin) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Current password, new password, and confirmation are required' });
    }

    if (!PASSWORD_POLICY.test(newPassword)) {
      return res.status(400).json({ message: 'New password must be at least 8 characters and include letters and numbers' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirmation do not match' });
    }

    const admin = await User.findById(req.user.userId);
    if (!admin) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const matches = await admin.comparePassword(currentPassword);
    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Profile photo is required' });
    }

    const admin = await User.findById(req.user.userId);
    if (!admin) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    admin.profilePhoto = `/uploads/profile-pictures/${req.file.filename}`;
    await admin.save();

    return res.status(200).json({
      message: 'Profile photo uploaded successfully',
      profilePhoto: admin.profilePhoto
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload profile photo', error: error.message });
  }
};

exports.deleteProfilePhoto = async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId);
    if (!admin) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    admin.profilePhoto = null;
    await admin.save();

    return res.status(200).json({ message: 'Profile photo deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete profile photo', error: error.message });
  }
};
