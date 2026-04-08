import { Link } from "react-router-dom";

const overviewCards = [
  {
    title: "Product",
    text: "AuditMind AI is a Solidity security copilot that combines deterministic rule checks with ElizaOS and Qwen-backed reasoning to turn raw contract code into a structured review workspace."
  },
  {
    title: "Runtime",
    text: "The app runs as a React frontend, an Express backend, and an internal ElizaOS runtime. The backend owns contract resolution, scoring, report assembly, and source-status tracking."
  },
  {
    title: "Deployment",
    text: "The repository includes Docker packaging and a Nosana deployment template so the full stack can run as one container with the frontend served by the backend."
  }
];

const journeySteps = [
  {
    title: "1. Choose a source",
    text: "The user starts in the Analyzer and submits Solidity through pasted code, uploaded files, a public GitHub URL, or a verified contract address."
  },
  {
    title: "2. Resolve the Solidity",
    text: "The backend normalizes the input into one Solidity payload. Upload and GitHub modes can bundle multiple files; address mode resolves verified source through Sourcify."
  },
  {
    title: "3. Run deterministic checks",
    text: "Rule checks detect features, high-signal flags, and rule-generated risks before any AI reasoning is attempted."
  },
  {
    title: "4. Ask the AI layer",
    text: "The backend builds a strict JSON prompt, tries Eliza first, falls back to direct Qwen if needed, and degrades to rule-only mode if both are unavailable."
  },
  {
    title: "5. Merge and score",
    text: "Rule findings and agent findings are merged into one risk list, scored, converted into a verdict, and expanded into readable reasoning and recommendations."
  },
  {
    title: "6. Render the workspace",
    text: "The frontend shows the final report across summary, risks, recommendations, source, evidence, auto-fix, and admin-power views, then stores history locally."
  }
];

const frontendPages = [
  ["Home", "Landing page that explains the product direction, major capabilities, and entry points into the workspace."],
  ["Auth", "Local-only sign-in and sign-up flow for now, with browser-persisted accounts and provider-style Google/GitHub buttons."],
  ["Analyze", "The main security workspace with input modes, risk score, report tabs, exports, tooling status, and report persistence."],
  ["History", "Shows previous analysis runs stored locally."],
  ["Saved Reports", "Stores user-saved reports separately from the raw history feed."],
  ["Compare", "Lets the user compare two saved or historical analyses side by side."],
  ["Settings", "Controls local preferences like confidence filtering, auto-save, display behavior, and analysis profile selection."],
  ["About", "A short architecture summary page."],
  ["Docs", "The new top-to-bottom in-app documentation page for the project."],
];

const backendFlow = [
  ["src/server.ts", "Starts the Express server, exposes `/health`, `/api/tooling-status`, `/api/analyze`, and serves the built frontend in production."],
  ["src/backend/routes/analyze.ts", "Accepts analysis requests, resolves the contract source, validates it, and forwards it into the analyzer."],
  ["src/backend/services/inputResolver.ts", "Routes source resolution through code, upload, GitHub, or address fetchers."],
  ["src/backend/services/analyzer.ts", "Runs the rule pass, builds the prompt, merges AI output, computes score/verdict, and shapes the final report."],
  ["src/backend/services/agentAnalyzer.ts", "Owns provider selection and failover: Eliza first, Qwen second, fallback last."],
  ["src/backend/services/elizaAgent.ts", "Talks to the Eliza API, including session-based messaging flows."],
  ["src/backend/services/qwenClient.ts", "Calls the direct Qwen-compatible endpoint when Eliza is unavailable or fails."],
  ["src/backend/services/promptBuilder.ts", "Builds the strict JSON prompt used for smart contract analysis."],
  ["src/backend/utils/ruleChecks.ts", "Detects Solidity features, flags, rule risks, and fallback summaries."],
];

const inputModes = [
  ["Paste Code", "Fastest local analysis path for a single Solidity snippet or contract file."],
  ["Upload Files", "Supports single-file and multi-file upload flows, including local folder selection in the browser."],
  ["GitHub Link", "Resolves public GitHub repo, tree, blob, or raw file URLs and fetches Solidity sources."],
  ["Contract Address", "Fetches verified source via Sourcify before analysis."],
  ["Repo Scan", "UI mode aimed at repo-level GitHub scanning using the same backend GitHub resolver path."],
];

const outputViews = [
  ["Summary", "Displays the contract summary and the merged reasoning narrative."],
  ["Risks", "Lists severity-ranked issues with confidence and suggestions."],
  ["Recommendations", "Shows the top remediation priorities."],
  ["Agent Reasoning", "Breaks the reasoning into overview-style sections and points."],
  ["Source", "Shows whether validation, rule engine, Eliza, and Qwen were used."],
  ["Evidence", "Maps findings to likely lines and code snippets where possible."],
  ["Auto-Fix", "Generates patch-style guidance for matching findings."],
  ["Admin Powers", "Summarizes privileged or high-trust behaviors such as owner controls and destructive actions."],
];

const runtimeFacts = [
  "Port 3000 is used by the Eliza runtime.",
  "Port 3001 is used by the AuditMind backend and the production-served frontend.",
  "Port 5173 is used by the Vite frontend in development.",
  "Local auth, history, saved reports, compare state, and settings are persisted in browser storage through Zustand.",
  "Eliza runtime data is stored through PGlite using the configured `PGLITE_DATA_DIR` path.",
  "The frontend is same-origin ready for deployment and can call backend routes without hardcoded localhost URLs when built."
];

const commands = [
  ["npm install", "Install dependencies."],
  ["npm run dev", "Start the Eliza development runtime."],
  ["npm run backend", "Run the AuditMind backend from TypeScript in development."],
  ["npm run frontend", "Run the Vite frontend."],
  ["npm run type-check", "Run TypeScript verification."],
  ["npm run build", "Build the frontend, backend, and Eliza runtime artifacts."],
  ["npm test", "Run the full test suite."],
];

const deploymentNotes = [
  "The Docker image starts both the Eliza runtime and the AuditMind backend through `scripts/start-auditmind.sh`.",
  "The built frontend is served from `dist/frontend` by `src/server.ts`.",
  "The compiled backend entrypoint is `dist/server.js`.",
  "For Nosana deployment, expose only port `3001` and keep Eliza internal on `3000`.",
  "Use `nosana-deployment.template.json` as the deployment template and replace the image, market address, and secret placeholders.",
];

const fileGroups = [
  {
    title: "Frontend",
    items: [
      "src/frontend/App.jsx",
      "src/frontend/components/Layout.jsx",
      "src/frontend/pages/*",
      "src/frontend/services/api.js",
      "src/frontend/store/useStore.js",
      "src/frontend/dashboard.css",
    ],
  },
  {
    title: "Backend",
    items: [
      "src/server.ts",
      "src/backend/routes/analyze.ts",
      "src/backend/services/*",
      "src/backend/utils/*",
      "src/backend/types/*",
    ],
  },
  {
    title: "Eliza Layer",
    items: [
      "src/index.ts",
      "src/character.ts",
      "src/plugin.ts",
    ],
  },
  {
    title: "Build and Deployment",
    items: [
      "build.ts",
      "Dockerfile",
      "scripts/start-auditmind.sh",
      "nosana-deployment.template.json",
      "vite.config.ts",
    ],
  },
  {
    title: "Samples and Docs",
    items: [
      "sample-contracts/*",
      "docs/agent-workflow.md",
      "README.md",
      "idea.md",
      "CLAUDE.md",
    ],
  },
];

const constraints = [
  "Local auth is browser-persisted and not server-backed yet.",
  "GitHub analysis currently supports public GitHub URLs only.",
  "Contract address analysis depends on verified Sourcify metadata.",
  "Line-level evidence and auto-fix output are heuristic helpers, not a replacement for manual audit review.",
  "The Eliza starter plugin still exists in the repo for runtime/test compatibility even though AuditMind's product logic lives in the custom backend and frontend.",
];

function SectionCard({ title, text }) {
  return (
    <article className="am-card am-section-card am-docs-card">
      <h2 className="am-section-title">{title}</h2>
      <p className="am-muted">{text}</p>
    </article>
  );
}

export default function Docs() {
  return (
    <div className="am-stack">
      <section className="am-card am-hero-card">
        <div className="am-docs-hero">
          <div>
            <div className="am-chip" style={{ marginBottom: 16 }}>
              In-app project documentation
            </div>
            <h1 className="am-page-title">
              AuditMind <span>Project Docs</span>
            </h1>
            <p className="am-subtitle">
              This page explains the project from top to bottom: what the product is, how the UI is
              organized, how the backend and agent pipeline work, what data flows through the system,
              and how the app is built and deployed.
            </p>
            <div className="am-input-actions" style={{ marginTop: 22 }}>
              <Link className="am-primary-btn am-link-btn" to="/analyze">
                Open Analyzer
              </Link>
              <Link className="am-secondary-btn am-link-btn" to="/settings">
                Open Settings
              </Link>
            </div>
          </div>

          <div className="am-card am-landing-card">
            <div className="am-section-title">At a glance</div>
            <div className="am-list-item">Full-stack Solidity security workspace with AI plus deterministic checks.</div>
            <div className="am-list-item">Frontend, backend, Eliza runtime, and deployment assets live in one repo.</div>
            <div className="am-list-item">Multiple source-ingestion modes feed one unified analysis pipeline.</div>
            <div className="am-list-item">Report output is designed for both beginners and technical reviewers.</div>
          </div>
        </div>
      </section>

      <section className="am-three-col">
        {overviewCards.map((card) => (
          <SectionCard key={card.title} title={card.title} text={card.text} />
        ))}
      </section>

      <section className="am-card am-section-card">
        <div className="am-section-header">
          <div>
            <h2 className="am-section-title">End-to-end product flow</h2>
            <p className="am-muted">
              This is the main user journey from input all the way to report output and local persistence.
            </p>
          </div>
        </div>
        <div className="am-docs-flow-grid">
          {journeySteps.map((step) => (
            <div key={step.title} className="am-list-item am-docs-flow-item">
              <strong>{step.title}</strong>
              <p className="am-muted" style={{ marginTop: 10 }}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="am-two-col">
        <section className="am-card am-section-card">
          <h2 className="am-section-title">Frontend surface</h2>
          {frontendPages.map(([title, text]) => (
            <div key={title} className="am-list-item">
              <strong>{title}</strong>
              <p className="am-muted" style={{ marginTop: 8 }}>{text}</p>
            </div>
          ))}
        </section>

        <section className="am-card am-section-card">
          <h2 className="am-section-title">Analysis inputs and report outputs</h2>
          <div className="am-docs-subsection">
            <strong className="am-docs-mini-title">Input modes</strong>
            {inputModes.map(([title, text]) => (
              <div key={title} className="am-list-item">
                <strong>{title}</strong>
                <p className="am-muted" style={{ marginTop: 8 }}>{text}</p>
              </div>
            ))}
          </div>
          <div className="am-docs-subsection">
            <strong className="am-docs-mini-title">Output tabs</strong>
            {outputViews.map(([title, text]) => (
              <div key={title} className="am-list-item">
                <strong>{title}</strong>
                <p className="am-muted" style={{ marginTop: 8 }}>{text}</p>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="am-card am-section-card">
        <div className="am-section-header">
          <div>
            <h2 className="am-section-title">Backend and agent pipeline</h2>
            <p className="am-muted">
              These files form the contract-analysis core of the application.
            </p>
          </div>
        </div>
        <div className="am-docs-timeline">
          {backendFlow.map(([title, text]) => (
            <div key={title} className="am-docs-timeline-row">
              <div className="am-docs-timeline-title">{title}</div>
              <div className="am-docs-timeline-body">{text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="am-two-col">
        <section className="am-card am-section-card">
          <h2 className="am-section-title">Runtime, storage, and environment</h2>
          {runtimeFacts.map((item) => (
            <div key={item} className="am-list-item">{item}</div>
          ))}
        </section>

        <section className="am-card am-section-card">
          <h2 className="am-section-title">Current constraints and honesty notes</h2>
          {constraints.map((item) => (
            <div key={item} className="am-list-item">{item}</div>
          ))}
        </section>
      </section>

      <section className="am-two-col">
        <section className="am-card am-section-card">
          <h2 className="am-section-title">Commands used during development</h2>
          {commands.map(([command, text]) => (
            <div key={command} className="am-list-item">
              <strong>{command}</strong>
              <p className="am-muted" style={{ marginTop: 8 }}>{text}</p>
            </div>
          ))}
          <pre className="am-code-diff">{`npm install
npm run dev
npm run backend
npm run frontend
npm run type-check
npm run build
npm test`}</pre>
        </section>

        <section className="am-card am-section-card">
          <h2 className="am-section-title">Build and deployment path</h2>
          {deploymentNotes.map((item) => (
            <div key={item} className="am-list-item">{item}</div>
          ))}
          <pre className="am-code-diff">{`docker build -t YOUR_REGISTRY_USERNAME/auditmind:latest .
docker push YOUR_REGISTRY_USERNAME/auditmind:latest`}</pre>
        </section>
      </section>

      <section className="am-card am-section-card">
        <h2 className="am-section-title">Project map by folder and responsibility</h2>
        <div className="am-docs-file-grid">
          {fileGroups.map((group) => (
            <div key={group.title} className="am-list-item am-docs-file-group">
              <strong>{group.title}</strong>
              <ul className="am-structured-list">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
