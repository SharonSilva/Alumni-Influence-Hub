const { validationResult } = require('express-validator');
const Profile = require('../models/Profile');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

// getProfile
function getProfile(req, res) {
  const profile = Profile.findByUserId(req.user.id);
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: Profile.buildFullView(profile) });
}

// updateProfile
function updateProfile(req, res) {
  if (!handleValidation(req, res)) return;
  const updated = Profile.update(req.user.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: updated });
}

// uploadPhoto 
function uploadPhoto(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const updated = Profile.update(req.user.id, { photoUrl: `/uploads/${req.file.filename}` });
  if (!updated) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: { photoUrl: updated.photoUrl } });
}

// getCompletion 
function getCompletion(req, res) {
  const profile = Profile.findByUserId(req.user.id);
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

  const percent = Profile.recalculateCompletion(profile);
  res.json({
    success: true,
    data: {
      completionPercent: percent,
      isComplete:        profile.profileCompleted,
      sections: {
        bio:             !!profile.bio,
        linkedIn:        !!profile.linkedInUrl,
        photo:           !!profile.photoUrl,
        currentRole:     !!profile.currentRole,
        currentEmployer: !!profile.currentEmployer,
        graduationYear:  !!profile.graduationYear,
        hasDegree:       Profile.getDegrees(profile.id).length > 0,
        hasEmployment:   Profile.getEmployment(profile.id).length > 0,
      },
    },
  });
}

// Sub-resource controller factory 
function subResourceController(collectionKey, label) {
  return {
    list(req, res) {
      const profile = Profile.findByUserId(req.user.id);
      if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
      const { db } = require('../db');
      res.json({ success: true, data: db[collectionKey].filter(i => i.profileId === profile.id) });
    },

    create(req, res) {
      if (!handleValidation(req, res)) return;
      const profile = Profile.findByUserId(req.user.id);
      if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
      const newItem = Profile.addSubResource(collectionKey, profile.id, req.body);
      res.status(201).json({ success: true, data: newItem });
    },

    update(req, res) {
      const profile = Profile.findByUserId(req.user.id);
      if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
      const updated = Profile.updateSubResource(collectionKey, req.params.itemId, profile.id, req.body);
      if (!updated) return res.status(404).json({ success: false, message: `${label} not found` });
      res.json({ success: true, data: updated });
    },

    remove(req, res) {
      const profile = Profile.findByUserId(req.user.id);
      if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
      const deleted = Profile.deleteSubResource(collectionKey, req.params.itemId, profile.id);
      if (!deleted) return res.status(404).json({ success: false, message: `${label} not found` });
      res.json({ success: true, message: `${label} deleted` });
    },
  };
}

module.exports = {
  getProfile,
  updateProfile,
  uploadPhoto,
  getCompletion,
  subResourceController,
};