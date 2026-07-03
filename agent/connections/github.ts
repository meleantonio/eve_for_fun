import { defineOpenAPIConnection } from "eve/connections";

// Minimal hand-authored spec instead of the full GitHub OpenAPI document.
// The official spec is a 12+ MB runtime download with ~1000 operations;
// fetching it at session start is slow, fragile ("fetch failed" crashes),
// and floods the model with tools it should never use. This inline subset
// covers only follow-up tasks; tutorials are published via `publish_tutorial`.

const ownerParam = {
  name: "owner",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "Repository owner (user or org login)",
};

const repoParam = {
  name: "repo",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "Repository name",
};

const okResponse = { "200": { description: "OK" } };

export default defineOpenAPIConnection({
  baseUrl: "https://api.github.com",
  description:
    "GitHub follow-up tasks on existing tutorial repos: read/update repo metadata, read/write individual files, open issues. Do NOT use this to publish tutorials — use the publish_tutorial tool instead.",
  spec: {
    openapi: "3.0.3",
    info: { title: "GitHub REST API (curated subset)", version: "1.0.0" },
    paths: {
      "/user": {
        get: {
          operationId: "get_authenticated_user",
          summary: "Get the authenticated user",
          responses: okResponse,
        },
      },
      "/repos/{owner}/{repo}": {
        get: {
          operationId: "get_repo",
          summary: "Get a repository",
          parameters: [ownerParam, repoParam],
          responses: okResponse,
        },
        patch: {
          operationId: "update_repo",
          summary: "Update repository settings (description, homepage, topics visibility)",
          parameters: [ownerParam, repoParam],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    homepage: { type: "string" },
                    private: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: okResponse,
        },
      },
      "/repos/{owner}/{repo}/contents/{path}": {
        get: {
          operationId: "get_file_contents",
          summary: "Get a file's contents (base64) and blob SHA",
          parameters: [
            ownerParam,
            repoParam,
            {
              name: "path",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "File path within the repository",
            },
            {
              name: "ref",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Branch, tag, or commit SHA (defaults to default branch)",
            },
          ],
          responses: okResponse,
        },
        put: {
          operationId: "create_or_update_file",
          summary:
            "Create or update a single file. content must be base64-encoded; sha is required when updating an existing file.",
          parameters: [
            ownerParam,
            repoParam,
            {
              name: "path",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "File path within the repository",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message", "content"],
                  properties: {
                    message: { type: "string", description: "Commit message" },
                    content: {
                      type: "string",
                      description: "New file content, base64-encoded",
                    },
                    sha: {
                      type: "string",
                      description: "Blob SHA of the file being replaced (required for updates)",
                    },
                    branch: { type: "string", description: "Target branch (default: main)" },
                  },
                },
              },
            },
          },
          responses: okResponse,
        },
      },
      "/repos/{owner}/{repo}/issues": {
        post: {
          operationId: "create_issue",
          summary: "Open an issue on a repository",
          parameters: [ownerParam, repoParam],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title"],
                  properties: {
                    title: { type: "string" },
                    body: { type: "string" },
                    labels: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Created" } },
        },
      },
    },
  },
  auth: {
    getToken: async () => {
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        throw new Error("Set GITHUB_TOKEN for the GitHub connection");
      }
      return { token };
    },
  },
});
