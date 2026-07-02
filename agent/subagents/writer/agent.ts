import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Write polished, runnable econ-focused AI tutorials from research briefs.",
  model: "openai/gpt-5.4-mini",
});
