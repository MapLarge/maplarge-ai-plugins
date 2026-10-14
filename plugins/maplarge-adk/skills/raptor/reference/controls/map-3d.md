# RaptorMap in 3D (Cesium globe)

Turning a `RaptorMap` from the flat 2D map into MapLarge's 3D Cesium globe, and what behaves differently once it is one: switching between 2D and 3D, updates and reloads, the camera and zoom, base maps and projection, Cesium's own on-screen controls, the Cesium ion key, terrain, and reaching the Cesium `Viewer` from a view model. This page covers MapLarge's behavior only; for the CesiumJS API itself (entities, cameras, materials) use the CesiumJS documentation.

The behaviors on this page were run in a browser against MapLarge Server 4.131, 4.139 and 4.142, except where a sentence says it comes from the client code or was run on one version. The few that need a sample table ran on 4.139 and 4.142 only. The tests never contact Cesium ion, Bing or Azure, so nothing that needs an answer from those services was run. Where 4.131 behaves differently, "Version differences" says so. `ml.version` in the browser console shows a server's version.

## When to use

A request for a 3D map, a globe, terrain, or a tilted or rotated view; a 2D/3D toggle; a `mapOptions.api` of `"CESIUM"`; `mapOptions.cesium`, `cesiumKey`, `camera` or `apiOptions`; or code reaching `ml.Cesium` or the Cesium `Viewer` through `getInternalMap()`.

## At a glance

| To do this | Use | Know first |
| --- | --- | --- |
| Show the map as a globe | `mapOptions.api: ml.ui.map.api.CESIUM` | CesiumJS loads on first use, and every globe opens far out and flies in for about 4 seconds. |
| Open it tilted or turned | `camera.pitch` and `rotation` | Server 4.139 and later. |
| Let users switch 2D and 3D | Two option objects, carrying only `lat`, `lng`, `z` across | A switch is a full reload, and the current options must not be copied across. |
| Show existing layers | Nothing to change, except transparency | They are draped flat on the surface, and a server layer's `opacity` option is ignored there; put the alpha in the style color. |
| Put features at a real height, or add 3D Tiles, CZML or a model | A `czml` option, a `special` layer or an external `service` layer | Draped layers stay flat whatever height a column holds. |
| Let users draw | A `drawingToolbar` with an explicit `tools` list | With no `tools` list the toolbar's one default button throws on the globe. |
| Move the camera from code | `map.zoom.set`, `map.center.setLL`, `map.zoomToWKT` | Every move is a flight of 3 to 4 seconds. |
| Read a click | `map.addClickListener` | Gives the ground point; does not fire on sky. |
| Limit zoom | Cesium's camera limits, set in the viewer callback | `minZoom`, `maxZoom` and `maxBounds` have no effect on the globe. The Cesium limits stop the mouse wheel, not `map.zoom.set`. |
| Add terrain | `cesium.ionTerrainAssetId`, a terrain layer, or a provider set in code | If the Cesium ion request fails at startup, the map stays blank. |
| Hide Cesium's buttons | `apiOptions: { geocoder: false, ... }` | A help panel covers the top right corner on a user's first visit. |
| Reach the Cesium `Viewer` | `onInternalMapAvailable` plus the `"maploaded"` event | The viewer is replaced on every full reload, so do not keep it. |
| Animate something | A running `viewer.clock` | A change made outside the clock needs `viewer.scene.requestRender()`. |

Layers and drawing on the globe each have their own page; both are listed under "Related".

## Terms

- **The globe** is a map whose provider is Cesium, in any of Cesium's scene modes. **The 2D map** is the default Leaflet map.
- **A full reload** is the map rebuilding itself (`map.load()`): every layer is destroyed and re-created, and on a globe the Cesium viewer is destroyed and replaced. It is not a browser refresh.
- **A quick update** applies a change to the live map with no reload.
- **The saved state** is what `map.save()` returns: the options you wrote plus many the map adds.

## Turn the globe on

`mapOptions.api` picks the map provider. Cesium settings go in `mapOptions.cesium`, camera settings in `mapOptions.camera`, and options for the Cesium `Viewer` itself in `mapOptions.apiOptions`. All three are tabled under "Reference".

```ts
const globeOptions: ml.ui.map.iMapOptions = {
    api: ml.ui.map.api.CESIUM,
    lat: 25.77, lng: -80.19, z: 10,
    searchBox: false,
};

// View: the node's own mapOptions hold only the viewport.
s.raptorMap({ viewName: "mainMap", mapOptions: { lat: 25.77, lng: -80.19, z: 10 }, bindings: { data: s.getTypedProp("mapState") } });

// ViewModel (DynamicViewModel)
public mapState: IRaptorMapOptions = { mapOptions: globeOptions, layers: [] };
```

`IRaptorMapOptions` and `RaptorMap` are imported from `raptor/raptorDom/controls/Map/RaptorMap`.

- **Use the constants `ml.ui.map.api.CESIUM` and `ml.ui.map.api.LEAFLET`, not string literals.** `api` is typed as a plain `string`, so a mistake compiles. A misspelling logs the warning `Invalid API: <value>` and gives the 2D map. Lower-case `"cesium"` gives a globe with MapLarge's search box drawn over it.
- **Declare the options as a typed `ml.ui.map.iMapOptions` object.** `IRaptorMap.mapOptions` is declared `any`, so options written inline in `s.raptorMap(...)` are not type-checked.
- **Set `searchBox: false` on every globe.** MapLarge turns its search box off by itself only for a map that is created as a globe and never reloaded. On Server 4.139 and later a Raptor map whose node has its own `mapOptions` as well as bound state, as above, reloads once as it starts, and a map switched to 3D was never created as a globe. Either way the search box is drawn over the globe unless the option is set. On a server with place search turned off the box removes itself.

To open the globe turned and tilted (Server 4.139 and later), add `rotation`, the heading in degrees, and `camera.pitch`, the tilt in degrees up from straight down:

```ts
const tiltedGlobe: ml.ui.map.iMapOptions = { ...globeOptions, rotation: 45, camera: { pitch: 60 } };
```

## Switch between 2D and 3D

**A switch is a full reload. Build each side from its own options object and carry over only the viewport.**

```ts
// flatOptions is the dashboard's own 2D iMapOptions and sets api: ml.ui.map.api.LEAFLET.
public toggle3D(): void {
    const { lat, lng, z, api } = this.mapState.mapOptions;
    const to3D = api !== ml.ui.map.api.CESIUM;
    this.mapState.mapOptions = { ...(to3D ? globeOptions : flatOptions), lat, lng, z };
    this.update("mainMap");   // not needed when mapState is a RaptorMapOptions
}
```

The tempting one-liner, `{ ...this.mapState.mapOptions, api: ml.ui.map.api.CESIUM }`, is the mistake. `mapState.mapOptions` does not hold the options you wrote. Shortly after the map appears, and again after every pan or zoom, the node replaces the whole bound object with `{ mapOptions: map.save(), layers }`. That saved state carries keys that belong to one provider:

| Copying | Carries | Result |
| --- | --- | --- |
| a 2D map's saved state into the globe | `rotateEnabled: false` | A globe that cannot be tilted. It still pans and spins. |
| a 2D map's saved state into the globe | `searchBox: true` | MapLarge's search box drawn over the globe. |
| the globe's saved state into 2D | `rotation` | A flat map rotated by the globe's heading, the opposite way. |

More rules for a map that switches:

- **Set `api` in both option objects, and keep the node's own `mapOptions` to the viewport.** The node's `mapOptions` are merged underneath the bound ones on every load, so an `api: CESIUM` written on the node survives every switch back to 2D.
- **Keep `camera` out of the 2D options.** On the 2D map it only logs a warning.
- **A tilted globe hands back a different center.** `lat` and `lng` are the ground point under the camera, not the middle of the screen. At z 12 a view tilted 30 degrees is already 11 km off, and one tilted 70 degrees 20 km, so a switch back to 2D lands beside what the user was looking at.
- **The first switch to 3D on a page is the slow one,** because CesiumJS loads then. In the test, with the library served from a local cache, the globe showed after about 1.3 seconds; a real first load adds the download. Later switches take about 0.2 seconds. Either way the globe then flies in for about 4 seconds. A switch back to 2D takes under a tenth of a second.

### The built-in switch

A map with `showEditor` has its own 2D and 3D buttons: in its map options menu, or, with `noLegacyButtons`, in the menu of the button with the globe icon. Prefer your own toggle:

- **Its globe cannot be tilted and has the search box over it,** because it builds the 3D options from the 2D map's saved state.
- **With `noLegacyButtons` and the state bound as a plain object, its 3D button can leave a broken map:** a Cesium map that reports itself as 2D, with every layer listed twice. It switches cleanly when the state is a `RaptorMapOptions`.
- **If the map view has not been updated since it was created, the switch comes up with no layers** until the next `update("mainMap")`.

Hide it with `showEditor: { showMapOptions: { hideChooseDimensions: true } }`. `ml.config.disable3D = true`, set before the maps are created, hides it for the whole app, but does not stop a map whose own options say `api: CESIUM`.

## Updates, reloads and the bound state

**Seven keys of the bound `mapOptions` are applied as quick updates:** `lat`, `lng`, `z`, `rotation`, `baseLayer`, `mlBaseLayer` and `service`. Two more, `drawings` and `drawingsV2`, cause no reload either, but a change to them is ignored on a live map, so change drawings through the map itself. Changing any other key is a full reload, including `api` and anything in `cesium`, `cesiumKey`, `camera`, `apiOptions`, `projection`, `rotateEnabled`, `searchBox` or `minZoom`.

**How the view model holds the bound object decides whether an ordinary `update("mainMap")` stays quick.** The node writes the saved state back into the bound member. If it cannot, every key of the saved state looks new on the next update, and the map reloads.

| The bound member is | `update("mainMap")` after load | Notes |
| --- | --- | --- |
| a plain field, or a get/set pair that stores what it is given | Quick | Call `this.update("mainMap")` yourself after a change. |
| a `RaptorMapOptions` | Quick | Its `mapOptions` setter schedules the update for you. The framework also runs a whole-page `update()` on every pan. |
| a getter whose setter keeps only part of the value, or a getter with no setter | **A full reload every time on the globe.** On the 2D map, on the first update after load and after each pan. | A getter with no setter also throws on each write-back. |

- **To change one option, build on the stored object:** `this.mapState.mapOptions = { ...this.mapState.mapOptions, mlBaseLayer: "dark" }`. That is safe within one provider; it is the copy across providers that breaks.
- **Keep your own fields off a plain bound object.** The write-back replaces it with `{ mapOptions, layers }`, so a `legendOptions` or any field of yours on it is dropped.
- **Replace a layer object; do not edit it in place.** `layers[i].visible = false` followed by an update works once and is ignored from then on, because the node compares the layer against the same object. Assign `{ ...layer, visible: false }` instead.

## What is different on the globe

| Area | On the globe |
| --- | --- |
| Search box | Drawn over a globe that was switched or reloaded into 3D, unless `searchBox: false`. On a server with place search turned off the box removes itself. |
| Built-in drawing panel | Never shown, whatever `drawingTools` says. A `drawingToolbar` with an explicit `tools` list works. |
| Rotation and tilt | On by default (off by default in 2D). `camera.rotateEnabled: false` turns off tilting as well as turning; the globe still pans. The top-level `rotateEnabled` is deprecated and does the same. |
| Zoom | `z` becomes a camera height: 2,806 km at z 5, 86 km at z 10, 2.7 km at z 15. |
| Zoom and pan limits | `minZoom`, `maxZoom` and `maxBounds` have no effect. See "Camera and zoom" for a limit that does. |
| Center | `lat` and `lng` are the ground point under the camera, which on a tilted view is not the middle of the screen. |
| Base maps | The named base maps work, and a map with no base map shows `satellite`. `openfreemap` is refused with a console warning. |
| Projection | Web Mercator by default. `"wgs84"` and `"EPSG:4326"` switch the globe to a geographic tile grid. Any other code is replaced with Web Mercator and a console warning. |
| Terrain | A smooth ellipsoid unless terrain is added. |
| Map controls | The scale bar, zoom buttons, draw-to-zoom button and attribution are absent. Cesium's own buttons take their place. |
| Clicks and hover | `map.addClickListener` gives the exact ground point and does not fire on sky. Layer clicks and hover work on draped layers. |
| Viewport reads | `getVisibleBB()` is the whole world whenever fewer than two corners of the map are on the globe: straight down that was z 4 or lower on a 1024 by 768 map, and it is also the case on a view tilted to the horizon. A wider map reaches it at a higher z (not run). Off the globe it can be `null`, although its declared type does not say so. Check for both before building a viewport filter. `getVisibleProjectedBB()` is always `null`. |
| Flat scene modes | `cesium.sceneType` `"2D"` and `"COLUMBUS"` are still the Cesium map, so this table applies to them. They ignore the starting `lat`, `lng` and `z`, and `map.center` and `map.zoom` read wrong in them. |
| Resizing | The canvas follows its container by itself. |

## Camera and zoom

Read and move the map through `map.zoom.get()`, `map.zoom.set(z)`, `map.center.get()` and `map.center.setLL(lat, lng)`. `ml.ui.map.Map` has no `getZoom`, `setZoom`, `getCenter` or `setCenter`.

| `z` | Camera height |
| --- | --- |
| 2 | 22,657 km |
| 5 | 2,806 km |
| 10 | 86 km |
| 15 | 2.7 km |
| 20 | 82 m |

- **Every move is a flight of 3 to 4 seconds,** even a short one. Nothing jumps.
- **`map.zoom.set` and `map.center.setLL` keep the heading and tilt. `setBounds` resets the view** to north-up, straight down. `zoomToWKT` and `zoomToBoundingBox` end there too, but were only started from a straight-down view.
- **Do not pass a `maxZoom` to `zoomToWKT` on the globe.** From far out it is ignored, and from close in it can zoom in past the shape. Call `map.zoom.set` afterwards if the zoom has to be capped.
- **The zoom that reads back is rounded down.** After `map.zoom.set(18)` it can read 17 while the camera sits at the right height, and a camera at 60 km saves as `z: 10` (86 km). A globe re-created from `map.save()` gets its heading and tilt back exactly, but not its height.
- **`rotation` is the heading in degrees.** On the globe `rotation: 45` works by itself. On the 2D map it also needs `rotateEnabled: true`.
- **`camera.pitch` is degrees up from straight down:** 0 looks straight down and 90 looks at the horizon.
- **`camera.maxPitch` limits tilting. `camera.minPitch` makes the map open tilted** and logs that it is not fully supported. `camera.rollEnabled` is not supported on the globe.
- **`camera.rotateEnabled` wins over the deprecated top-level `rotateEnabled`,** with a console message when they disagree.
- **From a straight-down view, the tilt gesture only answers an upward drag** (Ctrl and drag up, or middle-button drag up).

**To limit zooming, set Cesium's own camera limits** in the viewer callback (see "Reach the Cesium viewer"). They stop the mouse: with the values below, zooming out stopped at 500 km and zooming in at 20 km. `map.zoom.set` still goes past them, and the user's next mouse zoom pulls the camera back inside. No way was found to keep the view inside a bounding box.

```ts
private buildScene(viewer: ml.Cesium.Viewer): void {
    const controller = viewer.scene.screenSpaceCameraController;
    controller.minimumZoomDistance = 20000;    // meters
    controller.maximumZoomDistance = 500000;
}
```

## Base maps and projection

- **The default base map is `satellite`,** served through the MapLarge server. A default globe contacts no other host.
- **Changing `mlBaseLayer` keeps the same viewer.** It is a quick update.
- **Give `bing` its own `bingKey` every time.** Without it the globe sends the Cesium ion key to Microsoft's Bing service in its place. `azure` takes `azureKey`; that is from the client code, because the `azure` base map did not draw in the test.
- **Write `"mercator"`, or leave `projection` out, for Web Mercator.** `"EPSG:3857"` is not recognized: it logs the custom-projection warning, and the map falls back to Web Mercator with an empty `projection` in its saved state. The geographic spellings are `"wgs84"`, `"EPSG:4326"` and `"epsg4326"`.
- **A custom projection is dropped, not kept for later.** After the replacement `map.save().projection` is empty. A map that needs a polar or national projection has to stay 2D.

## Cesium's buttons and panels

Cesium adds its own geocoder, home button, scene-mode picker, help button and fullscreen button, plus an info box and selection indicator that appear when an entity is clicked. Turn each off through `apiOptions`, which is passed to the Cesium `Viewer` and wins over MapLarge's defaults and over the `cesium` block, with a console warning that names the keys.

```ts
const quietGlobe: ml.ui.map.iMapOptions = {
    api: ml.ui.map.api.CESIUM,
    searchBox: false,
    apiOptions: {
        geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false,
        fullscreenButton: false, infoBox: false, selectionIndicator: false,
    },
};
```

- **Leave `infoBox` and `selectionIndicator` on if entities should answer clicks.** They are what shows a clicked entity's details, for entities layers and `czml` layers.
- **The help panel is open on a user's first visit** and covers the top right corner. A developer who has opened a globe before does not see it. Keep the help button and close the panel with `apiOptions: { navigationInstructionsInitiallyVisible: false }`. To see what a new user sees, remove `cesium-hasSeenNavHelp` from the browser's local storage.
- **The geocoder is Cesium ion's,** not MapLarge's place search. Each search sends the ion key to Cesium ion.
- **The home button flies to Cesium's own home view,** not to the map's `lat`, `lng` and `z`.
- **The scene-mode picker's "2D" is a flattened Cesium scene,** not the 2D map. `apiOptions: { scene3DOnly: true }` removes the picker.
- **Leave `apiOptions.baseLayerPicker` off.** Turning it on calls Cesium ion at once, lists third-party providers, and adds the base map a second time.

## The Cesium ion key

MapLarge's base maps and layers need no Cesium ion key. Three things call Cesium ion: terrain from `cesium.ionTerrainAssetId`, Cesium's geocoder when a user searches, and the base layer picker.

- **`mapOptions.cesiumKey` sets `Cesium.Ion.defaultAccessToken`.** Without it the map uses `ml.cesiumIonApiKey`, and then a fallback built into the framework. A globe with no key set still has a token.
- **The key is applied once per page, by the first globe.** If that globe has no `cesiumKey`, a later map's `cesiumKey` is ignored. Set `ml.cesiumIonApiKey` before the first globe when maps on one page need the same key.
- **`map.save()` keeps `cesiumKey`,** so a persisted map state carries the token.

A Cesium ion token is a credential, and a dashboard sends it to every viewer's browser. Give a dashboard a Cesium ion token restricted as tightly as your Cesium ion account allows, for example to the assets it needs and to your site's URLs. Never commit a real token to extension source; keep a placeholder in code and supply the real value from configuration.

## Terrain

The globe is a smooth ellipsoid; Cesium World Terrain is not loaded by default. Three routes add terrain:

| Route | How | Needs |
| --- | --- | --- |
| A Cesium ion asset, at startup | `cesium: { ionTerrainAssetId: 1 }` (1 is Cesium World Terrain) | A Cesium ion key that can read the asset. Only the failing request was run. |
| A provider set in code | `setCurrentTerrainProvider(provider)`, or `apiOptions: { terrainProvider }` | A Cesium terrain provider you build |
| A MapLarge layer | A raster layer whose query sets `select.terrain: true` | A raster table. Run on Server 4.142 only. |

**If the Cesium ion request for `ionTerrainAssetId` fails, there is no globe at all.** The asset is requested before the viewer is built, so the failure leaves an empty map with only `Request has failed.` in the console, and `map.load()` with good options does not bring it back. This was measured with the request blocked, and with it answered by a simulated 401 and 404. A failure of this kind, such as a viewer behind a firewall, does not show up on the developer's machine.

**To keep a failed request from costing the whole map, add terrain after the globe exists.** Leave `ionTerrainAssetId` out and call this from the viewer callback (see "Reach the Cesium viewer"). A failure is then caught in your own code, and the globe stays up, smooth. This was run with the request blocked; the successful case needs Cesium ion and was not run.

```ts
private async addIonTerrain(rm: RaptorMap, assetId: number): Promise<void> {
    try {
        const provider = await ml.Cesium.CesiumTerrainProvider.fromUrl(ml.Cesium.IonResource.fromAssetId(assetId));
        (rm.map.mapAdapter as ml.ui.map.MapCesium).setCurrentTerrainProvider(provider);
    } catch {
        // No terrain: the globe stays up, smooth.
    }
}
```

`hideTerrain()` on the same adapter puts the smooth ellipsoid back on a live globe. `showTerrain()` is declared; it was run only with no provider selected, where it logs a warning. The `cesium.hideTerrain` option is not read.

## Reach the Cesium viewer

**Set up your Cesium scene in a callback that runs for every new viewer.** A full reload destroys the viewer and builds another, so code that reaches it once is left holding a dead one.

```ts
private watchViewer(rm: RaptorMap, setup: (viewer: ml.Cesium.Viewer) => void): void {
    const seen = new WeakSet<object>();
    const run = () => {
        if (rm.map.api.get() !== ml.ui.map.api.CESIUM) return;
        const viewer = rm.map.getInternalMap() as ml.Cesium.Viewer;
        if (!viewer || viewer.isDestroyed() || seen.has(viewer)) return;
        seen.add(viewer);
        setup(viewer);
    };
    rm.map.onInternalMapAvailable(run);   // the map that exists now, or the first one
    rm.map.on("maploaded", run);          // every later reload and switch
}

public watchGlobe(): void {
    this.raptorDom.nodeT<RaptorMap>("mainMap").onMapCreated(rm => this.watchViewer(rm, viewer => this.buildScene(viewer)));
}
```

Call `watchGlobe()` once, from the view model's `initialize()`. The map node exists by then.

- **`onMapCreated` alone is too early.** CesiumJS loads the first time a globe is created, so inside `onMapCreated` `ml.Cesium` can still be `undefined` and `getInternalMap()` `null`.
- **`onInternalMapAvailable` runs a registration once.** It runs at once if a map already exists, whatever its provider, which is why the callback checks the provider. It does not run again after a reload.
- **`"maploaded"` fires after every full reload and every switch,** but not when the map is first built. That is why both are registered.
- **`getInternalMap()` is declared `any`.** Cast it to `ml.Cesium.Viewer`. All of CesiumJS is typed under `ml.Cesium`; there is no global `Cesium`.
- **Build your entities and primitives inside the callback.** Entities and data sources you kept can be added to the new viewer; a primitive is destroyed with the old one.
- **A call on a destroyed viewer throws** `TypeError: Cannot read properties of undefined (reading 'scene')`, or the same for `entities`, `clock` or `canvas`.
- **Listeners on `map.zoom` and `map.center` stop firing after a full reload,** because those objects are replaced. Add them again on `"maploaded"`. Click listeners and `map.on(...)` handlers survive.
- **`map.destroy()` does not destroy the viewer.** Its render loop and WebGL context stay alive. Call `viewer.destroy()` yourself when removing a globe by hand.
- **Some settings change on a live globe with no reload,** through `map.mapAdapter` cast to `ml.ui.map.MapCesium`: `hideTerrain()`, `setCurrentTerrainProvider(provider)` and `highQualityRender = true`. `setCurrentTime(iso)` and `setSceneType("COLUMBUS")` work too but are missing from the typings.

## Repainting and animation

MapLarge turns on Cesium's request-render mode, so the globe repaints only when something asks it to. The usual symptom is a change that shows only after the mouse moves.

- **A running clock repaints by itself.** The clock is stopped until you start it: with `viewer.clock.shouldAnimate = true`, time-driven entities move without any extra call.
- **A change made outside the clock does not repaint.** After adding or changing an entity, a primitive or an imagery layer's alpha with a still clock, call `viewer.scene.requestRender()`.
- **To repaint every frame instead, set `cesium: { requestRenderMode: false }`.** Leaving the key out keeps request-render mode on. Do not pass `undefined` or `null`, for example from an unset setting: both turn continuous rendering on.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| The map stays 2D; console shows `Invalid API: ...` | `api` is misspelled | Use `ml.ui.map.api.CESIUM`. |
| A MapLarge search box sits over the globe | `searchBox` was left to its default | Set `searchBox: false` in the globe options. |
| The globe cannot be tilted after a switch from 2D | The 2D map's saved `rotateEnabled: false` was carried over | Build the globe from its own options; carry only `lat`, `lng`, `z`. |
| The flat map is rotated after a switch from 3D | The globe's saved `rotation` was carried over | The same. |
| A globe synced to a 2D map cannot be tilted | Maps joined by `syncMode` share `rotateEnabled` | Leave the 3D map out of the sync if it has to tilt. |
| Dragging does not tilt a straight-down view | The tilt gesture only answers an upward drag | Ctrl and drag up. |
| The built-in 3D button gives no layers, or every layer twice | See "The built-in switch" | Build your own toggle, or bind a `RaptorMapOptions`. |
| The whole globe reloads on every change | The bound state is behind a getter or a partial setter | Hold it in a plain field or a `RaptorMapOptions`. |
| A layer toggle works once, then never | The layer object was edited in place | Replace the layer object. |
| `minZoom`, `maxZoom` or `maxBounds` are ignored | They have no effect on the globe | Set Cesium's camera limits; see "Camera and zoom". |
| The zoom reads one lower than was set | The zoom is rounded down from the camera height | Compare with a tolerance, or keep your own value. |
| A viewport filter matches everything | `getVisibleBB()` returned the whole world | Skip the filter when the box spans 360 degrees. |
| An empty map; console shows `Request has failed.`, or a 401 or 404 from Cesium ion followed by `Rendering has stopped.` | The Cesium ion request for `ionTerrainAssetId` failed | Check the key, the asset, any restriction on the token and the viewer's route to Cesium ion, then refresh the browser. Better: add terrain after the globe exists. |
| A later map's `cesiumKey` has no effect | The key is applied once per page, by the first globe | Set `ml.cesiumIonApiKey` before the first globe. |
| `ml.Cesium` is `undefined`, or `getInternalMap()` is `null` | CesiumJS has not loaded yet | See "Reach the Cesium viewer". |
| `TypeError: Cannot read properties of undefined (reading 'scene')` | A kept viewer was destroyed by a full reload | Set the scene up again for each new viewer. |
| A zoom or center listener stopped firing | `map.zoom` and `map.center` are replaced on a full reload | Add the listener again on `"maploaded"`. |
| A change shows only after the mouse moves | Request-render mode | Call `viewer.scene.requestRender()` after the change. |
| A panel of mouse instructions covers the corner | Cesium's help panel, shown on a first visit | `apiOptions: { navigationInstructionsInitiallyVisible: false }`. |
| The globe opens somewhere else | `cesium.sceneType` is `"2D"` or `"COLUMBUS"` | Move the map after it loads with `map.center.setLL(...)`. |
| Console shows `Cannot read properties of null (reading 'handleBaseTileLayerInfo')` on a switch back to 2D | Thrown by the framework on most 3D to 2D switches | None needed; the map works. |
| Console shows `Drawing type freehandpolygon not supported.` | A drawing toolbar with no `tools` list | List `Polygon`, `Rectangle`, `Circle`, `PolyLine` or `Marker` in `tools`, or set `drawingsVersion: 2` on the map and the toolbar. |
| Every layer is blank | One layer's tiles are failing | Hide layers one at a time to find it, or set `mapOptions.ignoreErrors: true`. |

## Version differences

| Behavior | 4.131 | 4.139 | 4.142 |
| --- | --- | --- | --- |
| `mapOptions.camera` (`rotateEnabled`, `pitch`, `roll`, limits) | Not available. `rotateEnabled` does nothing on the globe, which always tilts. | Yes | Yes |
| `rotation` sets the globe's heading, and a globe's heading is saved | No | Yes | Yes |
| `cesium.camera` | The live camera option, in radians, and where `save()` keeps the camera; it replaces `lat`, `lng`, `z` at start (from the client code) | Legacy; converted to `camera` and `rotation` with a console message | Same as 4.139 |
| `drawings` and `drawingsV2` in the bound options | A change is a full reload, and is applied | A change is ignored | Same as 4.139 |
| A full reload keeps shapes drawn since load | No | Yes | Yes |
| A quick `lat`, `lng` or `z` update keeps the tilt | No, the view flattens | Yes | Yes |
| A reloaded globe's camera | Restored exactly, from `cesium.camera` | Heading and tilt restored; height snaps to the whole-number `z` | Same as 4.139 |
| The built-in 2D and 3D switch gives a globe that tilts | Yes | No | No |
| A node with its own `mapOptions` plus bound state reloads once as it starts | No | Yes | Yes |
| The built-in 3D button with `noLegacyButtons` and a plain bound object | Works | Can break the map | Can break the map |
| A globe synced to a 2D map by `syncMode` can tilt | Yes | No | No |

## Related

- `map-3d-layers.md`: how layers render on the globe, features at a real height, 3D Tiles, CZML, models, terrain layers.
- `map-3d-drawing.md`: drawing on the globe with the V1 and V2 drawing tools.
- `map.md`: the map node, `RaptorMapOptions`, map events, and the 2D option set.

---

## Reference

### `mapOptions.cesium` (`MapCesiumOptions`)

Changing any of these after the map exists is a full reload.

| Field | Type | Effect |
| --- | --- | --- |
| `sceneType` | `MapCesiumSceneType` | `ThreeDimensional` (`"3D"`, the default), `TwoDimensional` (`"2D"`) or `Columbus` (`"COLUMBUS"`). Not case-sensitive at run time; an unrecognized value gives 3D. |
| `ionTerrainAssetId` | `number` | Terrain from a Cesium ion asset, requested before the globe is built. Needs a Cesium ion key. |
| `requestRenderMode` | `boolean` | Repaint only on request. Defaults to `true`; `undefined` and `null` give `false`. |
| `highQualityRender` | `boolean` | FXAA on, rendering at the device pixel ratio, and 4x MSAA. Off by default, with MSAA off. |
| `showTimeline` | `boolean` | Show Cesium's timeline and animation widgets. |
| `currentTime` | `string` | The scene clock's time, ISO 8601. An unparseable string is accepted without an error. |
| `showCredits` | `boolean` | Show the Cesium credits. Hidden unless `true`. |
| `debugShowFramesPerSecond` | `boolean` | Show Cesium's frame-rate counter. |
| `camera` | `MapCesiumCameraOptions` | Legacy starting camera, in radians. Set `mapOptions.camera` and `rotation` instead. |
| `hideBaseLayerPicker` | `boolean` | Stored and saved only. |
| `hideTerrain` | `boolean` | Not read. |

### `mapOptions.camera`

Server 4.139 and later. On the 2D map these options log a warning and do nothing.

| Field | Effect on the globe |
| --- | --- |
| `rotateEnabled` | `false` turns off turning and tilting. Defaults to `true`. |
| `pitch` | Starting tilt in degrees up from straight down. |
| `roll` | Starting roll in degrees. On a straight-down view it shows as heading. |
| `maxPitch` | The most the view can tilt. |
| `minPitch` | The least tilt; the map opens tilted to it. Logged as not fully supported. |
| `rollEnabled` | Not supported on the globe; logged. |

### `mapOptions.apiOptions`

Passed to the Cesium `Viewer` when it is built. A key that MapLarge also sets takes your value, with the warning `Some map option properties will be overridden: ...`. `msaaSamples` is the exception.

| Key | Effect |
| --- | --- |
| `geocoder`, `homeButton`, `sceneModePicker`, `navigationHelpButton`, `fullscreenButton` | `false` removes that Cesium button. |
| `infoBox`, `selectionIndicator` | `false` removes Cesium's readout for a clicked entity. |
| `navigationInstructionsInitiallyVisible` | `false` keeps the help panel closed on a first visit. |
| `scene3DOnly` | `true` removes the scene-mode picker and the flat scene modes. |
| `terrainProvider` | A Cesium terrain provider to start with. |
| `contextOptions` | Passed to WebGL, for example `{ webgl: { preserveDrawingBuffer: true } }` to read the globe's pixels back. |
| `msaaSamples` | MapLarge sets it after the viewer is built, so your value is overwritten unless `cesium.highQualityRender` is `true`. |
