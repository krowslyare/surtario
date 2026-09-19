# Surtario

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the person responsible for researching and purchasing ingredients for a restaurant. In a small operation this may be the owner, administrator, buyer, or chef; the role is not required to be separate.

The initial commercial customer is an unvalidated hypothesis: an independent single-location restaurant, especially in Lima, where the responsible person may work with paper, spreadsheets, photos, and WhatsApp while checking suppliers and preparing purchases.

## Product Purpose

Surtario helps a restaurant explore ingredient prices and suppliers, preserve the evidence behind a finding, compare offers, and optionally prepare a quotation or purchase decision. The product is useful when the person can recognize relevant alternatives, recover their sources and contacts, and continue the work without repeating the research.

Market exploration is autonomous: it does not require a recipe, purchase history, stock, a private document, a quantity, or an intention to buy. A purchase is an optional continuation, not the prerequisite for research.

## Positioning

Surtario is a traceable sourcing workspace rather than a marketplace or automatic purchasing system. It keeps the ingredient and market context, source, date, presentation, price, conditions, review status, and later decision connected so a person can judge an offer before acting.

This is a product position to validate, not a claim of being first, cheapest, or without competitors.

## Operating Context

- The default demo is English-first and uses the synthetic `Rice` example in Portland, Oregon, with USD and pounds. The Peru fixture remains available through `?example=pe`, preserving Spanish source material, PEN, and metric units.
- Each study keeps one ingredient, location, currency, unit, and market context. The product does not silently mix markets, convert currencies, infer tax treatment, or assume delivery coverage.
- The normal flow is explore market → review sources, prices, and contacts → select and save evidence → compare or request terms when needed.
- Supplier offers, market references, and completed purchases are different facts. Selecting an offer or saving a comparison does not place or record a purchase.
- The demo uses synthetic records and isolated browser sessions. Private restaurant documents and production customer data remain outside the enabled demo scope.

## Capabilities and Constraints

- Research may find distributors without published prices; missing price, weight, stock, minimums, taxes, freight, delivery, or equivalence remain pending rather than being invented.
- Comparisons initially cover one ingredient or specification per request and expose presentation, minimum, excess, cash outlay, and unit price when confirmed.
- Deterministic calculations are separate from AI suggestions. AI may extract or propose correspondences, but the person reviews and confirms them; sources and observation dates are retained.
- Optional flows include saved studies, document/list review, purchasing priorities, missing-condition scenarios, a bounded purchasing advisor, and an explicitly reviewed quotation email to a configured test recipient.
- Firecrawl, OpenAI, and AgentMail have separate provider gates and server-side credentials. Repository evidence records real Firecrawl search and AgentMail test-delivery/reply work, while direct OpenAI acceptance and the complete hosted provider journey remain separate verification gates.
- No recipe-based costing, inventory system, automatic purchasing, fiscal engine, general multi-country engine, or customer-data pilot is implied by the current product.

## Brand Commitments

- The product name is Surtario and its voice is direct, concrete, and operational.
- The application is English-first; original source quotations and Peru fixture content may retain their source language, while controls and generated explanations remain in English.
- The approved Surtario identity, bundled assets, and design decisions remain authoritative in `DESIGN.md`, `docs/diseno/UI_UX.md`, `docs/diseno/INTERACCION.md`, and the existing token files. This record does not replace those visual sources.

## Evidence on Hand

- Synthetic Rice/Portland and Peru fixtures, deterministic comparison rules, saved-study flows, and browser journeys are present in the repository.
- The repository records development walkthroughs that exercised real Firecrawl search, reviewed evidence, AgentMail test delivery/replies, comparison, selection, and reload recovery. These records are not evidence of commercial adoption, savings, market coverage, or final contest readiness.
- OpenAI extraction/advice and the combined hosted Firecrawl → OpenAI → AgentMail journey remain explicitly unverified where the current stage documents say so.
- There is no validated restaurant pilot yet. Do not fabricate customers, testimonials, savings, benchmarks, demand, or provider coverage.

## Product Principles

1. Preserve the source, date, and review state behind every important number.
2. Keep unknown critical terms visible and pending; never infer them from language, location, or a generic supplier pattern.
3. Let people explore and compare before asking them to buy, send, or commit.
4. Separate facts, calculations, AI proposals, user confirmation, and completed external actions.
5. Keep demo data isolated and protect private documents, credentials, recipients, and production operations behind explicit enablement gates.

## Accessibility & Inclusion

The web experience must reflow across mobile and desktop, preserve visible keyboard focus, provide touch targets of at least 44px where applicable, and respect reduced-motion preferences. Existing responsive checks do not constitute a complete accessibility audit or physical-device certification.
