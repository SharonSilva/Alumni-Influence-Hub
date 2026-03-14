const { db, today } = require('../db');
const Profile       = require('../models/Profile');

function getFeatured(req, res) {
  const winner = db.winners.find(w => w.displayDate === today());
  if (!winner) return res.json({ success: true, data: null, message: 'No Alumni of the Day today.' });

  const user    = db.users.find(u => u.id === winner.userId);
  const profile = db.profiles.find(p => p.userId === winner.userId);
  if (!user || !profile) return res.status(500).json({ success: false, message: 'Data error' });

  const { password, ...safeUser } = user;
  const fullProfile = Profile.buildFullView(profile);
  delete fullProfile.walletBalance; // never expose financial data publicly

  const featuredSponsors = db.sponsorships
    .filter(s => s.profileId === profile.id && s.status === 'accepted')
    .map(s => ({ sponsorshipId: s.id, certificationName: s.certificationName, sponsor: db.sponsors.find(sp => sp.id === s.sponsorId) }));

  res.json({ success: true, data: { displayDate: winner.displayDate, alumni: { ...safeUser, profile: fullProfile }, featuredSponsors } });
}

function browseAlumni(req, res) {
  const { search, degree, graduationYear, employer, page = 1, limit = 10 } = req.query;

  let results = db.users
    .filter(u => u.role === 'alumni' && u.emailVerified)
    .map(u => {
      const p = db.profiles.find(p => p.userId === u.id);
      const { password, ...safe } = u;
      const fullProfile = p ? Profile.buildFullView(p) : null;
      if (fullProfile) delete fullProfile.walletBalance;
      return { ...safe, profile: fullProfile };
    });

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.profile?.currentRole?.toLowerCase().includes(q) ||
      a.profile?.currentEmployer?.toLowerCase().includes(q) ||
      a.profile?.degrees?.some(d => d.title.toLowerCase().includes(q)) ||
      a.profile?.certifications?.some(c => c.name.toLowerCase().includes(q))
    );
  }
  if (degree)         results = results.filter(a => a.profile?.degrees?.some(d => d.title.toLowerCase().includes(degree.toLowerCase())));
  if (graduationYear) results = results.filter(a => a.profile?.graduationYear === +graduationYear);
  if (employer)       results = results.filter(a => a.profile?.currentEmployer?.toLowerCase().includes(employer.toLowerCase()));

  const total = results.length;
  const paged = results.slice((+page - 1) * +limit, +page * +limit);
  res.json({ success: true, data: paged, meta: { total, page: +page, limit: +limit, pages: Math.ceil(total / +limit) } });
}

function getAlumniById(req, res) {
  const user = db.users.find(u => u.id === req.params.userId && u.role === 'alumni');
  if (!user) return res.status(404).json({ success: false, message: 'Alumni not found' });
  const profile = db.profiles.find(p => p.userId === user.id);
  const { password, ...safe } = user;
  const fullProfile = profile ? Profile.buildFullView(profile) : null;
  if (fullProfile) delete fullProfile.walletBalance;
  res.json({
    success: true,
    data: {
      ...safe,
      profile: fullProfile,
      totalAppearances: db.winners.filter(w => w.userId === user.id).length,
      pastFeatureDates: db.winners.filter(w => w.userId === user.id).sort((a, b) => b.displayDate.localeCompare(a.displayDate)).slice(0, 5).map(w => w.displayDate),
    },
  });
}

function listPublicSponsors(req, res) {
  res.json({ success: true, data: db.sponsors });
}

function listPublicEvents(req, res) {
  let events = [...db.events].sort((a, b) => a.date.localeCompare(b.date));
  if (req.query.upcoming !== 'false') events = events.filter(e => e.date >= today());
  res.json({ success: true, data: events });
}

module.exports = { getFeatured, browseAlumni, getAlumniById, listPublicSponsors, listPublicEvents };