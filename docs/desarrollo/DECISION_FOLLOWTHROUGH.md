# Finding → question → confirmed answer → decision

The missing-delivery insight now closes the loop inside the comparison. Its first supported case is an offer whose only missing term is freight, with a complete same-currency benchmark. It does not infer other missing terms or use AI text as an instruction.

The question contains the supplier, ingredient/specification, actual whole-pack order, and calculated delivery boundary. An operator can copy it and try an amount. The preview shows both the hypothetical total and the before/after recommendation from the existing deterministic advisor, using the current priority, budget and coverage constraints. A lower order total does not silently override a unit-price preference, and a new answer does not remove an unresolved budget constraint.

A separate checkbox confirms that the supplier supplied this final delivery amount, including tax. Editing the amount clears confirmation. Applying it changes only freight, preserves original source evidence, and recalculates the current decision without selecting an offer, placing a purchase or sending a message. Invalid or stale questions cannot be applied. Invalid advisor input blocks confirmation rather than silently falling back to another decision context.

The resulting panel connects the missing term, prepared question, operator-confirmed answer and before/after recommendation. It distinguishes changed and unchanged recommendations. The updated comparison can be saved with the existing owned-session persistence; after reload, the confirmed freight remains. The before/after recap is current-view state, not a persistent decision-history ledger. Changing the comparison or advisor context hides an inapplicable recap. Generated advisor narratives retain the existing invalidation rules and require an explicit new analysis.

## Verification

The local pass has 205 unit/backend/configuration tests passing. New cases cover amounts below, at and above the boundary; a unit-price priority that differs from minimum outlay; a budget that still blocks a decision; stale questions; and preservation of other offer fields. Frontend/backend TypeScript checks and hosting build checks passed.

Seven focused browser journeys cover the existing advisor's persistence/staleness/quantity/mobile behavior plus the new confirm-and-save flow. The new journey verifies that hypothetical amounts do not alter the quote, changing an amount clears approval, the actual unit-price priority reaches the preview, confirmation moves focus to the result, and the saved delivery survives reload. Desktop and 390 px captures show the before/after panel without horizontal overflow. The baseline English integration previously passed all 64 browser journeys; this entry does not present that older full-suite run as a new one.

No schema, authentication, provider configuration or external mail operation is added. The existing bundle-size warning remains. Private accounts/documents, complete hosted-provider acceptance and video recording retain their separate release gates.
