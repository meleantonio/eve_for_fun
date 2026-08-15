/**
 * Durable discovery log.
 * Local `.eve/discoveries.json` is a cache only — on Vercel cwd is ephemeral.
 * Source of truth is a GitHub file when GITHUB_TOKEN is available.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getGithubOwner,
  githubFetch,
  githubHeaders,
  getTokenOptional,
} from "#lib/github.js";
import { techniqueFamily, isNearDuplicate } from "#lib/technique_family.js";

export type DiscoveryEntry = {
  title: string;
  url: string;
  category: string;
  technique_family: string;
  relevance_score: number;
  notes?: string;
  primary_source_url?: string;
  dataset_name?: string;
  recorded_at: string;
};

const LOG_FILE = "discoveries.json";

function localLogPath(): string {
  return join(process.cwd(), ".eve", LOG_FILE);
}

function discoveryRepoName(): string {
  return process.env.DISCOVERY_LOG_REPO ?? "econ-ai-scout-log";
}

function discoveryRepoPath(): string {
  return process.env.DISCOVERY_LOG_PATH ?? LOG_FILE;
}

async function readLocal(): Promise<DiscoveryEntry[]> {
  try {
    return JSON.parse(await readFile(localLogPath(), "utf-8")) as DiscoveryEntry[];
  } catch {
    return [];
  }
}

async function writeLocal(log: DiscoveryEntry[]): Promise<void> {
  await mkdir(join(process.cwd(), ".eve"), { recursive: true });
  await writeFile(localLogPath(), JSON.stringify(log, null, 2));
}

async function readGithub(): Promise<{ entries: DiscoveryEntry[]; sha?: string } | null> {
  const token = getTokenOptional();
  if (!token) return null;

  const owner = getGithubOwner();
  const repo = discoveryRepoName();
  const path = discoveryRepoPath();
  const res = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    { headers: githubHeaders(token, "") },
  );

  if (res.status === 404) {
    return { entries: [] };
  }
  if (!res.ok) {
    throw new Error(`Discovery log read failed: GitHub ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { content?: string; encoding?: string; sha: string };
  if (!data.content) return { entries: [], sha: data.sha };
  const raw = Buffer.from(data.content, (data.encoding as BufferEncoding) ?? "base64").toString(
    "utf-8",
  );
  const entries = JSON.parse(raw) as DiscoveryEntry[];
  return { entries, sha: data.sha };
}

async function ensureDiscoveryRepo(token: string): Promise<void> {
  const owner = getGithubOwner();
  const repo = discoveryRepoName();
  const existing = await githubFetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubHeaders(token, ""),
  });
  if (existing.ok) return;
  if (existing.status !== 404) {
    throw new Error(`Discovery repo check failed: ${existing.status}: ${await existing.text()}`);
  }

  const created = await githubFetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify({
      name: repo,
      description: "Durable discovery log for Econ AI Scout (dedup across Vercel runs)",
      private: false,
      auto_init: true,
    }),
  });
  if (!created.ok && created.status !== 422) {
    throw new Error(`Discovery repo create failed: ${created.status}: ${await created.text()}`);
  }
}

async function writeGithub(log: DiscoveryEntry[], sha?: string): Promise<void> {
  const token = getTokenOptional();
  if (!token) return;

  await ensureDiscoveryRepo(token);
  const owner = getGithubOwner();
  const repo = discoveryRepoName();
  const path = discoveryRepoPath();

  const res = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      method: "PUT",
      headers: githubHeaders(token),
      body: JSON.stringify({
        message: `chore: update discovery log (${log.length} entries)`,
        content: Buffer.from(JSON.stringify(log, null, 2)).toString("base64"),
        branch: "main",
        ...(sha ? { sha } : {}),
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Discovery log write failed: GitHub ${res.status}: ${await res.text()}`);
  }
}

function mergeByUrl(a: DiscoveryEntry[], b: DiscoveryEntry[]): DiscoveryEntry[] {
  const map = new Map<string, DiscoveryEntry>();
  for (const e of [...a, ...b]) {
    map.set(e.url, e);
  }
  return [...map.values()].sort((x, y) => x.recorded_at.localeCompare(y.recorded_at));
}

/** Load durable log (GitHub when possible), syncing a local cache. */
export async function loadDiscoveries(): Promise<DiscoveryEntry[]> {
  const local = await readLocal();
  try {
    const remote = await readGithub();
    if (!remote) return local;
    const merged = mergeByUrl(remote.entries, local);
    await writeLocal(merged);
    return merged;
  } catch {
    return local;
  }
}

export type RecordDiscoveryInput = {
  title: string;
  url: string;
  category: string;
  relevance_score: number;
  notes?: string;
  primary_source_url?: string;
  dataset_name?: string;
  technique_family?: string;
};

export type RecordDiscoveryResult = {
  recorded: boolean;
  duplicate: boolean;
  near_duplicate: boolean;
  near_match_of?: string;
  technique_family: string;
  total: number;
  durable: boolean;
  reason?: string;
};

/**
 * Append a discovery unless URL or technique-family near-duplicate exists.
 * Score 0 entries are logged as rejected (not publishable) but still recorded
 * only when explicitly allowed — by default score 0 is stored with recorded=false.
 */
export async function recordDiscovery(input: RecordDiscoveryInput): Promise<RecordDiscoveryResult> {
  const family = input.technique_family?.trim() || techniqueFamily(input.title);
  const log = await loadDiscoveries();

  const urlDup = log.find((d) => d.url === input.url);
  if (urlDup) {
    return {
      recorded: false,
      duplicate: true,
      near_duplicate: false,
      technique_family: family,
      total: log.length,
      durable: Boolean(getTokenOptional()),
      reason: "url_already_recorded",
    };
  }

  const near = log.find(
    (d) =>
      d.technique_family === family ||
      isNearDuplicate(input.title, d.title) ||
      isNearDuplicate(family, d.technique_family),
  );
  if (near) {
    return {
      recorded: false,
      duplicate: false,
      near_duplicate: true,
      near_match_of: near.title,
      technique_family: family,
      total: log.length,
      durable: Boolean(getTokenOptional()),
      reason: "technique_family_near_duplicate",
    };
  }

  const entry: DiscoveryEntry = {
    title: input.title,
    url: input.url,
    category: input.category,
    technique_family: family,
    relevance_score: input.relevance_score,
    notes: input.notes,
    primary_source_url: input.primary_source_url,
    dataset_name: input.dataset_name,
    recorded_at: new Date().toISOString(),
  };

  const next = [...log, entry];
  await writeLocal(next);

  let durable = false;
  try {
    const remote = await readGithub();
    if (getTokenOptional()) {
      const merged = mergeByUrl(remote?.entries ?? [], next);
      await writeGithub(merged, remote?.sha);
      await writeLocal(merged);
      durable = true;
      return {
        recorded: true,
        duplicate: false,
        near_duplicate: false,
        technique_family: family,
        total: merged.length,
        durable,
      };
    }
  } catch (err) {
    return {
      recorded: true,
      duplicate: false,
      near_duplicate: false,
      technique_family: family,
      total: next.length,
      durable: false,
      reason: `local_only: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return {
    recorded: true,
    duplicate: false,
    near_duplicate: false,
    technique_family: family,
    total: next.length,
    durable,
    reason: durable ? undefined : "no_github_token_local_cache_only",
  };
}

export function listFamilies(log: DiscoveryEntry[]): string[] {
  return [...new Set(log.map((d) => d.technique_family))];
}
