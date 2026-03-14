const express  = require('express');
const { body } = require('express-validator');
const ctrl     = require('../controllers/SponsorController');
const { authenticate, requireAdmin } = require('../middleware/Auth');

const router = express.Router();

router.get('/',                             authenticate,               ctrl.listSponsors);
router.post('/',                            authenticate, requireAdmin, [
  body('name').trim().notEmpty(),
  body('category').trim().notEmpty(),
], ctrl.createSponsor);

router.post('/:sponsorId/offers',           authenticate, requireAdmin, [
  body('profileId').notEmpty(),
  body('certificationName').trim().notEmpty(),
  body('offerAmount').isFloat({ min: 1 }),
], ctrl.makeOffer);

router.patch('/offers/:offerId/respond',    authenticate, [
  body('decision').isIn(['accepted', 'declined']),
], ctrl.respondToOffer);

module.exports = router;