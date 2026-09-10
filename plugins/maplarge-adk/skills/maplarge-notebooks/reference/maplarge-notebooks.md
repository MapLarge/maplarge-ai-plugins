# MapLarge Notebooks — User Guide

A comprehensive end-user guide to MapLarge Notebooks: what they are, how to create and run them, every feature exposed in the UI, the full `maplarge` Python API, how to use them inside ETL flows, and how to build custom kernels.

---

## 1. What Is a MapLarge Notebook?

### 1.1 The short version

A **MapLarge Notebook** is a Jupyter-compatible interactive Python (or R) computing environment built into the MapLarge platform. You write code in cells, run them against a live kernel, and see output inline — same mental model as Jupyter, JupyterLab, Databricks notebooks, or Google Colab. The difference is that the kernel lives inside a managed container on the MapLarge server, every kernel ships with an `import maplarge` module, and the notebooks themselves are first-class citizens of the platform rather than files on your laptop.

### 1.2 Why this exists (the problem being solved)

A lot of real analytics work looks like: "pull some MapLarge tables, do something Python-shaped to them, produce a new table that people can query and put on a dashboard — and run it again every hour / every day / every time a feed updates."

Without MapLarge Notebooks you'd stitch that together with:

- A local Jupyter notebook that hits the MapLarge REST API
- Some ad-hoc Python that writes CSVs
- A separate scheduler / cron / Airflow DAG to re-run it
- Custom code to upload results back into a MapLarge table
- Secret management for API tokens that touch the server
- A way for a colleague to see what you actually ran

MapLarge Notebooks collapse all of that into one artifact:

- **The kernel is already inside the platform**, so `maplarge.GetData("myTable")` reads straight from storage with no network hop and no separate credentials
- **The notebook is the ETL step** — drop the same notebook into an ETL flow and it runs on a schedule
- **The output table lands natively** in a MapLarge account, ready for dashboards, SQL queries, or downstream ETL
- **Version history, sharing, and audit** come for free because notebooks are stored as server-side records, not files

If the question is "can I just run Jupyter on my laptop?", you can — and for one-shot exploration you sometimes should. MapLarge Notebooks become the right answer when the result needs to live on the platform, run repeatedly, or be accessible to other people.

### 1.3 How they differ from a local Jupyter notebook

| Dimension | Local Jupyter / Colab | MapLarge Notebook |
| ----------- | ----------------------- | ------------------- |
| Kernel location | Your laptop / Colab VM | Managed container on the MapLarge server |
| Python environment | Whatever you `pip install`ed | Pre-built container images (standard data-science, LLM, vision, Ollama, etc.) |
| Data access | Export/import via CSV, REST calls, OAuth | `import maplarge` — direct |
| Output destination | Files, print statements | `maplarge.SetOutput(df)` → new MapLarge table |
| Scheduling | Bring your own (cron, Airflow) | Wire into ETL, scheduled by the platform |
| Storage | `.ipynb` on disk | PersistentJson record on the server, full version history |
| Sharing | Email a file / check into git | Save in a shared account, collaborators see it on Home page |
| Credentials | Hand-managed API tokens | Secrets toolbar; MapLarge auth implicit |
| Compute sizing | Whatever your laptop has | Resource requests/limits on the container (CPU/memory/GPU) |

The **`.ipynb` compatibility is genuine** — you can export a MapLarge notebook as `.ipynb`, open it in VS Code or JupyterLab (though `import maplarge` won't work outside the MapLarge container), and upload a standard `.ipynb` back into MapLarge.

### 1.4 Where notebooks fit in the MapLarge ecosystem

Notebooks are one of several ways to get data in, transform it, and get it back out. Their specific niche:

- **Tables** are where data lives (rows, columns, queryable).
- **Imports** get external data into a table (file uploads, connectors).
- **ETL flows** chain transforms (query operators, filters, joins) into pipelines.
- **Dashboards** visualize table data interactively.
- **Notebooks** are the "escape hatch to arbitrary Python" inside that ecosystem. They show up in two places:
  1. **Interactively in the editor** — for exploration, prototyping, one-off analysis
  2. **As an "External Processing" step inside an ETL flow** — so the Python you wrote interactively becomes a scheduled production step

The lifecycle most notebooks follow: create → iterate interactively (often 40-70 saves before stabilizing) → wire into an ETL flow → run scheduled or on demand → dashboard-visualize the output table.

### 1.5 When to reach for a notebook — and when not to

**Use a notebook when:**

- You need to transform data in ways that MapLarge's built-in query operators can't express (custom math, NLP, ML inference, calling external APIs, parsing odd file formats)
- You want the result as a MapLarge table for querying / dashboards / further ETL
- You want the transformation to run on a schedule or against fresh data
- You're training or evaluating a model and need a structured place to log runs
- The analysis is complex enough that a cell-based explanation is easier to maintain than a monolithic script

**Reach for something else when:**

- A MapLarge query / ETL transform can already do the job — prefer the native primitives
- You're doing one-shot laptop-local exploration that will never need to run on the server
- You just need a dashboard — notebooks don't render UI; they produce tables that dashboards consume
- The workload is genuinely heavy and short — a dedicated batch job or standalone container may fit better

### 1.6 Who actually uses them

Observed in production:

- **Data engineers** building ingestion feeds from external APIs (Capital Bike Share, WMATA, OpenSky flight tracking, satellite TLE orbit data, weather grib2 files) → scheduled as ETL steps
- **Analysts** reshaping and enriching existing tables (schema condensers, computed-column additions, spatial clustering)
- **MLOps engineers** training vision models, logging to MLFlow, registering and deploying best-model checkpoints
- **LLM teams** running prompt evaluation rigs (compete multiple models on the same trace, judge responses, persist results)
- **Researchers** prototyping change-detection, density-mapping, and geospatial-analytics pipelines

The two dominant usage profiles — "data ingestion / ETL" and "MLOps / LLM evaluation" — use the same tool in visibly different ways; see §13 for the full breakdown.

---

## 2. Getting Started

### 2.1 Creating a notebook

**Home page → Create New → Notebook.**

Fill in:

- **Account** — defaults to Personal; pick a different account if you want collaborators to see it
- **Name** and **Description** (optional)
- **Container Image** — pick one of the registered kernel images (only visible if your admin has registered more than one)

Click **Create**. The notebook opens with:

- One empty code cell on the left
- A **Script Output** panel on the right
- A **Toolbar** at the top

### 2.2 Importing an existing `.ipynb`

Standard Jupyter notebooks can be uploaded as-is.

**Home page → Notebooks section → Upload → Browse → pick your `.ipynb` → Create.**

The notebook will appear on the home page after upload. Any MapLarge-specific toolbar settings (Table Inputs, VFS Mappings, etc.) come in empty — you can fill them in after import.

### 2.3 Exporting a notebook

Open the notebook → click the notebook **name** in the top bar → **Download**. A `.ipynb` file lands in your Downloads folder. The file is fully Jupyter-compatible; MapLarge-specific toolbar config is preserved in the notebook's `metadata` block so it round-trips back into MapLarge if re-uploaded.

### 2.4 Other top-bar actions on the name menu

Click the down arrow next to the notebook name to access:

| Action | What it does |
| --------------------- | -------------- |
| **Edit** | Rename / change description |
| **Save a Copy** | Duplicate into the same or a different account |
| **Version History** | Browse all prior saves; restore an older version |
| **Download** | Export as `.ipynb` |
| **Upload new version** | Replace the notebook's contents with an uploaded file (keeps history) |
| **Delete** | Remove the notebook |

---

## 3. The Notebook Editor — Tour

### 3.1 Top ribbon bar

| Area | Purpose |
| ------------------------ | --------- |
| **Notebook name menu** | Edit / Copy / Version History / Download / Upload / Delete |
| **Table Inputs** | Attach MapLarge tables as named inputs your script can reference (§4.1) |
| **VFS Mappings** | Mount MapLarge VFS folders into the kernel container (§4.2) |
| **Output Fields** | Declare the output-table schema for ETL (§4.3) |
| **User Parameters** | Named parameters your script can read from `maplarge.userParameters` (§4.4) |
| **Secrets** | Inject API keys, tokens, etc. into the container without hardcoding (§4.5) |
| **Resource Limits / Requests** | Set CPU / memory / GPU limits for the kernel (§4.6) |
| **Idle Timeout** | Minutes of inactivity before the kernel is shut down (§4.7) |
| **Cell Palette** | Add Code, Add Markdown, Cut, Copy, Paste, **Run Cell** (`Ctrl+Enter`) |
| **Kernel Controls** | Start, Interrupt, Restart, Restart Container, Stop, Switch Image (§3.3) |
| **Output Panel toggle** | Show/hide Script Output panel; pick layout |

### 3.2 Cell operations

Select a cell (its boundary highlights) before any operation.

- **Add Code / Add Markdown** — the `+` icon on the cell palette, or the drop-down for cell type
- **Cut / Copy / Paste** — scissors / copy / paste icons in the palette
- **Run Cell** — play icon, or `Ctrl+Enter`. Runs the selected cell and advances to the next

### 3.3 Kernel controls

A **kernel** is the language runtime; a **container** is the Docker image the kernel is running inside. They can be controlled separately:

| Control | Effect |
| --------------------- | -------- |
| **Start Kernel** | Start the runtime environment (boots the container if needed) |
| **Interrupt Kernel** | Stop the cell currently running (like Ctrl-C) |
| **Restart Kernel** | Reset language state — every variable and function you've defined is gone — but keep the container running |
| **Restart Container** | Restart the container itself; the kernel reconnects |
| **Stop Kernel** | Stop the container |
| **Switch Image** | Rebind the notebook to a different registered container image |

The kernel status indicator (top right) reads:

- `connecting` — the container is starting, kernel not ready yet
- `idle` — ready to accept cells
- `busy` — cell is running
- `stopped` / `failed` — container exited or failed to start

Cells are numbered `[1]:`, `[2]:`, etc. as they execute — that counter is your easiest signal of whether a run actually happened.

---

## 4. Toolbar Features in Depth

### 4.1 Table Inputs

**Toolbar → Table Inputs → Add Argument.**

Attach MapLarge tables to your notebook as named inputs. For each argument you pick:

- **Data Source** — the MapLarge table (e.g., `test/acled`)
- **Name** — the name you'll reference in Python (e.g., `ACLED`)

In your script, pass that **Name** to any `maplarge.GetData` / `DataIterator` / `GetInputSchema` call:

```python
df = maplarge.GetData("ACLED", 0, 1000)
```

When the notebook runs inside an ETL flow, the ETL editor reconnects these argument names to whatever data source the flow is passing in — so the same notebook script works against any table that matches the expected shape.

### 4.2 VFS Mappings

**Toolbar → VFS Mappings → Add File.**

Mount MapLarge VFS folders into the kernel container's filesystem. For each mapping:

- **VFS path** — the path inside MapLarge's VFS
- **Mount point** — where inside the container it shows up (e.g., `/data/models`)
- **Writable** — unchecked (read-only) by default

Use VFS for things that need to **persist across kernel restarts** or be **shared between notebooks**, such as:

- Trained model files (`model.pkl`, `model.onnx`)
- Large reference datasets that shouldn't be a MapLarge table
- Intermediate artifacts

The `maplarge` API also exposes these files directly (§5.3): `ListFiles`, `GetFileBytes`, `SaveFile`.

### 4.3 Output Fields

**Toolbar → Output Fields.**

Declares what the notebook will produce when used in an ETL flow.

- **Copy Data Form** → pick one of your Table Inputs. The notebook's output schema starts with that input's columns.
- **Add Column** → add columns on top. Each column has **Column Name** and **Column Type** (String, Int32, Int64, Float32, Float64, Boolean, DateTime, XY, Shape, etc.).

Special case: if your columns include both `latitude` and `longitude`, MapLarge automatically adds an `XY` geometry column — so the output table is immediately mappable without extra work.

Whatever you declare here is what downstream ETL steps will see as the notebook's output schema, and it must match what you call `maplarge.SetOutputSchema(...)` with from Python.

### 4.4 User Parameters

**Toolbar → User Parameters.**

Named key-value pairs passed into your script at runtime. Good for:

- Thresholds (`threshold=0.5`)
- Category filters (`category=deaths`)
- Model versions (`modelVersion=v3`)
- Any knob that callers might want to tune without editing cell source

From Python:

```python
import maplarge
t = float(maplarge.userParameters.get("threshold", "0.5"))
```

When the notebook is used as an ETL step, the ETL flow captures the parameter values at flow-configuration time.

### 4.5 Secrets

**Toolbar → Secrets.**

Inject API keys, tokens, database passwords, etc. into the container without hardcoding them in cell source. For each secret you pick:

- **Name** — identifier
- **Path** — where it appears in the container (file path or env var, depending on mount method)
- **Mount Method** — file or env

Always prefer Secrets over hardcoded credentials — cell source is visible to anyone with access to the notebook and gets captured in version history.

### 4.6 Resource Requests / Limits

**Toolbar → Resource Limits / Requests.**

Kubernetes-style resource hints for the kernel container. Common keys:

- `cpu` — e.g., `"2"` (2 CPU cores)
- `memory` — e.g., `"4Gi"` (4 gibibytes)
- `nvidia.com/gpu` — e.g., `"1"` (one GPU — only if your cluster has GPU nodes)

**Requests** = what you reserve; **Limits** = the hard cap. Useful when running heavy ML training or when the default allocation is too small.

### 4.7 Idle Timeout

**Toolbar → Idle Timeout (min).**

Number of minutes of inactivity after which the kernel is automatically stopped. Valid range: **5 to 1440 minutes (24 hours)**. If unset, the platform-wide default (typically 10 minutes) applies.

Raise this for long-running exploratory sessions; lower it to be kind to shared infrastructure.

> **Heads up:** when the idle watcher shuts down an interactive kernel, any output tables produced by that kernel's session are cleaned up. If you want the results to persist, either run the notebook as an ETL step (the ETL flow commits the output table formally) or raise the idle timeout while you're working.

### 4.8 Container Image / Switch Image

- When creating a notebook, you can pick a **Container Image** if multiple are registered.
- On an existing notebook: **kernel menu → Switch Image** to change which image backs it. The next kernel start uses the new image.

---

## 5. The `maplarge` Python API

Every MapLarge kernel container has `import maplarge` pre-installed. This is the full set of methods available to your cells.

### 5.1 Execution context

```python
maplarge.MODE
# One of:
#   maplarge.MODE.INTERACTIVE  — live kernel session in the browser editor
#   maplarge.MODE.DESCRIBE     — ETL is asking for the output schema only (fast path)
#   maplarge.MODE.EXECUTE      — ETL is running the step for real
```

Branch on this so your script doesn't do heavy work when ETL just needs the schema:

```python
import maplarge

maplarge.SetOutputSchema(columns=[
    {"name": "result", "type": "Float64"}
], copyFromSource="table0")

if maplarge.MODE != maplarge.MODE.DESCRIBE:
    # expensive work only for INTERACTIVE or EXECUTE
    ...
```

```python
maplarge.userParameters  # dict of name → value (strings) from the User Parameters toolbar
```

### 5.2 Reading data

```python
# Schema for declared inputs (ETL) or any accessible table (interactive)
maplarge.GetInputSchema(inputs=["test/accidents_2010", "tutorial/mockData1"])

# Total row count
maplarge.GetRecordCount("table0")

# Fetch a slice as a pandas DataFrame
df = maplarge.GetData("table0", 0, 60000, ["pop", "TOTALACRES"])

# Iterate the whole source in pages
for row in maplarge.DataIterator("table0", page_size=100000, columns=None):
    ...

# Raw binary column value (stored blob / image bytes)
raw = maplarge.GetBinaryData("imageTable", "imageColumn", 0)
```

The `source` argument is either:

- a **Table Input name** you declared in the toolbar (recommended; works the same in interactive and ETL modes), or
- a fully-qualified `account/table` name (works in interactive mode; in ETL, prefer named inputs so the flow editor can rewire sources)

### 5.3 Writing output (required for ETL)

```python
# Declare the output columns. Required in DESCRIBE and EXECUTE modes.
maplarge.SetOutputSchema(
    columns=[
        {"name": "cluster", "type": "Int32"},
        {"name": "score",   "type": "Float64"}
    ],
    copyFromSource="table0"  # optional: start with table0's schema and add on top
)

# Push the result DataFrame. Required in EXECUTE mode.
maplarge.SetOutput(df, additive=False)

# Replace with additive=True to append to whatever was previously set
maplarge.SetOutput(more_rows, additive=True)

# Discard output set earlier
maplarge.ClearOutput()
```

### 5.4 VFS file access

```python
maplarge.ListFiles(path, recursive=False)  # list files under a VFS path
size = maplarge.GetFileBytes(path)         # size of a VFS file, in bytes
maplarge.SaveFile(vfsPath, localPath)      # copy VFS → container's local filesystem
```

Combine with toolbar VFS Mappings (§4.2) to read from a VFS path without copying first, or use `SaveFile` to pull a file out of VFS into the container's local FS for processing.

---

## 6. Complete Examples

### 6.1 Append a computed column to an existing table

```python
import maplarge
import pandas as pd

maplarge.SetOutputSchema(
    columns=[{"name": "NewColumn", "type": "String"}],
    copyFromSource="table0"
)

newData = ["NewValue" for _ in maplarge.DataIterator("table0")]
df = pd.DataFrame(newData, columns=["NewColumn"])
maplarge.SetOutput(df)
```

### 6.2 Create new data from scratch

```python
import maplarge
import pandas as pd

maplarge.SetOutputSchema(columns=[
    {"name": "Name",   "type": "String"},
    {"name": "Amount", "type": "Int32"}
])

output = pd.DataFrame([['Alice', 10], ['Bob', 20]], columns=['Name', 'Amount'])
maplarge.SetOutput(output)
```

### 6.3 Row-by-row scoring over a big table

```python
import maplarge
import pandas as pd

maplarge.SetOutputSchema(columns=[
    {"name": "score", "type": "Float64"}
], copyFromSource="input")

if maplarge.MODE != maplarge.MODE.DESCRIBE:
    scores = [my_score(row) for row in maplarge.DataIterator("input", page_size=50000)]
    maplarge.SetOutput(pd.DataFrame({"score": scores}))
```

### 6.4 Clustering and publishing back

```python
import maplarge
import pandas as pd
from sklearn.cluster import KMeans

maplarge.SetOutputSchema(columns=[
    {"name": "cluster", "type": "Int32"}
], copyFromSource="points")

if maplarge.MODE != maplarge.MODE.DESCRIBE:
    n = maplarge.GetRecordCount("points")
    df = maplarge.GetData("points", 0, n, ["latitude", "longitude"])
    km = KMeans(n_clusters=5, n_init=10).fit(df[["latitude", "longitude"]])
    maplarge.SetOutput(pd.DataFrame({"cluster": km.labels_}))
```

> Because `latitude` and `longitude` are both present on the input, the output table automatically gets an `XY` column and is immediately mappable.

### 6.5 User-tunable threshold

Toolbar → **User Parameters** → `threshold = 0.5`.

```python
import maplarge
t = float(maplarge.userParameters.get("threshold", "0.5"))
# ... use t ...
```

### 6.6 Ingest an external data feed into a MapLarge table

This is the most common notebook pattern in practice. No Table Inputs — the data comes from an outside API. Declare the output schema and push rows straight in.

```python
import maplarge
import pandas as pd
import requests

maplarge.SetOutputSchema(columns=[
    {"name": "station_id", "type": "String"},
    {"name": "name",       "type": "String"},
    {"name": "latitude",   "type": "Double"},
    {"name": "longitude",  "type": "Double"},
    {"name": "bikes_available", "type": "Int32"},
    {"name": "docks_available", "type": "Int32"},
    {"name": "observed_at", "type": "DateTime"},
])

if maplarge.MODE != maplarge.MODE.DESCRIBE:
    r = requests.get("https://example.com/feed.json", timeout=30)
    rows = r.json()["stations"]
    df = pd.DataFrame(rows)
    maplarge.SetOutput(df)
```

Wire this up as an ETL step and schedule it to run every 5 minutes — you've just built a live data feed into MapLarge. Because `latitude` + `longitude` are both present, the output table auto-gets an `XY` column and is immediately mappable.

### 6.7 Reshape an existing table into a new schema

Second most common pattern — take one Table Input, rewrite its rows.

```python
import maplarge
import pandas as pd

maplarge.SetOutputSchema(columns=[
    {"name": "sat_id",       "type": "String"},
    {"name": "epoch_utc",    "type": "DateTime"},
    {"name": "inclination_deg", "type": "Double"},
    {"name": "eccentricity", "type": "Double"},
])

if maplarge.MODE != maplarge.MODE.DESCRIBE:
    rows = []
    for raw in maplarge.DataIterator("TLE_Hist"):
        rows.append({
            "sat_id": raw["NORAD_CAT_ID"],
            "epoch_utc": parse_epoch(raw["EPOCH"]),
            "inclination_deg": float(raw["INCLINATION"]),
            "eccentricity": float(raw["ECCENTRICITY"]),
        })
    maplarge.SetOutput(pd.DataFrame(rows))
```

Notice the Table Input is named `TLE_Hist`, not `InputTable1`. Rename your inputs; future you will thank you.

### 6.8 Join multiple Table Inputs into a unified catalog

When you need to combine several source tables (e.g., satellite imagery catalogs from different providers).

```python
import maplarge
import pandas as pd

maplarge.SetOutputSchema(columns=[
    {"name": "provider",   "type": "String"},
    {"name": "image_id",   "type": "String"},
    {"name": "acquired",   "type": "DateTime"},
    {"name": "latitude",   "type": "Double"},
    {"name": "longitude",  "type": "Double"},
    {"name": "cloud_cover","type": "Double"},
])

if maplarge.MODE != maplarge.MODE.DESCRIBE:
    dfs = []
    for provider, input_name in [
        ("Airbus",   "Airbus_Footprints"),
        ("Capella",  "Capella_S3"),
        ("GEGD",     "GEGD_Footprints"),
        ("Maxar",    "Maxar_2024"),
        ("UMBRA",    "UMBRA"),
    ]:
        df = maplarge.GetData(input_name, 0, maplarge.GetRecordCount(input_name))
        df["provider"] = provider
        dfs.append(df[["provider", "image_id", "acquired", "latitude", "longitude", "cloud_cover"]])
    maplarge.SetOutput(pd.concat(dfs, ignore_index=True))
```

### 6.9 LLM multi-model evaluation

Score the same set of prompts against several LLMs and publish a comparison table. Common on R&D servers with `maplarge/llm` or `ollama/ollama` images.

```python
import maplarge
import pandas as pd

maplarge.SetOutputSchema(columns=[
    {"name": "prompt_id",  "type": "String"},
    {"name": "model",      "type": "String"},
    {"name": "response",   "type": "String"},
    {"name": "latency_ms", "type": "Int32"},
    {"name": "score",      "type": "Double"},
])

if maplarge.MODE != maplarge.MODE.DESCRIBE:
    import time
    from my_llm_client import call_model   # provided by the container image
    rows = []
    for p in maplarge.DataIterator("trace"):
        for model in ["claude-opus-4-7", "claude-haiku-4-5", "llama-3-70b"]:
            t0 = time.time()
            resp = call_model(model, p["prompt"])
            rows.append({
                "prompt_id":  p["id"],
                "model":      model,
                "response":   resp,
                "latency_ms": int((time.time() - t0) * 1000),
                "score":      evaluate(resp, p["ground_truth"]),
            })
    maplarge.SetOutput(pd.DataFrame(rows))
```

Drop this into an ETL step and you have a scheduled model-comparison pipeline.

### 6.10 Parameterized ML training with MLFlow

Treat a notebook as a training job — hyperparameters come from User Parameters, metrics and artifacts go to MLFlow. This is the single best fit for MapLarge notebooks in an ML workflow.

```python
import maplarge
import mlflow
import pandas as pd

# User Parameters from the toolbar
batch_size = int(maplarge.userParameters.get("batch_size", "8"))
max_epochs = int(maplarge.userParameters.get("max_epochs", "10"))
lr         = float(maplarge.userParameters.get("lr", "0.0003"))
checkpoint = maplarge.userParameters.get("checkpoint", "")
config     = maplarge.userParameters.get("config", "")

maplarge.SetOutputSchema(columns=[
    {"name": "run_id",    "type": "String"},
    {"name": "epoch",     "type": "Int32"},
    {"name": "val_loss",  "type": "Double"},
    {"name": "val_acc",   "type": "Double"},
])

if maplarge.MODE == maplarge.MODE.DESCRIBE:
    pass
else:
    mlflow.set_tracking_uri("maplarge:/")
    mlflow.set_registry_uri("maplarge:/")
    with mlflow.start_run() as run:
        mlflow.log_params({
            "batch_size": batch_size, "max_epochs": max_epochs,
            "lr": lr, "checkpoint": checkpoint, "config": config,
        })
        rows = []
        for epoch in range(max_epochs):
            val_loss, val_acc = train_one_epoch(lr, batch_size)  # your training
            mlflow.log_metric("val_loss", val_loss, step=epoch)
            mlflow.log_metric("val_acc",  val_acc,  step=epoch)
            rows.append({"run_id": run.info.run_id, "epoch": epoch,
                         "val_loss": val_loss, "val_acc": val_acc})
        mlflow.log_artifact("model.pt")
        maplarge.SetOutput(pd.DataFrame(rows))
```

Kicking off five runs with different `lr` values becomes "edit User Parameter, Run Cell" — no code changes, and every run is traceable through MLFlow.

### 6.11 Before/after change detection

Flood / earthquake / wildfire change-detection notebooks all follow the same shape: two Table Inputs, polygon output.

```python
import maplarge
import pandas as pd

maplarge.SetOutputSchema(columns=[
    {"name": "change_id",   "type": "String"},
    {"name": "change_type", "type": "String"},
    {"name": "area_km2",    "type": "Double"},
    {"name": "footprint",   "type": "Poly"},
    {"name": "detected_at", "type": "DateTime"},
])

if maplarge.MODE != maplarge.MODE.DESCRIBE:
    before_df = maplarge.GetData("before", 0, maplarge.GetRecordCount("before"))
    after_df  = maplarge.GetData("after",  0, maplarge.GetRecordCount("after"))
    changes = detect_changes(before_df, after_df)   # your algorithm
    maplarge.SetOutput(pd.DataFrame(changes))
```

Table Input names `before` / `after` (or `allImages` / `newImages`) are the established convention — stick with them.

### 6.12 Train once, score often via VFS

Two notebooks sharing a VFS-mounted folder:

- **Notebook A (training)** — runs manually. Fits a model and writes `model.pkl` to a VFS mount with **Writable** checked.
- **Notebook B (scoring)** — used as an ETL step. Reads `model.pkl` from the same VFS mount (read-only), applies it per row, calls `SetOutput`.

Notebook A can use a heavy GPU container image; Notebook B can use a lightweight CPU image — the VFS mount bridges them.

---

## 7. Using a Notebook Inside an ETL Flow

Once a notebook defines an analytic, you can drop it into an ETL flow so it runs on a schedule, on demand, or as new data arrives.

**Steps (from the UI):**

1. **Home page → Create New → ETL**
2. **Add Data** → pick an input table (e.g., `test/stanag_dc`)
3. **Add Transform → Advanced Components → External Processing**
4. **Script Source** → pick one of your notebooks from the list (or "custom script")
5. Wire the notebook's Table Inputs to ETL data sources (the ETL editor shows your declared arguments)
6. **Output to Table** → fill in Destination Account, Friendly Name, Table Name, Tags, Visibility, Action (Overwrite / Append / Merge)
7. Run now or save and schedule

The important contract: your notebook must correctly handle `maplarge.MODE.DESCRIBE` (fast return of schema) and `maplarge.MODE.EXECUTE` (real run with `SetOutput`). If you only ever call `SetOutput(...)` unconditionally, the ETL planner spends unnecessary time on every schema resolution — and if you don't call `SetOutputSchema(...)`, it can't resolve the schema at all. Always pair them.

When the ETL finishes, MapLarge offers **Dashboard Actions → Open in Dashboard Editor**, which creates a new dashboard with the result table pre-loaded.

---

## 8. Version History

Notebooks are versioned automatically on save.

**Notebook name menu → Version History.** Pick any prior version to view or restore. Restoring creates a new version on top (history is never destroyed, just extended).

Use **Upload new version** on the name menu to replace the current contents from a local `.ipynb` while preserving history.

---

## 9. Custom Kernels (Building Your Own Docker Image)

Sometimes the default image isn't enough — you need pre-installed libraries, CUDA, a specific Python version, or a heavyweight ML stack where `pip install` on every run is too slow. You can build your own kernel image and register it with MapLarge.

### 9.1 When to build a custom kernel

- Installing dependencies in-notebook takes too long
- You have proprietary Python packages that need to be available everywhere
- You need GPU drivers, CUDA, etc.
- You want to standardize a team's environment

### 9.2 Starting from the MapLarge kernel helpers

Your image needs the MapLarge Python helpers so that `import maplarge` works inside it. Add these to your repo before building:

```text
ml_python_packages/
    maplargeclient/       # required
    mlflowmaplarge/       # only if you want MLFlow integration
maplarge.py
mlgetfiles.py
entrypoint.sh
```

In your Dockerfile:

- `COPY` those files into the image
- `RUN pip install ./ml_python_packages/maplargeclient`
- (Optional) `RUN pip install ./ml_python_packages/mlflowmaplarge` for MLFlow
- Set the entrypoint to `entrypoint.sh`

Build the image locally, test it, push to a registry (Docker Hub, GHCR, a private registry).

### 9.3 Registering the image in MapLarge

(Requires admin role.)

1. **Home page → Admin cog → Container Management**
2. **Images → +** (new image)
3. Fill in:
   - **Image** — fully qualified reference, e.g., `myorg/my-kernel`
   - **Default Tag** — e.g., `latest` or a pinned version
   - **Description**
   - **Execute Command** — typically `python` or `ipython`
   - **Supports Interactive Notebooks** — check this to make it pickable for notebooks
   - **Image Pull Policy** — `IfNotPresent` or `Always`
4. Save.

Once registered, any notebook can **Switch Image** to the new kernel, and new-notebook creation will show it in the picker.

For private registries, your MapLarge admin needs to have credentials configured in the server's registry config — coordinate with them before using a private image.

---

## 10. Admin: Container Management (Admin Users Only)

The **Container Management** sidebar entry (under Admin) gives admin users a UI for:

- **Images** — list, add, edit, delete registered container images
- **Workload Logs** — inspect logs from running and recent kernel containers for diagnostics

End-users don't see this sidebar entry; if you need an image registered, ask your admin.

---

## 11. Troubleshooting

### "There's no Notebook tile on my Home page"

- The platform admin needs to enable notebooks at the server level.
- At least one container image needs to be registered. If neither is true, the Notebook tile doesn't appear.
- If other users see it and you don't, check whether you have the right account permissions.

### "Kernel is stuck on `connecting` and never goes to `idle`"

- Give it a minute on first start — the image may be pulling for the first time.
- **Stop Kernel → Start Kernel** to retry.
- If it still doesn't transition, contact your admin — the server's Docker/Kubernetes connection may be misconfigured.

### "My cell runs but produces no output"

- Check the **Script Output** panel — exceptions land there, not inline.
- Make sure the Script Output panel is actually visible (toolbar → Show Output Panel).
- If stdout appears to be buffered, add `print(..., flush=True)` or run the cell again.

### "ETL says my notebook's output schema is empty"

- Your script isn't calling `maplarge.SetOutputSchema(...)` in `DESCRIBE` mode.
- Always call `SetOutputSchema` unconditionally at the top of the script, then gate the heavy work on `if maplarge.MODE != maplarge.MODE.DESCRIBE:`.

### "My output tables keep disappearing"

- In interactive mode, output tables produced inside the session are tied to the kernel. When the kernel times out, the cleanup removes them.
- To keep results, either raise **Idle Timeout**, or run the notebook as a proper ETL step so the ETL flow commits the output table formally.

### "I restarted the kernel and lost all my variables"

- That's what **Restart Kernel** does — it's the fast way to clear state.
- Use **Interrupt** instead if you just want to stop the currently running cell.
- **Restart Container** is even more destructive — it also resets anything written to the container's non-VFS filesystem.

### "I want to share a notebook with a colleague"

- Create it (or Save a Copy) into a **shared account** (not Personal). Anyone with access to that account sees it on their Home page.
- Or export with **Download** and send them the `.ipynb` to Upload.

### "Installing pip packages takes too long every time"

- Consider building a custom kernel image with those packages baked in (§9). Much faster than a fresh `pip install` on every kernel start, and it standardizes the environment for everyone using that image.

---

## 12. Quick Reference — `maplarge` Methods

| Method | Purpose |
| -------- | --------- |
| `maplarge.MODE` | `INTERACTIVE` / `DESCRIBE` / `EXECUTE` — branch on this to skip heavy work in `DESCRIBE` |
| `maplarge.userParameters` | Dict of toolbar-supplied named parameters |
| `maplarge.GetInputSchema(inputs=[...])` | Schema of declared inputs or any accessible table |
| `maplarge.GetRecordCount(source)` | Row count |
| `maplarge.GetData(source, start, take, columns=None)` | Fetch rows as a pandas DataFrame |
| `maplarge.DataIterator(source, page_size=100000, columns=None)` | Iterator over the whole source |
| `maplarge.GetBinaryData(source, column, rowIndex)` | Raw bytes from a binary column |
| `maplarge.SetOutputSchema(columns=[...], copyFromSource=None)` | Declare the output schema (required for ETL) |
| `maplarge.SetOutput(df, additive=False)` | Push results (required in `EXECUTE`) |
| `maplarge.ClearOutput()` | Discard previously set output |
| `maplarge.ListFiles(path, recursive=False)` | List files under a VFS path |
| `maplarge.GetFileBytes(path)` | Size of a VFS file in bytes |
| `maplarge.SaveFile(vfsPath, localPath)` | Copy VFS file → container local FS |

---

## 13. What Notebooks Are Actually Used For

Based on real-world notebook use across multiple MapLarge servers, there are two distinct usage profiles that shape how the toolbar gets used and how code is structured.

### 13.1 Profile A — Data-ingestion / ETL (dominant on "analyst" servers)

This is the pattern on servers used for data pipelines and dashboards:

1. **Ingest an external data feed → land it as a MapLarge table.** Capital Bike Share, WMATA buses, OpenSky flight data, satellite TLEs, financial feeds. Notebook pulls from an API on a schedule (via ETL), reshapes the rows, calls `SetOutput`. Often **zero Table Inputs** — data comes from the outside world.

2. **Reshape / reformat an existing MapLarge table.** "Reformat Historical TLE Data to New Schema" — take one Table Input, rewrite its rows into a new schema, publish. Usually **one Table Input, one output**.

3. **Cross-source join across multiple Table Inputs.** Schema condensers combining satellite imagery catalogs (Airbus, Capella, GEGD, Maxar, UMBRA) into a unified view. Only pattern that uses 5+ Table Inputs.

4. **Propagate / compute derived data against existing tables.** Orbit propagation, scoring. One input, many derived output columns (20+).

5. **Binary processing via VFS.** grib2 weather files → voxel tables, image bytes → feature tables.

Typical toolbar usage: Table Inputs ~48%, Output Schema ~52%, VFS ~14%, User Parameters ~5%.

### 13.2 Profile B — LLM evaluation / ML training / MLOps (dominant on "R&D" servers)

Different patterns emerge on servers where notebooks do ML training, LLM evaluation, and model deployment:

1. **LLM evaluation rigs.** Run a set of prompts (a "trace") through multiple LLMs, score or compare responses, publish results as a table. Common patterns: "LLM - Bedrock Models - Compete", "LLM - Ollama Models - Compete", "LLM-VLM_as_a_Judge_for_RPPs", "LLM_Trace_Log_Per_OPP_Case". Often uses a dedicated LLM-inference image like `maplarge/llm` or `ollama/ollama`.

2. **Model training with MLFlow.** Parameterized notebooks that train a vision or statistical model, log metrics/artifacts to MLFlow. Examples: "HMM with MLFlow", "mmrotate_training_mlflow_log_artifacts". Takes hyperparameters via User Parameters (see §13.4). Uses specialized images like `maplarge/mmrotate`.

3. **Model deployment.** Load a best-model checkpoint from MLFlow, run inference against a Table Input of images/rasters, publish predictions. Examples: "mmrotate_deployment_mlflow_best_model", "mmrotate_inference".

4. **Change detection on rasters/imagery.** `before` + `after` or `allImages` + `newImages` Table Inputs → polygon deltas of what changed. Examples: "BRIO_Flood_Change_Detection", "Earthquake_Change_Detection", "Wildfire_HADR_Smoke_Detection".

5. **Spatial clustering / raster-to-vector.** Cluster event points into regions ("Flooding_HADR_Clustering_Flood_Events"), or threshold-segment a population raster into density polygons ("worldpop_raster_to_polygons_threshold").

6. **Ontology / metadata generation.** Use LLMs to auto-generate ontologies, Dockerfiles, or repo-maturity scores from code/docs.

Typical toolbar usage on Profile B servers: **Table Inputs ~68%**, **Output Schema ~60%**, **VFS ~20%**, **User Parameters ~16%** — substantially higher adoption than Profile A.

### 13.3 Toolbar features by adoption (across both profiles)

- **Table Inputs** — 50-70% depending on workload. Near-universal for notebooks that transform existing MapLarge tables.
- **Output Fields / Output Schema** — 50-60%. Required for ETL use; skipped by pure-exploration notebooks.
- **VFS Mappings** — 15-20%. Binaries, model weights, large artifacts.
- **User Parameters** — 5% on ETL servers, 15-20% on ML servers. **If you're doing ML training, you probably want these.** (See §13.4.)
- **Resource Limits** — 0% observed across hundreds of notebooks. Users trust defaults.
- **Idle Timeout** — <5%. Default works for most.
- **Secrets** — present but usage not measurable from metadata.

### 13.4 User Parameters — the hyperparameter pattern

User Parameters are where you pass knobs a notebook might want tuned between runs without editing code. Common MLOps uses:

| Notebook purpose | Typical User Parameters |
| ------------------- | ------------------------- |
| Model training | `checkpoint`, `batch_size`, `max_epochs`, `lr`, `config` |
| Deployment / inference | `model`, `config` |
| Clustering / stats | `max_states`, `min_states`, `min_samples_required` |
| Geo notebooks | `lat`, `lon` (name of the latitude/longitude columns) |
| Table-selection | `polygon`, `table`, `account` (pointing at an input by name) |

If you catch yourself editing a cell just to change a number or a table name between runs, that's a User Parameter.

### 13.5 Consistent Table Input naming conventions

Common naming patterns observed in practice:

- **Change detection:** `before` / `after`, or `allImages` / `newImages`
- **LLM evaluation:** `trace` (the input prompts + ground truth)
- **Domain-specific:** `flood`, `flooding`, `shadow`, `imageData`, `operations`, `tasks`
- **Satellite imagery catalogs:** `Airbus_Footprints`, `Capella_S3`, `GEGD_Footprints`, `Maxar_2024`, `UMBRA`

Don't use `InputTable1`, `InputTable2` etc. — they're the defaults the UI gives you, and half the notebook corpus that leaves them in place is actively harder to read.

### 13.6 What real output schemas look like

Output tables tend to produce:

- **String** columns most frequently (IDs, names, status, category, LLM responses)
- **Double** / **Float64** for measurements, scores, confidences
- **DateTime** for timestamps
- **Int32** for counts / enums / cluster labels
- **XY** for point geometry (track positions, sensor locations)
- **Poly** for polygon geometry — common on Profile B servers for **change-detection regions** (flood zones, damage footprints) and **raster-to-vector density maps**

A typical "substantive" notebook publishes 14–22 columns. A one-column notebook is usually appending a single computed value to an input table (via `copyFromSource`). MLOps notebooks that publish predictions often have 30+ columns — `image_id`, `model_name`, `class`, `confidence`, plus bounding-box corners.

### 13.7 Iteration is the norm

Heavily-used notebooks accumulate **40–70 saved versions**. That's not sloppiness — it's how real work happens. Version History is a first-class tool here, not a safety net:

- Save early and often; restore if a change backfires
- Before making invasive changes, do a **Save a Copy** to branch
- Before uploading a new version of a canonical template notebook (like a "Sample Notebook for ETL"), make sure it still reflects current best practice — other users will see it

### 13.8 Container image choice

`maplarge/ipython-kernel` is the default Python image and backs the majority of active notebooks on every server — it has the standard data-science stack pre-installed (pandas, numpy, scikit-learn, etc.) and MLFlow integration turned on. Good default for virtually everything.

For specialized workloads, dedicated images exist on some servers (pre-registered by admins) — real examples seen in the wild:

| Image | Purpose | When to pick it |
| ------- | --------- | ----------------- |
| `maplarge/ipython-kernel` | Default Python with data-science stack + MLFlow | General-purpose, ETL, exploration |
| `ghcr.io/maplarge/notebook` | Alternative ghcr-hosted Python image | Equivalent to default for most uses |
| `maplarge/llm` | LLM inference (Bedrock-style client, prompting utilities) | Running prompts against hosted LLMs, multi-model eval, judging |
| `ollama/ollama` | Local LLM inference via Ollama | Running open-weights models (Llama, Mistral, etc.) without external API calls |
| `maplarge/mmrotate` / `maplarge/mmrotate:v5-mlflow` | MMRotate rotated-object-detection training/inference | Training rotated bbox detectors on overhead imagery (SAR ships, vehicles, etc.), inference against image tables |

**Only build your own image (§9) when nothing pre-registered fits.** Most workflows are covered by one of the above.

### 13.9 MLFlow integration

Both default images have `EnableMLFlow: true` baked in, and MLFlow is a first-class concern on MLOps-heavy servers — notebook names like "HMM with MLFlow", "mmrotate_training_mlflow_log_artifacts", "mmrotate_deployment_mlflow_best_model", "MLFlow_Delete_Experiment" show it in heavy use.

Inside a notebook, MLFlow works as you'd expect:

```python
import mlflow

mlflow.set_tracking_uri("maplarge:/")   # routed through MapLarge via the MLFlow bridge
mlflow.set_registry_uri("maplarge:/")

with mlflow.start_run():
    mlflow.log_param("batch_size", batch_size)
    mlflow.log_metric("val_loss", loss)
    mlflow.log_artifact("model.pt")
```

Metrics and artifacts land in MapLarge-managed MLFlow storage, so experiments survive kernel restarts and are visible to other users on the same server. Deployment notebooks can load a registered model by name and run inference against a Table Input.

---

## 14. Tips & Best Practices

1. **Always call `SetOutputSchema` unconditionally**, then gate heavy work on `if maplarge.MODE != maplarge.MODE.DESCRIBE:`. This is the single most common mistake when turning an interactive notebook into an ETL step.
2. **Rename your Table Inputs.** Defaults like `InputTable2` turn your code into a scavenger hunt. Use `TLE_Hist`, `operations`, `current`, etc.
3. **Prefer named Table Inputs over hardcoded table paths.** An interactive script that reaches for `"acct/table"` directly will work in the editor but break when run from ETL, where the flow editor expects to rewire sources by name.
4. **Match toolbar features to your use case.** For ETL/ingestion notebooks, Table Inputs + Output Fields alone covers the 95% case. For ML training / LLM eval / parameterized pipelines, **User Parameters are load-bearing** — use them for hyperparameters (`lr`, `batch_size`, `checkpoint`, `config`), model names, and table-name knobs. Resource Limits remain near-zero-use in the wild; trust defaults.
5. **Keep secrets in the Secrets toolbar, not in cell source.** Cell source is visible to anyone who can open the notebook and is captured in version history.
6. **Check the output panel, not just inline.** MapLarge routes stdout and exceptions to the Script Output panel, not inside the cell.
7. **Use Save a Copy before invasive changes.** Heavy iteration is normal (50+ versions is common), but if you're about to restructure, branch first.
8. **Bake heavy dependencies into a custom image** *only* when the default image genuinely doesn't cut it. Most workflows don't need this.
9. **Raise Idle Timeout when you're doing a long exploratory session**, lower it (or leave default) otherwise. Idle kernels hold container resources.
10. **Pin container image tags in production.** `:latest` might upgrade Python out from under you. Use an explicit version tag for stable behavior.
11. **Use VFS for "persists across kernel restarts" binary data** (grib2, model artifacts, large images); **use MapLarge tables for rows you query.** Different tools for different jobs.
12. **For collaboration, create notebooks in shared accounts, not Personal.** Only the Personal account's owner sees Personal notebooks.
13. **If you're publishing a table that should be mappable, include `latitude` + `longitude` columns** — MapLarge auto-generates an `XY` column so the output is immediately visualizable.
14. **When building on top of an existing table, use `copyFromSource`** so your output inherits that table's schema rather than re-declaring every column. Rare in practice, but genuinely useful for "add one derived column" notebooks.
