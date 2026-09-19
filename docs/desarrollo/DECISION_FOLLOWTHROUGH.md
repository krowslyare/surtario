# Finding → question → confirmed answer → decision

The missing-delivery insight now closes the loop inside the comparison. Its first supported case is an offer whose only missing term is freight, with a complete same-currency benchmark. It does not infer other missing terms or use AI text as an instruction.

The question contains the supplier, ingredient/specification, actual whole-pack order, and calculated delivery boundary. An operator can copy it and try an amount. The preview shows both the hypothetical total and the before/after recommendation from the existing deterministic advisor, using the current priority, budget and coverage constraints. A lower order total does not silently override a unit-price preference, and a new answer does not remove an unresolved budget constraint.

A separate checkbox confirms that the supplier supplied this final delivery amount, including tax. Editing the amount clears confirmation. Applying it changes only freight, preserves original source evidence, and recalculates the current decision without selecting an offer, placing a purchase or sending a message. Invalid or stale questions cannot be applied. Invalid advisor input blocks confirmation rather than silently falling back to another decision context.

The resulting panel connects the missing term, prepared question, operator-confirmed answer and before/after recommendation. It distinguishes changed and unchanged recommendations. The updated comparison can be saved with the existing owned-session persistence; after reload, the confirmed freight remains. The before/after recap is current-view state, not a persistent decision-history ledger. Changing the comparison or advisor context hides an inapplicable recap. Generated advisor narratives retain the existing invalidation rules and require an explicit new analysis.

## Verification

The local pass has 205 unit/backend/configuration tests passing. New cases cover amounts below, at and above the boundary; a unit-price priority that differs from minimum outlay; a budget that still blocks a decision; stale questions; and preservation of other offer fields. Frontend/backend TypeScript checks and hosting build checks passed.

Thirteen focused browser journeys cover the existing advisor and saved-comparison persistence, staleness, quantity and mobile behavior, plus the new confirm-and-save flow and blocked site storage. The new journey verifies that hypothetical amounts do not alter the quote, changing an amount clears approval, the actual unit-price priority reaches the preview, confirmation moves focus to the result, and the saved delivery survives reload. Desktop and 390 px captures show the before/after panel without horizontal overflow. The baseline English integration previously passed all 64 browser journeys; this entry does not present that older full-suite run as a new one.

Independent Luna max review identified one P2: the recap offered saving even when blocked site storage prevented session initialization. Saving now follows the existing session/query/connection readiness, with an explanation when unavailable. A browser regression verifies that a confirmed answer still recalculates locally while the save button remains disabled. The parent reviewed and tested this correction. Follow-up review also corrected the unavailable message for intentionally persistence-disabled examples.

No schema, authentication, provider configuration or external mail operation is added. The existing bundle-size warning remains. Private accounts/documents, complete hosted-provider acceptance and video recording retain their separate release gates.


## Contextual actions after PR #35

The saved comparison offers a deterministic delivery question or a minimum-order proposal. A minimum proposal requires a confirmed minimum that blocks the user's stated budget or maximum coverage; the proposed pack count comes from the required quantity. It is labeled hypothetical. Freight questions preserve the arithmetic threshold against complete offers; eligibility and recommendation after confirmation use the same current preferences. Neither proposal is an agreed supplier term.

Each quotation action stores its offer, comparison revision, preferences and evidence offer IDs. Drafts disclose only the target offer to the optional writer, not other suppliers' private quotations. Changing the comparison blocks sending and confirmation from that old action. Editing the message invalidates the approved revision. Existing uncertain-send and event idempotency rules remain in force.

The reply review can confirm freight OR the minimum, explicitly chosen by a human and supported by a literal reply excerpt. Other terms and original evidence stay unchanged. For contextual actions, the reply review explicitly uses the question's saved preferences; the server rejects a different context. Legacy generic requests use the operator's reviewed current context. Before/after reports preserve that context, clear an earlier selection and do not register a purchase. A confirmed minimum can make an offer viable while another remains recommended; unchanged or worse terms are also recorded without a success claim.

The existing case library prioritizes missing commercial terms, interrupted work and evidence awaiting a comparison. Reasons appear on each case. This is a lightweight multi-ingredient worklist, not shared-freight or whole-basket optimization. Replies still lead the next-action card inside each case.
