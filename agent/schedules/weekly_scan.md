---
cron: "0 8 * * 1"
---

Run the weekly AI-for-economics scan:

1. Load the `web_research` skill.
2. Search for new AI techniques from the past 7 days relevant to economic research
   (causal inference, NLP, forecasting, data extraction, survey design, reproducible workflows).
3. For each promising find not already in the discovery log, delegate to `research` for a brief assessment.
4. Pick the top 1–2 techniques worth a tutorial this week.
5. Load `econ_research_tutorial`, delegate drafting to `writer`, then publish via `publish_tutorial`.
6. Summarize what you found and published (repo name, URL, and commit SHA).
