# Suites that write data

Rules for a Playwright suite that creates or changes rows on a MapLarge server. Loaded from the
`adk-ui-testing` skill when a test saves anything.

A suite that only reads may run beside another. One that creates rows needs more
care, because the server is usually shared with other people and other runs:

- Run with one worker. Parallel specs against one server corrupt each other's
  state.
- Stamp every row the test creates with a marker unique to the run, and delete by
  that marker in a `finally` block so cleanup also happens when the test fails.
- Assert only on rows the run created. A table's total, or its "next id", can
  legally change under the test.
- A run that is killed skips its `finally`. Sweep for the interrupted run's
  marker before trusting any count taken afterwards.
- Confirm a write through the product's own list or a fresh query, not through a
  read taken in the same instant. A read straight after a write can return the
  previous version.
