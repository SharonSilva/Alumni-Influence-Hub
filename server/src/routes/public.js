const express = require('express');
const ctrl    = require('../controllers/PublicController');
const { authenticateKey } = require('../middleware/Auth');

const router = express.Router();

router.get('/featured',      authenticateKey(['read:featured']),           ctrl.getFeatured);
router.get('/alumni',        authenticateKey(['read:alumni']),             ctrl.browseAlumni);
router.get('/alumni/:userId',authenticateKey(['read:alumni']),             ctrl.getAlumniById);
router.get('/sponsors',      authenticateKey(['read:sponsors']),           ctrl.listPublicSponsors);
router.get('/events',        authenticateKey(['read:events']),             ctrl.listPublicEvents);

module.exports = router;