# Surtario design and interaction

The visual identity supports a kitchen's sourcing work: legible evidence, restrained emphasis and clear next actions. The design must preserve meaningful distinctions between searching, reviewing, saving, messaging and deciding.

## Shared system

`src/styles/tokens.css` is the source of truth. Use the existing brand assets and `src/components/ui/` controls before adding a new visual pattern.

| Role | Token/value |
| --- | --- |
| Primary text/action | Aubergine `#42202D` |
| Canvas | Porcelain `#FAFAF7` |
| Brand surface | Radish `#EEC6D0` |
| Accent | Chili `#BA3527` |
| Supporting accent | Lime `#E4EF9B` |
| Headings | Bricolage Grotesque |
| Body and controls | Manrope |
| Content maximum | 96rem |
| Minimum control height | 44px |

Keep evidence rows aligned and readable. Separate a search header, its coverage and its candidate list through type hierarchy and spacing. Use a uniform outline when a region needs emphasis; avoid a default heavy left stripe, repeated shaded cards or competing primary actions. Reuse the palette; do not improvise a different theme for each feature.

## Task structure

- Exploration starts with ingredient/category and area. A quantity, document or recipe is optional.
- Selected options belong to My study. Saving, adding a selection and choosing an offer are distinct actions with distinct feedback.
- Global navigation has Overview, Explore suppliers, My study and Messages; all four remain accessible on mobile. Research a question is a contextual dialog from an ingredient or study. Saving opens a persistent research workspace with Overview, Messages, Sources and Activity; saved questions reopen from the study or Overview. Global section changes clear contextual return links, while browser Back restores the originating detail.
- Overview separates next steps, all sourcing work and recent decision updates. Empty decision history explicitly says no updates exist and explains which reviewed terms create an outcome. Do not display placeholder results.
- The global Messages entry exposes requests/replies directly. New replies do not silently change prices.
- Source review and short research questions fit focused dialogs. Keep the dialog header/close control available while the body scrolls.
- In comparisons, lead with cash required, received quantity, excess and unresolved conditions. Put detailed evidence and reasoning behind accessible disclosures, without hiding the main blocker.

No field may present missing data as zero. Currency, base unit and whether an amount is per pack or per order must be clear. No global “best supplier” styling when the outcome depends on a priority or incomplete terms.

## Responsive behavior

Use 1920 × 1080 as the desktop reference and inspect narrow layouts at 390 and 320px. Results and study rail stack on mobile; fixed headers/panels must not obscure the active task. Desktop sticky content needs visible clearance from navigation. Do not force a fixed page height or squeeze desktop columns into a phone layout.

Keep DOM, reading and keyboard order consistent. Menus must stay inside the dialog's focus layer; Escape closes the menu before the dialog. Return focus to the trigger when closing a task. In-form errors belong to the relevant field and preserve edits.

## Motion and states

Use the shared animated `Disclosure`, dialogs and segmented controls. Retain drafts when content collapses; closed regions must not expose hidden controls to the keyboard. Normal anchor/source navigation scrolls visibly, and `prefers-reduced-motion` removes motion without delaying the result.

The branded entrance belongs to landing → workspace, not F5 or direct workspace links. Research loading uses actual checkpoints/counters, restrained brand motion and a message during quiet periods. Pause decorative loading motion when disconnected, hidden or offscreen. Completion follows a real terminal checkpoint; failed/empty/partial results retain their own explanation. Do not interpolate financial figures or invent progress percentages.

Support initial, empty, busy, partial, disconnected, failed, saved and stale states. Keep visible focus using the brand focus token; never remove it to make a screenshot cleaner. Color is accompanied by text/icon meaning.

## Review expectations

For changed interfaces, inspect the actual UI on desktop/mobile, keyboard behavior, reduced motion and preserved drafts. Run the relevant existing regression checks and build. Screenshots and tool audit output are local work artifacts, not product routes or proof of full accessibility certification.

## Kitchen list to ingredient progress

Use **Import ingredient list** for the input and **Supplier quotes** for commercial-document examples. Explain the purpose in plain language. Review places the original beside editable rows on desktop and above them on narrow screens; uncertain names have an explicit review action. Selection and delivery area precede research, with one shared route for one or several ingredients.

Overview uses the existing type, plum/neutral palette, borders, focus tokens and spacing. Batch rows align ingredient, actual phase, available evidence and next action; mobile rows stack without hiding actions. Preserve selection and return position while opening a case. Show explicit empty/filter/error/limit states, keep available findings accessible and distinguish research from confirmed offers. Do not use simulated progress percentages or present source quantities as confirmed orders.
