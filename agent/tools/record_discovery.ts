import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineTool } from "eve/tools";
import { z } from "zod";

const LOG_PATH = join(process.cwd(), ".eve", "discoveries.json");

type DiscoveryEntry = {
  title: string;
  url: string;
  category: string;
  relevance_score: number;
  notes?: string;
  recorded_at: string;
};

export default defineTool({
  description:
    "Record a discovered AI technique to avoid duplicate tutorials across runs.",
  inputSchema: z.object({
    title: z.string(),
    url: z.string().url(),
    category: z.string(),
    relevance_score: z.number().min(1).max(10),
    notes: z.string().optional(),
  }),
  async execute(entry) {
    await mkdir(join(process.cwd(), ".eve"), { recursive: true });

    let log: DiscoveryEntry[] = [];
    try {
      log = JSON.parse(await readFile(LOG_PATH, "utf-8")) as DiscoveryEntry[];
    } catch {
      /* first run */
    }

    const duplicate = log.some((d) => d.url === entry.url);
    if (!duplicate) {
      log.push({ ...entry, recorded_at: new Date().toISOString() });
      await writeFile(LOG_PATH, JSON.stringify(log, null, 2));
    }

    return { recorded: !duplicate, total: log.length, duplicate };
  },
});
