const { validationResult } = require('express-validator');
const { db, id }           = require('../db');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return false; }
  return true;
}

function listSponsors(req, res) {
  res.json({ success: true, data: db.sponsors });
}

function createSponsor(req, res) {
  if (!handleValidation(req, res)) return;
  const newSponsor = { id: id(), name: req.body.name,
     category: req.body.category,
      description: req.body.description || '', createdAt: new Date().toISOString() };
  db.sponsors.push(newSponsor);
  res.status(201).json({ success: true, data: newSponsor });
}

function makeOffer(req, res) {
  if (!handleValidation(req, res)) return;
  const sponsor = db.sponsors.find(s => s.id === req.params.sponsorId);
  if (!sponsor) return res.status(404).json({ success: false, message: 'Sponsor not found' });
  const profile = db.profiles.find(p => p.id === req.body.profileId);
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  const offer = { id: id(), 
                  sponsorId: req.params.sponsorId, 
                  profileId: req.body.profileId, 
                  certificationName: req.body.certificationName, 
                  offerAmount: parseFloat(req.body.offerAmount), 
                  status: 'pending', createdAt: new Date().toISOString() };

  db.sponsorships.push(offer);
  res.status(201).json({ success: true, data: offer });
}

function respondToOffer(req, res) {
  if (!handleValidation(req, res)) return;
  const offer = db.sponsorships.find(s => s.id === req.params.offerId);
  if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
  const profile = db.profiles.find(p => p.id === offer.profileId);
  if (!profile || profile.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
  if (offer.status !== 'pending') return res.status(400).json({ success: false, message: 'Offer is no longer pending' });
  offer.status      = req.body.decision;
  offer.respondedAt = new Date().toISOString();
  if (offer.status === 'accepted') profile.walletBalance += offer.offerAmount;
  res.json({ success: true, data: offer });
}

module.exports = { listSponsors, createSponsor, makeOffer, respondToOffer };