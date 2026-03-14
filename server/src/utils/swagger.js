
const swaggerUi   = require('swagger-ui-express');

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title:       'Alumni Influencers API',
    version:     '1.0.0',
    description: `
## Phantasmagoria Ltd × University of Eastminster

A RESTful Web API serving the Alumni Influencers AR platform.

### Authentication

Two authentication schemes are supported:

1. **JWT Bearer Token** – For alumni/admin user sessions.
   Obtain via \`POST /api/auth/login\`.
   Pass as: \`Authorization: Bearer <token>\`

2. **API Key** – For developer/client applications (AR client, mobile app, etc.).
   Generate via admin panel or \`POST /api/keys\`.
   Pass as: \`X-API-Key: <key>\`

### Quick Start (seed credentials)
All seed users have password \`Password1!\`

| Email | Role |
|-------|------|
| \`priya.sharma@alumni.eastminster.ac.uk\` | alumni |
| \`liam.chen@alumni.eastminster.ac.uk\` | alumni (high wallet) |
| \`admin@eastminster.ac.uk\` | admin |

Seed API Key (read:featured): \`east_arkey_prod_abc123xyz\`
    `,
    contact: {
      name: 'Phantasmagoria Ltd',
      email: 'api@phantasmagoria.co.uk',
    },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'JWT',
        description:  'JWT obtained from POST /api/auth/login',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in:   'header',
        name: 'X-API-Key',
        description: 'Developer API key from POST /api/keys',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors:  { type: 'array', items: { type: 'object' } },
        },
      },
      User: {
        type: 'object',
        properties: {
          id:            { type: 'string', format: 'uuid' },
          email:         { type: 'string', format: 'email' },
          name:          { type: 'string' },
          role:          { type: 'string', enum: ['alumni', 'admin'] },
          emailVerified: { type: 'boolean' },
          createdAt:     { type: 'string', format: 'date-time' },
        },
      },
      Profile: {
        type: 'object',
        properties: {
          id:              { type: 'string' },
          userId:          { type: 'string' },
          graduationYear:  { type: 'integer' },
          bio:             { type: 'string' },
          linkedInUrl:     { type: 'string', format: 'uri' },
          photoUrl:        { type: 'string' },
          currentRole:     { type: 'string' },
          currentEmployer: { type: 'string' },
          location:        { type: 'string' },
          walletBalance:   { type: 'number' },
          appearanceCount: { type: 'integer' },
          isActiveToday:   { type: 'boolean' },
        },
      },
      Degree: {
        type: 'object',
        properties: {
          id:            { type: 'string' },
          profileId:     { type: 'string' },
          title:         { type: 'string', example: 'BSc Computer Science' },
          institution:   { type: 'string', example: 'University of Eastminster' },
          url:           { type: 'string', format: 'uri' },
          completedDate: { type: 'string', format: 'date' },
        },
      },
      Certification: {
        type: 'object',
        properties: {
          id:            { type: 'string' },
          profileId:     { type: 'string' },
          name:          { type: 'string', example: 'AWS Solutions Architect' },
          issuer:        { type: 'string', example: 'Amazon Web Services' },
          url:           { type: 'string', format: 'uri' },
          completedDate: { type: 'string', format: 'date' },
        },
      },
      Bid: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          userId:      { type: 'string' },
          bidDate:     { type: 'string', format: 'date' },
          status:      { type: 'string', enum: ['active', 'won', 'lost', 'cancelled'] },
          submittedAt: { type: 'string', format: 'date-time' },
        },
      },
      Winner: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          userId:      { type: 'string' },
          displayDate: { type: 'string', format: 'date' },
          bidAmount:   { type: 'number' },
          createdAt:   { type: 'string', format: 'date-time' },
        },
      },
      ApiKey: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          name:        { type: 'string' },
          key:         { type: 'string', description: 'Full key (shown only at creation)' },
          scopes:      { type: 'array', items: { type: 'string' } },
          active:      { type: 'boolean' },
          createdAt:   { type: 'string', format: 'date-time' },
          lastUsedAt:  { type: 'string', format: 'date-time' },
          usageCount:  { type: 'integer' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth',       description: 'Registration, login, email verification, password reset' },
    { name: 'Profile',    description: 'Alumni profile management (core + sub-resources)' },
    { name: 'Profile - Degrees',        description: 'Degree entries' },
    { name: 'Profile - Certifications', description: 'Professional certification entries' },
    { name: 'Profile - Licences',       description: 'Professional licence entries' },
    { name: 'Profile - Courses',        description: 'Short professional course entries' },
    { name: 'Profile - Employment',     description: 'Employment history entries' },
    { name: 'Bidding',    description: 'Daily blind bidding system' },
    { name: 'Winners',    description: 'Alumni of the Day history' },
    { name: 'Sponsors',   description: 'Sponsoring organisations and offer management' },
    { name: 'Events',     description: 'University alumni events (unlock extra bid)' },
    { name: 'Wallet',     description: 'Sponsorship earnings and bid transaction log' },
    { name: 'API Keys',   description: 'Developer API key management (admin only)' },
    { name: 'Public API', description: 'Client-facing endpoints accessed via API key' },
  ],
  paths: {
    // AUTH 
    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Register a new alumni account',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['email', 'password', 'name'],
            properties: {
              email:    { type: 'string', example: 'jane.doe@alumni.eastminster.ac.uk' },
              password: { type: 'string', example: 'Password1@', description: 'Min 8 chars, 1 uppercase, 1 number, 1 special char' },
              name:     { type: 'string', example: 'Jane Doe' },
            },
          }}},
        },
        responses: {
          201: { description: 'Registered — verification email sent' },
          400: { description: 'Validation error' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/auth/verify-email': {
      get: {
        tags: ['Auth'], summary: 'Verify email via token link',
        parameters: [{ in: 'query', name: 'token', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Email verified' }, 400: { description: 'Invalid/expired token' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login – returns JWT',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['email', 'password'],
          properties: {
            email:    { type: 'string', example: 'priya.sharma@alumni.eastminster.ac.uk' },
            password: { type: 'string', example: 'Password1!' },
          },
        }}}},
        responses: { 200: { description: 'JWT returned' }, 401: { description: 'Invalid credentials or unverified email' } },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'], summary: 'Logout',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'], summary: 'Request password reset email',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['email'],
          properties: { email: { type: 'string', example: 'priya.sharma@alumni.eastminster.ac.uk' } },
        }}}},
        responses: { 200: { description: 'Reset email sent (always 200 to prevent enumeration)' } },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'], summary: 'Reset password with token',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['token', 'password'],
          properties: { token: { type: 'string' }, password: { type: 'string', example: 'NewPass1@' } },
        }}}},
        responses: { 200: { description: 'Password reset' }, 400: { description: 'Invalid/expired token' } },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Get own user info',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User object' } },
      },
    },

    //PROFILE 
    '/api/profile': {
      get: {
        tags: ['Profile'], summary: 'Get own full profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Full profile including all sub-resources' } },
      },
      put: {
        tags: ['Profile'], summary: 'Update core profile fields',
        security: [{ bearerAuth: [] }],
        requestBody: { content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            bio: { type: 'string' }, linkedInUrl: { type: 'string' },
            currentRole: { type: 'string' }, currentEmployer: { type: 'string' },
            location: { type: 'string' }, graduationYear: { type: 'integer' },
          },
        }}}},
        responses: { 200: { description: 'Updated profile' } },
      },
    },
    '/api/profile/photo': {
      post: {
        tags: ['Profile'], summary: 'Upload profile photo',
        security: [{ bearerAuth: [] }],
        requestBody: { content: { 'multipart/form-data': { schema: {
          type: 'object', properties: { photo: { type: 'string', format: 'binary' } },
        }}}},
        responses: { 200: { description: 'Photo uploaded' } },
      },
    },
    '/api/profile/completion': {
      get: { tags: ['Profile'], summary: 'Profile completion status', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Completion %' } } },
    },
    '/api/profile/degrees': {
      get:  { tags: ['Profile - Degrees'], summary: 'List own degrees',  security: [{ bearerAuth: [] }], responses: { 200: { description: 'Degrees array' } } },
      post: { tags: ['Profile - Degrees'], summary: 'Add a degree entry', security: [{ bearerAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Degree' } } } },
        responses: { 201: { description: 'Degree created' } } },
    },
    '/api/profile/degrees/{id}': {
      put:    { tags: ['Profile - Degrees'], summary: 'Update a degree',  security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Profile - Degrees'], summary: 'Delete a degree',  security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/profile/certifications': {
      get:  { tags: ['Profile - Certifications'], summary: 'List certifications', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: { tags: ['Profile - Certifications'], summary: 'Add certification',    security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } },
    },
    '/api/profile/certifications/{id}': {
      put:    { tags: ['Profile - Certifications'], summary: 'Update', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Profile - Certifications'], summary: 'Delete', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/profile/licences': {
      get:  { tags: ['Profile - Licences'], summary: 'List licences', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: { tags: ['Profile - Licences'], summary: 'Add licence',   security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } },
    },
    '/api/profile/licences/{id}': {
      put:    { tags: ['Profile - Licences'], summary: 'Update', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Profile - Licences'], summary: 'Delete', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/profile/courses': {
      get:  { tags: ['Profile - Courses'], summary: 'List courses', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: { tags: ['Profile - Courses'], summary: 'Add course',   security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } },
    },
    '/api/profile/courses/{id}': {
      put:    { tags: ['Profile - Courses'], summary: 'Update', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Profile - Courses'], summary: 'Delete', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/profile/employment': {
      get:  { tags: ['Profile - Employment'], summary: 'List employment history', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: { tags: ['Profile - Employment'], summary: 'Add employment record',   security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } },
    },
    '/api/profile/employment/{id}': {
      put:    { tags: ['Profile - Employment'], summary: 'Update', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Profile - Employment'], summary: 'Delete', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },

    // BIDDING 
    '/api/bids/tomorrow': {
      get: { tags: ['Bidding'], summary: "View tomorrow's slot info", security: [{ bearerAuth: [] }], responses: { 200: { description: 'Slot info' } } },
    },
    '/api/bids': {
      post: {
        tags: ['Bidding'], summary: 'Place a bid',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['amount'],
          properties: { amount: { type: 'number', example: 250, minimum: 1 } },
        }}}},
        responses: { 201: { description: 'Bid placed + blind feedback' }, 400: { description: 'Closed / limit / balance' }, 409: { description: 'Already bid today' } },
      },
    },
    '/api/bids/{id}': {
      patch:  { tags: ['Bidding'], summary: 'Increase bid amount', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { amount: { type: 'number' } } } } } }, responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Bidding'], summary: 'Cancel bid',          security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Cancelled' } } },
    },
    '/api/bids/status':  { get: { tags: ['Bidding'], summary: 'Blind win/lose status', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Status' } } } },
    '/api/bids/history': { get: { tags: ['Bidding'], summary: 'Own bid history',       security: [{ bearerAuth: [] }], responses: { 200: { description: 'Bids array' } } } },
    '/api/bids/monthly': { get: { tags: ['Bidding'], summary: 'Monthly limit status (X/3)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Monthly stats' } } } },
    '/api/bids/resolve': { post: { tags: ['Bidding'], summary: '(Admin) Resolve daily auction', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Winner selected' } } } },

    // WINNERS 
    '/api/winners/today': { get: { tags: ['Winners'], summary: "Today's Alumni of the Day", security: [{ bearerAuth: [] }], responses: { 200: { description: 'Winner' } } } },
    '/api/winners':       { get: { tags: ['Winners'], summary: 'Winner history',            security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } } },

    // SPONSORS
    '/api/sponsors':          { get: { tags: ['Sponsors'], summary: 'List sponsors', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } }, post: { tags: ['Sponsors'], summary: '(Admin) Create sponsor', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } } },
    '/api/sponsors/{id}/offers': { post: { tags: ['Sponsors'], summary: '(Admin) Make offer to alumni', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Offer created' } } } },
    '/api/sponsors/offers/{id}/respond': { patch: { tags: ['Sponsors'], summary: 'Accept or decline sponsorship offer', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { decision: { type: 'string', enum: ['accepted', 'declined'] } } } } } }, responses: { 200: { description: 'Responded' } } } },

    // EVENTS 
    '/api/events':            { get: { tags: ['Events'], summary: 'List events', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } }, post: { tags: ['Events'], summary: '(Admin) Create event', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } } },
    '/api/events/{id}/register': { post: { tags: ['Events'], summary: 'Register for event', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Registered' } } } },

    //WALLET
    '/api/wallet': { get: { tags: ['Wallet'], summary: 'Wallet balance + transactions', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Wallet data' } } } },

    // API KEYS 
    '/api/keys':        { get: { tags: ['API Keys'], summary: 'List all API keys', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Keys array' } } }, post: { tags: ['API Keys'], summary: 'Generate new API key', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Key generated (save it now)' } } } },
    '/api/keys/{id}':       { get: { tags: ['API Keys'], summary: 'Key details + stats', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Key detail' } } }, delete: { tags: ['API Keys'], summary: 'Revoke key', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Revoked' } } } },
    '/api/keys/{id}/stats': { get: { tags: ['API Keys'], summary: 'Usage logs with timestamps', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Stats' } } } },

    // PUBLIC 
    '/api/public/featured':  { get: { tags: ['Public API'], summary: "Today's Alumni of the Day (AR Client endpoint)", security: [{ apiKeyAuth: [] }], responses: { 200: { description: 'Featured alumnus' } } } },
    '/api/public/alumni':    { get: { tags: ['Public API'], summary: 'Browse alumni directory', security: [{ apiKeyAuth: [] }], responses: { 200: { description: 'Alumni list' } } } },
    '/api/public/alumni/{id}': { get: { tags: ['Public API'], summary: 'Single alumni public profile', security: [{ apiKeyAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Profile' } } } },
    '/api/public/sponsors':  { get: { tags: ['Public API'], summary: 'Sponsor list', security: [{ apiKeyAuth: [] }], responses: { 200: { description: 'Sponsors' } } } },
    '/api/public/events':    { get: { tags: ['Public API'], summary: 'Upcoming alumni events', security: [{ apiKeyAuth: [] }], responses: { 200: { description: 'Events' } } } },
  },
};

module.exports = { swaggerUi, swaggerSpec };