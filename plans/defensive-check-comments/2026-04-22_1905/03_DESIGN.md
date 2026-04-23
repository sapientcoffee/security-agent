# Design Document - Defensive Check for Analysis Comments

## Architectural Approach
We will add defensive checks when processing the `analysisResult` in `github-bot/src/server.js`. The `analysisResult` is an object returned by an external AI agent, and its structure might be malformed or missing expected fields.

### Logic Changes
1.  **Defensive Access:** When calling `githubService.createReview`, use `(analysisResult.comments || [])` to ensure an array is always passed for the comments.
2.  **Summary Fallback:** Add a fallback for `analysisResult.summary` (e.g., `analysisResult.summary || 'Security analysis complete.'`).
3.  **Null Check:** Ensure `analysisResult` itself is not null. If it's null, we should handle it gracefully, perhaps by logging an error and returning or using a default object.

### Code Modification
In `github-bot/src/server.js`:

```javascript
          const analysisResult = await analyzeDiff(diff, { 'X-Cloud-Trace-Context': traceId }) || {};
          
          const commitId = payload.pull_request.head.sha;
          logger.info('Creating PR review', { pull_number, commitId });
          
          await githubService.createReview(
            owner,
            repo,
            pull_number,
            commitId,
            analysisResult.summary || 'Analysis complete.',
            analysisResult.comments || []
          );
```

## Security & Reliability
- **Input Validation:** This change treats the AI agent's response as untrusted/unreliable input and validates its structure before use.
- **Fail-Safe:** By providing defaults, we ensure the bot can complete its workflow even with partial information.
