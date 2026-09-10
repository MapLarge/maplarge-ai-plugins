// Verdict colours for the check suite and the publish gate — one palette so
// `npm run check` and `npm run publish` read the same way. Only the lines a
// maintainer has to act on get colour (pass / fail / the location to open);
// narration stays plain. Built on node:util.styleText (Node 22.13+): with a
// stream passed, it emits plain text automatically when stdout is not a TTY
// or NO_COLOR is set, so CI logs, pipes, and test captures never see escapes.

import { styleText } from "node:util";

const opts = { stream: process.stdout };

export const pass = (text) => styleText("green", text, opts);
export const fail = (text) => styleText(["red", "bold"], text, opts);
export const strong = (text) => styleText("bold", text, opts);
