# Perfeng Console — Material screen design review

[Open the design gallery](index.html) or [inspect the baseline comparison](report.html). The approved [wireframes and contract field inventory](../screen-review/README.md) remain the source for each screen's question, data fields and gaps. This packet gives those screens their Material presentation and keyboard behavior. Every page bears the **Design fixture only** label. All values are examples, including timestamps, identities, approval states and planned receipt fields.

## Implementation guidance

**Use the approved Angular Material designs as a guideline. Do not copy the gallery directly into the application.** Preserve the operator journey, evidence hierarchy, distinct unavailable and UNKNOWN states, and keyboard and focus behavior. Implement these outcomes with production Angular Material components and the pinned contracts under [ADR 0002](../../decisions/0002-ui-technology-stack.md). Adapt layout and spacing to real content and verify the result with the planned browser and accessibility checks.

Keep the exported HTML, generated Material classes, review CSS/JavaScript, screenshots and sample values in this design packet. They must never become application templates, runtime assets or fallback data.

## Review walkthroughs

| Journey | Pages | What to inspect |
|---|---|---|
| CI to audited rerun | [Sign in](session.html) → [source Run](run.html) → [comparison](report.html) → [review](rerun.html) → [receipt](receipt.html) → [child Run](child.html) | Execution COMPLETED remains distinct from regression FAIL. At 140 ms, the example passes its 200 ms requirement and exceeds its baseline by 40%. The child reuses the ordinary Run design. |
| Ordinary operations | [Find a Run](lookup.html), [create](create.html), [cancel](cancel.html), [catalog](catalog.html), [baseline lifecycle](baseline.html) | Require complete authorized selections. An absent inventory remains a gap. Review mutations before dispatch; an uncertain result requires reconciliation. |
| Diagnostics | [Health](health.html), [workers](workers.html), [observability gaps](gaps.html) | Startup readiness, live dependency state and scientific verdicts have different meanings. Static gap definitions survive a provider outage. |
| Post-pilot | [Service onboarding](onboard.html), [policy proposal](policy.html) | A reviewed Git change and its exact publication are separate milestones. |
| Optional verifier | [Scenario selection](lab.html), [campaign](campaign.html) | The historical export uses a separate shell. Implement Verification inside the Console with a distinct Material theme and a persistent maintainer label. Only authorized maintainers see its link. Synthetic observations do not receive real Run links. |

On any screen choose **Fixture state** to preview Example, Empty, Loading, Error, Backend unavailable, or UNKNOWN value. Browser history and bookmarked state fragments work. The gallery predates the single-browser decision; its separate verifier entrance is superseded. No network source, account, browser storage or real mutation backs any control. Transaction buttons stay disabled. “Preview confirmation” opens an inert review dialog on the rerun, cancel and campaign pages.

## Visual and component decisions

- **Toolbar and rail.** A Material toolbar provides a stable product identity and persistent fixture label within the header. The dark navigation rail groups Runs, Resources and Diagnostics. Post-pilot and verifier workspaces use separate entrances. A disclosure replaces the rail at 800 CSS pixels and below.
- **Evidence first.** Run detail leads with execution and the next evidence action. Comparison leads with the bound reference, candidate and signed difference. Numeric text is the source for the comparison bars, which are decorative. The research §27 sections remain in order below.
- **Tables and cards.** Outlined Material cards group related evidence. Native semantic tables preserve column headers and text verdicts. Long IDs and metric names wrap; scrollable table regions can receive keyboard focus. Use an interactive grid only if future tasks require cell navigation.
- **Colors and typography.** The local Azure Blue Material theme supplies the base Material tokens. Teal signals navigation/action, rust identifies an adverse verdict and pale blue separates contract notes. Each outcome also has a written label. System fonts, local assets and no animation keep review behavior deterministic.
- **What is a real component here.** Angular 22.2.4 templates were compiled in a temporary workspace and rendered with Material/CDK 22.2.6. The exported pages contain rendered MatToolbar, outlined MatCard, and MatButton markup, the local prebuilt theme and extracted component styles. The fixture selector, tables, landmarks and modal are native HTML. A small design-only script controls state, focus, disclosure and modal preview. No Angular runtime or build tool is required to open the export. The production implementation should use MatDialog/CDK focus handling and Material component harnesses under the accepted ADR's admission gates. [Accepted ADR](../../decisions/0002-ui-technology-stack.md) · [Material theming](https://material.angular.dev/guide/theming)

## Keyboard interaction

| Action | Keyboard behavior |
|---|---|
| Enter a page | First Tab reveals “Skip to content”. Enter focuses the main landmark. Page title and one h1 identify the location. |
| Navigate sections | Tab/Shift+Tab traverse native links in document order. Enter follows a link. The current destination is identified in the rail when present. On narrow screens, Enter or Space opens Workspace navigation. Escape closes it and returns focus to its trigger. |
| Change a state | Focus the labeled native select, use platform arrow/select keys, and commit the choice. One polite status announcement identifies the fixture shown. The selector keeps focus. If history changes the state while focus is in content that disappears, focus moves to the screen heading. |
| Review evidence | Headings, named tables and column headers expose the reading structure. Overflow table regions support native horizontal scrolling. The visual comparison bars contribute no duplicate announcement. |
| Preview a confirmation | Enter or Space opens the dialog. Focus moves to “Return to review”. Tab and Shift+Tab stay inside. Escape or the return button closes it and restores focus to the opener. |
| Handle real polling later | Preserve focus on stable rows across updates. When an actionable row disappears, clear its selection and move focus to a stable section/status. Restored rows must never silently reacquire approval. The exported fixture tests focus loss on state replacement. Production polling and live announcements still require implementation tests. |

## WCAG 2.1 AA review

| Criteria | Design treatment and remaining verification |
|---|---|
| 1.3.1 Info and Relationships; 1.3.2 Meaningful Sequence | One main region and h1, explicit headings, named navigation, label/value pairs and scoped table headers. Source order follows the task. Manually verify row/header association with assistive technology in the implemented UI. |
| 1.4.1 Use of Color; 1.4.3 Contrast; 1.4.11 Non-text Contrast | Verdicts and availability always include text. Measured examples: main text on white 14.73:1, supporting text on page 6.49:1, FAIL text on its badge 7.97:1, PASS text 7.37:1. Select border on white 4.41:1. Focus ring on white 7.64:1 and on the rail 8.58:1. Decorative card borders are not the sole signal of an action. |
| 1.4.4 Resize Text; 1.4.10 Reflow; 1.4.12 Text Spacing | Responsive rail and stacked evidence cards. At 320 CSS pixels the document fits the viewport; a genuinely two-dimensional table can scroll locally. Root text enlargement to 200% was checked on the comparison. Browser zoom, user text-spacing overrides and long translations need manual review in the product. |
| 2.1.1 Keyboard; 2.1.2 No Keyboard Trap; 2.4.1 Bypass Blocks; 2.4.3/2.4.7 Focus | Native activation, visible focus, working skip link, keyboard disclosure, focus return and Escape dismissal. A modal contains focus while permitting an explicit exit. |
| 2.4.2 Page Titled; 2.4.4 Link Purpose; 2.4.6 Headings and Labels; 3.2.3 Consistent Navigation | Stable product shell, distinct document titles, named fixture controls, meaningful action labels and repeated navigation order. The intentional state preview changes only its selected content. |
| 3.3.1 Error Identification; 3.3.2 Labels or Instructions; 4.1.2 Name, Role, Value; 4.1.3 Status Messages | Empty, invalid, unavailable and unknown have different explanations. Native buttons/selects and labeled dialogs expose their state. Use one concise polite live message per state switch. Production form errors must bind to the offending field and preserve safe input. |

### Evidence and limits

Chromium checked all 108 state views across 18 page examples, plus the directory. Axe-core 4.10.3 reported zero violations for its WCAG 2.0/2.1 A/AA tagged rules in the directory, all state views, and each of the three open dialogs. Checks exercised skip-link activation, history restoration, focus when a state disappears, modal trapping/dismissal/return and mobile menu dismissal. All 109 views passed the 320 CSS pixel document-width check. No external requests or page errors were observed.

These are checks of the exported designs. Screen-reader usability, all WCAG success criteria, the production Angular overlay/CSP integration, actual keyboard behavior with live polling and backend authorization still need product verification. A zero automated count is not a conformance claim. [WCAG 2.1](https://www.w3.org/TR/WCAG21/) · [Material button guidance](https://material.angular.dev/components/button/overview)

[Desktop comparison capture](comparison-desktop.png) · [Mobile comparison capture](comparison-mobile.png) · [Material license](LICENSE-Material.txt)
