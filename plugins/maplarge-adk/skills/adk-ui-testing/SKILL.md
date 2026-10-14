---
name: adk-ui-testing
description: Authoring and running Playwright end-to-end tests against a MapLarge
  ADK extension's dashboard — scaffolding the suite, pointing it at the dev server,
  authenticating, locating Raptor controls by test id, driving switches,
  dropdowns and sliders, pacing drags, hovers and right-clicks on a map,
  asserting against asynchronous filters and canvas-rendered charts, keeping a
  suite that writes data clean, and proving a test can fail.
  Use when adding, editing, debugging, or reviewing UI tests for an ADK extension,
  or when a suite passes while the feature is broken. Triggers on "playwright",
  "ui test", "e2e test", "smoke test", "adk new feature playwright",
  "playwright.config", "getByTestId", "testIdAttribute", "data-test-id",
  "slider test", "drag on the map", "hover test", "cannot automate this control",
  "flaky test",
  "test passes but the page is empty", "/adk-ui-testing".
metadata:
  owner: "Victor Olivo <victor.olivo@maplarge.com> · AI Resource Team"
  provenance: "ARC-68"
  verified-against: "MapLarge Server 4.131, 4.136 and 4.139 / ADK CLI 1.0.92 / Playwright 1.5x, suites run live 2026-10-01 (ARC-68)"
---

# ADK UI testing with Playwright

This skill covers end-to-end tests that drive a MapLarge ADK extension's dashboard
in a browser: scaffolding the suite, authenticating against the server, locating
Raptor controls, and writing assertions that survive the framework's asynchronous
rendering. It does **not** cover how to build the controls being tested — for
views, view models, bindings and node options use the `raptor` skill, and for
charts use `echarts`. For building, running and deploying the extension itself,
use `adk-extension-dev`.

## Grounding

A suite lives beside the extension it tests:

```text
extensions/{ext}/playwright/
├── playwright.config.ts
├── .env                  # gitignored: base URL and credentials
├── .env.template         # committed: the keys, never the values
└── tests/
    └── {name}.spec.ts
```

Scaffold it with the one feature template that exists:

```bash
maplarge adk new feature playwright -e {ext}
```

**Repair two things in the generated output before writing any test.** The
template ships a `playwright.config` project name containing a literal
`#BROWSERTYPE#` placeholder with no substitution, and the stock `playwright.dev`
demo spec rather than anything pointed at the extension. Replace the placeholder
with a real project name (`chromium`) and delete the demo spec. A suite left on
the demo spec passes without ever loading the extension, which reads as green
coverage where there is none.

Run the suite from the `playwright/` directory, never from the extension root —
the config lives there, and running a directory above it makes Playwright load the
spec files without the config, failing with *"Playwright Test did not expect
test() to be called here."*

```bash
cd extensions/{ext}/playwright && npx playwright test
```

## Point the suite at the running server

`playwright.config.ts` reads a base URL from the environment. It must match the
port the dev server was actually started on:

```bash
maplarge adk run -extensions {ext} -httpsPort 9443   # PLAYWRIGHT_BASE_URL=https://localhost:9443
```

When a repository holds more than one extension and each is served on its own
port, a stale base URL points the whole suite at a different extension. Every
test that loads the dashboard then fails while tests that never load it still
pass — a split that looks like a broken feature and is a wrong port.

Read the browser's own address before diagnosing anything else:

```ts
console.log(page.url());
```

Two further environment rules, both of which produce green runs against stale code:

- **Restart the dev server after every source edit.** `adk run` cannot be relied
  on to recompile; the served bundle keeps its startup timestamp while the server
  answers `200`. Confirm an edit reached the bundle before trusting a result:
  `grep -c "a-string-you-just-added" .adk/www/scripts/_{ext}.js`
- **Never rebuild while a suite is running.** A run whose bundle changes underneath
  it proves nothing, in either direction.

## Authenticate

Two routes. Probe which one the target server supports rather than assuming:

**Token in the query string.** `maplarge login -profile {profile}` writes a token
into the CLI profile; pass it and the user as `mluser` and `mltoken` query
parameters, and the dashboard skips the login form. Prefer this — it is one line
and has no shared state.

```ts
const url = `${ROUTE}?mluser=${encodeURIComponent(user)}&mltoken=${encodeURIComponent(token)}`;
```

**A sign-in setup project.** On servers where `maplarge login` returns no token,
sign in through the form once in a setup project and reuse the stored
`storageState`. Make it a project dependency rather than a global setup, so a
failed sign-in is reported as the failing step it is instead of as every test
timing out.

Tokens expire. When one does, the suite lands on the server's home or login page
and every dashboard assertion fails for a reason unrelated to the code. Assert
the landing explicitly so the failure names itself:

```ts
await expect(sidePanel, "the dashboard never appeared — if this is a login form the stored token has expired")
  .toBeVisible({ timeout: 45_000 });
```

When credentials are missing or nothing answers at the base URL, skip with a
reason that names what is missing and how to supply it. Report a skipped suite
as a configuration finding. It is not a pass.

Credentials live in a gitignored `.env`, with a committed `.env.template` listing
the keys and no values. **NEVER commit a token or password**, and never paste the
output of `maplarge config list-profiles` into a ticket or PR — it prints stored
passwords in plaintext.

A token passed in the query string is also written into the Playwright trace of a
failing run, in both its action log and its network log, and the HTML report
embeds that trace. The scaffolded config sets `trace: "retain-on-first-failure"`,
so any failing token-authenticated run produces one. Do not share that report or
upload it as a CI artifact. Where reports are published, authenticate through
the sign-in setup project instead.

## Locate controls by test id

Every Raptor view definition accepts `testId`, which renders as a `data-test-id`
attribute, and the scaffolded `playwright.config.ts` already sets
`testIdAttribute: "data-test-id"`. Set `testId` on the control and locate it with
`getByTestId`:

```ts
// view
s.input({ inputType: "text", testId: "asset-search", placeholder: "Operator name" });

// test
await panel.getByTestId("asset-search").fill("CHEVRON");
```

Use this rather than a CSS class or a DOM `id` as the hook. A DOM `id` also
works if the config's `testIdAttribute` is changed to match, but `testId` needs
no config change, may repeat where a component is rendered more than once, and
is the same attribute the platform puts on its own controls' parts, so one
`getByTestId` reaches both. The attribute lands on the
control element itself rather than on a wrapper, so there is no guessing between
`input.my-class`, `.my-class input` and `input[type=text]`; and some nodes — the
drawing toolbar among them — drop `customCssClasses` entirely while still
honouring `testId`.

The platform's own controls also carry `data-test-id` attributes, including
composite controls that expose their internal parts. Before concluding that a
control cannot be driven from a test, list what it actually exposes:

```ts
await page.evaluate(() => [...document.querySelectorAll("[data-test-id]")]
  .map(e => `${e.tagName.toLowerCase()}#${e.getAttribute("data-test-id")}`));
```

**Name the control you mean.** A positional locator such as
`getByRole("button").first()` is a guess about layout: a dialog header carrying
three buttons will hand back the wrong one, and the test then performs a
different action than its name claims while still passing.

**A hidden control is still in the page.** A `visible` binding hides a node with
the `d-none` class rather than removing it, so `toHaveCount` proves nothing about
it: assert `toBeVisible` and `toBeHidden`. A `foreach` that shrinks likewise
leaves a surplus hidden row carrying the previous last row's id, and a bare
locator then matches two elements. Scope a row locator with `:not(.d-none)`.

**Assert an icon by its `svg` child, not by its button.** A button given an icon
key the platform does not know still renders, visible and clickable, with nothing
inside it. Check the `svg` and its `mlsvg-key` attribute:

```ts
await expect(row.getByTestId("row-delete").locator("svg[mlsvg-key='ml-trashcan']")).toBeVisible();
```

One id may legitimately repeat — a component rendered once per data source gives
each copy the same id. Scope through the container rather than making ids unique:

```ts
const panel = page.getByTestId(`asset-panel-${source}`);
await panel.getByTestId("asset-count").textContent();
```

## Drive switches, dropdowns and dialogs

**A switch is a checkbox.** Raptor renders a real `input[type=checkbox]`, so use
`check()`, `uncheck()` and `toBeChecked()` on the control's test id. Where the
visible element is a styled wrapper over the input, `setChecked(value, { force:
true })` reaches it.

**A dropdown's options are not inside the dropdown.** `quickSelect` renders its
options as list items in a floating popup attached elsewhere in the page, so a
locator scoped to the control finds none. Click the control, then pick the item
from the page. When the pick is inside a retry, press Escape first so each
attempt starts closed. Otherwise a retry toggles the list shut instead of
reopening it:

```ts
await page.keyboard.press("Escape");
await page.getByTestId("locality-filter").click();
await page.getByRole("listitem").filter({ hasText: /^Gloucester County$/ }).click();
```

**Fill text inputs with `fill()`**, and send individual key presses only when the
keystroke handling is itself under test.

**Assert on the dialog you opened, by its test id.** Counting `.modal` nodes
counts the platform's own dialogs too.

## Drive a slider from its handle

A Raptor slider is a web component, and the two obvious ways to drive it both
mislead. Typing into its text boxes with `fill()` can collapse a range slider's
two ends onto one value, and a pointer drag along its track can leave the handle
where it was. Either result reads as a control that cannot be tested.

Its handles carry the platform's own test ids: `thumb-1`, and in range mode
`thumb-2` for the upper end. Focus a handle and press an arrow key. Each press
moves it one `step`, which is also how a keyboard user moves it:

```ts
const lower = page.getByTestId("population-slider").getByTestId("thumb-1");

await lower.focus();
await page.keyboard.press("ArrowRight");
await expect.poll(() => layerCount(page, "Precincts")).toBe(2345);

await lower.focus();
await page.keyboard.press("ArrowLeft");
await expect.poll(() => layerCount(page, "Precincts")).toBe(2373);
```

Wait for the effect of one press before sending the next. A press that lands
while the page is still re-rendering from the previous one can be lost, so a
test that sends four in a row and asserts the fourth value can fail
intermittently.

To read the slider's own position, read the element's `value` property rather
than using `toHaveValue`. It is an array with one entry per handle.

Move the handle back in the same test. Moved from the keyboard, a slider hands
the view model **the same array on every change and edits it in place**. A view
model that stores that array, then compares the next value against what it
stored, is comparing the array with itself: its "nothing changed" check drops
every keyboard change after the first. A mouse drag still works, so the defect is
invisible to anyone checking by hand with a mouse, and a test that only moves the
handle one way passes against it. The repair belongs in the view model, which
keeps and hands out copies (`[...value]`) instead of the slider's array.

## When a control cannot be driven

Work down this list before deciding a control is out of reach:

1. List the test ids the page exposes (the snippet under *Locate controls by test
   id*). Composite platform controls often expose the part to act on.
2. Try the keyboard before the pointer. A control that takes focus usually
   responds to arrow keys, Enter or Space, and a key press has no coordinates to
   get wrong.
3. Read what the control did, not only what the page shows. An element's own
   `value`, or the events it dispatches, separates "the control did not move" from
   "the control moved and nothing listened".

If nothing works, keep the test and mark it `test.fixme` with the reason, rather
than deleting it. A parked test records that a shipped control has no automated
guard; a deleted one hides that. Check the behaviour by hand, and report the
control: the repair may be an id or a keyboard path the control should expose,
which no test-side technique can supply.

This skill has no recipe for trackpad pinch or for wheel zoom on a map. Treat
those as unverified until someone has driven them successfully.

## Assert against asynchronous state

Applying a filter, reloading a data source and recomputing a count are all
asynchronous, and no DOM event marks the end. Reading immediately after an
interaction returns the previous value.

Poll, and let the polling own the retry:

```ts
await expect.poll(() => panelCount(page, "pipelines"), {
  message: "typing an operator did not narrow the layer — the box is not reaching the data source",
  timeout: 30_000,
}).toBe(1846);
```

Do not wrap a click and its assertion in a retry that re-clicks. A toggle clicked
twice returns to its original state, so the retry alternates forever and never
settles — the failure then reads as a control that cannot filter.

Assert the exact number the control computes, not a bound. `toBeLessThan(total)`
also passes when the filter matched **nothing**, which is what a rejected
comparison or a filter naming a column that does not exist leaves behind. A filter
on a missing column is logged as a console *warning*, not an error, and the layer
carries on showing everything — so do not filter the console to errors while
chasing a silent failure.

A negative assertion needs a settle window. Polling for "nothing happened" passes
on its first attempt, before anything could have happened. Wait a bounded, named
interval first, and say in a comment what it waits out:

```ts
/** Longest the dashboard takes to log a boot error after its first paint. */
const BOOT_SETTLE_MS = 3000;

await page.waitForTimeout(BOOT_SETTLE_MS);
expect(consoleErrors).toEqual([]);
```

That is the one sound use of a fixed wait. A wait added because a test "was flaky
otherwise" is an unfixed race.

Read through the page when the DOM does not show the state. `page.evaluate` can
run a query or read a layer's live definition, which tells a filter that never
applied apart from one that applied and drew nothing:

```ts
const rows = await page.evaluate(async () =>
  (await ml.query().from("{account}/{table}").take(-1).runAsync()).data.totals.Records);
```

Use this for reading. Setting state through the runtime skips the code path the
user takes, so it proves less than the same step done through the control.

When a test exercises two features together, assert a number belonging to neither
input on its own. If filter A alone leaves 9,922 rows and filter B alone leaves
1,846, then asserting 975 proves they combined; either input's own number would
mean one had replaced the other.

## Assert that it drew

A chart can report every correct number while mounting no canvas at all, and a
layer can fetch its data successfully over a map that paints nothing. Counts and
rendering are independent, so check both:

```ts
const canvas = panel.getByTestId("status-chart").locator("canvas").first();
await expect(canvas).toBeVisible();
const box = await canvas.boundingBox();
```

Ask a chart where its marks are instead of computing pixel offsets. Plot margins
are whatever the chart type resolved them to, which is not what the view declared,
so a click computed from assumed margins lands on the neighbouring mark:

```ts
const x = chart.convertToPixel({ xAxisIndex: 0 }, category);
```

A coordinate calibrated against one layout breaks the day a label is added. Where
an interaction has to be driven by coordinates, such as dragging on a map to draw
a shape, compute them from the element's bounding box and pace the gesture as
*Pointer gestures on a map* describes.

Prefer an assertion the framework cannot satisfy by accident. A layer's tile URLs
name every layer drawn in them with a hash covering that layer's style, so
re-reading the tile images' `src` detects a restyle; watching for a network
request does not, because re-showing a layer returns to a tile combination the
browser has already cached and sends nothing.

## Pointer gestures on a map

Dragging, drawing, hovering, right-clicking and rotating on a map each need a
real pointer and deliberate pacing, and each fails silently without it. Read
`reference/map-gestures.md` before writing any of them. The rule that matters
most: **pace every drag**. The map ignores a drag delivered in a single frame, so
press, pause, move through intermediate points with a pause between each, then
release.

## Suites that write data

A suite that creates rows on a shared server needs a run marker, cleanup that
survives a failing test, and assertions scoped to its own rows. Read
`reference/writing-suites.md` before adding a test that saves anything.

## Prove each test can fail

A test that cannot fail is worse than no test, and the failure mode is quiet: a
locator matching nothing makes `toBeHidden()` and `toHaveCount(0)` pass.

Break the production code, confirm the test reds, restore, confirm it greens.
Break it with a wrong implementation rather than an empty one, since a test
that only notices a missing feature says little.
Where a suite makes several distinct claims, break each claim separately — one
break that reds everything proves only that the tests notice a dead feature, not
that each assertion measures what its name says.

Test the reverse step. A search that applies but never releases, a base map that
can be switched away from but not back, a dialog that opens but throws on reopen —
each of these passes a one-way test. Close the thing, clear the filter, toggle it
back on. Then press it again: a control that works once and then sticks passes
the one-way test and the reverse step both, and only a second press catches it.

## Examples

A user asks: "add a test that the locality filter narrows the address layer."

```ts
test("filtering by locality narrows the addresses and nothing else", async ({ page }) => {
  await openDashboard(page);
  const precinctsBefore = await layerCount(page, "Precinct Boundaries");

  await page.getByTestId("locality-filter").click();
  await page.getByRole("listitem").filter({ hasText: /^Gloucester County$/ }).click();

  await expect.poll(() => layerCount(page, "All Addresses"), {
    message: "the locality filter did not reach the data source",
  }).toBe(18795);
  expect(await layerCount(page, "Precinct Boundaries")).toBe(precinctsBefore);
});
```

Exact count, polled, plus an untouched source to prove the filter is scoped.

A user asks: "the chart test passes but the chart is blank."

Counts and rendering are independent. Add a rendering assertion beside the count,
and open one collapsed section rather than all of them — opening a later section
can mount an earlier section's chart and hide the defect:

```ts
await panelHeader(page, "Pipelines").click();
await expect(panel.getByTestId("status-chart").locator("canvas").first()).toBeVisible();
```

A user asks: "why does my test pass when I break the feature?"

Print what the locator resolved to. A hook that was renamed, or never rendered,
yields an empty locator that satisfies every negative assertion:

```ts
console.log(await page.getByTestId("asset-search").count()); // 0 means it matched nothing
```

## Hand-offs

- Building or fixing the control under test — view definitions, bindings,
  `testId` and other node options: use `raptor`.
- Chart configuration, series and option merging: use `echarts`.
- Scaffolding, building, packaging or deploying the extension: use
  `adk-extension-dev`.
- A build that produces stale output after a clean edit: use `adk-clean-cache`
  before treating it as a test failure.
