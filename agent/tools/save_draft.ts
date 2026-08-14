import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { topicToRepoName } from "#lib/github.js";
import { evaluateTutorialContract } from "#evals/tutorial_contract.js";

function draftsDir(repoName: string): string {
  // Vercel's runtime filesystem is read-only outside /tmp.
  const root = process.env.VERCEL
    ? join(tmpdir(), "eve-drafts")
    : join(process.cwd(), ".eve", "drafts");
  return join(root, repoName);
}

export default defineTool({
  description:
    "Checkpoint a tutorial draft (README + tutorial.py + requirements + data source) BEFORE publishing. Runs the fail-closed contract and returns violations without publishing.",
  inputSchema: z.object({
    topic: z.string().describe("Same topic string you will pass to publish_tutorial"),
    title: z.string(),
    content: z.string().describe("Full Markdown tutorial body (without title)"),
    tutorial_py: z.string(),
    requirements_txt: z.string(),
    data_source_name: z.string(),
    data_source_url: z.string().url(),
  }),
  async execute({
    topic,
    title,
    content,
    tutorial_py,
    requirements_txt,
    data_source_name,
    data_source_url,
  }) {
    const repoName = topicToRepoName(topic);
    const dir = draftsDir(repoName);
    await mkdir(dir, { recursive: true });

    const readme = `# ${title}\n\n${content}`;
    await writeFile(join(dir, "README.md"), readme);
    await writeFile(join(dir, "tutorial.py"), tutorial_py);
    await writeFile(join(dir, "requirements.txt"), requirements_txt);
    await writeFile(
      join(dir, "DATA_SOURCE.md"),
      `# Data source\n\n- **Name:** ${data_source_name}\n- **URL:** ${data_source_url}\n`,
    );

    const contract = evaluateTutorialContract({
      readme,
      tutorialPy: tutorial_py,
      requirementsTxt: requirements_txt,
      dataSourceName: data_source_name,
      dataSourceUrl: data_source_url,
    });

    return {
      saved: true,
      path: dir,
      contract_ok: contract.ok,
      violations: contract.violations,
    };
  },
});
