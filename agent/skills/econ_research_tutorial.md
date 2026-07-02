---
description: Write and publish econ-focused AI tutorials to GitHub.
---

Tutorial template:

## Overview
## Why economists should care
## Prerequisites
## The technique in plain language
## Step-by-step (with code)
## Econ use case walkthrough
## Pitfalls and when not to use this
## References

After drafting, call `publish_tutorial` with:

- `topic` — a short phrase that identifies the technique (used to name the repo, e.g.
  "structured PDF extraction" → `meleantonio/econ-ai-structured-pdf-extraction`)
- `title` — the tutorial heading
- `content` — the full Markdown body (without the title)

Each topic gets its own public repo under **meleantonio**. Re-publishing the same topic
updates `README.md` in the existing repo.
