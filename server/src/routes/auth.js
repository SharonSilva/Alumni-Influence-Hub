const express     = require('express');
const { body, query } = require('express-validator');
const ctrl        = require('../controllers/authController');
const { authenticate } = require('../middleware/Auth');

const router = express.Router();

const DOMAIN = process.env.UNIVERSITY_DOMAIN || 'alumni.eastminster.ac.uk';

// Reusable strong-password validator 
const passwordRules = body('password')
  .isLength({ min: 8 }).withMessage('Minimum 8 characters')
  .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
  .matches(/[0-9]/).withMessage('Must contain a number')
  .matches(/[^A-Za-z0-9]/).withMessage('Must contain a special character');

router.post('/register', [
  body('email')
    .isEmail().withMessage('Valid email required')
    .normalizeEmail({ gmail_dots: false })
    .custom(email => {
      if (!email.endsWith(`@${DOMAIN}`) && !email.endsWith('@eastminster.ac.uk'))
        throw new Error(`Must use a @${DOMAIN} university email`);
      return true;
    }),
  passwordRules,
  body('name').trim().notEmpty().withMessage('Name is required'),
], ctrl.register);

router.get('/verify-email', [
  query('token').notEmpty().withMessage('Token required'),
], ctrl.verifyEmail);

router.post('/login', [
  body('email').isEmail().normalizeEmail({ gmail_dots: false }),
  body('password').notEmpty(),
], ctrl.login);

router.post('/logout', authenticate, ctrl.logout);

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail({ gmail_dots: false }),
], ctrl.forgotPassword);

router.post('/reset-password', [
  body('token').notEmpty(),
  body('password')
    .isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/),
], ctrl.resetPassword);

router.get('/me', authenticate, ctrl.getMe);

module.exports = router;