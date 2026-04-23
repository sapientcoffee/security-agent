import { jest } from '@jest/globals';
import request from 'supertest';
import crypto from 'crypto';

// Mock dependencies before importing the app
jest.unstable_mockModule('../src/github-service.js', () => ({
  GitHubService: jest.fn()
}));

jest.unstable_mockModule('../src/agent-client.js', () => ({
  analyzeDiff: jest.fn()
}));

const { GitHubService } = await import('../src/github-service.js');
const { analyzeDiff } = await import('../src/agent-client.js');
const appModule = await import('../src/server.js');
const app = appModule.default;

describe('GitHub Bot Integration Flow', () => {
  const SECRET = 'test-secret';
  let mockGetPRDiff;
  let mockCreateReview;

  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    delete process.env.SKIP_BACKGROUND; // Ensure background process runs
    process.env.GITHUB_APP_ID = '12345';
    process.env.GITHUB_PRIVATE_KEY = 'test-private-key';
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_PRIVATE_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPRDiff = jest.fn();
    mockCreateReview = jest.fn();

    GitHubService.mockImplementation(() => {
      return {
        getPRDiff: mockGetPRDiff,
        createReview: mockCreateReview
      };
    });
  });

  const generateSignature = (payload) => {
    const hmac = crypto.createHmac('sha256', SECRET);
    return 'sha256=' + hmac.update(payload).digest('hex');
  };

  it('should process a pull request end-to-end', async () => {
    // Setup mock implementations
    const fakeDiff = 'diff --git a/file.js b/file.js\n+ console.log("test");';
    mockGetPRDiff.mockResolvedValue(fakeDiff);

    const fakeAnalysisResult = {
      summary: 'Test summary',
      comments: [
        { path: 'file.js', position: 1, body: 'Test comment' }
      ]
    };
    analyzeDiff.mockResolvedValue(fakeAnalysisResult);
    mockCreateReview.mockResolvedValue();

    const payloadObj = {
      action: 'opened',
      repository: {
        name: 'test-repo',
        owner: { login: 'test-owner' }
      },
      pull_request: { 
        number: 1,
        head: { sha: 'abcdef123456' }
      },
      installation: { id: 12345 }
    };
    const payload = JSON.stringify(payloadObj);
    const signature = generateSignature(payload);

    // Create a promise to wait for the background process
    const processPromise = new Promise((resolve) => {
      app.once('pr_process_promise', async (promise) => {
        await promise;
        resolve();
      });
    });

    // Send the webhook request
    const response = await request(app)
      .post('/api/webhook')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'pull_request')
      .set('x-hub-signature-256', signature)
      .send(payload);

    expect(response.status).toBe(202);
    expect(response.text).toBe('Accepted');

    // Wait for the background process to complete
    await processPromise;

    // Verify interactions
    expect(GitHubService).toHaveBeenCalledWith('12345', 'test-private-key', 12345);
    expect(mockGetPRDiff).toHaveBeenCalledWith('test-owner', 'test-repo', 1);
    expect(analyzeDiff).toHaveBeenCalledWith(fakeDiff);
    expect(mockCreateReview).toHaveBeenCalledWith(
      'test-owner',
      'test-repo',
      1,
      'abcdef123456',
      'Test summary',
      fakeAnalysisResult.comments
    );
  });
});
