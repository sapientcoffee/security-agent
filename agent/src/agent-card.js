export const getAgentCard = (baseUrl) => ({
  protocolVersion: "0.3.0",
  name: "Security Audit Agent",

  description: "A specialized remote subagent for security auditing, providing code reviews, bug hunting, and security alignment checks.",
  version: "1.0.0",
  url: baseUrl,
  preferredTransport: "HTTP+JSON",
  capabilities: {
    streaming: false,
    extendedAgentCard: false
  },
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["application/json"],
  skills: [
    {
      id: "security-audit",
      name: "Security Audit",
      description: "Analyze code for security vulnerabilities, logic breaks, and alignment with security best practices.",
      examples: [
        "Audit this file for security issues",
        "Check this specification against implementation for security gaps"
      ]
    }
  ]
});
