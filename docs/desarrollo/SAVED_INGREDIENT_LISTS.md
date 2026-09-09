# Saved ingredient lists

The public demo can persist the reviewed ingredient names from manual entry or
an XLSX/CSV ingredient column. A saved list can be reopened after a reload and
replaces the current local ingredient queue.

## Stored contract

`ingredientLists.save` accepts the browser capability token, a UUID-shaped
idempotency key, one to 100 reviewed names, and the source kind `manual` or
`spreadsheet`. Each trimmed name must contain one to 120 characters. The server
derives the read-only source label; clients cannot supply it.

The database stores only the capability hash, idempotency key, reviewed names,
source kind, and update time. It does not receive or store file bytes, file or
sheet names, raw rows, other spreadsheet columns, prices, quantities, or
document transcriptions. Photo/PDF transcription remains local to the tab.

Retries with the same capability and idempotency key return the original list
only when the payload is identical. A changed payload is rejected. Reads are
isolated by capability. Capacity is bounded to 100 names per list, 10 lists per
browser session, and 100 lists across the demo.

The interface labels this as synthetic public-demo storage. Reopening a list
does not create a market study, offer, purchase, or source record.

## Local verification

121 combined domain/backend tests, build and ten focused browser checks passed on an isolated local Convex backend. Browser coverage includes reload recovery and a delayed save response arriving after the queue has been replaced. Session isolation, input bounds and immutable idempotent retries are tested in memory. Source metadata after recovery describes the saved list; it does not pretend that the original file is still available.
