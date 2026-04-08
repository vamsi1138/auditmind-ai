# AuditMind AI Product Brief And Roadmap

## Product Summary

AuditMind AI is a smart contract security copilot for Solidity projects. It is designed to help developers, learners, and reviewers understand contract behavior, detect high-signal security risks, and continue manual review with clearer evidence and recommendations.

## Current Product Scope

Shipped in the repository today:

- React frontend with dedicated pages for analysis, history, saved reports, compare, settings, about, and auth
- Express backend with `/api/analyze`, `/health`, and `/api/tooling-status`
- Input modes for pasted code, file upload, public GitHub URLs, and verified contract addresses
- Rule-based risk detection and verdict scoring
- Eliza-first AI orchestration with direct Qwen fallback
- Structured reporting with contract summary, risk list, reasoning, source status, and recommendations
- Local-only persistence for history, saved reports, compare state, settings, and auth session
- Docker packaging and a Nosana deployment template

## Core Users

- beginner Solidity developers
- indie builders shipping contracts without in-house audit teams
- students learning smart contract security
- reviewers who want a faster first-pass triage tool

## Value Proposition

AuditMind AI shortens the path from raw Solidity to a readable security review by combining:

- deterministic checks for obvious patterns
- AI reasoning for context and explanation
- beginner-friendly language
- developer-facing review priorities

## Roadmap Priorities

High-value next steps:

1. Line-level evidence mapping
2. True auto-fix diffs and patched snippets
3. Static-tool execution and ingestion for Slither/Foundry outputs
4. First-class repo scan mode beyond current GitHub/upload flows
5. Persistent user accounts and server-backed storage
6. Team-ready PDF and Markdown export flows
7. Stronger admin-power and trust-boundary dashboards

## Scope Guidance

Features that are clearly supported by current backend evidence:

- multi-file upload analysis
- public GitHub source analysis
- verified contract address analysis
- Eliza and Qwen source-status reporting

Features that still need deeper backend support to be fully product-grade:

- line-numbered evidence
- deterministic patch generation
- full repository scanning outside the existing resolver paths
- persistent authentication and cloud storage

## Success Criteria

AuditMind should help a user answer these questions quickly:

- What does this contract do?
- What are the main trust boundaries?
- Which issues matter most right now?
- Did the result come from rule-only analysis or from live AI endpoints?
- What should I check next before deploying?
