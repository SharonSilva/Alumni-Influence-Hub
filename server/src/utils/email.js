

const nodemailer = require('nodemailer');

// Build a transport once.  In test/dev without SMTP creds we use a
// "stub" transport that just logs – this means the app boots and tests
// pass without any external service.
function buildTransport() {
  if (process.env.NODE_ENV === 'test') {
    // Silent stub – no output during tests
    return { sendMail: async () => ({ messageId: 'test-stub' }) };
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development fallback: log to console
  return {
    sendMail: async (opts) => {
      console.log('\n  [DEV EMAIL]');
      console.log(`   To:      ${opts.to}`);
      console.log(`   Subject: ${opts.subject}`);
      console.log(`   Body:    ${opts.text || opts.html}`);
      console.log('─'.repeat(50));
      return { messageId: 'dev-console' };
    },
  };
}

const transport = buildTransport();
const FROM = process.env.EMAIL_FROM || '"Alumni Influencers" <noreply@eastminster.ac.uk>';

// Email Templates 


  // Send email verification link after registration.

async function sendVerificationEmail(to, token) {
  const link = `http://localhost:${process.env.PORT || 3000}/api/auth/verify-email?token=${token}`;
  return transport.sendMail({
    from:    FROM,
    to,
    subject: 'Verify your Alumni Influencers account',
    text:    `Welcome! Please verify your email by clicking this link (valid 24h):\n\n${link}\n\nIf you did not register, ignore this email.`,
    html:    `<p>Welcome!</p><p>Please verify your email: <a href="${link}">Verify Email</a> (valid 24h)</p>`,
  });
}


 //Send a password reset link.

async function sendPasswordResetEmail(to, token) {
  const link = `http://localhost:${process.env.PORT || 3000}/api/auth/reset-password?token=${token}`;
  return transport.sendMail({
    from:    FROM,
    to,
    subject: 'Reset your Alumni Influencers password',
    text:    `You requested a password reset. Click the link below (valid ${process.env.RESET_TOKEN_EXPIRES_MINUTES || 30} minutes):\n\n${link}\n\nIf you did not request this, ignore this email.`,
    html:    `<p>You requested a password reset.</p><p><a href="${link}">Reset Password</a> (valid ${process.env.RESET_TOKEN_EXPIRES_MINUTES || 30} mins)</p>`,
  });
}


 // Notify an alumnus they won the daily bid.

async function sendWinnerNotification(to, name, date) {
  return transport.sendMail({
    from:    FROM,
    to,
    subject: '🏆 You are Alumni of the Day!',
    text:    `Congratulations ${name}! Your profile will be featured as Alumni of the Day on ${date}. Log in to see your profile displayed.`,
    html:    `<h2>🏆 Congratulations, ${name}!</h2><p>Your profile will be the <strong>Alumni of the Day</strong> on <strong>${date}</strong>.</p>`,
  });
}


  // Notify losing bidders they did not win.

async function sendLostBidNotification(to, name, date) {
  return transport.sendMail({
    from:    FROM,
    to,
    subject: 'Bidding result – Alumni of the Day',
    text:    `Hi ${name}, unfortunately you did not win the Alumni of the Day slot for ${date}. Your bid amount has NOT been charged. Better luck next time!`,
    html:    `<p>Hi ${name},</p><p>Unfortunately you did not win the slot for <strong>${date}</strong>. Your bid was <strong>not charged</strong>. Try again tomorrow!</p>`,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWinnerNotification,
  sendLostBidNotification,
};