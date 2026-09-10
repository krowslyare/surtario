# Firecrawl source-quality validation

Seven real provider attempts ran on September 10, 2026, between 03:42 and 03:44 UTC, through the existing operator-only `discovery:probe` on the dedicated Convex development deployment. This is September 9 in Lima. Firecrawl recovered useful catalog content, but the current discovery flow is not yet reliable enough to promise comparable prices across ingredients.

## Method and boundaries

- Five initial cases: rice, oil, chicken, potato and a deliberately nonexistent ingredient. Two additional, explicitly targeted queries tested search refinement after inspecting the first results.
- The deployed adapter called Firecrawl `/v2/search` with Peru/Lima targeting, three results and Markdown scraping. It retained up to 20,000 characters per page. It does not follow product links, assess relevance or distinguish an error page from useful content.
- The provider checkout predates the local rehearsal transport wrapper on `main`; the query, parser, limits and timeouts are otherwise unchanged. No backend code was pushed or deployed for these probes.
- Timings below include the Convex CLI, authentication, network and action. They are not isolated Firecrawl service latency. One attempt timed out at the existing 25-second application boundary and was not retried; its provider credit consumption is unknown.
- An operator inspected returned Markdown and cross-checked selected supplier pages through a separate web reader. This was not an automated OpenAI extraction run, a browser purchase test or a representative market benchmark. Original page readers can also use caches.
- No quote, email or WhatsApp message was sent. The internal action did not write studies or offers. Raw responses stay in ignored local evidence; only public URLs, measurements, hashes and assessments are versioned in [the evidence manifest](evidence/firecrawl-2026-09-10.json).

## Results

| Query before the adapter's supplier/location suffix | Wall time | Result | Assessment |
| --- | ---: | --- | --- |
| `arroz extra 50 kg` | 3.68 s | Costeño corporate catalog, Mundo Abarrotes category, Makro category | Useful discovery. Mundo Abarrotes preserves product/price associations; Costeño has presentations without prices; Makro contains conflicting price/unit text and is truncated. |
| `aceite vegetal 20 L` | 7.42 s | Facebook post, Monte Sol homepage, Kompass directory | One unreadable social result. Supplier/contact discovery is possible, but no unambiguous priced 20 L offer was found in the retained content. |
| `pollo entero` | 5.27 s | Avigroup homepage, Instagram profile, Redondos product | WordPress error, unreadable social result and one useful specification page without a price. |
| `papa huayro` | 5.38 s | Two Facebook results and Bottato product page | Social results have no Markdown. Bottato supplies a contact/catalog route without a price; separate page inspection identifies processed potato, requiring an equivalence check. |
| `ingrediente inexistente zxqv-7842` | 12.70 s | Industrial supplier, food-import regulation PDF and consumer-arbitration registry PDF | All three are irrelevant to the invented ingredient. The adapter nevertheless reports a successful search without a provider warning. |
| `"arroz Brilhante extra 50 kg" site:mundoabarrotes.com/producto/` | 2.11 s | Zero sources | A known product page exists, but this query returned nothing. Search operators and exact phrases are not a sufficient fallback. |
| `"aceite vegetal" "20" -site:facebook.com -site:instagram.com` | 26.64 s | Application timeout | Refinement did not return an observable result within the existing limit. No automatic retry or timeout increase. |

The five initial searches returned 15 sources: four had no Markdown, one contained a site error, two were truncated, and all three negative-control results were irrelevant. These categories are not all disjoint. A nonempty response and `warning: false` do not establish usable evidence.

## High-signal findings

1. **Readable prices exist.** The [Mundo Abarrotes category](https://mundoabarrotes.com/etiqueta/arroz-50-kilos/) paired Brilhante Extra 50 kg with PEN 208. The [individual product page](https://mundoabarrotes.com/producto/arroz-brilhante-extra-50kg/) independently displayed the same presentation and amount in the web reader. This is an observed published price, not a confirmed delivered quote. Tax, freight, minimum, availability and offer validity were not established.
2. **Category labels cannot supply package size.** That same 50 kg category includes 49 kg products. Some image descriptions retain 50 kg while the linked product title says 49 kg. Old/current prices and sold-out products also appear together. Literal citation validation alone cannot establish that a price belongs to the intended variant or is orderable.
3. **Nonempty text can be unusable.** Avigroup returned a WordPress critical-error message. The retained Makro category placed a 50 kg product beside PEN 198, repeated PEN 7.90/kg and unrelated unit-price text. Their arithmetic is inconsistent; the cause could be page templates, rendering or scraping. This run does not attribute it to a specific layer, and those figures must not become a confirmed offer.
4. **Contact-only results have value.** Monte Sol includes product and quotation/contact links. Bottato's short response includes WhatsApp and a PDF catalog. These are research leads, not zero-priced offers. Monte Sol also shows a difference between one displayed phone number and its linked WhatsApp destination, so automated contact extraction should preserve conflicts for review rather than choose silently. No contact values are included in this report.
5. **Product form matters.** Redondos describes a chicken product with a weight range, not one exact package weight. Bottato describes pre-fried/frozen products on its site. Neither can be assumed equivalent to an unspecified fresh ingredient.
6. **Freshness is separate from observation.** The action's timestamp records when we received the result, not when the supplier updated it. The adapter does not override Firecrawl caching or retain a supplier-validity date. [Firecrawl documents caching and freshness limitations](https://docs.firecrawl.dev/features/scrape#caching-and-maxage).

## Follow-up planned at the time of this probe

The bounded source-analysis and product-read slice below is now implemented locally. Its real scrape, Luna replay, tests and remaining limits are recorded separately in [source analysis evidence](FIRECRAWL_SOURCE_ANALYSIS.md). The observations above describe the original deployed adapter.

1. Classify readable product evidence, a catalog needing product selection, contact-only sources, unreadable/error pages and irrelevant results before offering price extraction. Keep contact-only discovery useful. Do not hardcode these suppliers as the product's only supported sources.
2. Let the user select a product link from a discovered catalog and read that public page with a bounded same-site follow-up. Preserve the source relationship, timestamp and truncation state. The failed exact-search experiment supports trying direct reading rather than repeating search indefinitely; a real `/scrape` acceptance test is still required.
3. Extract only the selected product's evidenced fields; flag conflicting presentation, price, unit or availability. Preserve unknown terms and user confirmation before comparison. Refresh selected evidence with an explicit freshness policy before presenting a current purchasing recommendation.
4. Re-run these counterexamples, then exercise the actual extraction/confirmation path. Acceptance requires the negative case to yield no relevant evidence, broken pages to stay out of price extraction, missing prices to remain pending and the selected product amount/presentation to match the source. An empty search must never mean no supplier exists.

Stages 2–4 remain open. The prior synthetic Luna rehearsal does not establish performance on these real inputs. This validation adds provider-quality evidence and does not close hosted acceptance.

## Email channel fit: United States and Peru

Email quotations are a documented supplier workflow in the United States. [FoodServiceDirect](https://support.foodservicedirect.com/hc/en-us/articles/1260803524649-How-do-I-request-bulk-vs-wholesale-pricing) accepts emailed requests for 50 or more cases and describes a typical response within three business days. [WebstaurantStore](https://www.webstaurantstore.com/request-quote.html) supports personalized quotations and emailed PDF quotes generated from a cart. These examples establish channel availability, not its market share or suitability for urgent replenishment. [US Foods MOXē](https://www.usfoods.com/how-we-help-you/easy-ordering/moxe-help-center) also supports ordering through its own platform.

For this product, AgentMail fits approved requests for unpublished prices, terms or catalogs when the supplier uses email. The Peruvian sources in this run also expose WhatsApp routes. Preserve channel choice and the manual WhatsApp path; do not require suppliers to adopt email. Automatic email extraction and attachment handling remain separate unimplemented improvements, and no supplier was contacted during this research.
