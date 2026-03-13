const express = require('express');
const ctrl    = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');
 
const router = express.Router();
 
router.get('/', authenticate, ctrl.getWallet);
 
module.exports = router;