import { jest } from '@jest/globals';
import { GitHubService } from '../src/github-service.js';

describe('GitHubService', () => {
  let githubService;

  beforeEach(() => {
    process.env.GITHUB_APP_ID = '12345';
    process.env.GITHUB_PRIVATE_KEY = 'test-private-key';
    process.env.GITHUB_INSTALLATION_ID = '123456';
    githubService = new GitHubService();
  });

  afterEach(() => {
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_PRIVATE_KEY;
    delete process.env.GITHUB_INSTALLATION_ID;
  });

  it('should initialize Octokit with createAppAuth', () => {
    expect(githubService.octokit).toBeDefined();
  });

  it('should call octokit.rest.pulls.get with correct headers to get diff', async () => {
    // Mock the pulls.get method correctly within octokit's nested structure
    githubService.octokit.rest.pulls = {
      get: jest.fn().mockResolvedValue({ data: 'mock-diff-content' })
    };

    const diff = await githubService.getPRDiff('owner1', 'repo1', 123);

    expect(githubService.octokit.rest.pulls.get).toHaveBeenCalledWith({
      owner: 'owner1',
      repo: 'repo1',
      pull_number: 123,
      headers: {
        accept: 'application/vnd.github.v3.diff',
      },
    });
    expect(diff).toBe('mock-diff-content');
  });

  it('should call octokit.rest.pulls.createReview with formatted comments', async () => {
    githubService.octokit.rest.pulls = {
      createReview: jest.fn().mockResolvedValue({ data: 'mock-review-response' })
    };

    const comments = [
      { path: 'src/index.js', line: 10, body: 'Missing check' },
      { path: 'src/app.js', line: 20, body: 'Needs escaping' }
    ];

    const response = await githubService.createReview('owner1', 'repo1', 123, 'sha123', 'Overall review', comments);

    expect(githubService.octokit.rest.pulls.createReview).toHaveBeenCalledWith({
      owner: 'owner1',
      repo: 'repo1',
      pull_number: 123,
      commit_id: 'sha123',
      body: 'Overall review',
      event: 'COMMENT',
      comments: [
        { path: 'src/index.js', line: 10, body: 'Missing check', side: 'RIGHT' },
        { path: 'src/app.js', line: 20, body: 'Needs escaping', side: 'RIGHT' }
      ]
    });
    expect(response).toBe('mock-review-response');
  });
});
