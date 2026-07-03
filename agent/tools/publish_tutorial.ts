import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  ensureTopicRepo,
  publishFileToGithub,
  topicToRepoName,
} from "#lib/github.js";

/** Best-effort local checkpoint so content survives a crash mid-publish. */
async function checkpointDraft(repoName: string, body: string): Promise<void> {
  try {
    const dir = process.env.VERCEL
      ? join(tmpdir(), "eve-drafts")
      : join(process.cwd(), ".eve", "drafts");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${repoName}.md`), body);
  } catch {
    // Checkpointing must never block publishing.
  }
}

export default defineTool({
  description:
    "Create a topic-specific GitHub repo under meleantonio (if needed) and publish the tutorial as README.md.",
  inputSchema: z.object({
    topic: z
      .string()
      .describe(
        "Tutorial topic used to derive the repo name, e.g. 'LLM-assisted causal coding'",
      ),
    title: z.string(),
    content: z.string().describe("Full Markdown tutorial body (without title)"),
    repo_description: z
      .string()
      .optional()
      .describe("Short GitHub repo description; defaults to the title"),
    commit_message: z.string().optional(),
  }),
  async execute({ topic, title, content, repo_description, commit_message }) {
    const repoName = topicToRepoName(topic);
    const body = `# ${title}\n\n${content}`;
    await checkpointDraft(repoName, body);

    const { owner, repo, created, url } = await ensureTopicRepo({
      topic,
      description:
        repo_description ??
        `Econ AI tutorial: ${title}`.slice(0, 350),
    });
    const result = await publishFileToGithub({
      owner,
      repo,
      path: "README.md",
      content: body,
      message: commit_message ?? (created ? `Init tutorial: ${title}` : `Update tutorial: ${title}`),
    });

    return {
      repo: `${owner}/${repo}`,
      repo_name: repoName,
      repo_url: url,
      tutorial_url: `${url}/blob/main/README.md`,
      created,
      sha: result.commit.sha,
    };
  },
});
