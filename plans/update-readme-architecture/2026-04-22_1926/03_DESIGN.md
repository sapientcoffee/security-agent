# Design: Dual Architecture Views

## Image 1: High-Level (GCP Style)
**Prompt**: "A high-level Google Cloud Architecture Diagram (GCP Style) for a Security Audit Agent system. 4 distinct horizontal layers: 1. User Layer (Web Frontend, GeminiCLI). 2. Integration Layer (GitHub Bot receiving webhooks). 3. Intelligence Layer (Backend Agent on Cloud Run). 4. Foundation Layer (Gemini/Vertex AI, Firestore, Secret Manager, Cloud Tasks). Connections: Web Frontend and GeminiCLI both point directly to Backend Agent. GitHub Bot points to Cloud Tasks, which points to Backend Agent. White background, clean layout, standard GCP icons."

## Image 2: Detailed (Enterprise Style)
**Prompt**: "A highly detailed technical architecture diagram for an enterprise Security Audit Agent system. 
Layers:
1. **User Layer**: 'React Frontend (Web App)' and 'GeminiCLI (Remote Subagent)'. Arrows point to 'Backend Agent'.
2. **External Integrations Layer**: 'GitHub' icon with a 'GitHub Bot Service' box sending webhooks to the cloud listener.
3. **Cloud Provider Layer (Google Cloud)**:
   - 'GitHub Bot (Node.js)' enqueues to 'Cloud Tasks'.
   - 'Cloud Tasks' dispatches to 'Backend Agent'.
   - 'Backend Agent (Node.js)' as the central hub connects to:
     - 'Firestore (Database)' with sub-boxes for 'Tenant Partition 1' and 'Tenant Partition 2'.
     - 'Secret Manager' with sub-boxes for 'Private Keys' and 'API Tokens'.
     - 'Vertex AI (Gemini Pro)' for 'Security Review'.
     - 'Vulnerability Scanner' internal service.
Style: Professional blueprint style, grey/blue/green accents, detailed data flow labels ('Enqueues messages', 'Retrieve Secrets', 'Audit Data'). Include a legend in the corner. Highly legible and clean."

## README Structure
1. **## 🏗️ Architecture Overview**
   - Brief intro.
   - High-Level Image.
   - Description of Core Services (Frontend, GeminiCLI, Backend Agent, GitHub Bot).
2. **## 🛡️ Detailed System Design**
   - Detailed Image.
   - Deep dive into multi-tenancy (Firestore) and security (Secret Manager).
3. **## 🔄 Global Flows**
   - PR Flow.
   - Web Manual Flow.
   - CLI Manual Flow (Direct connection emphasized).
