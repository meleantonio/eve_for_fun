/**
 * Fail-closed contract for econ AI tutorials.
 * Publish and evals import this module; a draft that fails any gate must not ship.
 */

export type ContractViolation = {
  code: string;
  message: string;
};

export type TutorialArtifacts = {
  readme: string;
  tutorialPy: string;
  requirementsTxt: string;
  dataSourceName: string;
  dataSourceUrl: string;
};

/** Old 8-section template headings that must not appear as the tutorial spine. */
export const BANNED_TEMPLATE_HEADINGS = [
  "Why economists should care",
  "The technique in plain language",
  "Econ use case walkthrough",
  "Pitfalls and when not to use this",
] as const;

/** Required contract sections (fail-closed). Order is pedagogical, not decorative. */
export const REQUIRED_SECTIONS = [
  { id: "named_object", patterns: [/^##\s+Named object\b/im, /^##\s+1[\).\]]\s*Named object\b/im] },
  { id: "stake", patterns: [/^##\s+Stake\b/im, /^##\s+2[\).\]]\s*Stake\b/im] },
  { id: "naive_path", patterns: [/^##\s+Naive path\b/im, /^##\s+3[\).\]]\s*Naive path\b/im] },
  { id: "technique", patterns: [/^##\s+Technique\b/im, /^##\s+4[\).\]]\s*Technique\b/im] },
  {
    id: "you_will_get_this_wrong",
    patterns: [
      /^##\s+You will get this wrong\b/im,
      /^##\s+5[\).\]]\s*You will get this wrong\b/im,
    ],
  },
  { id: "controversy", patterns: [/^##\s+Controversy\b/im, /^##\s+6[\).\]]\s*Controversy\b/im] },
] as const;

/** RELAI must be visible as an explicit teaching spine. */
export const RELAI_MARKERS = [
  /\bExamine\b/i,
  /\b(e)?Xplain\b/i,
  /\bProbe\b/i,
  /\bLink to economics\b/i,
  /\bOutput prediction\b/i,
  /\bRecreate\b/i,
  /\bExtend\b/i,
] as const;

export const BANNED_CONTENT_PATTERNS: { code: string; re: RegExp; message: string }[] = [
  {
    code: "toy_ols",
    re: /\by\s*~\s*x1\s*\+\s*x2\b/i,
    message: "Toy OLS formula y ~ x1 + x2 is banned.",
  },
  {
    code: "toy_ols_vars",
    re: /\b(?:np\.random|random)\.[a-zA-Z_]*\([^)]*\)[\s\S]{0,120}\b(?:y|x1|x2)\b/,
    message: "Synthetic y/x1/x2 demo data is banned.",
  },
  {
    code: "policy_report_pdf",
    re: /\bpolicy_report\.pdf\b/i,
    message: "Fake policy_report.pdf is banned; name a real document.",
  },
  {
    code: "not_implemented",
    re: /\bNotImplementedError\b/,
    message: "NotImplementedError stubs are banned.",
  },
  {
    code: "generate_sh_demo",
    re: /\bgenerate\.sh\b/,
    message: "generate.sh-as-demo is banned.",
  },
  {
    code: "draft_voice_closer",
    re: /If you want[, ]+I can also\b/i,
    message: "Draft-voice closer (“If you want, I can also…”) must not ship.",
  },
  {
    code: "pseudo_application",
    re: /\bpseudo[- ]application\b/i,
    message: "Pseudo-applications are banned; use a real empirical object.",
  },
];

const URL_IN_CODE_RE = /https?:\/\/[^\s"'`)>\]]+/gi;

function hasHeading(readme: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((re) => re.test(readme));
}

function countBannedTemplateHeadings(readme: string): string[] {
  return BANNED_TEMPLATE_HEADINGS.filter((h) =>
    new RegExp(`^##\\s+${h.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*$`, "im").test(
      readme,
    ),
  );
}

/** Extract http(s) URLs that appear inside tutorial.py (not just the README). */
export function urlsUsedInCode(tutorialPy: string): string[] {
  const found = tutorialPy.match(URL_IN_CODE_RE) ?? [];
  return [...new Set(found.map((u) => u.replace(/[.,;]+$/, "")))];
}

/** Detect a concrete wrong-number demonstration (naive path fails quantitatively). */
export function hasWrongNumberDemonstration(readme: string, tutorialPy: string): boolean {
  const corpus = `${readme}\n${tutorialPy}`;
  const signals = [
    /\bwrong (?:number|figure|estimate|print|revision|count)\b/i,
    /\bnaive (?:path|approach|estimate|method).{0,80}\b(?:wrong|incorrect|fails|mismatch)/i,
    /\b(?:gets?|returns?|reports?|yields?)\s+(?:the\s+)?wrong\b/i,
    /\bassert\s+.+(?:!=|!==|not equal)/i,
    /\bexpected_wrong\b/i,
    /\bNAIVE_(?:VALUE|ESTIMATE|NUMBER)\b/,
    /\bWRONG_(?:VALUE|ESTIMATE|NUMBER|PRINT)\b/,
  ];
  return signals.some((re) => re.test(corpus));
}

export function evaluateTutorialContract(artifacts: TutorialArtifacts): {
  ok: boolean;
  violations: ContractViolation[];
} {
  const violations: ContractViolation[] = [];
  const { readme, tutorialPy, requirementsTxt, dataSourceName, dataSourceUrl } = artifacts;

  if (!readme.trim()) {
    violations.push({ code: "empty_readme", message: "README content is empty." });
  }
  if (!tutorialPy.trim()) {
    violations.push({ code: "missing_tutorial_py", message: "tutorial.py is required." });
  }
  if (!requirementsTxt.trim()) {
    violations.push({
      code: "missing_requirements",
      message: "requirements.txt is required.",
    });
  }
  if (!dataSourceName.trim()) {
    violations.push({
      code: "missing_data_source_name",
      message: "A named data source is required.",
    });
  }
  if (!/^https?:\/\//i.test(dataSourceUrl.trim())) {
    violations.push({
      code: "missing_data_source_url",
      message: "data_source_url must be a real http(s) URL.",
    });
  }

  const bannedHeadings = countBannedTemplateHeadings(readme);
  if (bannedHeadings.length >= 3) {
    violations.push({
      code: "old_template",
      message: `Old 8-section template detected (${bannedHeadings.join(", ")}).`,
    });
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!hasHeading(readme, section.patterns)) {
      violations.push({
        code: `missing_section_${section.id}`,
        message: `Missing required section: ${section.id.replace(/_/g, " ")}.`,
      });
    }
  }

  const missingRelai = RELAI_MARKERS.filter((re) => !re.test(readme));
  if (missingRelai.length > 0) {
    violations.push({
      code: "missing_relai",
      message:
        "RELAI spine must be visible (Examine, eXplain, Probe, Link to economics, Output prediction, Recreate, Extend).",
    });
  }

  const corpus = `${readme}\n${tutorialPy}\n${requirementsTxt}`;
  for (const ban of BANNED_CONTENT_PATTERNS) {
    if (ban.re.test(corpus)) {
      violations.push({ code: ban.code, message: ban.message });
    }
  }

  const codeUrls = urlsUsedInCode(tutorialPy);
  if (codeUrls.length === 0) {
    violations.push({
      code: "no_real_url_in_code",
      message: "tutorial.py must use at least one real http(s) URL (primary source or data).",
    });
  } else if (
    dataSourceUrl.trim() &&
    !codeUrls.some(
      (u) =>
        u.includes(new URL(dataSourceUrl).hostname) ||
        dataSourceUrl.includes(u) ||
        u.startsWith(dataSourceUrl) ||
        dataSourceUrl.startsWith(u),
    )
  ) {
    // Soft structural nudge: named source should appear in code when host is comparable.
    // Only flag when the named URL's host never appears.
    try {
      const host = new URL(dataSourceUrl).hostname.replace(/^www\./, "");
      if (!tutorialPy.includes(host)) {
        violations.push({
          code: "data_source_unused_in_code",
          message: `Named data source host (${host}) does not appear in tutorial.py.`,
        });
      }
    } catch {
      violations.push({
        code: "invalid_data_source_url",
        message: "data_source_url is not a valid URL.",
      });
    }
  }

  if (!hasWrongNumberDemonstration(readme, tutorialPy)) {
    violations.push({
      code: "no_wrong_number",
      message:
        "Tutorial must show a naive path that fails with a wrong number (quantitative failure).",
    });
  }

  if (!/\bsmoke\b/i.test(tutorialPy) && !/if __name__\s*==\s*["'`]__main__["'`]/i.test(tutorialPy)) {
    violations.push({
      code: "no_smoke_entry",
      message: "tutorial.py must expose a runnable __main__ smoke entrypoint.",
    });
  }

  return { ok: violations.length === 0, violations };
}

/** Convenience for evals: describe why a fixture should fail. */
export function violationCodes(artifacts: TutorialArtifacts): string[] {
  return evaluateTutorialContract(artifacts).violations.map((v) => v.code);
}
