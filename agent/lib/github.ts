const GITHUB_API = "https://api.github.com";

function githubHeaders(token: string, contentType = "application/json") {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Set GITHUB_TOKEN for GitHub publishing");
  }
  return token;
}

export function getGithubOwner(): string {
  return process.env.GITHUB_OWNER ?? "meleantonio";
}

const REPO_PREFIX = () => process.env.GITHUB_REPO_PREFIX ?? "econ-ai-";

/** Derive a GitHub repo name from a tutorial topic. */
export function topicToRepoName(topic: string): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const name = `${REPO_PREFIX()}${slug}`.replace(/-+/g, "-").replace(/-$/, "");
  return name.slice(0, 100);
}

export async function repoExists(owner: string, repo: string): Promise<boolean> {
  const token = getToken();
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: githubHeaders(token, ""),
  });
  if (res.status === 404) {
    return false;
  }
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  return true;
}

export async function createRepo(args: {
  owner: string;
  name: string;
  description: string;
  isPrivate?: boolean;
}): Promise<{ html_url: string; full_name: string }> {
  const token = getToken();
  const res = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify({
      name: args.name,
      description: args.description,
      private: args.isPrivate ?? false,
      auto_init: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub create repo ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { html_url: string; full_name: string };
  return data;
}

export async function ensureTopicRepo(args: {
  topic: string;
  description: string;
}): Promise<{ owner: string; repo: string; created: boolean; url: string }> {
  const owner = getGithubOwner();
  const repo = topicToRepoName(args.topic);
  const exists = await repoExists(owner, repo);

  if (!exists) {
    const created = await createRepo({
      owner,
      name: repo,
      description: args.description,
    });
    return { owner, repo, created: true, url: created.html_url };
  }

  return { owner, repo, created: false, url: `https://github.com/${owner}/${repo}` };
}

interface PublishArgs {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
}

export async function publishFileToGithub(args: PublishArgs) {
  const token = getToken();
  const branch = args.branch ?? "main";
  const apiBase = `${GITHUB_API}/repos/${args.owner}/${args.repo}`;

  const existing = await fetch(
    `${apiBase}/contents/${encodeURIComponent(args.path)}?ref=${branch}`,
    { headers: githubHeaders(token, "") },
  );

  let sha: string | undefined;
  if (existing.ok) {
    const data = (await existing.json()) as { sha: string };
    sha = data.sha;
  }

  const res = await fetch(`${apiBase}/contents/${encodeURIComponent(args.path)}`, {
    method: "PUT",
    headers: githubHeaders(token),
    body: JSON.stringify({
      message: args.message,
      content: Buffer.from(args.content).toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<{ commit: { sha: string } }>;
}
