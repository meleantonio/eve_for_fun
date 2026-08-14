import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Investigate a single AI technique: runnable primary source, one named real dataset, near-duplicate check, fail-closed 0–10 score.",
  model: "openai/gpt-5.4-mini",
});
