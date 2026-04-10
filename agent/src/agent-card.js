// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
