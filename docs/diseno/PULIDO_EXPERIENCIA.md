# Procurement workspace · visual implementation plan

## Direction

A calm workspace for researching ingredients. Search first, supplier evidence next, with study tools alongside. The user can research without a quantity, recipe or purchase intent.

Palette: canvas `#F7F8F2`, white surfaces `#FFFFFF`, forest ink/action `#213D32`, muted text `#5D6C63`, sage `#E8EEDF`, citron selection `#DBEDAB`. Semantic warning, error and information colors remain distinct. Manrope is already served locally; use sentence case, 400–700 weights, tabular price numerals and left alignment. Desktop title 44px, mobile 32px, body 14–16px, supplier prices 30px.

```text
Desktop
[ Brand                                        My study ]
[ Ingredient search                      Region  Search ]
[ Results / example                  ][ Study & save     ]
[ Supplier, source, price, conditions ][ Ingredient list  ]
[ Supplier, source, price, conditions ][ Review document  ]

Mobile
[ Brand                              Study ]
[ Ingredient                               ]
[ Region ][ Search                         ]
[ Shortcut to list / file tools             ]
[ Supplier, price, source, select           ]
[ Save study / saved studies                ]
[ Ingredient list / document review        ]
```

Use a unified supplier list with thin separators, generous price alignment, restrained corner radii and a small original SVG crate mark. Keep unknown conditions next to the amount. Secondary document tools use a native disclosure, with the source and manual alternative available inside.

## Motion and interaction

One short entrance for the workspace, a short dialog entrance and color transitions for selection and controls. Native CSS is sufficient; no GSAP, Lenis or Three.js dependency. Respect reduced motion, retain native scrolling, never animate or reorder incoming prices. Keyboard focus remains visible and dialogs retain existing focus restoration.

## Adversarial pass before implementation

- The generated reference invents supplier photos, navigation and notes. Exclude them: they suggest functionality or evidence the product does not have.
- A palette change alone does not fix the page. Move optional tools out of the primary results column and collapse the document workflow until requested.
- A sidebar can become mobile clutter. Keep save controls compact and put results before the study and tools on narrow screens; the browser review confirmed that the initial save-first stack delayed the first supplier.
- A disabled search button needs an explanation, not a large duplicate research panel. Keep provider availability visible without implying a live search.
- Do not trade legibility for subtlety: verify text and control contrast, 320px reflow, keyboard use and the actual comparison/document dialogs.

## Image reference

Generated with the integrated image generation tool in this session. The tool does not expose a model version selector, so no GPT 2.5 version claim is made. The image is a design concept, not a screenshot of the implemented application.

Generation brief: a desktop and mobile Spanish restaurant procurement workspace, warm off-white, white, forest, sage and citron; local humanist sans typography; ingredient and region search, supplier rows with prominent normalized prices and secondary package prices, source and pending delivery/tax details, a compact study tray, and optional Excel/photo/PDF intake. Synthetic examples include PEN 4.44/kg for an 18kg package, PEN 5/kg for a 1kg package, and a supplier without a published price. No gradients, purple, glass, fake savings, marketing illustration or 3D.

## Verification

Chrome computer use reviewed the implemented desktop screen and a 390 × 844 responsive viewport, including search, the keyboard shortcut to intake, the manual/file dialog, quotation review and comparison setup. Browser feedback moved mobile results before saving and moved comparison quantity before save/recovery. Dialog headers remain visible while scrolling. Native device emulation is not a physical-phone test.

Contrast calculations: forest/white 11.81:1, muted/white 5.54:1, muted/canvas 5.19:1, muted/sage 4.68:1, control border/white 3.30:1 and forest/citron 9.40:1. Disabled-control opacity is excluded; no claim of a full accessibility audit.

The focused run initially passed 29 checks and lost the demo state during a development-server reload caused by an HTML edit. The subsequent stable run passed that demo. A separate local-worktree setup problem blocked three fixture CLI calls; an ignored configuration link to the verified anonymous backend at ports 3220/3221 corrected local resolution. No cloud configuration or provider credentials were changed. The final stable full-suite run passed all 51 browser checks.

## Adversarial implementation review

- The form has one default action: web research when enabled, synthetic exploration otherwise. A transport-boundary browser test covers Enter and the separate example action without contacting providers.
- Collapsing document tools must preserve their component state. Keyboard and draft-preservation coverage checks closing/reopening both the disclosure and dialog.
- Save/recovery callbacks, revision checks, unknown amounts, provenance, mail permissions and deterministic calculations were preserved. The full suite exercises the existing persistence and purchasing journey.
- Responsive layout uses one DOM instance for each save and input tool. No duplicate mutations, cloned controls or new animation libraries were added.


## Final local results

- 126 domain/backend tests passed.
- All 51 browser journeys passed in one stable run against the anonymous local backend, including the demo rehearsal, persisted document/reply reviews, 320/390/768/1280px reflow, keyboard document access, reduced motion and enabled-web-search submission through a simulated transport boundary.
- Typecheck, production build and static-hosting asset validation passed.
- Chrome computer use verified desktop and 390px mobile composition, intake and review dialogs, comparison setup and advisor context. Changing the synthetic quantity from 10kg to 20kg produced PEN 175 and PEN 100, as expected.
- No new runtime dependency, model call, supplier contact or cloud deployment in this UI delivery. Physical-device testing, restaurant usability validation and the complete real-provider acceptance flow remain pending.
