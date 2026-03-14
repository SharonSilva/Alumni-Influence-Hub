const { db, today } = require('../db');
const Profile       = require('../models/Profile');

function getToday(req, res) {
  const winner = db.winners.find(w => w.displayDate === today());
  if (!winner) {
    return res.json({ success: true, data: null, message: 'No Alumni of the Day today yet.' });
  }
  const user    = db.users.find(u => u.id === winner.userId);
  const profile = db.profiles.find(p => p.userId === winner.userId);
  if (!user || !profile) {
    return res.status(500).json({ success: false, message: 'Winner data error' });
  }
  const { password, ...safeUser } = user;
  const featuredSponsors = db.sponsorships
    .filter(s => s.profileId === profile.id && s.status === 'accepted')
    .map(s => ({
      sponsorshipId:     s.id,
      certificationName: s.certificationName,
      sponsor:           db.sponsors.find(sp => sp.id === s.sponsorId),
    }));
  res.json({
    success: true,
    data: {
      ...winner,
      alumni: { ...safeUser, ...Profile.buildFullView(profile) },
      featuredSponsors,
    },
  });
}

function getHistory(req, res) {
  const { page = 1, limit = 10, userId } = req.query;
  let list = [...db.winners].sort((a, b) => b.displayDate.localeCompare(a.displayDate));
  if (userId) list = list.filter(w => w.userId === userId);
  const total  = list.length;
  const paged  = list.slice((+page - 1) * +limit, +page * +limit);
  const enriched = paged.map(w => {
    const u = db.users.find(u => u.id === w.userId);
    const { password, ...safe } = u || {};
    return { ...w, alumni: safe };
  });
  res.json({ success: true, data: enriched, meta: { total, page: +page, limit: +limit } });
}

module.exports = { getToday, getHistory };