import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Investigate a single AI technique: sources, reproducibility, econ use cases, risks.",
  model: "openai/gpt-5.4-mini",
});
