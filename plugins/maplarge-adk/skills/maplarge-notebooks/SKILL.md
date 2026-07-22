---
name: maplarge-notebooks
description: >-
  Authoritative user guide to MapLarge Notebooks — the Jupyter-compatible, server-hosted Python/R
  notebooks with a built-in `import maplarge` module: creating/importing/exporting notebooks, the
  editor and toolbar (Table Inputs, VFS Mappings, Output Fields, User Parameters, Secrets, resource
  limits, idle timeout, container images), the full `maplarge` Python API, ETL/External-Processing
  integration, MLFlow, custom kernel images, and real-world usage patterns. Use when creating,
  authoring, running, debugging, scheduling, or sharing a MapLarge notebook, wiring one into an ETL
  flow, handling secrets/credentials in a kernel, building or registering a custom kernel image, or
  answering questions about what notebooks can do.
  Triggers on: "maplarge notebook", "notebook", "notebooks", "jupyter", "ipynb", "import maplarge",
  "maplarge python api", "kernel", "container image", "switch image", "custom kernel", "register image",
  "container management", "ipython-kernel", "ollama", "maplarge/llm", "mmrotate", "table inputs",
  "vfs mappings", "vfs mount", "output fields", "output schema", "SetOutputSchema", "SetOutput",
  "ClearOutput", "GetData", "GetInputSchema", "GetRecordCount", "DataIterator", "GetBinaryData",
  "ListFiles", "GetFileBytes", "SaveFile", "user parameters", "userParameters", "hyperparameters",
  "secrets", "api key", "token", "credentials in notebook", "resource limits", "resource requests",
  "cpu memory gpu", "idle timeout", "maplarge.MODE", "DESCRIBE mode", "EXECUTE mode", "INTERACTIVE mode",
  "external processing", "etl step", "etl flow", "notebook as etl", "schedule notebook", "data feed",
  "ingest feed", "reshape table", "computed column", "copyFromSource", "clustering", "change detection",
  "raster to vector", "llm evaluation", "model training", "mlflow", "model deployment", "version history",
  "save a copy", "upload new version", "download notebook", "export notebook", "share notebook",
  "shared account", "script output panel", "restart kernel", "interrupt kernel", "restart container",
  "kernel stuck connecting", "output tables disappearing", "XY column", "latitude longitude", "Poly column",
  "troubleshoot notebook", "notebook tile missing", "pip install too long", "data science notebook"
---

# MapLarge Notebooks

BEFORE creating, authoring, running, debugging, or scheduling a MapLarge notebook — or answering any question about them — read the bundled reference at `${CLAUDE_PLUGIN_ROOT}/skills/maplarge-notebooks/reference/maplarge-notebooks.md`. It is the authoritative guide. Read only the relevant sections (use the table below); read the whole file only when the task spans many areas.

## When to read what

| Task | Sections to read |
|------|------------------|
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
