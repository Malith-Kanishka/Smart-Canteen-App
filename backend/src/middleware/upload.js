const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    './uploads/profile-pictures',
    './uploads/food-items',
    './uploads/complaints',
    './uploads/receipts',
    './uploads/transactions',
    './uploads/menu-items'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

// Profile Picture Upload
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/profile-pictures');
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5242880 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// Food Item Upload
const foodStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/food-items');
  },
  filename: (req, file, cb) => {
    cb(null, `food-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const foodUpload = multer({
  storage: foodStorage,
  limits: { fileSize: 5242880 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// Complaint Upload
const complaintStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/complaints');
  },
  filename: (req, file, cb) => {
    cb(null, `complaint-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const complaintUpload = multer({
  storage: complaintStorage,
  limits: { fileSize: 5242880 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

module.exports = {
  profileUpload,
  foodUpload,
  complaintUpload,
  ensureUploadDirs
};
