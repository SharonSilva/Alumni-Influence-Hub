const crypto = require('crypto');
const { db, id } = require('../db');

class Token {

   // Generate a cryptographically secure random token string.
  static generate() {
    return crypto.randomBytes(32).toString('hex');
  }

    // Create and store an email verification token.

  static createEmailToken(userId, expiryHours = 24) {
    const raw      = Token.generate();
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
    db.emailTokens.push({ id: id(), userId, token: raw, expiresAt, used: false });
    return raw;
  }


    // Find a valid (unused, unexpired) email verification token.

  static findValidEmailToken(raw) {
    const record = db.emailTokens.find(t => t.token === raw && !t.used);
    if (!record) return null;
    if (new Date(record.expiresAt) < new Date()) return null;
    return record;
  }

   // Mark an email token as used (single-use enforcement).

  static consumeEmailToken(raw) {
    const record = db.emailTokens.find(t => t.token === raw);
    if (record) record.used = true;
  }


    // Create and store a password reset token.
    // Invalidates any existing active reset tokens for this user first.

  static createResetToken(userId, expiryMinutes = 30) {
    // Invalidate old tokens
    db.passwordResets
      .filter(r => r.userId === userId && !r.used)
      .forEach(r => { r.used = true; });

    const raw      = Token.generate();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    db.passwordResets.push({ id: id(), userId, token: raw, expiresAt, used: false });
    return raw;
  }


    // Find a valid (unused, unexpired) password reset token.

  static findValidResetToken(raw) {
    const record = db.passwordResets.find(r => r.token === raw && !r.used);
    if (!record) return null;
    if (new Date(record.expiresAt) < new Date()) return null;
    return record;
  }


    // Mark a reset token as used.

  static consumeResetToken(raw) {
    const record = db.passwordResets.find(r => r.token === raw);
    if (record) record.used = true;
  }
}

module.exports = Token;