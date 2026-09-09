# Hackathon log

- **Project:** restaurant-procurement
- **Event:** Convex All Gas Hackathon
- **What it does:** Explora ejemplos de precios y distribuidores sin exigir documentos ni cantidad; guarda estudios sintéticos por sesión de navegador y permite preparar una comparación opcional.
- **Live app:** not deployed
- **Repo:** private
- **Frontend:** not deployed
- **Convex deployment:** not deployed
- **Components:** @convex-dev/agent
- **Convex features:** schema, indexes, queries, mutations, internal action, scheduled mutations, realtime queries (local)
- **Auth:** Other (capacidad anónima de demo; sin cuentas)
- **AI models:** none
- **Started:** 2026-09-07T18:47:16Z


### 2026-09-09 - working tree · PR 14 local review
Preserved decision context during the first comparison save and added scheduled recovery for interrupted advisor executions. Expiry keeps deterministic results and prevents a late model completion from replacing a failed state; it never retries a provider.
Independent Sol review was adjudicated and corrected. 112 domain/backend tests, frontend/backend typechecks, build and three advisor browser journeys passed. Browser checks used the existing synthetic local backend; changed backend behavior was verified in memory. No real provider calls or public deployment.
