# Purchasing advisor delivery

The advisor answers what to do next with a saved comparison: buy under stated conditions, negotiate with the current supplier, clarify missing terms, or continue research. It does not buy or send messages. Research remains available without a budget, quantity, stock, history or recipes.

## Implementation contract

- Optional context: priority (cash, unit price, balanced), available budget in the comparison currency, confirmed daily use and current stock in its base unit, maximum coverage days, and preferred supplier from the comparison.
- The deterministic engine computes whole packages, order cash outlay, excess, budget fit and estimated coverage only from provided inputs. Unknown taxes/delivery remain pending. No inferred demand, automatic tax rates, realized savings or historical trends.
- Negotiation drafts cite comparable offers from the saved snapshot. A suggested discussion is not evidence of overcharging, acceptance, availability or a market decline.
- The AI advisor reads an owned immutable comparison snapshot and uses bounded read-only tools for scenarios and source evidence. It may explain tradeoffs and missing information; no send/purchase tools are exposed. Recommendations and monetary figures displayed by the app remain bound to validated deterministic results.
- The analysis records comparison revision, context, result and source evidence. Changing the saved comparison or context makes the displayed analysis visibly stale. Sources are untrusted content, never instructions.
- The model call is disabled until explicitly configured. A useful deterministic scenario view remains available and is labeled as calculation, not as an AI response. Model errors preserve that view and do not claim AI success.

## Delivery sequence

1. Advisor: scenarios, optional context, executive verdict, negotiation draft, persisted snapshot and bounded model action.
2. Operator mail recovery: inspect uncertain sends and quarantined replies, reconcile only after verification, never automatically resend.
3. Save reviewed ingredient lists without storing file bytes; retain explicit session ownership and demo limits.
4. Prepare static hosting and local readiness checks; deployment remains a separate operation.
5. Configure server credentials only when the author is ready, then execute real search/extraction/advice and authorized mail round trip. Record actual outcomes before publication.

Private uploads, restaurant accounts, purchase history and recipes remain a separate commercial stage unless the author expands this scope. Existing local tests do not establish production behavior or external provider quality.

## Decision policy and verification

Cash priority chooses the lowest complete order outlay. Unit-price priority chooses the lowest normalized product price. Balanced priority gives equal weight to each ordering and breaks ties by lower outlay; it is a stated heuristic, not a financial optimization claim. Budget and coverage constraints apply before ranking. Coverage requires both confirmed daily usage and stock. Mixed currencies block recommendations instead of relabeling the budget.

The AI action requires `ADVISOR_ENABLED=true`, `OPENAI_API_KEY` and `OPENAI_ADVISOR_MODEL` in the server environment. It uses the registered Agent component with two read-only tools: scenario calculation and evidence inspection. Generated prose is qualitative and cites active offer sources; the interface shows monetary results from the deterministic calculation. A failed call is not retried automatically. Each reservation schedules an internal expiry after two minutes; interrupted executions become failed while preserving their calculations, and late completions cannot overwrite that state. Each session retains at most 20 snapshots, with a demo-wide cap of 200; the UI recovers the latest 10 for a comparison.

Local verification: 110 domain/backend tests, typecheck/build and eight focused browser cases passed against an isolated local Convex backend. Tests cover ownership, immutable retries, stale revisions, provider-disabled behavior, numeric/source validation, budget/currency boundaries, recovery after reload and mobile/desktop layout. Independent Sol review identified removed-offer evidence and mixed-currency budget issues; both were corrected with regressions. Actual OpenAI interpretation and tool execution with a provider remain unverified until credentials are configured.
