/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as comparison from "../comparison.js";
import type * as discovery from "../discovery.js";
import type * as extraction from "../extraction.js";
import type * as lib_extraction from "../lib/extraction.js";
import type * as lib_firecrawl from "../lib/firecrawl.js";
import type * as studies from "../studies.js";
import type * as studyValidators from "../studyValidators.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  comparison: typeof comparison;
  discovery: typeof discovery;
  extraction: typeof extraction;
  "lib/extraction": typeof lib_extraction;
  "lib/firecrawl": typeof lib_firecrawl;
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
};
