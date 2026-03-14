const express  = require('express');
const { body } = require('express-validator');
const ctrl     = require('../controllers/EventController');
const { authenticate, requireAdmin } = require('../middleware/Auth');

const router = express.Router();

router.get('/',             authenticate,               ctrl.listEvents);
router.get('/:id',          authenticate,               ctrl.getEvent);
router.post('/',            authenticate, requireAdmin, [
  body('title').trim().notEmpty(),
  body('date').isISO8601(),
  body('location').trim().notEmpty(),
  body('unlocksExtraBid').optional().isBoolean(),
], ctrl.createEvent);
router.post('/:id/register', authenticate,              ctrl.registerForEvent);

module.exports = router;