import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { topicToRepoName } from "#lib/github.js";

function draftsDir(): string {
  // Vercel's runtime filesystem is read-only outside /tmp.
  return process.env.VERCEL
    ? join(tmpdir(), "eve-drafts")
    : join(process.cwd(), ".eve", "drafts");
}

export default defineTool({
  description:
    "Checkpoint a tutorial draft to local disk BEFORE publishing, so the content survives if the session crashes. Call this as soon as the draft is complete, then call publish_tutorial.",
  inputSchema: z.object({
    topic: z.string().describe("Same topic string you will pass to publish_tutorial"),
    title: z.string(),
    content: z.string().describe("Full Markdown tutorial body (without title)"),
  }),
  async execute({ topic, title, content }) {
    const dir = draftsDir();
    await mkdir(dir, { recursive: true });

    const path = join(dir, `${topicToRepoName(topic)}.md`);
    await writeFile(path, `# ${title}\n\n${content}`);

    return { saved: true, path };
  },
});
