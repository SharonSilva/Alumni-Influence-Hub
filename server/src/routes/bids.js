const express  = require('express');
const { body } = require('express-validator');
const ctrl     = require('../controllers/bidController');
const { authenticate, requireAdmin } = require('../middleware/Auth');

const router = express.Router();

router.get('/tomorrow',         authenticate,                ctrl.getTomorrowSlot);
router.post('/',                authenticate, [body('amount').isFloat({ min: 1 })], ctrl.placeBid);
router.patch('/:bidId',         authenticate, [body('amount').isFloat({ min: 1 })], ctrl.updateBid);
router.delete('/:bidId',        authenticate,                ctrl.cancelBid);
router.get('/status',           authenticate,                ctrl.getBidStatus);
router.get('/history',          authenticate,                ctrl.getBidHistory);
router.get('/monthly',          authenticate,                ctrl.getMonthlyStatus);
router.post('/resolve',         authenticate, requireAdmin,  ctrl.resolveAuction);

module.exports = router;