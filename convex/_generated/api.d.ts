/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as advisor from "../advisor.js";
import type * as advisorValidators from "../advisorValidators.js";
import type * as comparison from "../comparison.js";
import type * as comparisonValidators from "../comparisonValidators.js";
import type * as comparisons from "../comparisons.js";
import type * as crons from "../crons.js";
import type * as decisionActionValidators from "../decisionActionValidators.js";
import type * as deliveryValidators from "../deliveryValidators.js";
import type * as discovery from "../discovery.js";
import type * as documentValidators from "../documentValidators.js";
import type * as documents from "../documents.js";
import type * as extraction from "../extraction.js";
import type * as http from "../http.js";
import type * as ingredientListValidators from "../ingredientListValidators.js";
import type * as ingredientLists from "../ingredientLists.js";
import type * as lib_advisorAgent from "../lib/advisorAgent.js";
import type * as lib_agentExtraction from "../lib/agentExtraction.js";
import type * as lib_caseEvents from "../lib/caseEvents.js";
import type * as lib_demoSession from "../lib/demoSession.js";
import type * as lib_documentExtraction from "../lib/documentExtraction.js";
import type * as lib_extraction from "../lib/extraction.js";
import type * as lib_firecrawl from "../lib/firecrawl.js";
import type * as lib_inquiryDraft from "../lib/inquiryDraft.js";
import type * as lib_providerTransport from "../lib/providerTransport.js";
import type * as lib_replyExtraction from "../lib/replyExtraction.js";
import type * as lib_sourceQuality from "../lib/sourceQuality.js";
import type * as lib_watchEvidence from "../lib/watchEvidence.js";
import type * as lib_webAnalysis from "../lib/webAnalysis.js";
import type * as lib_webReviews from "../lib/webReviews.js";
import type * as prospectValidators from "../prospectValidators.js";
import type * as prospects from "../prospects.js";
import type * as quotationMail from "../quotationMail.js";
import type * as quotationValidators from "../quotationValidators.js";
import type * as research from "../research.js";
import type * as researchValidators from "../researchValidators.js";
import type * as sourcing from "../sourcing.js";
import type * as sourcingEntry from "../sourcingEntry.js";
import type * as sourcingValidators from "../sourcingValidators.js";
import type * as sourcingWatch from "../sourcingWatch.js";
import type * as sourcingWorkflow from "../sourcingWorkflow.js";
import type * as studies from "../studies.js";
import type * as studyValidators from "../studyValidators.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  advisor: typeof advisor;
  advisorValidators: typeof advisorValidators;
  comparison: typeof comparison;
  comparisonValidators: typeof comparisonValidators;
  comparisons: typeof comparisons;
  crons: typeof crons;
  decisionActionValidators: typeof decisionActionValidators;
  deliveryValidators: typeof deliveryValidators;
  discovery: typeof discovery;
  documentValidators: typeof documentValidators;
  documents: typeof documents;
  extraction: typeof extraction;
  http: typeof http;
  ingredientListValidators: typeof ingredientListValidators;
  ingredientLists: typeof ingredientLists;
  "lib/advisorAgent": typeof lib_advisorAgent;
  "lib/agentExtraction": typeof lib_agentExtraction;
  "lib/caseEvents": typeof lib_caseEvents;
  "lib/demoSession": typeof lib_demoSession;
  "lib/documentExtraction": typeof lib_documentExtraction;
  "lib/extraction": typeof lib_extraction;
  "lib/firecrawl": typeof lib_firecrawl;
  "lib/inquiryDraft": typeof lib_inquiryDraft;
  "lib/providerTransport": typeof lib_providerTransport;
  "lib/replyExtraction": typeof lib_replyExtraction;
  "lib/sourceQuality": typeof lib_sourceQuality;
  "lib/watchEvidence": typeof lib_watchEvidence;
  "lib/webAnalysis": typeof lib_webAnalysis;
  "lib/webReviews": typeof lib_webReviews;
  prospectValidators: typeof prospectValidators;
  prospects: typeof prospects;
  quotationMail: typeof quotationMail;
  quotationValidators: typeof quotationValidators;
  research: typeof research;
  researchValidators: typeof researchValidators;
  sourcing: typeof sourcing;
  sourcingEntry: typeof sourcingEntry;
  sourcingValidators: typeof sourcingValidators;
  sourcingWatch: typeof sourcingWatch;
  sourcingWorkflow: typeof sourcingWorkflow;
  studies: typeof studies;
  studyValidators: typeof studyValidators;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
