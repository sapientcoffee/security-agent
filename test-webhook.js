const crypto = require('crypto');
const secret = 'my-secret';
const payload = '{"action":"opened","pull_request":{"number":1},"repository":{"owner":{"login":"test"},"name":"repo"}}';

const hmac = crypto.createHmac('sha256', secret);
const digest = 'sha256=' + hmac.update(payload).digest('hex');

console.log(`Signature: ${digest}`);

const execSync = require('child_process').execSync;
const cmd = `curl -s -w "%{http_code}" -X POST http://localhost:3001/api/webhook -H "x-github-event: pull_request" -H "x-hub-signature-256: ${digest}" -H "Content-Type: application/json" -d '${payload}'`;

console.log('Running:', cmd);
const result = execSync(cmd, { env: { ...process.env, GITHUB_WEBHOOK_SECRET: 'my-secret' } }).toString();
console.log('Result:', result);
