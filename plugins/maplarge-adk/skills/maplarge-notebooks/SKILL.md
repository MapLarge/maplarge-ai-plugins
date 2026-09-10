---
name: maplarge-notebooks
description: >-
  Authoritative user guide to MapLarge Notebooks: Jupyter-compatible, server-hosted Python/R
  notebooks with the built-in import maplarge module. Covers creating/importing/exporting
  notebooks, the editor and toolbar (Table Inputs, VFS Mappings, Output Fields, User Parameters,
  Secrets, resource limits, idle timeout, container images), the full maplarge Python API,
  ETL/External Processing integration, MLFlow, and custom kernel images. Use when creating,
  authoring, running, debugging, scheduling, or sharing a MapLarge notebook, wiring one into an
  ETL flow, handling secrets or credentials in a kernel, or building and registering a custom
  kernel image. Triggers on "notebook", "jupyter", "ipynb", "import maplarge", "SetOutputSchema",
  "table inputs", "vfs mappings", "output schema", "user parameters", "secrets", "kernel",
  "container image", "external processing", "etl step", "schedule notebook", "mlflow",
  "restart kernel", "troubleshoot notebook".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "Imported from the internal claude-plugins pool; retrofitted under ARC-12"
  verified-against: "MapLarge Notebooks @ 2026-08 import baseline; SetOutputSchema API signature spot-verified against trunk 119ba585c6e, 2026-09-09 (ARC-49)"
---

# MapLarge Notebooks

Covers MapLarge Notebooks end to end: creating and authoring server-hosted Python/R notebooks,
the `maplarge` module, toolbar configuration (Table Inputs, VFS, Output Fields, Parameters,
Secrets), ETL integration, and custom kernel images. It excludes continuous streaming ingest
(`maplarge-datastreams` owns on-ramps; notebooks suit scheduled pull-and-reshape jobs), table
administration on the server (`maplarge-database`), and the dashboards that visualize notebook
output (`adk-raptor-dev` / `raptor`).

BEFORE creating, authoring, running, debugging, or scheduling a MapLarge notebook — or answering any question about them — read the bundled reference at `reference/maplarge-notebooks.md` (relative to this skill folder). It is the authoritative guide. Read only the relevant sections (use the table below); read the whole file only when the task spans many areas.

## When to read what

| Task | Sections to read |
| ------ | ------------------ |
| What notebooks are / when to use one vs. ETL/dashboard/laptop Jupyter | §1 What Is a MapLarge Notebook? (esp. §1.3 differ from local Jupyter, §1.5 when to reach for one) |
| Create, import an `.ipynb`, export/download, rename, copy, delete | §2 Getting Started |
| Editor layout, cell ops, kernel vs. container controls, kernel status | §3 The Notebook Editor — Tour |
| Attach MapLarge tables as named inputs | §4.1 Table Inputs; naming conventions §13.5; tip 2/3 in §14 |
| Mount/persist files (model weights, large artifacts, binaries) | §4.2 VFS Mappings; §5.4 VFS file access; §6.12 train-once-score-often |
| Declare output table schema for ETL; auto XY column | §4.3 Output Fields; §5.3 Writing output; §13.6 real output schemas |
| Pass tunable knobs / hyperparameters into a script | §4.4 User Parameters; §13.4 hyperparameter pattern; §6.5, §6.10 |
| Inject API keys/tokens/passwords safely | §4.5 Secrets; §14 tip 5 |
| Set CPU/memory/GPU; idle timeout | §4.6 Resource Requests/Limits; §4.7 Idle Timeout |
| Full `maplarge` Python API (read/write/VFS/MODE) | §5 The `maplarge` Python API; §12 Quick Reference table |
| Working code by pattern (ingest feed, reshape, join, cluster, change-detect, LLM eval, ML train) | §6 Complete Examples; §13.1/§13.2 usage profiles |
| Wire a notebook into an ETL flow / External Processing step | §7 Using a Notebook Inside an ETL Flow; §14 tip 1 |
| Versioning, restore, branch before invasive changes | §8 Version History; §13.7 iteration is the norm |
| Build & register a custom Docker kernel image | §9 Custom Kernels; §10 Admin Container Management |
| Pick the right container image (default vs. llm/ollama/mmrotate) | §13.8 Container image choice |
| MLFlow tracking/registry/artifacts | §6.10; §13.9 MLFlow integration |
| Something is broken (no tile, stuck connecting, empty output, vanishing tables, lost variables) | §11 Troubleshooting |
| General best practices | §14 Tips & Best Practices |

## Key facts

- **Always call `maplarge.SetOutputSchema(...)` unconditionally at the top, then gate heavy work behind `if maplarge.MODE != maplarge.MODE.DESCRIBE:`.** The #1 mistake turning an interactive notebook into an ETL step; without it ETL reports an empty output schema (§7, §11, §14).
- **Prefer named Table Inputs over hardcoded `account/table` paths.** Hardcoded paths work in the editor but break under ETL, which rewires sources by input name. Rename inputs away from `InputTable1` (§4.1, §13.5, §14).
- **Interactive output tables are tied to the kernel** — when idle timeout shuts the kernel down, those tables get cleaned up. To persist results, run the notebook as a proper ETL step (or raise Idle Timeout while working) (§4.7, §11).
- **Keep credentials in the Secrets toolbar, never in cell source** — cell source is visible to anyone with notebook access and is captured in version history (§4.5, §14).
- **Including both `latitude` and `longitude` output columns auto-generates an `XY` geometry column**, making the result table immediately mappable (§4.3, §6.4, §14).
- **`maplarge/ipython-kernel` is the default image** (data-science stack + MLFlow). Only build a custom image when nothing pre-registered fits; pin tags (not `:latest`) in production (§13.8, §9, §14).

## Examples

- "Make my notebook runnable as an ETL step" → the first cell declares the schema
  unconditionally, then gates the work:

  ```python
  import maplarge
  maplarge.SetOutputSchema(columns=[{"name": "station", "type": "String"},
                                    {"name": "latitude", "type": "Double"},
                                    {"name": "longitude", "type": "Double"}])
  if maplarge.MODE != maplarge.MODE.DESCRIBE:
      run_the_actual_work()
  ```

  ETL first probes the notebook in DESCRIBE mode; without the unconditional schema call it sees
  an empty output schema (§7, §14).
- "Pull the bike-share feed every 5 minutes into a table" → a zero-Table-Inputs notebook that
  requests the public API, reshapes rows, and calls `SetOutput`; schedule it as an ETL step.
  Emitting both `latitude` and `longitude` auto-adds the `XY` column, so the table maps
  immediately (§6.6).
- "My notebook works in the editor but the ETL flow reads the wrong table" → replace hardcoded
  `account/table` paths with named Table Inputs; ETL rewires sources by input name, and names
  left as `InputTable1` invite mis-wiring (§4.1, §13.5).
