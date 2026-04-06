const User = require('../../models/User');
const { generateToken } = require('../../middleware/auth');
const { validateEmail, validatePhone } = require('../../utils/validators');

const KNOWN_ROLES = new Set(['admin', 'foodmaster', 'inventory', 'promotion', 'order', 'finance', 'feedback', 'customer']);

const sanitizeUser = (user) => {
  const plain = user.toObject();
  delete plain.password;
  return plain;
};

const buildUniqueUsername = async (baseUsername) => {
  const normalized = baseUsername.toLowerCase().trim();
  let attempt = normalized;
  let counter = 1;

  while (await User.exists({ username: attempt })) {
    attempt = `${normalized}${counter}`;
    counter += 1;
  }

  return attempt;
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim(), isActive: true });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = generateToken(user._id, user.role);
    return res.status(200).json({
      message: 'Login successful',
      token,
      role: user.role,
      isKnownRole: KNOWN_ROLES.has(user.role),
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

exports.registerCustomer = async (req, res) => {
  try {
    const { fullName, username, password, email, phone, address, dateOfBirth } = req.body;

    if (!fullName || !username || !password || !email || !phone) {
      return res.status(400).json({ message: 'Full name, username, password, email, and phone are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ message: 'Phone must be exactly 10 digits' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: email.toLowerCase().trim() }]
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const uniqueUsername = await buildUniqueUsername(normalizedUsername);

    const customer = await User.create({
      fullName: fullName.trim(),
      username: uniqueUsername,
      password,
      email: email.toLowerCase().trim(),
      phone,
      role: 'customer',
      address: address || '',
      dateOfBirth: dateOfBirth || null
    });

    const token = generateToken(customer._id, customer.role);
    return res.status(201).json({
      message: 'Customer registration successful',
      token,
      role: customer.role,
      user: sanitizeUser(customer)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

exports.verify = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    return res.status(200).json({
      message: 'Token verified',
      role: user.role,
      user
    });
  } catch (error) {
    return res.status(500).json({ message: 'Token verification failed', error: error.message });
  }
};

exports.logout = async (req, res) => {
  return res.status(200).json({ message: 'Logout successful' });
};
