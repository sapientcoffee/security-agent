# Design: AI JSON Parsing Utility

## Overview
Create a utility function `stripMarkdown` that extracts JSON content from strings that might be wrapped in Markdown code blocks. This utility will be used in both the `agent` and `github-bot` services.

## Technical Approach
The utility will use a regular expression to identify and extract content from between \` \` \`json\` (or similar) and \` \` \` delimiters.

### Utility Function
```javascript
/**
 * Strips markdown code block delimiters from a string.
 * @param {string} text The text to process.
 * @returns {string} The text with markdown delimiters removed.
 */
export function stripMarkdown(text) {
  if (!text) return "";
  
  // Pattern to match ```json ... ``` or just ``` ... ```
  // Supports optional language specifiers like json, javascript, js
  const markdownRegex = /```(?:json|javascript|js)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(markdownRegex);
  
  if (match) {
    return match[1].trim();
  }
  
  return text.trim();
}
```

### Integration Points
1.  **Agent Service:** `agent/src/server.js`
    - Import `stripMarkdown` from `./utils/ai-utils.js`.
    - Apply `stripMarkdown(output)` before `JSON.parse(output)`.
2.  **GitHub Bot Service:** `github-bot/src/agent-client.js` or `github-bot/src/server.js`.
    - Although the Agent currently handles the parsing, adding the utility to the Bot provides defense-in-depth and prepares it for direct AI interactions.

## File Changes
- `agent/src/utils/ai-utils.js`: New file.
- `agent/src/server.js`: Update to use `stripMarkdown`.
- `github-bot/src/utils/ai-utils.js`: New file.
- `github-bot/src/agent-client.js`: Update to use `stripMarkdown` on the response if needed, or just provide the utility for future use. (Actually, I'll apply it in the Agent first as that's where the failure is happening now).
