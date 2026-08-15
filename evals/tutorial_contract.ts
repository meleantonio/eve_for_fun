/**
 * Re-export publish-time contract for `#evals/*` and tests.
 * Implementation lives in agent/lib (runtime import path).
 */
export {
  BANNED_CONTENT_PATTERNS,
  BANNED_TEMPLATE_HEADINGS,
  RELAI_MARKERS,
  REQUIRED_SECTIONS,
  evaluateTutorialContract,
  hasWrongNumberDemonstration,
  urlsUsedInCode,
  violationCodes,
} from "../agent/lib/tutorial_contract.js";
export type { ContractViolation, TutorialArtifacts } from "../agent/lib/tutorial_contract.js";
