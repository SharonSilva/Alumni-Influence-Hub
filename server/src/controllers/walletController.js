const { db } = require('../db');

function getWallet(req, res) {
  const profile = db.profiles.find(p => p.userId === req.user.id);
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

  const credits = db.sponsorships
    .filter(s => s.profileId === profile.id && s.status === 'accepted')
    .map(s => ({ type: 'credit', description: `Sponsorship: ${s.certificationName}`, amount: s.offerAmount, date: s.createdAt }));

  const debits = db.bids
    .filter(b => b.userId === req.user.id && b.status === 'won')
    .map(b => ({ type: 'debit', description: `Won Alumni of the Day (${b.bidDate})`, amount: b.amount, date: b.bidDate }));

  const transactions = [...credits, ...debits].sort((a, b) => b.date.localeCompare(a.date));
  res.json({ success: true, data: { walletBalance: profile.walletBalance, transactions } });
}

module.exports = { getWallet };