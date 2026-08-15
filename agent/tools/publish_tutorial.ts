import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  ensureTopicRepo,
  publishFilesToGithub,
  resolveTopicRepo,
  topicToRepoName,
} from "#lib/github.js";
import { evaluateTutorialContract } from "#lib/tutorial_contract.js";

/** Best-effort local checkpoint so content survives a crash mid-publish. */
async function checkpointDraft(
  repoName: string,
  files: { path: string; content: string }[],
): Promise<void> {
  try {
    const dir = process.env.VERCEL
      ? join(tmpdir(), "eve-drafts", repoName)
      : join(process.cwd(), ".eve", "drafts", repoName);
    await mkdir(dir, { recursive: true });
    for (const file of files) {
      await writeFile(join(dir, file.path.replaceAll("/", "__")), file.content);
    }
  } catch {
    // Checkpointing must never block publishing.
  }
}

function buildDataSourceFile(name: string, url: string, notes?: string): string {
  return [
    `# Data source`,
    ``,
    `- **Name:** ${name}`,
    `- **URL:** ${url}`,
    notes ? `- **Notes:** ${notes}` : null,
    ``,
    `This tutorial must fetch or reference this object in \`tutorial.py\`. Do not substitute synthetic stand-ins.`,
    ``,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export default defineTool({
  description:
    "Publish a fail-closed econ AI tutorial to meleantonio: README.md + tutorial.py + requirements.txt + DATA_SOURCE.md. Rejects drafts that fail the tutorial contract (old template, toy OLS, draft-voice, missing wrong-number, etc.). Near-match slugs update the existing repo instead of minting a clone.",
  inputSchema: z.object({
    topic: z
      .string()
      .describe(
        "Tutorial topic used to derive the repo name, e.g. 'ALFRED payroll vintage revisions'",
      ),
    title: z.string(),
    content: z
      .string()
      .describe("Full Markdown tutorial body (without title). Must follow the fail-closed contract."),
    tutorial_py: z
      .string()
      .describe("Runnable Python tutorial with __main__ smoke entry and a real data URL."),
    requirements_txt: z
      .string()
      .describe("Pinned/minimum requirements for tutorial.py"),
    data_source_name: z.string().describe("Named real dataset, series, or document"),
    data_source_url: z.string().url().describe("Primary URL for the named data source"),
    data_source_notes: z.string().optional(),
    repo_description: z
      .string()
      .optional()
      .describe("Short GitHub repo description; defaults to the title"),
    commit_message: z.string().optional(),
    /** When true, skip creating a new repo if a near-match exists and only update. Default true. */
    update_near_match: z.boolean().optional(),
  }),
  async execute({
    topic,
    title,
    content,
    tutorial_py,
    requirements_txt,
    data_source_name,
    data_source_url,
    data_source_notes,
    repo_description,
    commit_message,
    update_near_match,
  }) {
    const readme = `# ${title}\n\n${content}`;
    const dataSourceMd = buildDataSourceFile(
      data_source_name,
      data_source_url,
      data_source_notes,
    );

    const contract = evaluateTutorialContract({
      readme,
      tutorialPy: tutorial_py,
      requirementsTxt: requirements_txt,
      dataSourceName: data_source_name,
      dataSourceUrl: data_source_url,
    });

    if (!contract.ok) {
      return {
        published: false,
        error: "tutorial_contract_failed",
        violations: contract.violations,
        hint: "Fix every violation before publishing. See evals/tutorial_contract.ts and examples/gold/.",
      };
    }

    const resolved = await resolveTopicRepo(topic);
    if (resolved.near_match && update_near_match === false) {
      return {
        published: false,
        error: "near_match_slug",
        near_match_of: resolved.near_match_of,
        created_name: resolved.created_name,
        hint: "A near-duplicate technique repo already exists. Set update_near_match=true to update it, or pick a genuinely new technique family.",
      };
    }

    const files = [
      { path: "README.md", content: readme },
      { path: "tutorial.py", content: tutorial_py },
      { path: "requirements.txt", content: requirements_txt },
      { path: "DATA_SOURCE.md", content: dataSourceMd },
    ];

    await checkpointDraft(resolved.repo, files);

    const { owner, repo, created, url, near_match, near_match_of } = await ensureTopicRepo({
      topic,
      repoName: resolved.repo,
      description:
        repo_description ?? `Econ AI tutorial: ${title}`.slice(0, 350),
    });

    const message =
      commit_message ??
      (created
        ? `Init tutorial: ${title}`
        : near_match
          ? `Update near-match tutorial: ${title}`
          : `Update tutorial: ${title}`);

    const result = await publishFilesToGithub({
      owner,
      repo,
      files,
      message,
    });

    return {
      published: true,
      repo: `${owner}/${repo}`,
      repo_name: repo,
      topic_slug: topicToRepoName(topic),
      repo_url: url,
      tutorial_url: `${url}/blob/main/README.md`,
      files: files.map((f) => f.path),
      created,
      near_match,
      near_match_of,
      sha: result.headSha,
      file_shas: result.shas,
      smoke: {
        command: "python tutorial.py",
        note: "Run after pip install -r requirements.txt; __main__ must exit 0.",
      },
    };
  },
});
