// github-bot/src/agent-client.js

/**
 * HTTP client for interacting with the Core Security Agent.
 */

/**
 * Sends PR diff to Security Agent POST /api/analyze
 * @param {string} diffText 
 * @returns {Promise<any>}
 */
export async function analyzeDiff(diffText) {
  const url = process.env.AGENT_API_URL || 'http://localhost:8080/api/analyze';
  const token = process.env.AGENT_API_TOKEN || '';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        inputType: 'code',
        content: diffText,
        structured: true
      })
    });

    if (!response.ok) {
      throw new Error(`Agent API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in analyzeDiff:', error);
    throw error;
  }
}

export default { analyzeDiff };