import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import crypto from 'crypto';
import * as agentClient from '../src/agent-client.js';
import { GitHubService } from '../src/github-service.js';
import { db } from '../src/lib/firebase.js';

// Mock the dependencies
jest.mock('../src/agent-client.js');
jest.mock('../src/github-service.js');
jest.mock('../src/lib/firebase.js', () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
  },
  admin: {
    firestore: {
      FieldValue: {
        serverTimestamp: () => 'mock-timestamp'
      }
    }
  }
}));

describe('Defensive Check Verification', () => {
  const SECRET = 'test-secret';

  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    // We want background processing to run
    delete process.env.SKIP_BACKGROUND;
    process.env.GITHUB_APP_ID = '12345';
    process.env.GITHUB_PRIVATE_KEY = 'test-private-key';
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_PRIVATE_KEY;
  });

  const generateSignature = (payload) => {
    const hmac = crypto.createHmac('sha256', SECRET);
    return 'sha256=' + hmac.update(payload).digest('hex');
  };

  it('should remain stable when analysisResult is missing comments and summary', async () => {
    const payload = {
      action: 'opened',
      repository: {
        name: 'test-repo',
        owner: { login: 'test-owner' }
      },
      pull_request: { 
        number: 1,
        head: { sha: 'test-sha' },
        html_url: 'http://example.com/pr/1'
      },
      installation: { id: 12345 }
    };
    const body = JSON.stringify(payload);
    const signature = generateSignature(body);

    // Mock analyzeDiff to return a malformed result (missing summary and comments)
    agentClient.analyzeDiff.mockResolvedValue({});

    // Mock GitHubService methods
    const mockGetPRDiff = jest.fn().mockResolvedValue('test-diff');
    const mockCreateReview = jest.fn().mockResolvedValue({ data: {} });
    GitHubService.prototype.getPRDiff = mockGetPRDiff;
    GitHubService.prototype.createReview = mockCreateReview;

    const response = await request(app)
      .post('/api/webhook')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'pull_request')
      .set('x-hub-signature-256', signature)
      .send(body);

    expect(response.status).toBe(202);

    // Wait for background process to (hopefully) complete or fail
    // In a real test we'd need a better way to wait, but let's give it a moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify that createReview was called with defaults
    expect(mockCreateReview).toHaveBeenCalledWith(
      'test-owner',
      'test-repo',
      1,
      'test-sha',
      'Analysis complete.',
      []
    );

    // Verify Firestore was called with defaults
    expect(db.collection).toHaveBeenCalledWith('github_reviews');
    expect(db.add).toHaveBeenCalledWith(expect.objectContaining({
      summary: 'Analysis complete.',
      commentCount: 0
    }));
  });
});
