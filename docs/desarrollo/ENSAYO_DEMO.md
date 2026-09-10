# Under-three-minute demo rehearsal

This is the recording plan for the contest video. The proposed shot budget is **170 seconds (2:50)**, leaving ten seconds below the three-minute limit. It has not yet been rehearsed with a stopwatch, so none of the timings below are measured results.

The demo tells one continuous story: research one restaurant ingredient, preserve reviewed evidence in one study, compare compatible offers, ask the purchasing advisor what to do, then incorporate a quotation received through the approved test-email flow. A quantity is needed only when moving from research to a possible purchase. Selecting an offer or accepting AI suggestions never records a purchase.

## Evidence boundary for the recording

- The main Firecrawl shot must come from the final hosted acceptance run. Show the original URL, observation date, source classification and the explicitly read product page. A saved run is acceptable when introduced as a real run completed before recording; do not imply that a network request happened during the shot.
- OpenAI suggestions are proposals. Show literal evidence, make an evidence-supported correction when needed, and use the manual confirmation control. The deterministic totals and executive verdict remain the source for amounts; the AI interpretation explains the saved scenario and cites its active sources.
- AgentMail may use a reply received before recording because email latency is unpredictable. Say that it is a previously received test reply, and show that it remains linked to the approved request and the owned test recipient. Do not send a second message for the video.
- Keep every `Ejemplo simulado` marker visible if a fixture is used. Synthetic data may illustrate a second offer or a failure state, but it does not prove Firecrawl, OpenAI or AgentMail execution.
- Leave missing price, minimum, freight, tax, stock, delivery and coverage values pending unless the visible source or the operator explicitly confirms them. Do not describe cash difference as realized savings.

## Shot plan

| Budget | Screen action | Narration and proof |
| --- | --- | --- |
| **0:00–0:10 · 10 s** | Open the final hosted app on market research. Enter the chosen ingredient and Lima; do not provide a recipe, document or quantity. | “A restaurant can begin with one ingredient and a location. It does not need purchase history or a committed order.” |
| **0:10–0:38 · 28 s** | Open the prepared real Firecrawl research run. Show a catalog/contact classification with its cited evidence and warning, choose its product link, then show the child page produced by **Leer ficha del producto**. Keep the URL and observation date visible. | Explain that a search result is only a candidate. The product page is read separately before it can become a comparable offer; missing price or delivery stays pending. |
| **0:38–1:04 · 26 s** | Open **Revisar extracción** on the product page. Show proposed fields beside literal evidence, correct at least one field only if the page supports the correction, confirm the review and choose **Añadir al estudio**. Add a second compatible reviewed offer or a distributor with no published price that was prepared for the same ingredient and region. | “The model proposes structured fields; the buyer owns the correction and confirmation. The original proposal, edited value, source and date remain together.” |
| **1:04–1:22 · 18 s** | Open **Mi estudio**. Show the real/simulated provenance on every card, the no-price candidate as `Pendiente`, and the combined option count. Use **Guardar estudio**, reload or open **Guardados**, and recover it. | “Offers and distributor leads now live in one recoverable study. Saving evidence does not create a purchase.” |
| **1:22–1:56 · 34 s** | Compare the compatible reviewed offers. Enter the required quantity and confirm only the known minimum, freight, tax and delivery conditions. Open the advisor, set one concise decision context such as cash priority and budget, then use **Guardar escenario y pedir análisis de IA**. Hold on **Qué haría**, **Impacto en este pedido**, **Condición para decidir**, and the cited **Interpretación de IA**. | Read the executive verdict, one cash/coverage consequence and one unresolved condition. State that package counts, excess and outlay are deterministic; AI explains rather than replaces them. |
| **1:56–2:32 · 36 s** | Open the saved AgentMail request. Show the safe, owned test recipient, `Aceptado por AgentMail`, and the linked reply received before recording. Choose **Revisar como nueva oferta**, then show **Sugerir campos con IA** results and their evidence. Correct any unsupported field, manually confirm the offer and equivalence, and choose **Añadir a comparación actual**. | “This reply came from our owned test mailbox and stayed linked by the provider thread. AI proposes fields from untrusted email text; a person verifies them before the offer can affect the comparison.” |
| **2:32–2:50 · 18 s** | Save the changed comparison. Show that the previous choice or advisor analysis is stale until the updated scenario is reviewed, then finish on the new offer, source link and remaining pending condition. | “The new evidence updates the decision without inventing delivery or stock. Nothing was purchased, and every consequential step required review.” |

The editor may shorten loading or use a visible cut to a completed real run. Do not hide a provider failure, splice a synthetic success into a real claim, or narrate a pre-existing result as live. If any essential state cannot be read comfortably within its shot, simplify the narration rather than speed through the evidence.

## Rehearsal and recording checklist

### Provider and data readiness

- [ ] Confirm the exact OpenAI account and project intended for the demo; configure its server-side key and compatible extraction/advisor models on the verified target.
- [ ] Complete direct OpenAI API acceptance inside the app for Firecrawl-source extraction, advisor tool execution and reply-field suggestions. Luna CLI rehearsal is separate evidence and does not satisfy this item.
- [ ] Complete one final hosted journey on the intended release deployment: real Firecrawl discovery/product read, direct OpenAI review and advice, one explicitly approved AgentMail send to a display-safe owned test recipient, signed linked reply, and manual reply-to-offer confirmation.
- [ ] Preload only the same owned browser session and the approved test reply needed for the take. Remove credentials, private message bodies and unrelated customer data from every visible surface.
- [ ] Verify the empty-result and provider-failure states separately. They need not consume video time, but the final demo must not invent suppliers when a provider returns nothing.

### Take readiness

- [ ] Rehearse this exact path with a stopwatch and record the measured duration; the current measurement is pending.
- [ ] Confirm each real source, observation date, reviewed edit, option count, restored study, deterministic total, advisor source citation, AgentMail request state and reply linkage immediately before recording.
- [ ] Keep a short disclosure ready for any pre-completed Firecrawl run, pre-generated AI result or pre-received AgentMail reply used to avoid provider latency.
- [ ] Record at readable scale, review the final cut end to end, and verify its exported duration is below three minutes.

### Release and submission still remaining

- [ ] Run the final hosted acceptance checks for the public URL, assets, SPA reload, session isolation and signed webhook route.
- [ ] Review tracked files and history for secrets or private data, then make the repository public only with the author's release authorization.
- [ ] Upload the final video, verify that its link is accessible, and complete the contest submission. A local rehearsal, development preview or repository push is not submission evidence.
