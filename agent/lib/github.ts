import { findNearMatch, techniqueFamily } from "#lib/technique_family.js";

const GITHUB_API = "https://api.github.com";

const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

/**
 * fetch with a timeout and retries on transient failures (network errors,
 * 429, 5xx). A single dropped connection ("fetch failed") must not abort
 * the whole publish step — that previously crashed the session and lost
 * the tutorial content.
 */
export async function githubFetch(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        lastError = new Error(`GitHub API ${res.status}: ${await res.text()}`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `GitHub request failed after ${MAX_RETRIES + 1} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export function githubHeaders(token: string, contentType = "application/json") {
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

export function getTokenOptional(): string | undefined {
  return process.env.GITHUB_TOKEN || undefined;
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
  const res = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
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
  const res = await githubFetch(`${GITHUB_API}/user/repos`, {
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

/** List existing tutorial repos for the owner (paginated, prefix-filtered). */
export async function listTutorialRepos(): Promise<string[]> {
  const token = getTokenOptional();
  if (!token) return [];

  const owner = getGithubOwner();
  const prefix = REPO_PREFIX();
  const names: string[] = [];

  for (let page = 1; page <= 10; page++) {
    const res = await githubFetch(
      `${GITHUB_API}/users/${owner}/repos?per_page=100&page=${page}&type=owner&sort=updated`,
      { headers: githubHeaders(token, "") },
    );
    if (!res.ok) {
      throw new Error(`GitHub list repos ${res.status}: ${await res.text()}`);
    }
    const batch = (await res.json()) as { name: string }[];
    if (batch.length === 0) break;
    for (const repo of batch) {
      if (repo.name.startsWith(prefix)) names.push(repo.name);
    }
    if (batch.length < 100) break;
  }

  return names;
}

/**
 * Resolve the repo to publish into.
 * Near-match existing slugs → reuse (skip minting a clone). Exact slug wins first.
 */
export async function resolveTopicRepo(topic: string): Promise<{
  repo: string;
  created_name: string;
  near_match: boolean;
  near_match_of?: string;
  action: "create" | "update" | "skip_duplicate_family";
}> {
  const createdName = topicToRepoName(topic);
  const existing = await listTutorialRepos();

  if (existing.includes(createdName)) {
    return {
      repo: createdName,
      created_name: createdName,
      near_match: false,
      action: "update",
    };
  }

  const near = findNearMatch(createdName, existing);
  if (near) {
    // Same technique family already has a public repo → update that repo, do not mint a clone.
    return {
      repo: near,
      created_name: createdName,
      near_match: true,
      near_match_of: near,
      action: "update",
    };
  }

  // Also compare against technique families of existing repos.
  const family = techniqueFamily(createdName);
  const familyHit = existing.find((name) => techniqueFamily(name) === family);
  if (familyHit) {
    return {
      repo: familyHit,
      created_name: createdName,
      near_match: true,
      near_match_of: familyHit,
      action: "update",
    };
  }

  return {
    repo: createdName,
    created_name: createdName,
    near_match: false,
    action: "create",
  };
}

export async function ensureTopicRepo(args: {
  topic: string;
  description: string;
  /** When set, force publish into this repo name (near-match reuse). */
  repoName?: string;
}): Promise<{
  owner: string;
  repo: string;
  created: boolean;
  url: string;
  near_match: boolean;
  near_match_of?: string;
}> {
  const owner = getGithubOwner();
  const minted = topicToRepoName(args.topic);
  const resolved = args.repoName
    ? {
        repo: args.repoName,
        created_name: minted,
        near_match: args.repoName !== minted,
        near_match_of: args.repoName !== minted ? args.repoName : undefined,
        action: "update" as const,
      }
    : await resolveTopicRepo(args.topic);

  const repo = resolved.repo;
  const exists = await repoExists(owner, repo);

  if (!exists) {
    const created = await createRepo({
      owner,
      name: repo,
      description: args.description,
    });
    return {
      owner,
      repo,
      created: true,
      url: created.html_url,
      near_match: resolved.near_match,
      near_match_of: resolved.near_match_of,
    };
  }

  return {
    owner,
    repo,
    created: false,
    url: `https://github.com/${owner}/${repo}`,
    near_match: resolved.near_match,
    near_match_of: resolved.near_match_of,
  };
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

  const existing = await githubFetch(
    `${apiBase}/contents/${encodeURIComponent(args.path)}?ref=${branch}`,
    { headers: githubHeaders(token, "") },
  );

  let sha: string | undefined;
  if (existing.ok) {
    const data = (await existing.json()) as { sha: string };
    sha = data.sha;
  }

  const res = await githubFetch(`${apiBase}/contents/${encodeURIComponent(args.path)}`, {
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

/** Publish multiple files sequentially (GitHub Contents API is per-file). */
export async function publishFilesToGithub(args: {
  owner: string;
  repo: string;
  files: { path: string; content: string }[];
  message: string;
  branch?: string;
}): Promise<{ shas: Record<string, string>; headSha: string }> {
  const shas: Record<string, string> = {};
  let headSha = "";
  for (const file of args.files) {
    const result = await publishFileToGithub({
      owner: args.owner,
      repo: args.repo,
      path: file.path,
      content: file.content,
      message: `${args.message} [${file.path}]`,
      branch: args.branch,
    });
    shas[file.path] = result.commit.sha;
    headSha = result.commit.sha;
  }
  return { shas, headSha };
}
