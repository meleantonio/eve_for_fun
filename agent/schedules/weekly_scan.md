---
cron: "0 8 * * 1"
---

Run the weekly AI-for-economics scan:

1. Load the `web_research` skill.
2. Search for new AI techniques from the past 7 days relevant to economic research
   (causal inference, NLP, forecasting, data extraction, survey design, reproducible workflows).
3. For each promising find, check the durable discovery log via `record_discovery` intent
   (technique-family dedup). Skip near-duplicates.
4. Delegate to `research` for a brief assessment. **Score must be 0** unless there is a
   real dataset, a runnable primary source, and no near-duplicate family.
5. Publish **at most one** tutorial this week. If nothing scores above 0 / clears the
   fail-closed contract, publish **zero**. Do not pad thin weeks.
6. Load `econ_research_tutorial`, delegate drafting to `writer`, `save_draft`, then
   `publish_tutorial` (README + tutorial.py + requirements.txt + named data source).
7. Near-match slug → update the existing repo; never mint another goal-loop clone.
8. Summarize what you found and published (or explicitly: published nothing, and why).
