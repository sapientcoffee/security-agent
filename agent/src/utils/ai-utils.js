/**
 * Strips markdown code block delimiters from a string.
 * This is useful when AI models wrap JSON or other output in code blocks.
 * 
 * @param {string} text The text to process.
 * @returns {string} The text with markdown delimiters removed.
 */
export function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Pattern to match ```json ... ``` or just ``` ... ```
  // Supports optional language specifiers like json, javascript, js
  const markdownRegex = /```(?:json|javascript|js)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(markdownRegex);
  
  if (match) {
    return match[1].trim();
  }
  
  return text.trim();
}

/**
 * Safely parses JSON by first stripping markdown delimiters.
 * 
 * @param {string} text The text to parse.
 * @returns {any} The parsed JSON object.
 * @throws {Error} If parsing fails.
 */
export function safeJsonParse(text) {
  const cleanText = stripMarkdown(text);
  try {
    return JSON.parse(cleanText);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}\nInput: ${cleanText.substring(0, 100)}...`);
  }
}
