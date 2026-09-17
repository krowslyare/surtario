# Real research quality · September 16, 2026

**Initial baseline (before the fixes below): research utility was not accepted.** Five actual Firecrawl searches reproduced the reported apples/New York problem. Query refinement found price-bearing pages, but did not establish two independent, equivalent, geographically applicable offers. The prior synthetic closeout remains evidence of application mechanics only.

## Executed method

Used the existing internal `discovery:probe` on development deployment `incredible-wolverine-122`, without pushing code, changing environment variables or writing cloud studies. Every call used the deployed adapter: ingredient query + `wholesale restaurant suppliers` + `New York, US`, three results and scraped Markdown. Five searches returned 15 source entries (14 distinct URLs), four without Markdown. This tests refinement across calls, not a higher per-call limit. No automatic retry or external supplier contact occurred. Provider credit consumption was not reported.

| Ingredient query before the fixed suffix | Observed result | Utility assessment |
| --- | --- | --- |
| apples | New York Apple Association directory, Ambrook article, Hudson River Fruit homepage | One direct distributor lead and one directory; no priced offer. The article is not a supplier. Reproduces the reported failure pattern, not necessarily the user's exact historical session. |
| apples fresh case price buy online | Restaurant Depot homepage, US Foods general page, Foodomarket Gala page | One relevant price-bearing page; other pages do not establish apple offers or local fulfillment. 3.727 s including CLI/network. |
| Gala apples case price | Foodomarket Gala, Foodotrends Golden Delicious history, WebstaurantStore Royal Gala | Same price source again, wrong-variety historical reference, and one product with no Firecrawl body. Not three alternative Gala suppliers. 20.138 s. |
| fresh chicken breast boneless case price | Foodomarket breast page, Facebook post, CHEF'STORE category | One readable product page with conflicting current prices; two sources without recovered text. 5.272 s. |
| nonexistent ingredient zxqv-7842 | Sysco, Woolco Foods, Yelp | No demonstrated match to the invented ingredient. The provider still returns three hits and `warning: false`. 3.841 s. |

Public URLs, response timestamps, character counts and hashes: [sanitized manifest](evidence/research-quality-2026-09-16.json). Raw source bodies and CLI results remain ignored under `.local/research-quality/`.

## Independent page checks

These checks used the web reader, separately from Firecrawl and the application. They locate missed evidence; they do not establish that the app can retrieve or correctly interpret it.

- [Foodomarket Gala](https://www.foodomarket.com/en-us/products/fresh-fruits-and-vegetables/gala-apples) displays USD-symbol 49.95 per case and an 80-count pack, but prose also describes a 40 lb case. The page mixes a current listing and aggregated weekly-price language. Its package identity, price type and applicability require confirmation; no weight conversion or final delivered total was accepted.
- [WebstaurantStore Royal Gala](https://www.webstaurantstore.com/fresh-royal-gala-apples-case/877JVI04597.html) was readable through the independent reader despite the empty Firecrawl search body. It displays a regular 104.99 per 88-count case and a distinct 84.00 member price. The listed 45 lb is shipping weight, not confirmed net contents. Availability and delivery depend on a special order; NYC address eligibility/freight were not checked. These figures are published observations, not a verified delivered quotation.
- [Foodomarket chicken breast](https://www.foodomarket.com/en-us/products/poultry/boneless-chicken-breast-542-2) displays 1.79/lb and 71.60 for 4×10 lb, while narrative calls 1.49 the current quote for the same date. It must retain the contradiction rather than silently choose a price.

## Real Luna replay of real retrieved sources

Five source interpretations used the actual local Convex Agent/SDK path with `gpt-5.6-luna` CLI. Inputs were the recorded Firecrawl bodies above, not synthetic catalog fixtures. The OpenAI transport was the local bridge; no direct OpenAI API call was made. Cloud evidence was copied into dedicated local research records solely for this check. Their local record timestamps are replay times; original retrieval times remain in the manifest.

| Input | Actual outcome |
| --- | --- |
| Ambrook article | `irrelevant`; all offer fields absent. |
| Hudson River Fruit homepage | `contact`; no invented package or price. |
| Foodomarket Gala | Failed application extraction. Luna proposed `uncertain` but cited a nonexistent evidence line (929); server validation correctly rejected it. A safe rejection is not a useful completed extraction. |
| Foodomarket chicken | `uncertain`; conflicting price warning and no offer fields. |
| Sysco for invented ingredient | `irrelevant`; no offer fields. |

Four interpretations completed; one failed validation. No retry was used to replace the failure with a selected success. An initial local replay harness attempt hit the existing 30-second search cooldown; subsequent reservations respected it. No application limits were relaxed.

The lexical prefilter alone marks Sysco and Woolco as readable for the English negative query: its generic-word exclusions are Spanish-only, and one matching English generic term suffices. Readable does not mean relevant. Luna corrected Sysco's classification locally, but this classifier is disabled on the current hosting without OpenAI configuration. The negative result therefore exposes a real weakness in the active non-AI discovery path.

## Changes identified in the initial baseline (implemented in the follow-up below)

1. Separate supplier/contact discovery from searches for explicit product presentations and prices. A fixed supplier suffix on every query is not enough. Preserve the original ingredient; a broad apples study may include varieties, but comparing Gala requires explicit equivalence.
2. Broaden discovery with a bounded candidate/reading budget and deduplicate sources/suppliers across refinements. Select relevant product pages to read instead of presenting the first three hits as a completed study. A larger limit by itself was not tested and is not a proven fix.
3. Improve relevance before counting results, including English generic terms, articles and the invented-ingredient control. Keep unreadable sources and uncertain coverage visibly distinct from verified supplier leads.
4. Exercise explicit product-page reads for empty search bodies, recording failures and cost. The independent Webstaurant read proves missed accessible evidence, not that a Firecrawl direct scrape will succeed.
5. Preserve published listing prices, market references, member prices, shipping/net weight, conflicts and dates as distinct facts. Missing or ambiguous facts should produce a useful next step, not an invented comparable price.
6. Repeat these recorded counterexamples and fresh searches after each targeted change. Acceptance needs relevant independent options, defensible product/price attribution, explicit geographic uncertainty, no invented matches for the negative case, and a useful next action when prices remain unavailable. A zero-price study may still be useful for supplier contacts; it is not a completed price comparison.

No product changes, deployment, email, commit or push were performed during this validation. The code modifications from the earlier local closeout remain separate and uncommitted. OpenAI API and the hosted automatic research loop remain unverified/disabled; the local synthetic demo must not be used to claim general research utility.


## Implemented follow-up: real Firecrawl + Luna CLI

The isolated local application now searches English product/price and supplier queries separately (three queries, eight candidates per query), deduplicates tracking URLs, filters articles/social results and specific-product mismatches, and returns up to eight candidate sources. Search metadata and page reading are separate, so one slow page cannot erase the discovery result. Six initial pages are read, with at most two one-hop product reads and remaining slots filled from ranked candidates. Page reads use a one-hour discovery cache; explicitly selected product reads remain fresh. Scrape HTTP 429 gets at most two retries per study, respecting short Retry-After delays; other failures remain visible as partial coverage. Credits do not bypass provider rate limits.

The hybrid transport sends Firecrawl directly to the real API while inference goes through the real Luna CLI bridge. It is restricted to the existing validated loopback backend. Email remains simulated. Synthetic configuration explicitly resets the live-web flag. No OpenAI API key is needed for this local mode.

Evidence-line numbers are bounded in the generated schema. Server validation removes unsupported currency (including USD inferred from a bare dollar sign), unsupported specification attributes, and approximate/shipping weight used as exact package contents. The remaining published fields stay available for review. This closes failures actually observed during these runs; it does not turn model output into an approved offer.

### Observed acceptance

Fresh public `research.search` calls and `research.extract` calls used the application, not manually fabricated supplier results. English cases included apples, Gala apples, boneless chicken breast, long grain white rice, and an invented ingredient. The baseline and intermediate failures are retained above; searches vary over time and are not a coverage guarantee.

- Gala: recovered product pages from Foodomarket, BJ's and Gordon Food Service. Luna extracted a 4 lb bag at 5.49 (marked sold out) and a 5 lb package at 10.99 (not the eight-package case price). Bare-dollar currency remains unconfirmed. Foodomarket's count/weight and rounded-unit-price combination classified inconsistently across runs; the final run conservatively retained it as uncertain. It is not counted as a validated comparable offer.
- Chicken: recovered a 40 lb case at 109.99 from Farmer's Fresh Meat; a separate earlier live run recovered Pellicano's 40 lb case at 79.00. The final Foodomarket analysis preserved its 1.79 versus 1.49 per-lb contradiction. These observations do not establish delivery eligibility or delivered cost in NYC.
- Negative control: zero matches, instead of three generic distributors. No model call was needed.

The sanitized follow-up manifest records final search counts, timings, content hashes and extracted facts without session capabilities or full page bodies. Local raw runs remain ignored. Reading and inference failures are not counted as successes. The local product changes are uncommitted; no cloud deployment, external message, order, or purchase occurred.


### Final recorded sample and checks

| Query (New York, US) | Candidate sources | With recovered text | Search time |
| --- | ---: | ---: | ---: |
| apples | 8 | 8 | 12.913 s |
| Gala apples | 7 | 4 | 10.081 s |
| boneless chicken breast | 6 | 4 | 16.937 s |
| long grain white rice | 8 | 7 | 64.907 s |
| nonexistent ingredient zxqv-7842 | 0 | 0 | 2.570 s |

Twelve final source analyses completed; six retained a published price candidate. That count includes sources with unconfirmed currency, sold-out stock or unclear packaging, and is **not** six comparable offers. Rice added a Ready Hour 39.99 listing; BoxNCase's 7.38 lacked a clear variant/contents basis, while My Patriot Supply retained contradictory availability. Subsequent server regression checks additionally clear container counts (such as six pouches) used as net product units. A number in a search snippet never becomes an offer automatically.

[Sanitized final sample](evidence/research-quality-followup-2026-09-16.json). Earlier iterations exposed timeouts, scrape 429 responses, irrelevant social/article results and model overclaims; they motivated the changes, not a claim that every search succeeds. Luna remains conservative/inconsistent on Foodomarket's rounded unit-price/count/weight combinations. Those sources remain visibly uncertain rather than selected as equivalent offers.

Verification: 242 unit/backend/configuration checks, frontend TypeScript/build and two focused browser flows. A separate real-data browser check recovered the Gordon Food Service Gala extraction, opened its 10.99 package-price field, reloaded and recovered the same result. The source card now exposes extracted price/package/currency status before review. No human confirmation of purchasing terms was fabricated. Self-review covered bounded calls/retries, loopback-only bridge credentials, provenance, source URL validation, extraction evidence, packaging and unchanged ownership checks.


## Coverage follow-up: generic budgets and regional context

This supersedes the earlier eight-source budget. English discovery requests three queries of up to ten results each. It retains up to sixteen candidates and budgets twelve distinct reads, plus the existing two bounded rate-limit retries. Domain round-robin selection prioritizes diversity without permanently discarding the third relevant page on a merchant's site. Product queries no longer require a case pack; common singular/plural forms are normalized without per-ingredient lookup tables. Catalog child reads reserve part of the same reading budget and do not follow related-product links from individual product pages. Sources without recovered text stay visible; the UI separately counts candidates and recovered-text pages, not verified offers.

The requested region now reaches source interpretation from manual research, sourcing workflows and watches. The prompt asks for explicit delivery evidence and substitution warnings, and separates statistical references from merchant offers. These are model instructions, not a deterministic guarantee of geographic coverage. The strict URL, literal-evidence, currency and package validation gates remain in place. The 20,000-character content bound and three-step automated workflow bound remain; Latin American market adaptation was not included.

Fresh held-out English searches with real Firecrawl:

| Query, New York US | Retained | With text | Duration |
| --- | ---: | ---: | ---: |
| all purpose flour | 10 | 10 | 72.973 s |
| olive oil | 16 | 11 | 119.265 s |
| nonexistent ingredient zxqv-7842 | 0 | 0 | 5.071 s |

Real Luna checks on the flour sample identified Canada-only shipping evidence as insufficient for New York, flagged a gluten-free substitution, and classified FRED's national average as context with no merchant offer fields. No source-specific acceptance rules or canned model outputs were added. Broader retrieval carries latency and credit costs; sixteen candidates does not establish exhaustive coverage. Unread sources and delivery uncertainty remain explicit.

Regression checks cover 30 distinct candidates retaining 16 while making exactly 12 reads; more than two relevant pages on one host; singular/plural matching; propagation of the stored delivery area into extraction; and the earlier negative/evidence cases. 245 unit/backend/configuration tests and TypeScript/build passed; the two focused research browser flows passed. The sanitized coverage manifest contains observed provider results, not session capabilities or full page bodies.

[Sanitized coverage evidence](evidence/research-coverage-2026-09-16.json). The actual mobile UI displayed 16 candidates / 11 with recovered text without horizontal overflow and recovered the same counts after reload.

## Subsequent adaptive case research

The initial scan budgets above remain applicable to quick search. Persistent cases now investigate missing evidence over multiple targeted rounds, retaining prior findings. See [adaptive research and executed evidence](ADAPTIVE_RESEARCH.md); thirty raw initial search entries are not the overall case ceiling.
