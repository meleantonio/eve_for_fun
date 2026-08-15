# Econ AI Scout

A [Vercel Eve](https://vercel.com/eve) agent that scans the web for new AI techniques
useful in economic research and publishes **fail-closed** tutorials to GitHub.

## What changed (anti-dull)

The generator used to stamp an 8-section brochure (Overview → … → References) and mint
near-duplicate repos (`econ-ai-goal-loop-*`). It now refuses to publish unless the draft
names a real empirical object, shows a naive path that fails with a **wrong number**,
exposes RELAI, and ships `tutorial.py` + `requirements.txt` + `DATA_SOURCE.md`.

Weekly scan: **at most one** tutorial; **zero** if nothing clears the bar.

## What it does

- **Weekly scan** (Mondays 08:00 UTC): search → research (score 0 unless real data + runnable source + not a near-duplicate) → optional publish
- **Durable discovery log**: GitHub-backed (`meleantonio/econ-ai-scout-log` by default), not ephemeral Vercel cwd
- **Technique-family dedup**: near-match slugs update the existing repo instead of cloning
- **Contract gates**: `evals/tutorial_contract.ts` (enforced in `publish_tutorial`)
- **Gold example**: `examples/gold/alfred-payroll-revisions/`

## Prerequisites

- Node.js 24+
- A model credential (`AI_GATEWAY_API_KEY` or `vercel link` + OIDC)
- A GitHub fine-grained PAT with **Contents: Read and write** and **Administration: Read and write** (to create repos)
- (Production) Vercel Connect for GitHub

## Quick start

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
cp .env.example .env
# Edit .env with your keys

npm run dev
```

In another terminal, trigger the weekly scan without waiting for Monday:

```bash
curl -X POST http://localhost:3000/eve/v1/dev/schedules/weekly_scan
```

Or chat directly:

```bash
curl -X POST http://127.0.0.1:3000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Find one new AI trick for causal inference research and draft a tutorial."}'
```

## Tests

```bash
npm test          # fail-closed contract + technique-family dedup
npm run test:gold # smoke the gold tutorial.py
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_GATEWAY_API_KEY` | Yes* | Vercel AI Gateway key for model calls |
| `GITHUB_TOKEN` | Yes | Fine-grained PAT with repo create + contents write |
| `GITHUB_OWNER` | No | GitHub username (default: `meleantonio`) |
| `GITHUB_REPO_PREFIX` | No | Repo name prefix (default: `econ-ai-`) |
| `DISCOVERY_LOG_REPO` | No | Durable discovery log repo (default: `econ-ai-scout-log`) |
| `DISCOVERY_LOG_PATH` | No | File path inside that repo (default: `discoveries.json`) |

Repo naming: topic `"ALFRED payroll vintages"` → `meleantonio/econ-ai-alfred-payroll-vintages`
(near-match → update existing family repo instead).

\* Or use `vercel link` and `vercel env pull` for OIDC on Vercel.

## GitHub setup

1. Generate a fine-grained PAT for account **meleantonio** with:
   - **Contents**: Read and write
   - **Administration**: Read and write (required to create repos)
2. Set `GITHUB_TOKEN=ghp_...` in `.env`.

Each **distinct technique family** gets a repo under `econ-ai-*`. Existing Antonio tutorial
repos are left alone unless a near-match update intentionally targets them. Do not touch
`AC4E_EIEF_Luiss` or `mrkfrm-chks`.

For production with Vercel Connect (recommended for scheduled runs):

```bash
vercel link
vercel connect create github --name github
vercel connect attach <connector-uid> --yes
vercel env pull
```

## Deploy

```bash
vercel deploy
```

The weekly schedule registers as a Vercel Cron Job automatically.

## Project layout

```text
agent/
├── instructions.md          # Scout persona (fail-closed)
├── skills/                  # web_research + econ_research_tutorial (RELAI contract)
├── tools/                   # publish_tutorial, record_discovery, save_draft
├── subagents/               # research + writer
└── lib/                     # github, discoveries, technique_family
evals/
├── tutorial_contract.ts     # publish-time gates
├── tutorial_contract.test.ts
└── fixtures/                # known-bad drafts the gates must reject
examples/gold/               # one in-repo gold tutorial
```

## Docs

- [Eve documentation](https://eve.dev/docs)
- Bundled docs: `node_modules/eve/docs/` after install
