//No HTTP or Express knowleadge,Controllers call

const {db,id, today, dataStr} = require('../db');
const BID_CLOSE_HOUR = () => parseInt(process.env.BID_CLOSE_HOUR_UTC || '18');

class Bid {

    static findById(bidId){
        return db.bids.find(b =>b.id === bidId) || null;
    }

    static findTodayBidByUser(userId){
        return db.bids.find(b=>b.userId === userId && b.bidDate === today() && b.status === 'active') || null;
    }

    static getActiveBidsForDate(date){
        return db.bids.filter(b => b.bidDate === date && b.status === 'active');
    }

    static getUserBidHistory(userId){
        return db.bids
        .filter(b=>b.userId === userId)
        .sort((a,b) => b.bidDate.localeCompare(a.bidDate));
    }

    //Business rules checkes 
    static isBiddingOpen(){
        return new Date().getUTCHours() < BID_CLOSE_HOUR();
    }

    //count how many a user has won 
    //param {string} userId
    //Returns number

    static monthlyWinCount(userId){
        const ym = new Date().toISOString().slice(0,7);
        return db.winners.filter(w => w.userId === userId && w.displayDate.startsWith(ym)).length;
    }

    //has the user attended a bonus-granting event this month?
    // param {string} userId
    // returns {boolean}

    static hasEventBonusThisMonth(userId){
        const ym = new Date().toISOString().slice(0,7);
        return db.eventAttendees.some(ea => {
            if(ea.userId !== userId) return false;
            const evt = db.events.find(e => e.id === ea.eventId && e.unlocksExtraBid);
            return evt && evt.date.startsWith(ym); 
        });
    }

    static maxMonthlyAppearences(userId){
        return 3+ (Bid.hasEventBonusThisMonth(userId) ? 1 :0);
    }

    static isCurrentlyWinning(userId){
        const todayBids = Bid.getActiveBidsForDate(today());
        const mine = todayBids.find(b => b.userId === userId);
        if(!mine) return false;
        const max = Math.max(...todayBids.map(b=>b.amount));
        return mine.amount >= max;
    }

    //Mutation methods 

    //Place a new bid. Does NOT validate business rules - controller does that
    //param {string} userId
    //param {nubmer} amount
    //returns {object} new bid

    static place(userId, amount){
        const newBid = {
         id:   id(),
        userId,
        bidDate: today(),
        amount: parseFloat(amount),
        status: 'active',
        submittedAt: new Date().toISOString(),
        };
        db.bids.push(newBid);
        return newBid;
    }

    //increase the bid amount
    //param {string} bidId
    //PARAM {number} newAmount
    //returns {object} updated bid

    static increase(bidId, newAmount){
        const bid = Bid.findById(bidId);
        if(!bid) return null;
        bid.amount = parseFloat(newAmount);
        bid.updatedAt = new Date().toISOString();
        return bid;
    }

    //cancel an active bid
    //param {string} bidId
    //returns {object} cancelled bid

    static cancel(bidId){
        const bid = Bid.findById(bidId);
        if(!bid) return null;
        bid.status = 'cancelled';
        bid.cancelledAt = new Date().toISOString();
        return bid;
    }

    //Resolve todays auction
    //find the highest eligible bidder(monthly cap check)
    //Mark winners/loser
    //Deduct from winner's wallet
    //Store winner record
    //returns {{ winner: object|null, resolved: 0}};

   static resolveAuction(){
    const todayStr = today();
    const displayDate = dateStr(1);
     const activeBids = Bid.getActiveBidsForDate(todayStr);
     if(!activeBids.length) return {winner: null, resolved: 0};

     //sort by amount desc, then by earliest submission(tie-breaker)
     activeBids.sort((a,b) => b.amount - a.amount || a.submittedAt.localeCompare(b.submittedAt));

     const ym = new Date().toISOString().slice(0,7);
     const winnerBid = activeBids.find(b=>{
        const wins = Bid.monthlyWinCount(b.userId);
        return wins < Bid.maxMonthlyAppearences(b.userId);
     });

     if(!winnerBid) return {winner: null, resolved: activeBids.length};

     activeBids.forEach(b =>{
        b.status = b.id === winnerBid.id ? 'won' : 'lost';
        b.resolvedAt = new Date().toISOString();
     });

     //Deduct wallet and update appearance count
     const winProfile = db.profiles.find(p =>p.userId === winnerBid.userId);
     if(winProfile){
        winProfile.walletBalance -= winnerBid.amount;
        winProfile.isActiveToday = true;
        if(winProfile.appearanceCountMonth !== ym){
            winProfile.appearanceCount = 0;
            winProfile.appearanceCountMonth = ym;
        }
        winProfile.appearanceCount += 1;
     }

     //Stor winner record
     const winnerRecord = {
        id: id(),
        userId: winnerBid.userId,
        displayDate,
        bidAmount: winnerBid.amount,
        createdAt: new Date().toISOString(),
     };
     db.winners.push(winnerRecord);
     

     return{
        winner:  winnerRecord,
        loserIds: activeBids.filter(b =>b.status === 'lost').map(b=>b.userId),
        resolved: activeBids.length,
     };
   }
}

module.exports = Bid;