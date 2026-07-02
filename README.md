# Econ AI Scout

A [Vercel Eve](https://vercel.com/eve) agent that scans the web for new AI techniques
useful in economic research and publishes tutorials to your GitHub account.

## What it does

- **Weekly scan** (Mondays 08:00 UTC): searches for recent AI tricks relevant to economists
- **Research subagent**: evaluates reproducibility, use cases, and risks
- **Writer subagent**: drafts runnable tutorials with Python examples
- **GitHub publishing**: creates one repo per topic under `meleantonio/econ-ai-<topic-slug>`

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

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_GATEWAY_API_KEY` | Yes* | Vercel AI Gateway key for model calls |
| `GITHUB_TOKEN` | Yes | Fine-grained PAT with repo create + contents write |
| `GITHUB_OWNER` | No | GitHub username (default: `meleantonio`) |
| `GITHUB_REPO_PREFIX` | No | Repo name prefix (default: `econ-ai-`) |

Repo naming: topic `"LLM causal coding"` → `meleantonio/econ-ai-llm-causal-coding`

\* Or use `vercel link` and `vercel env pull` for OIDC on Vercel.

## GitHub setup

1. Generate a fine-grained PAT for account **meleantonio** with:
   - **Contents**: Read and write
   - **Administration**: Read and write (required to create repos)
2. Set `GITHUB_TOKEN=ghp_...` in `.env`.

Each tutorial topic automatically gets its own repo, e.g.
`https://github.com/meleantonio/econ-ai-structured-pdf-extraction`.

For production with Vercel Connect (recommended for scheduled runs):

```bash
vercel link
vercel connect create github --name github
vercel connect attach <connector-uid> --yes
vercel env pull
```

The `agent/connections/github.ts` connection uses app-scoped auth so cron jobs work without a logged-in user.

## Deploy

```bash
vercel deploy
```

The weekly schedule registers as a Vercel Cron Job automatically.

## Project layout

```text
agent/
├── instructions.md          # Scout persona and workflow
├── agent.ts                 # Model config
├── connections/github.ts    # GitHub OpenAPI via Vercel Connect
├── schedules/weekly_scan.md # Monday morning cron
├── skills/                  # Web research and tutorial writing playbooks
├── tools/                   # publish_tutorial, record_discovery
├── subagents/               # research + writer specialists
└── lib/github.ts            # GitHub REST helpers
```

Tutorials are published as `README.md` in topic-specific repos: `meleantonio/econ-ai-<slug>`.

## Docs

- [Eve documentation](https://eve.dev/docs)
- Bundled docs: `node_modules/eve/docs/` after install
