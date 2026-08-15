import { defineTool } from "eve/tools";
import { z } from "zod";
import { recordDiscovery } from "#lib/discoveries.js";
import { techniqueFamily } from "#lib/technique_family.js";

export default defineTool({
  description:
    "Record a discovered AI technique to the durable discovery log (GitHub-backed). Dedupes by URL and technique family so near-duplicate tutorials are not minted.",
  inputSchema: z.object({
    title: z.string(),
    url: z.string().url(),
    category: z.string(),
    relevance_score: z
      .number()
      .min(0)
      .max(10)
      .describe(
        "0 unless real dataset + runnable primary source + not a near-duplicate; otherwise 1–10.",
      ),
    notes: z.string().optional(),
    primary_source_url: z
      .string()
      .url()
      .optional()
      .describe("Runnable primary source (paper PDF, docs, or repo) when score > 0"),
    dataset_name: z
      .string()
      .optional()
      .describe("Named real dataset/object required when score > 0"),
    technique_family: z
      .string()
      .optional()
      .describe("Optional override; defaults to normalized family from title"),
  }),
  async execute(entry) {
    const family = entry.technique_family?.trim() || techniqueFamily(entry.title);

    if (entry.relevance_score > 0) {
      if (!entry.dataset_name?.trim() || !entry.primary_source_url) {
        return {
          recorded: false,
          duplicate: false,
          near_duplicate: false,
          technique_family: family,
          total: 0,
          durable: false,
          reason:
            "score>0 requires dataset_name + primary_source_url; use score 0 to log a reject",
        };
      }
    }

    return recordDiscovery({
      ...entry,
      technique_family: family,
    });
  },
});
