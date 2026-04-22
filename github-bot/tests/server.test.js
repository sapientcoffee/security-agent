import request from 'supertest';
import app from '../src/server.js';
import crypto from 'crypto';

describe('GitHub Bot Server', () => {
  const SECRET = 'test-secret';

  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    process.env.SKIP_BACKGROUND = 'true';
    process.env.GITHUB_APP_ID = '12345';
    process.env.GITHUB_PRIVATE_KEY = 'test-private-key';
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.SKIP_BACKGROUND;
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_PRIVATE_KEY;
  });

  describe('GET /health', () => {
    it('should return 200 OK and { status: "ok" }', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/webhook', () => {
    const validPayload = JSON.stringify({
      action: 'opened',
      repository: {
        name: 'test-repo',
        owner: { login: 'test-owner' }
      },
      pull_request: { number: 1 },
      installation: { id: 12345 }
    });

    const generateSignature = (payload) => {
      const hmac = crypto.createHmac('sha256', SECRET);
      return 'sha256=' + hmac.update(payload).digest('hex');
    };

    it('should return 401 if signature is missing', async () => {
      const response = await request(app)
        .post('/api/webhook')
        .set('Content-Type', 'application/json')
        .send(validPayload);
        
      expect(response.status).toBe(401);
      expect(response.text).toBe('No signature provided');
    });

    it('should return 401 if signature is invalid', async () => {
      const response = await request(app)
        .post('/api/webhook')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', 'sha256=invalid123')
        .send(validPayload);

      expect(response.status).toBe(401);
      expect(response.text).toBe('Invalid signature');
    });

    it('should return 200 for a non-PR event with valid signature', async () => {
      const payload = JSON.stringify({ action: 'created' });
      const signature = generateSignature(payload);

      const response = await request(app)
        .post('/api/webhook')
        .set('Content-Type', 'application/json')
        .set('x-github-event', 'issue_comment')
        .set('x-hub-signature-256', signature)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.text).toBe('Ignored event type');
    });

    it('should return 202 Accepted for a valid PR event', async () => {
      const signature = generateSignature(validPayload);

      const response = await request(app)
        .post('/api/webhook')
        .set('Content-Type', 'application/json')
        .set('x-github-event', 'pull_request')
        .set('x-hub-signature-256', signature)
        .send(validPayload);

      expect(response.status).toBe(202);
      expect(response.text).toBe('Accepted');
    });
  });
});
