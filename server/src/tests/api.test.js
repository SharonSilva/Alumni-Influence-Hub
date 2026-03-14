
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jest-testing';
process.env.UNIVERSITY_DOMAIN = 'alumni.eastminster.ac.uk';

const request = require('supertest');

let app;
beforeAll(async () => {
  jest.resetModules();
  app = require('../app');
  await new Promise(r => setTimeout(r, 300)); // allow seed to complete
});

// Token cache
let alumniToken; 
let liam4Token;    
let adminToken;

// AUTH
describe('Auth – Registration', () => {
  test('registers with valid university email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test.newgrad@alumni.eastminster.ac.uk',
      password: 'Password1!',
      name: 'Test NewGrad',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('rejects non-university email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'hacker@gmail.com', password: 'Password1!', name: 'Hacker',
    });
    expect(res.statusCode).toBe(400);
  });

  test('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'priya.sharma@alumni.eastminster.ac.uk', password: 'Password1!', name: 'Priya Again',
    });
    expect(res.statusCode).toBe(409);
  });

  test('rejects weak password (no special char)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'weak@alumni.eastminster.ac.uk', password: 'Password1', name: 'Weak',
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Auth – Email Verification', () => {
  test('rejects invalid verification token', async () => {
    const res = await request(app).get('/api/auth/verify-email?token=invalidtoken123');
    expect(res.statusCode).toBe(400);
  });

  test('cannot login without verified email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'unverified@alumni.eastminster.ac.uk', password: 'Password1!',
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toContain('not verified');
  });
});

describe('Auth – Login', () => {
  test('login returns JWT for verified alumni', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'priya.sharma@alumni.eastminster.ac.uk', password: 'Password1!',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toBeDefined();
    alumniToken = res.body.data.token;
  });

  test('login returns JWT for admin', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@eastminster.ac.uk', password: 'Password1!',
    });
    expect(res.statusCode).toBe(200);
    adminToken = res.body.data.token;
  });

  test('login returns JWT for liam (high wallet)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'liam.chen@alumni.eastminster.ac.uk', password: 'Password1!',
    });
    expect(res.statusCode).toBe(200);
    liam4Token = res.body.data.token;
  });

  test('rejects wrong password (generic message — no enumeration)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'priya.sharma@alumni.eastminster.ac.uk', password: 'WrongPass!',
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid email or password'); // no specific info
  });

  test('password not exposed in login response', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'priya.sharma@alumni.eastminster.ac.uk', password: 'Password1!',
    });
    expect(res.body.data.user.password).toBeUndefined();
  });
});

describe('Auth – Password Reset', () => {
  test('forgot-password always returns 200 (prevents enumeration)', async () => {
    const res1 = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@alumni.eastminster.ac.uk' });
    expect(res1.statusCode).toBe(200);
    const res2 = await request(app).post('/api/auth/forgot-password').send({ email: 'priya.sharma@alumni.eastminster.ac.uk' });
    expect(res2.statusCode).toBe(200);
    expect(res1.body.message).toBe(res2.body.message); // same message
  });

  test('rejects invalid reset token', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({
      token: 'invalidtoken', password: 'NewPass1!',
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Auth – /me and Logout', () => {
  test('GET /me returns own user info', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.email).toBe('priya.sharma@alumni.eastminster.ac.uk');
  });

  test('logout succeeds with valid token', async () => {
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('rejects requests without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

//PROFILE
describe('Profile – Core', () => {
  test('GET /api/profile returns full profile with sub-resources', async () => {
    const res = await request(app).get('/api/profile').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.degrees).toBeDefined();
    expect(res.body.data.certifications).toBeDefined();
    expect(res.body.data.licences).toBeDefined();
    expect(res.body.data.courses).toBeDefined();
    expect(res.body.data.employmentHistory).toBeDefined();
  });

  test('PUT /api/profile updates bio and role', async () => {
    const res = await request(app).put('/api/profile')
      .set('Authorization', `Bearer ${alumniToken}`)
      .send({ bio: 'Updated bio text', currentRole: 'Staff Engineer' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.bio).toBe('Updated bio text');
  });

  test('GET /api/profile/completion returns percentage', async () => {
    const res = await request(app).get('/api/profile/completion').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.data.completionPercent).toBe('number');
    expect(res.body.data.sections).toBeDefined();
  });
});

describe('Profile – Degrees CRUD', () => {
  let degreeId;
  test('POST adds a degree', async () => {
    const res = await request(app).post('/api/profile/degrees')
      .set('Authorization', `Bearer ${alumniToken}`)
      .send({ title: 'MSc Artificial Intelligence', institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/msc-ai', completedDate: '2020-09-01' });
    expect(res.statusCode).toBe(201);
    degreeId = res.body.data.id;
  });

  test('GET lists degrees', async () => {
    const res = await request(app).get('/api/profile/degrees').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('PUT updates degree title', async () => {
    const res = await request(app).put(`/api/profile/degrees/${degreeId}`)
      .set('Authorization', `Bearer ${alumniToken}`)
      .send({ title: 'MSc Advanced AI' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('MSc Advanced AI');
  });

  test('DELETE removes degree', async () => {
    const res = await request(app).delete(`/api/profile/degrees/${degreeId}`).set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
  });
});

describe('Profile – Certifications, Licences, Courses, Employment', () => {
  test('POST certification', async () => {
    const res = await request(app).post('/api/profile/certifications')
      .set('Authorization', `Bearer ${alumniToken}`)
      .send({ name: 'Kubernetes Admin', issuer: 'CNCF', url: 'https://cncf.io/ckad', completedDate: '2023-01-01' });
    expect(res.statusCode).toBe(201);
  });

  test('POST licence', async () => {
    const res = await request(app).post('/api/profile/licences')
      .set('Authorization', `Bearer ${alumniToken}`)
      .send({ name: 'GDPR Practitioner', awardingBody: 'BCS', url: 'https://bcs.org/gdpr' });
    expect(res.statusCode).toBe(201);
  });

  test('POST course', async () => {
    const res = await request(app).post('/api/profile/courses')
      .set('Authorization', `Bearer ${alumniToken}`)
      .send({ name: 'React Advanced', provider: 'Frontend Masters', url: 'https://frontendmasters.com' });
    expect(res.statusCode).toBe(201);
  });

  test('POST employment record', async () => {
    const res = await request(app).post('/api/profile/employment')
      .set('Authorization', `Bearer ${alumniToken}`)
      .send({ jobTitle: 'Junior Developer', employer: 'TechCorp', startDate: '2017-07-01', endDate: '2018-08-31', current: false });
    expect(res.statusCode).toBe(201);
  });
});

// BIDDING
describe('Bidding – Core', () => {
  test('GET /api/bids/tomorrow shows slot info', async () => {
    const res = await request(app).get('/api/bids/tomorrow').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.slotDate).toBeDefined();
    expect(res.body.data.monthlyStatus).toBeDefined();
  });

  test('GET /api/bids/monthly returns monthly status', async () => {
    const res = await request(app).get('/api/bids/monthly').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.maxAllowed).toBeGreaterThanOrEqual(3);
  });

  test('GET /api/bids/status returns blind status', async () => {
    const res = await request(app).get('/api/bids/status').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    // Amount must NOT be in response
    expect(res.body.data.amount).toBeUndefined();
  });

  test('GET /api/bids/history returns own bid history', async () => {
    const res = await request(app).get('/api/bids/history').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('rejects bid without auth', async () => {
    const res = await request(app).post('/api/bids').send({ amount: 100 });
    expect(res.statusCode).toBe(401);
  });

  test('admin cannot place a bid', async () => {
    const res = await request(app).post('/api/bids').set('Authorization', `Bearer ${adminToken}`).send({ amount: 999 });
    expect(res.statusCode).toBe(403);
  });

  test('rejects negative bid amount', async () => {
    const res = await request(app).post('/api/bids').set('Authorization', `Bearer ${alumniToken}`).send({ amount: -50 });
    expect(res.statusCode).toBe(400);
  });
});

describe('Bidding – Admin resolve', () => {
  test('admin can trigger bid resolution', async () => {
    const res = await request(app).post('/api/bids/resolve').set('Authorization', `Bearer ${adminToken}`);
    expect([200, 409]).toContain(res.statusCode);
  });

  test('non-admin cannot resolve bids', async () => {
    const res = await request(app).post('/api/bids/resolve').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(403);
  });
});

//WINNERS
describe('Winners', () => {
  test('GET /api/winners/today returns today or null', async () => {
    const res = await request(app).get('/api/winners/today').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    if (res.body.data) {
      expect(res.body.data.alumni).toBeDefined();
      expect(res.body.data.alumni.password).toBeUndefined();
    }
  });

  test('GET /api/winners returns history', async () => {
    const res = await request(app).get('/api/winners').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

//  API KEYS 
describe('API Key Management (Admin)', () => {
  let newKeyId;

  test('admin can list API keys', async () => {
    const res = await request(app).get('/api/keys').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('admin can generate a new API key', async () => {
    const res = await request(app).post('/api/keys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Key', scopes: ['read:featured', 'read:alumni'] });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.key).toMatch(/^east_/);
    newKeyId = res.body.data.id;
  });

  test('admin can view key stats', async () => {
    const res = await request(app).get(`/api/keys/${newKeyId}/stats`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalCalls).toBeDefined();
  });

  test('admin can revoke a key', async () => {
    const res = await request(app).delete(`/api/keys/${newKeyId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('alumni cannot access key management', async () => {
    const res = await request(app).get('/api/keys').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(403);
  });
});

// PUBLIC API 
describe('Public API (API Key auth)', () => {
  const VALID_KEY   = 'east_arkey_prod_abc123xyz';
  const REVOKED_KEY = 'east_revoked_ghi789rst';

  test('GET /api/public/featured with valid API key', async () => {
    const res = await request(app).get('/api/public/featured').set('X-API-Key', VALID_KEY);
    expect(res.statusCode).toBe(200);
    if (res.body.data) {
      // Wallet balance must NEVER be exposed publicly
      expect(res.body.data.alumni?.profile?.walletBalance).toBeUndefined();
    }
  });

  test('GET /api/public/featured without key returns 401', async () => {
    const res = await request(app).get('/api/public/featured');
    expect(res.statusCode).toBe(401);
  });

  test('revoked key is rejected', async () => {
    const res = await request(app).get('/api/public/featured').set('X-API-Key', REVOKED_KEY);
    expect(res.statusCode).toBe(403);
  });

  test('key with insufficient scope is rejected', async () => {
    // VALID_KEY has read:featured but not read:alumni
    const res = await request(app).get('/api/public/alumni').set('X-API-Key', VALID_KEY);
    expect(res.statusCode).toBe(403);
  });

  test('mobile key (read:alumni scope) can browse alumni', async () => {
    const res = await request(app).get('/api/public/alumni').set('X-API-Key', 'east_mobile_v2_def456uvw');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    res.body.data.forEach(a => expect(a.password).toBeUndefined());
  });
});

// SPONSORS & EVENTS 
describe('Sponsors and Events', () => {
  test('GET /api/sponsors returns sponsor list', async () => {
    const res = await request(app).get('/api/sponsors').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/events returns events list', async () => {
    const res = await request(app).get('/api/events').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('alumni can register for an event', async () => {
    const res = await request(app).post('/api/events/e3/register').set('Authorization', `Bearer ${alumniToken}`);
    expect([201, 409]).toContain(res.statusCode);
  });

  test('alumni can accept a sponsorship offer', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'sofia.martinez@alumni.eastminster.ac.uk', password: 'Password1!',
    });
    const sofiaToken = loginRes.body.data.token;
    const res = await request(app).patch('/api/sponsors/offers/sp5/respond')
      .set('Authorization', `Bearer ${sofiaToken}`)
      .send({ decision: 'accepted' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });
});

// WALLET 
describe('Wallet', () => {
  test('GET /api/wallet returns balance and transactions', async () => {
    const res = await request(app).get('/api/wallet').set('Authorization', `Bearer ${alumniToken}`);
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.data.walletBalance).toBe('number');
    expect(Array.isArray(res.body.data.transactions)).toBe(true);
  });

  test('wallet requires authentication', async () => {
    const res = await request(app).get('/api/wallet');
    expect(res.statusCode).toBe(401);
  });
});