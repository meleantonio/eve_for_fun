---
description: Write and publish fail-closed econ AI tutorials (RELAI, not an 8-heading stamp).
---

# Fail-closed tutorial contract

Do **not** use the old template (Overview → Why economists should care → Prerequisites →
The technique in plain language → Step-by-step → Econ use case walkthrough → Pitfalls →
References). That stamp produces dull clones.

Every public tutorial **must** contain these sections as real `##` headings:

## Named object
Name one concrete empirical object (dataset, series, PDF, API endpoint, replication file).
No “earnings calls in general.” No `policy_report.pdf`.

## Stake
What decision or claim hangs on the number? One short paragraph.

## Naive path
Show the obvious approach that **fails with a wrong number**. State the wrong number
explicitly. Verification over generation.

## Technique
Teach the method against that failure. Code lives in `tutorial.py` (not only fenced blocks).

## You will get this wrong
List the failure modes economists hit in the first week. Be specific.

## Controversy
Where do applied researchers disagree about this tool or identification?

Also make **RELAI** visible in the README (not as fluff labels — as work the reader does):

1. **Examine** the named object
2. **eXplain** the stake and the wrong number
3. **Probe** assumptions / fragility
4. **Link to economics** (estimator, institution, or literature object)
5. **Output prediction** before running
6. **Recreate** via `python tutorial.py`
7. **Extend** with a harder variant (left as exercises, not “If you want, I can also…”)

Tone: LSE applied seminar. AI is tutor, not ghostwriter. Economists should organise and
read code, not receive an edtech brochure.

# Banned

- `or pseudo-application`
- `policy_report.pdf`, `y ~ x1 + x2`, synthetic `x1`/`x2` demos
- `NotImplementedError`, `generate.sh` as the demo
- Draft-voice closers: “If you want, I can also…”
- One-technique-many-repos (goal-loop clones, etc.)

# Publish

After drafting, call `save_draft`, then `publish_tutorial` with:

- `topic` — technique phrase (repo slug); near-match slugs **update** the existing repo
- `title`, `content` — README body under the contract headings
- `tutorial_py` — runnable smoke entry (`if __name__ == "__main__"`)
- `requirements_txt`
- `data_source_name`, `data_source_url` — must appear in `tutorial.py`

The tool writes `README.md`, `tutorial.py`, `requirements.txt`, and `DATA_SOURCE.md`.
It **rejects** drafts that fail `evals/tutorial_contract.ts`.

See `examples/gold/alfred-payroll-revisions/` for the in-repo gold standard.
