const jwt  = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User  = require('../models/User');
const Token = require('../models/Token');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const JWT_SECRET     = process.env.JWT_SECRET || 'eastminster-alumni-secret-changeme';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Helper 
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

// register 
async function register(req, res) {
  if (!handleValidation(req, res)) return;

  const { email, password, name } = req.body;

  if (User.emailExists(email)) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const ADMIN_DOMAIN = 'eastminster.ac.uk';
  const role = email.endsWith(`@${ADMIN_DOMAIN}`) && !email.includes('alumni') ? 'admin' : 'alumni';

  const newUser  = await User.create({ email, password, name, role });
  const rawToken = Token.createEmailToken(newUser.id, 24);
  await sendVerificationEmail(email, rawToken);

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data:    { userId: newUser.id },
  });
}

// verifyEmail 
function verifyEmail(req, res) {
  if (!handleValidation(req, res)) return;

  const { token } = req.query;
  const record = Token.findValidEmailToken(token);

  if (!record) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
  }

  Token.consumeEmailToken(token);
  User.markEmailVerified(record.userId);

  res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
}

// login 
async function login(req, res) {
  if (!handleValidation(req, res)) return;

  const { email, password } = req.body;
  const GENERIC = 'Invalid email or password';

  const user = User.findByEmail(email);
  if (!user) return res.status(401).json({ success: false, message: GENERIC });

  const match = await User.verifyPassword(password, user.password);
  if (!match) return res.status(401).json({ success: false, message: GENERIC });

  if (!user.emailVerified) {
    return res.status(401).json({ success: false, message: 'Email not verified. Please check your inbox for the verification link.' });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ success: true, data: { user: User.toPublic(user), token } });
}

// logout 
function logout(req, res) {
  console.log(`[LOGOUT] User ${req.user.id} at ${new Date().toISOString()}`);
  res.json({ success: true, message: 'Logged out successfully. Please discard your token.' });
}

// forgotPassword 
async function forgotPassword(req, res) {
  if (!handleValidation(req, res)) return;

  const GENERIC = 'If that email is registered, a reset link has been sent.';
  const user = User.findByEmail(req.body.email);

  // Always 200  never reveal whether email exists
  if (!user) return res.json({ success: true, message: GENERIC });

  const expiryMinutes = parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES || '30');
  const rawToken = Token.createResetToken(user.id, expiryMinutes);
  await sendPasswordResetEmail(user.email, rawToken);

  res.json({ success: true, message: GENERIC });
}

//reset password
async function resetPassword(req, res) {
  if (!handleValidation(req, res)) return;

  const { token, password } = req.body;
  const record = Token.findValidResetToken(token);

  if (!record) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }

  Token.consumeResetToken(token);
  await User.updatePassword(record.userId, password);

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
}

function getMe(req, res) {
  res.json({ success: true, data: User.toPublic(req.user) });
}

module.exports = { register, verifyEmail, login, logout, forgotPassword, resetPassword, getMe };