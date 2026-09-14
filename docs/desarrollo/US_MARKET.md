# US market delivery

The default sample experience uses English interface copy, `Rice` in `Portland, OR, US`, USD and explicit US mass units. Its fictional offers are a 25 lb bag for $20, a 50 lb bag for $35 and a distributor without a published price. Taxes, freight, minimum order and availability remain unknown unless explicitly supplied. Peru examples and PEN remain supported in the same product through their own calculation and persistence context. Language does not establish supplier delivery coverage, product equivalence or tax treatment.

## Sources inspected on September 12, 2026

These are manual web inspections by the development agent, not calls made through the application's Firecrawl integration. They are candidates for a real provider acceptance test, not frozen offers in the product.

- [WebstaurantStore, Gulf Pacific long-grain white rice, 25 lb](https://www.webstaurantstore.com/gulf-pacific-white-long-grain-rice-25-lb/112WHTLG25.html): the page exposed a 25 lb pack and USD 18.99 regular price, alongside quantity tiers. Freight, final tax and delivery to a chosen location were not confirmed. Extraction must not mix the regular price with a discounted tier.
- [US Foods CHEF'STORE, Fiesta long-grain white rice](https://www.chefstore.com/p/fiesta-rice-long-grain-white_2076144/): a 25 lb presentation was discoverable. Store-specific price and availability need inspection for the chosen store. A search snippet alone is not accepted as a confirmed offer.

The Portland rice example uses fictional suppliers and prices, independent of those observations. It remains visibly labeled; no supplier name, current quote or receipt is fabricated from these pages.

## Contract

- Mass conversion: 1 lb = 0.45359237 kg; 1 oz = 0.028349523125 kg; 16 oz = 1 lb. Source: [NIST Handbook 44, 2026, Appendix C](https://nvlpubs.nist.gov/nistpubs/hb/2026/NIST.HB.44-2026.pdf).
- `oz` means mass. Fluid ounces, gallons and unweighted cases remain unsupported pending explicit conversions and evidence. No density or package-content inference.
- Search uses the supplied area. Explicit US/USA/United States suffixes select US discovery; legacy Lima/Arequipa/Cusco retain Peru. An unspecified country is not silently replaced with Peru.
- Product-page reads retain the originating research location, exact selected URL, ownership, provenance checks and existing request limits.
- Each saved example study belongs to its server-owned ingredient/location context. Cross-market selections are rejected. Reviewed live sources remain separate from sample data.
- A comparison uses one currency and compatible units. There is no implicit foreign exchange, tax calculation, delivery assumption or general country engine.

## Verification boundary

Unit/backend tests verify conversion, persisted values and mixed-context rejection. Browser checks must additionally verify English labels, lb/oz choices, US study recovery, the adviser and responsive layout after the UI is integrated. These checks do not prove a live provider call.

The existing cloud development preview was queried read-only on September 12: public research and advisor capabilities were disabled. This delivery does not enable billing, provider gates or external mail by changing interface copy. Direct OpenAI acceptance, a combined hosted provider journey and authenticated private-workspace acceptance remain separate from local tests and PR checks.
