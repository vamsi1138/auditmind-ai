# Eliza Runtime Integration Notes

This folder contains the inherited ElizaOS runtime-style integration suite for the project.

## What Is In Here

- `project-starter.e2e.ts`

That suite primarily verifies Eliza project wiring such as:

- runtime initialization
- character loading
- plugin registration
- action/provider availability
- service availability
- memory and connection smoke paths

## What It Is Not

This folder is not the main browser E2E surface for the AuditMind web app.

It does not directly cover:

- the React analyzer UI
- the Express `/api/analyze` contract-analysis route
- report rendering tabs such as Source, Evidence, Auto-Fix, or Admin Powers
- Nosana deployment behavior

## Current Test Reality In This Repo

The primary project verification path today is:

```bash
npm run type-check
npm run build
npm test
```

`npm test` currently exercises the Bun-based test suite used across:

- build-order integration
- project structure
- character and plugin checks
- route/provider/service tests

The runtime E2E file in this folder remains useful as reference and smoke coverage for the Eliza layer, but it is still starter-template-oriented in naming and scope.

## Important Note

`src/index.ts` currently exports the project agents only and does not register a `tests` array. That means this folder should be treated as runtime integration scaffolding, not the primary source of test execution for AuditMind.

## If You Extend This Area

Prefer adding coverage for real AuditMind concerns such as:

- agent/provider failover behavior
- Eliza availability detection
- backend source-analysis flags
- contract input resolution for GitHub, upload, and address modes
- report-assembly correctness
