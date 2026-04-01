const jwt  = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User  = require('../models/User');
const Token = require('../models/Token');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const JWT_SECRET     = process.env.JWT_SECRET || 'eastminster-alumni-secret-changeme';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Helper 
function handleValidation(req, res) {
  const errors = validationResult(req);   // collect all express-validator errors
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });   
    return false; //signal to caller that validation failed and execution should stop 
  }
  return true; //Return true as validation passed and controller can safely continue execution 
}

// register 
async function register(req, res) {
  if (!handleValidation(req, res)) return;          //step 1- validation gate

  const { email, password, name } = req.body;

  //step 2 - duplicate check before any expensive operations 
  if (User.emailExists(email)) {  //check if the email already exists
    return res.status(409).json({ success: false, message: 'Email already registered' }); //409 = Conflict (resource already exists)
  }

  //only reaches to this if vaid format & valid domai & strong password & no duplicates
  // Determine if the user is an 'admin' or 'alumni'
  const ADMIN_DOMAIN = 'eastminster.ac.uk';
  const role = email.endsWith(`@${ADMIN_DOMAIN}`) && !email.includes('alumni') ? 'admin' : 'alumni';

  const newUser  = await User.create({ email, password, name, role });  //Role is stored for access control later
  const rawToken = Token.createEmailToken(newUser.id, 24);// Generate a secure token for email verification
  await sendVerificationEmail(email, rawToken);   // Send verification email containing the token

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data:    { userId: newUser.id },    // Send response back to client
  });
}

// verifyEmail 
function verifyEmail(req, res) {
  if (!handleValidation(req, res)) return;

  const { token } = req.query;    //token is sent through URL ex: /verify-email?token=abc123
  const record = Token.findValidEmailToken(token);      // validates : unused +not expired token

  if (!record) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token' }); //reject request if token is invalid or 
    // ecxpired
  }

  Token.consumeEmailToken(token); //consumed immediately - replay-safe
  User.markEmailVerified(record.userId); //acitvate the account 

  res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
}

// login 
async function login(req, res) {
  if (!handleValidation(req, res)) return;    // ensure valid request body otherwise validation fails 

  const { email, password } = req.body;     //Extract the credientials from the request
  const GENERIC = 'Invalid email or password';  //generic error messages for all authentication failures 
  const user = User.findByEmail(email);  // Attempt to retrieve user from database
  if (!user) return res.status(401).json({ success: false, message: GENERIC });  // Do NOT reveal that the email is not registered
  //same message whether user not found password wrong 

  const match = await User.verifyPassword(password, user.password);
  if (!match) return res.status(401).json({ success: false, message: GENERIC }); //same generic message for incorrect password

  if (!user.emailVerified) {
    return res.status(401).json({ success: false, message: 'Email not verified. Please check your inbox for the verification link.' });
  }
// all checks passed - issue JWT
  const token = jwt.sign({ userId: user.id, role: user.role }, //payload - userId +role only
     JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });    //default : 24hrs
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