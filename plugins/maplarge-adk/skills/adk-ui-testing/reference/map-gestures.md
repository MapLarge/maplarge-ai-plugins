# Pointer gestures on a map

How to drive drags, drawing tools, hovers, right-clicks and rotation on a MapLarge map from a
Playwright test. Loaded from the `adk-ui-testing` skill when a test has to act on the map itself.

**Pace every drag.** The map ignores a drag delivered in a single frame, so a
`mouse.down`, one `mouse.move` and `mouse.up` in a row moves nothing and draws
nothing. Press, pause, move through at least two intermediate points with a
pause between each, then release:

```ts
const box = (await page.getByTestId("main-map").boundingBox())!;
const at = (fx: number, fy: number) => [box.x + box.width * fx, box.y + box.height * fy] as const;
const GESTURE_PACE_MS = 250;

await page.mouse.move(...at(0.3, 0.3));
await page.mouse.down();
for (const point of [at(0.4, 0.4), at(0.5, 0.5), at(0.6, 0.6)]) {
  await page.waitForTimeout(GESTURE_PACE_MS);
  await page.mouse.move(...point);
}
await page.waitForTimeout(GESTURE_PACE_MS);
await page.mouse.up();
```

**Arm a drawing tool and confirm it armed.** The drawing interface wires itself
up a few seconds after the map paints, and a click on a tool before then lands on
nothing. Click the tool, then poll the drawing manager until it reports one.

Which manager to ask depends on the map's drawings version. `getDrawingManager()`
always returns the original manager, even on a DrawingsV2 map, so polling it
there never sees an armed tool and the test times out as though the toolbar were
broken.

```ts
await toolButton.click();

// A DrawingsV2 map (`drawingsVersion: 2` in its map options):
await expect.poll(() => page.evaluate(() =>
  Boolean(ml.ui.map.last.getDrawingManagerV2().activeCreateTool))).toBe(true);

// A map on the original drawing tools:
await expect.poll(() => page.evaluate(() =>
  Boolean(ml.ui.map.last.getDrawingManager().getActiveTool()))).toBe(true);
```

`getDrawingManagerV2()` throws on a map that has not opted into DrawingsV2, so
use the form that matches the map rather than trying both.

**Hover with the real pointer, then poll.** Move the mouse to the feature and
poll for the hover content. The platform handles pointer movement on a throttle
of roughly 200 ms, so a read taken straight after the move sees the previous
state. Where the feature's exact pixel is not known, sweep a few points across
its area and stop at the first that produces the content.

**Right-click with a real right click.** Use `click({ button: "right" })`. A
dispatched `contextmenu` event opens nothing. The map's context menu does not
close on Escape: choose an item or use its own close control, and confirm it is
gone before right-clicking again, because an open menu swallows the next one.

**Rotate with Control held for the whole paced drag**, and read the result from
the map rather than from the screen.

**Close any platform dialog before gesturing.** A dialog opened over the map
covers part of it and takes the gesture. A drag through one moves the map a
fraction of the expected distance, which reads as a broken pan.
