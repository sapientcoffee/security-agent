import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';

export class GitHubService {
  constructor(
    appId = process.env.GITHUB_APP_ID,
    privateKey = process.env.GITHUB_PRIVATE_KEY,
    installationId = process.env.GITHUB_INSTALLATION_ID
  ) {
    this.octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey,
        installationId,
      },
    });
  }

  async getPRDiff(owner, repo, pullNumber) {
    const response = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      headers: {
        accept: 'application/vnd.github.v3.diff',
      },
    });
    return response.data;
  }

  async createReview(owner, repo, pullNumber, commitId, summary, comments) {
    const formattedComments = comments.map(c => ({
      path: c.path,
      line: c.line,
      body: c.body,
      side: 'RIGHT'
    }));

    const response = await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: commitId,
      body: summary,
      event: 'COMMENT',
      comments: formattedComments
    });
    return response.data;
  }
}
