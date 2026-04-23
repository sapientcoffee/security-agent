# Requirements: Fix AI JSON Parsing

## Objective
AI models occasionally wrap JSON output in Markdown code blocks (e.g., \` \` \`json ... \` \` \`). This causes \`JSON.parse()\` to fail. The goal is to create a utility function to strip these delimiters before parsing and apply it across the codebase where AI responses are handled.

## User Stories
- **Reliable Extraction:** As a developer, I want a utility that can extract the JSON content from a string, regardless of whether it is wrapped in markdown code blocks or not.
- **Robust Parsing:** As a system, I want AI-generated JSON responses to be parsed successfully even when the model includes markdown formatting.

## Scope
- Create a shared utility function (or duplicate in relevant packages if sharing is not feasible) to strip markdown delimiters.
- Update `agent` code to use this utility before parsing AI responses.
- Update `github-bot` code to use this utility before parsing AI responses.

## Constraints
- The utility should handle various markdown code block formats (e.g., \` \` \`json\`, \` \` \`javascript\`, \` \` \` \`).
- It should be idempotent (calling it on a plain JSON string should return the same string).
- Performance should be considered, though typical AI outputs are not massive.
- Must be covered by unit tests.
