# AuditMind AI Contributor Guide

This file is the project-specific contributor guide for collaborators and coding agents working inside the AuditMind repository.

## Project Overview

AuditMind AI is a Solidity security copilot built as a full-stack application:

- React frontend in `src/frontend`
- Express backend in `src/backend` and `src/server.ts`
- ElizaOS runtime entry in `src/index.ts`
- Eliza character and starter plugin in `src/character.ts` and `src/plugin.ts`

The backend performs deterministic analysis first and then tries to enrich the result with Eliza-routed or direct Qwen reasoning.

## Ports And Runtime Roles

- `3000` - Eliza runtime
- `3001` - AuditMind backend and production-served frontend
- `5173` - Vite frontend dev server

## Important Files

| File | Why it matters |
| --- | --- |
| `src/server.ts` | Express server, health routes, tooling status, static frontend serving |
| `src/backend/routes/analyze.ts` | Main API route |
| `src/backend/services/inputResolver.ts` | Resolves code/upload/GitHub/address sources |
| `src/backend/services/analyzer.ts` | Merges rules, AI output, verdict, and reasoning |
| `src/backend/services/agentAnalyzer.ts` | AI provider failover logic |
| `src/backend/services/elizaAgent.ts` | Eliza API integration |
| `src/backend/services/qwenClient.ts` | Direct Qwen fallback |
| `src/frontend/services/api.js` | Frontend/backend contract |
| `src/frontend/store/useStore.js` | Local persistence, auth, history, compare, settings |
| `build.ts` | Frontend and runtime build process |
| `Dockerfile` | Container image definition |
| `scripts/start-auditmind.sh` | Combined runtime launcher for deployment |
| `nosana-deployment.template.json` | Starter template for Nosana deployment |

## Daily Development Commands

```bash
npm install
npm run type-check
npm run build
npm test
```

For local development:

```bash
# Eliza runtime
npm run dev

# Backend
npm run backend

# Frontend
npm run frontend
```

## Documentation Expectations

When changing behavior, keep these docs aligned:

- `README.md`
- `docs/agent-workflow.md`
- `sample-contracts/README.md`
- `idea.md`

If a feature is only partially implemented, document it honestly instead of presenting it as complete.

## Architecture Notes

### Frontend

The frontend is route-based and keeps most user data locally:

- auth accounts
- current workspace
- history
- saved reports
- compare state
- settings

### Backend

The backend flow is:

1. resolve input
2. validate Solidity
3. run deterministic rule checks
4. build the AI prompt
5. try Eliza
6. fall back to direct Qwen if needed
7. merge risks and narratives
8. return structured report metadata

### Eliza Layer

The repository still contains the starter Eliza plugin and character setup for runtime compatibility and Eliza-focused tests. The product-facing Solidity analysis logic lives in the custom backend rather than in the starter plugin itself.

## Deployment Notes

- Production build outputs must exist in `dist/server.js`, `dist/index.js`, and `dist/frontend`.
- The frontend should use same-origin API calls in deployment unless `VITE_API_BASE` is explicitly set.
- Docker and Nosana should expose `3001`, while Eliza remains internal on `3000`.

## Security Notes

- Never commit live secrets from `.env`.
- Rotate any leaked API keys immediately.
- Be careful when editing `.dockerignore` so required build files are not excluded.

## Testing Notes

- `npm test` is the primary verification command in this repo.
- The `src/__tests__/e2e` folder is inherited runtime-integration scaffolding and is not the main browser E2E harness.
- If you modify build output locations, re-check build-order tests.
