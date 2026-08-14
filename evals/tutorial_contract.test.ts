import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateTutorialContract,
  violationCodes,
} from "./tutorial_contract.ts";
import { techniqueFamily, isNearDuplicate } from "../agent/lib/technique_family.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf-8");
}

describe("tutorial_contract fail-closed gates", () => {
  it("fails old 8-section template + toy OLS + draft-voice closer", () => {
    const readme = read("evals/fixtures/bad_old_template_toy_ols.md");
    const codes = violationCodes({
      readme,
      tutorialPy: readme, // code embedded in markdown for this fixture
      requirementsTxt: "numpy\n",
      dataSourceName: "policy_report.pdf",
      dataSourceUrl: "https://example.com/policy_report.pdf",
    });
    for (const expected of [
      "old_template",
      "toy_ols",
      "policy_report_pdf",
      "not_implemented",
      "generate_sh_demo",
      "draft_voice_closer",
    ]) {
      assert.ok(codes.includes(expected), `expected ${expected}, got ${codes.join(",")}`);
    }
  });

  it("fails when tutorial.py has no real URL and no wrong number", () => {
    const codes = violationCodes({
      readme: read("evals/fixtures/bad_no_url_no_wrong_number.md"),
      tutorialPy: read("evals/fixtures/bad_no_url_tutorial.py"),
      requirementsTxt: "pytest\n",
      dataSourceName: "generic corpus",
      dataSourceUrl: "https://example.com/corpus",
    });
    assert.ok(codes.includes("no_real_url_in_code"));
    assert.ok(codes.includes("no_wrong_number"));
  });

  it("passes the in-repo gold tutorial", () => {
    const result = evaluateTutorialContract({
      readme: read("examples/gold/alfred-payroll-revisions/README.md"),
      tutorialPy: read("examples/gold/alfred-payroll-revisions/tutorial.py"),
      requirementsTxt: read("examples/gold/alfred-payroll-revisions/requirements.txt"),
      dataSourceName: "ALFRED / FRED PAYEMS (All Employees: Total Nonfarm)",
      dataSourceUrl: "https://alfred.stlouisfed.org/series?seid=PAYEMS",
    });
    assert.equal(result.ok, true, result.violations.map((v) => v.message).join("; "));
  });
});

describe("technique family near-dedup", () => {
  it("collapses goal-loop clones into one family", () => {
    const a = techniqueFamily("econ-ai-loops-goal");
    const b = techniqueFamily("econ-ai-goal-loop-economics");
    const c = techniqueFamily("econ-ai-claude-goal-loop-econ-research");
    const d = techniqueFamily("econ-ai-goal-for-economic-research");
    assert.equal(a, "goal-loop");
    assert.equal(b, "goal-loop");
    assert.equal(c, "goal-loop");
    assert.equal(d, "goal-loop");
    assert.ok(isNearDuplicate("goal loop economics", "claude goal loop econ research"));
  });
});
