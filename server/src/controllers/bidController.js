const { validationResult } = require('express-validator');
const Bid     = require('../models/Bid');
const Profile = require('../models/Profile');
const User    = require('../models/User');
const { sendWinnerNotification, sendLostBidNotification } = require('../utils/email');
const { today, dateStr } = require('../db');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

//  getTomorrowSlot 
function getTomorrowSlot(req, res) {
  const { db } = require('../db');
  const tomorrow       = dateStr(1);
  const existingWinner = db.winners.find(w => w.displayDate === tomorrow);
  const myBidToday     = Bid.findTodayBidByUser(req.user.id);
  const wins = Bid.monthlyWinCount(req.user.id);
  const max  = Bid.maxMonthlyAppearances(req.user.id);

  res.json({
    success: true,
    data: {
      slotDate:         tomorrow,
      biddingOpen:      Bid.isBiddingOpen(),
      biddingClosesAt:  `${process.env.BID_CLOSE_HOUR_UTC || 18}:00 UTC today`,
      alreadyHasWinner: !!existingWinner,
      myBidToday: myBidToday ? {
        id:        myBidToday.id,
        status:    myBidToday.status,
        isWinning: Bid.isCurrentlyWinning(req.user.id),
        // amount omitted blind bidding
      } : null,
      monthlyStatus: {
        winsThisMonth:    wins,
        maxAllowed:       max,
        slotsRemaining:   Math.max(0, max - wins),
        eventBonusActive: Bid.hasEventBonusThisMonth(req.user.id),
      },
    },
  });
}

// placeBid 
function placeBid(req, res) {
  if (!handleValidation(req, res)) return;
  if (req.user.role !== 'alumni') {
    return res.status(403).json({ success: false, message: 'Only alumni can place bids' });
  }
  if (!Bid.isBiddingOpen()) {
    return res.status(400).json({ success: false, message: `Bidding closes at ${process.env.BID_CLOSE_HOUR_UTC || 18}:00 UTC. It reopens at 00:00 UTC.` });
  }
  if (Bid.findTodayBidByUser(req.user.id)) {
    return res.status(409).json({ success: false, message: 'You already have a bid today. Use PATCH to increase it.' });
  }

  const wins = Bid.monthlyWinCount(req.user.id);
  const max  = Bid.maxMonthlyAppearances(req.user.id);
  if (wins >= max) {
    return res.status(400).json({ success: false, message: `Monthly limit reached (${wins}/${max}). Attend a university event to unlock a 4th slot.` });
  }

  const profile = Profile.findByUserId(req.user.id);
  const amount  = parseFloat(req.body.amount);
  if (!profile || profile.walletBalance < amount) {
    return res.status(400).json({ success: false, message: `Insufficient wallet balance. Available: £${profile?.walletBalance ?? 0}` });
  }

  const newBid = Bid.place(req.user.id, amount);
  const winning = Bid.isCurrentlyWinning(req.user.id);

  res.status(201).json({
    success: true,
    data: {
      bid: { id: newBid.id, bidDate: newBid.bidDate, status: newBid.status, submittedAt: newBid.submittedAt },
      feedback: {
        isCurrentlyWinning: winning,
        message: winning
          ? ' You are currently the highest bidder!'
          : '  You are not currently the highest bidder. Consider increasing your bid.',
      },
      monthlyStatus: { winsThisMonth: wins, maxAllowed: max, slotsRemaining: max - wins },
    },
  });
}

//updateBid 
function updateBid(req, res) {
  if (!handleValidation(req, res)) return;
  if (!Bid.isBiddingOpen()) {
    return res.status(400).json({ success: false, message: 'Bidding window has closed.' });
  }

  const bid = Bid.findById(req.params.bidId);
  if (!bid)                        return res.status(404).json({ success: false, message: 'Bid not found' });
  if (bid.userId !== req.user.id)  return res.status(403).json({ success: false, message: 'Forbidden' });
  if (bid.bidDate !== today())     return res.status(400).json({ success: false, message: "Can only update today's bid" });
  if (bid.status !== 'active')     return res.status(400).json({ success: false, message: 'Bid is no longer active' });

  const newAmount = parseFloat(req.body.amount);
  if (newAmount <= bid.amount) {
    return res.status(400).json({ success: false, message: 'New amount must be strictly higher than current bid.' });
  }

  const profile = Profile.findByUserId(req.user.id);
  if (!profile || profile.walletBalance < newAmount) {
    return res.status(400).json({ success: false, message: `Insufficient balance. Available: £${profile?.walletBalance ?? 0}` });
  }

  const updated = Bid.increase(bid.id, newAmount);
  const winning = Bid.isCurrentlyWinning(req.user.id);

  res.json({
    success: true,
    data: {
      bid: { id: updated.id, bidDate: updated.bidDate, status: updated.status },
      feedback: {
        isCurrentlyWinning: winning,
        message: winning ? ' You are now the highest bidder!' : '  Still not the highest bidder.',
      },
    },
  });
}

//  cancelBid 
function cancelBid(req, res) {
  if (!Bid.isBiddingOpen()) {
    return res.status(400).json({ success: false, message: 'Bidding has closed — bids cannot be cancelled.' });
  }
  const bid = Bid.findById(req.params.bidId);
  if (!bid)                        return res.status(404).json({ success: false, message: 'Bid not found' });
  if (bid.userId !== req.user.id)  return res.status(403).json({ success: false, message: 'Forbidden' });
  if (bid.status !== 'active')     return res.status(400).json({ success: false, message: 'Only active bids can be cancelled' });

  Bid.cancel(bid.id);
  res.json({ success: true, message: 'Bid cancelled. No charge applied.' });
}

// getBidStatus 
function getBidStatus(req, res) {
  const myBid = Bid.findTodayBidByUser(req.user.id);
  if (!myBid) {
    return res.json({ success: true, data: { hasBidToday: false, message: 'You have not placed a bid today.' } });
  }
  res.json({
    success: true,
    data: {
      hasBidToday:        true,
      isCurrentlyWinning: Bid.isCurrentlyWinning(req.user.id),
      bidDate:            myBid.bidDate,
      message:            Bid.isCurrentlyWinning(req.user.id)
        ? ' You are the current highest bidder!'
        : ' You are not currently the highest bidder.',
    },
  });
}

// getBidHistory 
function getBidHistory(req, res) {
  res.json({ success: true, data: Bid.getUserBidHistory(req.user.id) });
}

// getMonthlyStatis
function getMonthlyStatus(req, res) {
  const wins     = Bid.monthlyWinCount(req.user.id);
  const max      = Bid.maxMonthlyAppearances(req.user.id);
  const hasBonus = Bid.hasEventBonusThisMonth(req.user.id);
  res.json({
    success: true,
    data: {
      winsThisMonth:    wins,
      maxAllowed:       max,
      slotsRemaining:   Math.max(0, max - wins),
      eventBonusActive: hasBonus,
      message:          `You have used ${wins} of your ${max} monthly appearance slots.`,
    },
  });
}

// resolve auction 
async function resolveAuction(req, res) {
  const { db } = require('../db');
  const displayDate = dateStr(1);

  if (db.winners.find(w => w.displayDate === displayDate)) {
    return res.status(409).json({ success: false, message: 'Winner already selected for tomorrow.' });
  }

  const result = Bid.resolveAuction();

  if (!result.winner) {
    const msg = result.resolved === 0
      ? 'No active bids to resolve today.'
      : 'All top bidders have reached their monthly limit.';
    return res.json({ success: true, message: msg });
  }

  // Email notifications which are non-blocking 
  const winUser = User.findById(result.winner.userId);
  if (winUser) sendWinnerNotification(winUser.email, winUser.name, result.winner.displayDate).catch(() => {});
  if (result.loserIds) {
    result.loserIds.forEach(uid => {
      const u = User.findById(uid);
      if (u) sendLostBidNotification(u.email, u.name, result.winner.displayDate).catch(() => {});
    });
  }

  res.json({
    success: true,
    data: {
      winner:            { userId: result.winner.userId, name: winUser?.name, displayDate: result.winner.displayDate, bidAmount: result.winner.bidAmount },
      totalBidsResolved: result.resolved,
    },
  });
}

module.exports = {
  getTomorrowSlot,
  placeBid,
  updateBid,
  cancelBid,
  getBidStatus,
  getBidHistory,
  getMonthlyStatus,
  resolveAuction,
};