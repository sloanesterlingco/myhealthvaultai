MyHealthVaultAI (Alpha)

Patient-controlled medication reconciliation with deterministic conflict detection and auditable alert lifecycle tracking.

Current Scope (Alpha)

Medication list management

Provider-attributed medication instructions (start, stop, continue, change)

Append-only medication action history

Deterministic medication conflict detection

Persistent “Care Plan Change” alerts

Patient acknowledgment tracking (visibility only, no clinical recommendation)

Daily medication “taken” logging

Out of Scope (Alpha)

Drug interaction engines

Clinical risk scoring

Labs or imaging ingestion

EMR integrations

Clinical advice or recommendations

Architecture

React Native (Expo + TypeScript)

Firebase (Firestore + Cloud Functions)

Append-only medicationActions for auditability

Deterministic rule-based conflict detection

Alert lifecycle: generated → viewed → reviewed

Design Principles

Deterministic and explainable

Advisory-only boundaries

GDPR-friendly patient data isolation

Minimal PHI surface

Auditability through append-only event tracking

Development

Install dependencies:

npm install


Start development:

npx expo start
