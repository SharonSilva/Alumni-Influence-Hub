//Handles  HTTP concerns for authentication
//Reads from req, call models, sends req 
//contains No business lof=gic or data queries (thst is the model's job)
// contains No html/ template rendering (this is the view's job)

const jwt = require('jsonwebtoken');
const {validationResult} = require('express-validator');
const User = require('../models/User');
const Token = require('../models/Token');
const{sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const JWT_SECRET =process.env.JWT_SECRET || 'eastminster-alumni-secret-chnageme';