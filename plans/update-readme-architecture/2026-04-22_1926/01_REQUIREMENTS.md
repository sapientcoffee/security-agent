# Requirements: Dual Architecture Views (High-Level & Detailed)

## Objective
Provide two distinct views of the system architecture in the `README.md`:
1.  **High-Level View**: A clean, standard Google Cloud architecture diagram for quick understanding.
2.  **Detailed View**: A comprehensive, enterprise-style diagram (updating `a_technical_architecture_diagram.png`) showing internal components like multi-tenant Firestore partitions, Secret Manager contents, and specific data flow labels.

## User Stories
- As a Developer, I want a high-level view to see the main entry points (Web, CLI, GitHub).
- As an Architect, I want a detailed view to see how multi-tenancy and secret management are handled internally.

## Constraints
- **Direct Connection**: Both diagrams must show GeminiCLI connecting directly to the Backend Agent (the subagent bridge is the implementation detail, but the flow is logically direct).
- **GCP Style**: The high-level diagram must use standard GCP iconography on a white background.
- **Detailed Style**: The detailed diagram must match the style of `nanobanana-output/a_technical_architecture_diagram.png` (grey/blue/green boxes, explicit flow labels, legend).
- **README Structure**: The high-level view should be at the top of the "Architecture Overview" section. The detailed view should be introduced as a "Detailed System Design".

## Success Criteria
- Two new images generated via `nanobanana`.
- `README.md` updated with both images and appropriate descriptions.
- The flow `GeminiCLI -> Backend Agent` is visually distinct.
