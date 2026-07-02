import { connect } from "@vercel/connect/eve";
import { defineOpenAPIConnection } from "eve/connections";

export default defineOpenAPIConnection({
  spec: "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json",
  baseUrl: "https://api.github.com",
  description:
    "GitHub: create repos, commit files, open issues. Use for publishing econ AI tutorials.",
  auth: connect({
    connector: "github/github",
    principalType: "app",
  }),
});
