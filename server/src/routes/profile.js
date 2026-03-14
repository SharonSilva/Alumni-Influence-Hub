const express  = require('express');
const path     = require('path');
const multer   = require('multer');
const { body } = require('express-validator');
const ctrl     = require('../controllers/ProfileController');
const { authenticate } = require('../middleware/Auth');

const router = express.Router();
router.use(authenticate);

// Multer (photo upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
  filename:    (req, file, cb) => cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    allowed.includes(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('Only jpg, jpeg, png, webp allowed'));
  },
});

//Core profile
router.get('/',          ctrl.getProfile);
router.put('/', [
  body('bio').optional().trim().isLength({ max: 1000 }),
  body('linkedInUrl').optional().isURL(),
  body('currentRole').optional().trim(),
  body('currentEmployer').optional().trim(),
  body('location').optional().trim(),
  body('graduationYear').optional().isInt({ min: 1950, max: new Date().getFullYear() }),
], ctrl.updateProfile);
router.post('/photo', (req, res) => {
  upload.single('photo')(req, res, err => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    ctrl.uploadPhoto(req, res);
  });
});
router.get('/completion', ctrl.getCompletion);

// Sub-resource route builder
function subRoutes(path, collectionKey, label, postValidators) {
  const c = ctrl.subResourceController(collectionKey, label);
  router.get(path,           c.list);
  router.post(path,          postValidators, c.create);
  router.put(`${path}/:itemId`,    c.update);
  router.delete(`${path}/:itemId`, c.remove);
}

subRoutes('/degrees', 'degrees', 'Degree', [
  body('title').trim().notEmpty(),
  body('institution').trim().notEmpty(),
  body('url').optional().isURL(),
  body('completedDate').optional().isISO8601(),
]);

subRoutes('/certifications', 'certifications', 'Certification', [
  body('name').trim().notEmpty(),
  body('issuer').trim().notEmpty(),
  body('url').optional().isURL(),
  body('completedDate').optional().isISO8601(),
]);

subRoutes('/licences', 'licences', 'Licence', [
  body('name').trim().notEmpty(),
  body('awardingBody').trim().notEmpty(),
  body('url').optional().isURL(),
  body('completedDate').optional().isISO8601(),
]);

subRoutes('/courses', 'courses', 'Course', [
  body('name').trim().notEmpty(),
  body('provider').trim().notEmpty(),
  body('url').optional().isURL(),
  body('completedDate').optional().isISO8601(),
]);

subRoutes('/employment', 'employmentHistory', 'Employment record', [
  body('jobTitle').trim().notEmpty(),
  body('employer').trim().notEmpty(),
  body('startDate').isISO8601(),
  body('endDate').optional().isISO8601(),
  body('current').optional().isBoolean(),
]);

module.exports = router;