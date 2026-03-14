/**
 * routes/winners.js  –  ROUTE layer (MVC: thin router)
 */

const express = require('express');
const ctrl    = require('../controllers/winnerController');
const { authenticate } = require('../middleware/Auth');

const router = express.Router();

router.get('/today', authenticate, ctrl.getToday);
router.get('/',      authenticate, ctrl.getHistory);

module.exports = router;