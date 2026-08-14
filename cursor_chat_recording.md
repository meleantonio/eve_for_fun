# Cursor Chat Recording

## Session: 2026-07-01 — Build Eve agent for AI tricks & economic research tutorials

### User request
Use the agents' docs at https://vercel.com/eve to build an eve agent that scans the web for new AI tricks that could be useful for economic research, and builds tutorials on my github account about how to use these tricks.

### Agent actions
- Researched Vercel Eve framework documentation (vercel.com/eve, eve.dev/docs)
- Installed Node 24 via Homebrew (Eve requires Node >=24)
- Ran `npx eve@latest init .` to scaffold project
- Applied Econ AI Scout agent: instructions, GitHub connection, weekly schedule, skills, tools, subagents

### Deploy to Vercel
- User authenticated Vercel CLI as `meleantonio`
- Linked project: `antonio-meles-projects/eve_for_fun`
- Production deploy: https://eveforfun.vercel.app
- Weekly cron registered; health check returns 200
- Added `GITHUB_TOKEN` and `GITHUB_OWNER` to Vercel production; redeployed
- Copied all project env vars into `.env.local` for local dev


### Fix: Connector not found github/github (2026-07-02)
- User reported eve error "Connector not found: github/github" despite GITHUB_TOKEN in `.env.local`
- Root cause: `agent/connections/github.ts` used Vercel Connect (`connect({ connector: "github/github" })`), not `GITHUB_TOKEN`
- Fix: switched connection auth to `getToken` reading `process.env.GITHUB_TOKEN` (same as `publish_tutorial`)

## Session: 2026-07-03 — Update GITHUB PAT on Vercel

### User request
Add the new GitHub PAT token to Vercel environment variables.

### Agent actions
- Read new `GITHUB_TOKEN` from `.env.local` (fine-grained PAT for `meleantonio` account)
- Updated Vercel project `antonio-meles-projects/eve_for_fun`:
  - **Production**: `GITHUB_TOKEN` (sensitive) via `vercel env add`
  - **Development**: `GITHUB_TOKEN` (encrypted) via `vercel env add`
  - **Preview**: `GITHUB_TOKEN` (sensitive, all branches) via Vercel REST API (CLI preview bug workaround)
- Verified all three environments have `GITHUB_TOKEN` configured

## Session: 2026-07-03 — Fix agent crashing before pushing tutorials to GitHub

### User request
The agent keeps crashing before pushing the tutorial to GitHub, then starts a new session
with cleared context, wasting tokens with no repo or saved content at the end.

### Diagnosis
- Dev terminal log showed the crash: `⨯ Error: fetch failed` right at publish time, followed
  by "Session ended — started a new session. Earlier context was cleared."
- Root cause 1: `agent/connections/github.ts` pointed at GitHub's full OpenAPI spec — a
  12.6 MB runtime download with ~1000 operations. Fetching it is slow and fragile, and the
  agent was hand-rolling publishing through it (base64 + create-or-update-file) instead of
  using `publish_tutorial`.
- Root cause 2: no retries/timeouts on GitHub API calls, so one transient network failure
  killed the session.
- Root cause 3: tutorial content lived only in model context, so a crash lost everything.

### Fixes
- `agent/connections/github.ts`: replaced the 12.6 MB remote spec with a minimal inline
  OpenAPI spec (get user, get/update repo, get/put file contents, create issue).
- `agent/lib/github.ts`: added `githubFetch` with a 30s timeout and up to 3 retries with
  exponential backoff on network errors, 429, and 5xx; all GitHub calls now use it.
- New tool `agent/tools/save_draft.ts`: checkpoints the finished draft to `.eve/drafts/`
  (or `/tmp/eve-drafts` on Vercel) so content survives a crash.
- `agent/tools/publish_tutorial.ts`: also checkpoints the draft to disk before pushing.
- `agent/instructions.md`: mandated save_draft → publish_tutorial immediately after
  drafting; forbade publishing via the raw `github` connection; on error, retry the tool
  instead of regenerating the tutorial.
- `npm run typecheck` passes.

## Session: 2026-07-03 — Debug mode: root-cause the "fetch failed" session crash

### User request
Same "fetch failed" crash reproduced after the first round of fixes; debug with runtime
evidence, then clean up instrumentation once fixed.

### Diagnosis (runtime evidence)
- Instrumented global fetch + process lifecycle in every Node process (agent.ts wrapper,
  then a NODE_OPTIONS preload) and logged to a debug session file.
- Found the eve dev server process was 2 hours old: Ctrl+C only killed the TUI client; new
  `npm run dev` invocations re-attached to the same stale background server (port 2000),
  which had 654 MB RSS and two orphaned 1 GB microsandbox VMs.
- Final run's logs showed the real network failures: ECONNRESET on outbound MCP endpoints
  (mcp.notion.com, mcp.linear.app) inside the eve dev process — transient upstream resets
  that eve dev treated as fatal, ending the session and clearing context.
- The GitHub publishing path was healthy after round-1 fixes: `publish_tutorial` succeeded
  twice during debugging (repos `econ-ai-claude-goal-loop-econ-research`,
  `econ-ai-goal-for-economic-research`).

### Resolution
- Killed the stale dev server and orphaned sandbox VMs; a fresh `npm run dev` completed the
  tutorial run cleanly and the user confirmed the issue fixed.
- Kept the round-1 hardening (inline GitHub spec, retries, save_draft checkpointing) —
  it made crashed runs recoverable: the follow-up session republished from the draft.
- Removed all debug instrumentation (agent.ts wrapper, preload script, tool log calls);
  typecheck passes.
- Note for the future: if "fetch failed" reappears, fully stop the stale dev server
  (check `lsof -ti tcp:2000`) instead of only Ctrl+C-ing the TUI.

## 2026-08-14 — Make eve_for_fun stop producing dull economics tutorials

### User request
Diagnose and fix the tutorial generator so it stops producing dull heading-stamped economics tutorials. Replace 8-section template with fail-closed contract; fix writer/research/dedup/publish/evals; open PR.

### What was dull
- 8-section heading stamp in `econ_research_tutorial.md`
- Writer allowed “pseudo-application” → fake policy_report.pdf / y~x1+x2
- Research scored 1–10 on hypothetical use cases, not one real object
- URL-only dedup; discoveries.json ephemeral on Vercel → goal-loop clone repos
- publish_tutorial wrote only README.md; weekly_scan forced top 1–2 filler

### Implemented
- Fail-closed RELAI contract + publish rejection (`evals/tutorial_contract.ts`)
- Technique-family dedup + GitHub-backed discovery log
- publish_tutorial writes README + tutorial.py + requirements.txt + DATA_SOURCE.md
- Gold example: `examples/gold/alfred-payroll-revisions/`
- `npm test` gates for old template / toy OLS / no URL / no wrong number / draft-voice
