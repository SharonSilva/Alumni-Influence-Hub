
 // Schema designed to 3NF. Each entity is a separate collection (array).
 // Foreign keys are stored as IDs (userId, profileId, etc.).
 // structured maps directly to relational tables.
 
 // Collections:
 //   users            – Auth credentials + roles
 //   emailTokens      – One-time email verification tokens
 //   passwordResets   – One-time password reset tokens
 //   profiles         – Core alumni profile (1-to-1 with users)
 //   degrees          – Alumni degree entries (N-to-1 with profiles)
 //   certifications   – Professional certifications (N-to-1 with profiles)
 //   licences         – Professional licences (N-to-1 with profiles)
 //   courses          – Short professional courses (N-to-1 with profiles)
 //   employmentHistory– Job history entries (N-to-1 with profiles)
 //   sponsors         – Sponsoring organisations
 //   sponsorships     – Sponsorship offers (N-to-1 sponsors + profiles)
 //   bids             – Daily auction bids (N-to-1 with users)
 //   winners          – Historical Alumni-of-the-Day records
 //   events           – University alumni events
 //   eventAttendees   – Event attendance (junction: events × users)
 //  apiKeys          – Developer API keys with usage tracking
 //   apiUsageLogs     – Per-request log for key statistics
 

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ─── Helpers
function id() { return uuidv4(); }

function today() {
  return new Date().toISOString().split('T')[0];
}

function dateStr(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

// ─── Collections 
const db = {
  users:             [],
  emailTokens:       [],   // { id, userId, token, expiresAt, used }
  passwordResets:    [],   // { id, userId, token, expiresAt, used }
  profiles:          [],   // core profile data
  degrees:           [],   // { id, profileId, title, institution, url, completedDate }
  certifications:    [],   // { id, profileId, name, issuer, url, completedDate }
  licences:          [],   // { id, profileId, name, awardingBody, url, completedDate }
  courses:           [],   // { id, profileId, name, provider, url, completedDate }
  employmentHistory: [],   // { id, profileId, jobTitle, employer, startDate, endDate, current }
  sponsors:          [],
  sponsorships:      [],
  bids:              [],
  winners:           [],
  events:            [],
  eventAttendees:    [],
  apiKeys:           [],   // { id, name, key, ownerId, scopes, active, createdAt, lastUsedAt }
  apiUsageLogs:      [],   // { id, apiKeyId, endpoint, method, timestamp, statusCode }
};

// ─── Seed
async function seed() {
  const password = await bcrypt.hash('Password1!', 12);

  // ── Users
  const users = [
    { id: 'u1', email: 'priya.sharma@alumni.eastminster.ac.uk',   password, name: 'Priya Sharma',   role: 'alumni', emailVerified: true,  createdAt: '2024-01-10T10:00:00Z', updatedAt: '2024-01-10T10:00:00Z' },
    { id: 'u2', email: 'james.okafor@alumni.eastminster.ac.uk',   password, name: 'James Okafor',   role: 'alumni', emailVerified: true,  createdAt: '2024-01-11T10:00:00Z', updatedAt: '2024-01-11T10:00:00Z' },
    { id: 'u3', email: 'sofia.martinez@alumni.eastminster.ac.uk', password, name: 'Sofia Martinez', role: 'alumni', emailVerified: true,  createdAt: '2024-01-12T10:00:00Z', updatedAt: '2024-01-12T10:00:00Z' },
    { id: 'u4', email: 'liam.chen@alumni.eastminster.ac.uk',      password, name: 'Liam Chen',      role: 'alumni', emailVerified: true,  createdAt: '2024-01-13T10:00:00Z', updatedAt: '2024-01-13T10:00:00Z' },
    { id: 'u5', email: 'amara.nwosu@alumni.eastminster.ac.uk',    password, name: 'Amara Nwosu',    role: 'alumni', emailVerified: true,  createdAt: '2024-01-14T10:00:00Z', updatedAt: '2024-01-14T10:00:00Z' },
    { id: 'u6', email: 'unverified@alumni.eastminster.ac.uk',     password, name: 'Unverified User',role: 'alumni', emailVerified: false, createdAt: '2024-03-01T10:00:00Z', updatedAt: '2024-03-01T10:00:00Z' },
    { id: 'u7', email: 'admin@eastminster.ac.uk',                 password, name: 'Admin User',     role: 'admin',  emailVerified: true,  createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' },
  ];
  db.users.push(...users);

  // ── Profiles 
  const profiles = [
    { id: 'p1', userId: 'u1', graduationYear: 2018, bio: 'Passionate about AI/ML.', linkedInUrl: 'https://linkedin.com/in/priya-sharma-dev', photoUrl: null, currentRole: 'Senior Software Engineer', currentEmployer: 'Google DeepMind', location: 'London, UK', appearanceCount: 2, appearanceCountMonth: today().slice(0, 7), isActiveToday: false, profileCompleted: true, createdAt: '2024-01-10T10:00:00Z' },
    { id: 'p2', userId: 'u2', graduationYear: 2019, bio: 'Specialising in renewable energy.', linkedInUrl: 'https://linkedin.com/in/james-okafor-eng', photoUrl: null, currentRole: 'Lead Electrical Engineer', currentEmployer: 'Siemens Energy', location: 'Manchester, UK', appearanceCount: 1, appearanceCountMonth: today().slice(0, 7), isActiveToday: false, profileCompleted: true, createdAt: '2024-01-11T10:00:00Z' },
    { id: 'p3', userId: 'u3', graduationYear: 2020, bio: 'Turning financial data into insights.', linkedInUrl: 'https://linkedin.com/in/sofia-martinez-data', photoUrl: null, currentRole: 'Data Science Manager', currentEmployer: 'HSBC', location: 'London, UK', appearanceCount: 1, appearanceCountMonth: today().slice(0, 7), isActiveToday: false, profileCompleted: true, createdAt: '2024-01-12T10:00:00Z' },
    { id: 'p4', userId: 'u4', graduationYear: 2017, bio: 'Protecting critical infrastructure.', linkedInUrl: 'https://linkedin.com/in/liam-chen-security', photoUrl: null, currentRole: 'Principal Security Architect', currentEmployer: 'GCHQ', location: 'Cheltenham, UK', appearanceCount: 3, appearanceCountMonth: today().slice(0, 7), isActiveToday: true, profileCompleted: true, createdAt: '2024-01-13T10:00:00Z' },
    { id: 'p5', userId: 'u5', graduationYear: 2021, bio: 'Serial entrepreneur.', linkedInUrl: 'https://linkedin.com/in/amara-nwosu-ceo', photoUrl: null, currentRole: 'Founder & CEO', currentEmployer: 'NovaBridge Consulting', location: 'Birmingham, UK', appearanceCount: 0, appearanceCountMonth: today().slice(0, 7), isActiveToday: false, profileCompleted: true, createdAt: '2024-01-14T10:00:00Z' },
  ];
  db.profiles.push(...profiles);

  // ── Degrees 
  db.degrees.push(
    { id: id(), profileId: 'p1', title: 'BSc Computer Science', institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-cs', completedDate: '2018-06-15' },
    { id: id(), profileId: 'p2', title: 'BEng Electrical Engineering', institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/beng-ee', completedDate: '2019-06-14' },
    { id: id(), profileId: 'p3', title: 'BSc Data Science', institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-ds', completedDate: '2020-06-12' },
    { id: id(), profileId: 'p4', title: 'MSc Cyber Security', institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/msc-cyber', completedDate: '2017-09-10' },
    { id: id(), profileId: 'p5', title: 'BA Business Management', institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/ba-bm', completedDate: '2021-06-18' },
  );

  // ── Certifications 
  db.certifications.push(
    { id: id(), profileId: 'p1', name: 'AWS Solutions Architect', issuer: 'Amazon Web Services', url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate', completedDate: '2022-03-10' },
    { id: id(), profileId: 'p1', name: 'TensorFlow Developer Certificate', issuer: 'Google', url: 'https://www.tensorflow.org/certificate', completedDate: '2023-05-20' },
    { id: id(), profileId: 'p4', name: 'CISSP', issuer: 'ISC²', url: 'https://www.isc2.org/Certifications/CISSP', completedDate: '2020-08-01' },
    { id: id(), profileId: 'p4', name: 'OSCP', issuer: 'Offensive Security', url: 'https://www.offsec.com/courses/pen-200', completedDate: '2022-11-05' },
  );

  // Licences 
  db.licences.push(
    { id: id(), profileId: 'p2', name: 'Chartered Engineer (CEng)', awardingBody: 'Engineering Council UK', url: 'https://www.engc.org.uk/ceng', completedDate: '2021-06-01' },
    { id: id(), profileId: 'p2', name: 'MIET', awardingBody: 'Institution of Engineering and Technology', url: 'https://www.theiet.org', completedDate: '2020-01-15' },
  );

  //Short Courses 
  db.courses.push(
    { id: id(), profileId: 'p3', name: 'Applied Machine Learning', provider: 'Coursera', url: 'https://coursera.org/learn/applied-ml', completedDate: '2022-09-01' },
    { id: id(), profileId: 'p5', name: 'Lean Six Sigma Green Belt', provider: 'ASQ', url: 'https://asq.org/cert/six-sigma-green-belt', completedDate: '2022-04-20' },
  );

  // Employment History 
  db.employmentHistory.push(
    { id: id(), profileId: 'p1', jobTitle: 'Software Engineer', employer: 'Accenture', startDate: '2018-09-01', endDate: '2021-12-31', current: false },
    { id: id(), profileId: 'p1', jobTitle: 'Senior Software Engineer', employer: 'Google DeepMind', startDate: '2022-01-01', endDate: null, current: true },
    { id: id(), profileId: 'p4', jobTitle: 'Security Analyst', employer: 'Deloitte', startDate: '2017-10-01', endDate: '2020-07-31', current: false },
    { id: id(), profileId: 'p4', jobTitle: 'Principal Security Architect', employer: 'GCHQ', startDate: '2020-08-01', endDate: null, current: true },
  );

  //  Sponsors 
  db.sponsors.push(
    { id: 's1', name: 'Amazon Web Services',  category: 'Cloud Certification',    description: 'AWS cloud certifications' },
    { id: 's2', name: 'Google',               category: 'Cloud Certification',    description: 'Google Cloud & TF certs' },
    { id: 's3', name: 'ISC²',                 category: 'Security Certification', description: 'CISSP and security credentials' },
    { id: 's4', name: 'Offensive Security',   category: 'Security Certification', description: 'OSCP penetration testing cert' },
  );

  //  Sponsorships
  db.sponsorships.push(
    { id: 'sp1', sponsorId: 's1', profileId: 'p1', certificationName: 'AWS Solutions Architect', offerAmount: 200, status: 'accepted', createdAt: dateStr(-5) },
    { id: 'sp2', sponsorId: 's2', profileId: 'p1', certificationName: 'TensorFlow Developer Certificate', offerAmount: 300, status: 'accepted', createdAt: dateStr(-4) },
    { id: 'sp3', sponsorId: 's3', profileId: 'p4', certificationName: 'CISSP', offerAmount: 400, status: 'accepted', createdAt: dateStr(-3) },
    { id: 'sp4', sponsorId: 's4', profileId: 'p4', certificationName: 'OSCP', offerAmount: 350, status: 'accepted', createdAt: dateStr(-3) },
    { id: 'sp5', sponsorId: 's1', profileId: 'p3', certificationName: 'AWS Solutions Architect', offerAmount: 150, status: 'pending',  createdAt: dateStr(-1) },
  );

  // Wallet balances are derived fields on profiles
  // p1: 200+300 = 500 credited
  // p4: 400+350 = 750 credited
  db.profiles.find(p => p.id === 'p1').walletBalance = 500;
  db.profiles.find(p => p.id === 'p4').walletBalance = 750;
  db.profiles.find(p => p.id === 'p2').walletBalance = 0;
  db.profiles.find(p => p.id === 'p3').walletBalance = 0;
  db.profiles.find(p => p.id === 'p5').walletBalance = 0;

  // Bids 
  db.bids.push(
    { id: 'b1', userId: 'u1', bidDate: today(), amount: 250, status: 'active', submittedAt: new Date().toISOString() },
    { id: 'b2', userId: 'u4', bidDate: today(), amount: 380, status: 'active', submittedAt: new Date().toISOString() },
    { id: 'b3', userId: 'u2', bidDate: today(), amount: 200, status: 'active', submittedAt: new Date().toISOString() },
    { id: 'b4', userId: 'u4', bidDate: dateStr(-1), amount: 310, status: 'won',  submittedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'b5', userId: 'u1', bidDate: dateStr(-1), amount: 220, status: 'lost', submittedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'b6', userId: 'u3', bidDate: dateStr(-1), amount: 150, status: 'lost', submittedAt: new Date(Date.now() - 86400000).toISOString() },
  );

  // Winners 
  db.winners.push(
    { id: 'w1', userId: 'u1', displayDate: dateStr(-3), bidAmount: 280, createdAt: dateStr(-4) },
    { id: 'w2', userId: 'u3', displayDate: dateStr(-2), bidAmount: 195, createdAt: dateStr(-3) },
    { id: 'w3', userId: 'u4', displayDate: dateStr(-1), bidAmount: 310, createdAt: dateStr(-2) },
    { id: 'w4', userId: 'u4', displayDate: dateStr(-4), bidAmount: 290, createdAt: dateStr(-5) },
  );

  // Events 
  db.events.push(
    { id: 'e1', title: 'Eastminster Careers Fair 2025', date: dateStr(-10), location: 'Main Campus, London', description: 'Annual networking fair.', unlocksExtraBid: true },
    { id: 'e2', title: 'Tech Alumni Networking Evening', date: dateStr(-5), location: 'London Tech Hub', description: 'CS and Engineering mixer.', unlocksExtraBid: true },
    { id: 'e3', title: 'Business Leadership Forum', date: dateStr(5), location: 'Online', description: 'Entrepreneurship panel.', unlocksExtraBid: true },
  );
  db.eventAttendees.push(
    { id: id(), eventId: 'e1', userId: 'u1', registeredAt: dateStr(-15) },
    { id: id(), eventId: 'e2', userId: 'u4', registeredAt: dateStr(-7) },
  );

  // API Keys (developer keys) 
  db.apiKeys.push(
    { id: 'k1', name: 'AR Client (Production)', key: 'east_arkey_prod_abc123xyz', ownerId: 'u7', scopes: ['read:featured'], active: true, createdAt: dateStr(-30), lastUsedAt: dateStr(-1) },
    { id: 'k2', name: 'Mobile App v2',          key: 'east_mobile_v2_def456uvw', ownerId: 'u7', scopes: ['read:featured', 'read:alumni'], active: true, createdAt: dateStr(-15), lastUsedAt: today() },
    { id: 'k3', name: 'Revoked Test Key',        key: 'east_revoked_ghi789rst',   ownerId: 'u7', scopes: ['read:featured'], active: false, createdAt: dateStr(-60), lastUsedAt: dateStr(-20) },
  );

  db.apiUsageLogs.push(
    { id: id(), apiKeyId: 'k1', endpoint: '/api/public/featured', method: 'GET', timestamp: new Date(Date.now() - 3600000).toISOString(), statusCode: 200 },
    { id: id(), apiKeyId: 'k1', endpoint: '/api/public/featured', method: 'GET', timestamp: new Date(Date.now() - 7200000).toISOString(), statusCode: 200 },
    { id: id(), apiKeyId: 'k2', endpoint: '/api/public/alumni',   method: 'GET', timestamp: new Date().toISOString(), statusCode: 200 },
  );

  console.log('  Database seeded');
}

module.exports = { db, seed, id, today, dateStr };