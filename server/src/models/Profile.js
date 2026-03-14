const { db, id } = require('../db');

class Profile {
  // Core Profile 

  static findByUserId(userId) {
    return db.profiles.find(p => p.userId === userId) || null;
  }

  static findById(profileId) {
    return db.profiles.find(p => p.id === profileId) || null;
  }


    // Update allowed fields on a profile.

  static update(userId, updates) {
    const profile = Profile.findByUserId(userId);
    if (!profile) return null;
    const allowed = ['bio', 'linkedInUrl', 'currentRole', 'currentEmployer', 'location', 'graduationYear', 'photoUrl'];
    allowed.forEach(f => { if (updates[f] !== undefined) profile[f] = updates[f]; });
    Profile.recalculateCompletion(profile);
    return profile;
  }


   // Recalculate profile completion percentage and update profileCompleted flag.

  static recalculateCompletion(profile) {
    const checks = [
      !!profile.bio,
      !!profile.linkedInUrl,
      !!profile.photoUrl,
      !!profile.currentRole,
      !!profile.currentEmployer,
      !!profile.graduationYear,
      db.degrees.some(d => d.profileId === profile.id),
      db.employmentHistory.some(e => e.profileId === profile.id),
    ];
    const done = checks.filter(Boolean).length;
    profile.profileCompleted = done === checks.length;
    return Math.round((done / checks.length) * 100);
  }


    // Build the full profile view including all sub-resources.

  static buildFullView(profile) {
    const percent = Profile.recalculateCompletion(profile);
    return {
      ...profile,
      completionPercent:  percent,
      degrees:            Profile.getDegrees(profile.id),
      certifications:     Profile.getCertifications(profile.id),
      licences:           Profile.getLicences(profile.id),
      courses:            Profile.getCourses(profile.id),
      employmentHistory:  Profile.getEmployment(profile.id),
    };
  }

  // Sub-resource generic helpers 


    // Generic method to add an item to any sub-resource collection.

  static addSubResource(collection, profileId, data) {
    const newItem = { id: id(), profileId, ...data, createdAt: new Date().toISOString() };
    db[collection].push(newItem);
    const profile = Profile.findById(profileId);
    if (profile) Profile.recalculateCompletion(profile);
    return newItem;
  }


    // Generic method to update a sub-resource item owned by a profile.

  static updateSubResource(collection, itemId, profileId, updates) {
    const item = db[collection].find(i => i.id === itemId && i.profileId === profileId);
    if (!item) return null;
    const fields = Object.keys(updates);
    fields.forEach(f => { if (updates[f] !== undefined) item[f] = updates[f]; });
    item.updatedAt = new Date().toISOString();
    return item;
  }


    // Generic method to delete a sub-resource item owned by a profile.

  static deleteSubResource(collection, itemId, profileId) {
    const idx = db[collection].findIndex(i => i.id === itemId && i.profileId === profileId);
    if (idx === -1) return false;
    db[collection].splice(idx, 1);
    const profile = Profile.findById(profileId);
    if (profile) Profile.recalculateCompletion(profile);
    return true;
  }

  // Named sub-resource accessors

  static getDegrees(profileId)        { return db.degrees.filter(d => d.profileId === profileId); }
  static getCertifications(profileId) { return db.certifications.filter(c => c.profileId === profileId); }
  static getLicences(profileId)       { return db.licences.filter(l => l.profileId === profileId); }
  static getCourses(profileId)        { return db.courses.filter(c => c.profileId === profileId); }
  static getEmployment(profileId)     { return db.employmentHistory.filter(e => e.profileId === profileId); }
}

module.exports = Profile;