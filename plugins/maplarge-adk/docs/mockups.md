# Mockups

## Additive Mockups And Spikes

When a user asks for a mockup or spike and says not to edit existing code:

- Put mockup-only files under `client/mockups/` or `docs/mockups/`.
  - Use `client/` for "live" mockups using `HTML` or other frontend code
  - Use `docs/` for static mockups like images or SVGs
- Do not wire routes or manifests unless explicitly requested.
- Hard-code data only inside mockup files.
- Keep mockup data separate from production table/query code.
- Label no-op actions clearly in the UI.
- If the user asks to make a "live" mockup navigable, wire it in `client/home.ts` with the smallest route/page registration change.
