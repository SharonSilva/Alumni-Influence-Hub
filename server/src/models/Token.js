// Manages one time tokens for email verification and password reset 
//Tokens are cryptographically random (256-bit) and single use

const crypto = require('crypto');
const {db, id} = require('../db');

class Token {

    static generate(){
        return crypto.randomBytes(32).toString('hex');
    }

    //create and store an email verification token 
    //param {string} userId
    //param {number} expiryHours deafault 24
    //returns {string} raw token (to include in verification link)

    static createEmailToken(userId, expiryHours=24){
        const raw = Token.generate();
        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
        db.emailTokens.push({id: id(), userId, token: raw, expiresAt, used: false});
        return raw;
    }

    //Find a valid (unused, unexpired) email verification token
    static findValidEmailToken(raw){
        const record = db.emailTokens.find(t => t.token === raw && !t.used);
        if(!record) return null;
        if(new Date(record.expiresAt) < new Date()) return null;
        return record;
    }

    //Mark an email token as used (single-use enforcement)
    //param {string} raw

    static consumeEmailToken(raw){
        const record = db.emailTokens.find(t => t.token === raw);
        if(record) record.used = true;
    }

    //create and store a password reset token 
    //Invalidates any existing active reset token for this user first 
    // param {string} userId
    //param {number} expiryMinutes default 30
    //return {string} raw tokens

    static createResetToken(userId, expiryMinutes=30){
        //Invalidates old tokens
        db.passwordResets
        .filter(r => r.userId === userId && !r.used)
        .forEach(r => {r.used = true;});

        const raw = Token.generate();
        const expiresAt = new Date(Date.now() + expiryMinutes*60*1000).toISOString();
        db.passwordResets.push ({id: id(), userId, token: raw, expiresAt, used:false});
        return raw;
    }

    //Find a valid (unused, unexpired) password reset token 
    // param {string} raw
    // returns {object|null}

    static findValidResetToken(raw){
        const record = db.passwordResets.find(r=>r.token === raw && !r.used);
        if(!record) return null;
        if(new Date(record.expiresAt) < new Date()) return null;
        return record;
    }

    static ocnsumeResetToken(raw){
        const record = db.passwordResets.find(r =>r.token === raw);
        if(record) record.used = true;
    }
}

module.exports = Token;