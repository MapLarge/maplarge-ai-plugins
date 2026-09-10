# The Golden Skill Template

> **Provenance:** ARC-8
>
> This document defines the one blessed way to write a MapLarge skill, plus the binary checklist reviewers use to accept or reject skill PRs. It exists because our skills are consumed by whatever AI assistant a customer happens to run — we control the skill, not the model — so every rule here is a portability rule first.

A **skill** is a directory containing a `SKILL.md` (YAML frontmatter + Markdown body) and optionally `reference/` docs, `scripts/`, and golden prompts. The format follows the [Agent Skills open standard](https://agentskills.io): assistants with a trigger layer (matching on the frontmatter `description`) load the body on demand; assistants without one load files wholesale. A compliant skill works in both worlds without variants.

---

## 1. Pick a shape — there are exactly two

Every skill is one of two sanctioned forms. Do not invent a third shape; if a skill genuinely fits neither, raise it in review and record the decision before writing it.

### Shape A — Workflow guide

A short, procedural skill for one job: an ordered set of operations, environment grounding, and the rails to run them safely. Body carries everything; `reference/` is optional and small.

*Worked example:* [`plugins/maplarge-adk/skills/adk-extension-dev/SKILL.md`](../plugins/maplarge-adk/skills/adk-extension-dev/SKILL.md)

### Shape B — Router + on-demand references

A skill covering a broad topic with many subtopics. The body carries the mental model, the universal rules, and a **routing table** mapping task keywords to reference docs. Detail lives in `reference/` files loaded only when needed.

*Worked examples:* [`plugins/maplarge-adk/skills/raptor/SKILL.md`](../plugins/maplarge-adk/skills/raptor/SKILL.md), [`plugins/maplarge-adk/skills/maplarge-database/SKILL.md`](../plugins/maplarge-adk/skills/maplarge-database/SKILL.md)

### Choosing

Ask: *could a competent engineer hold the whole topic in their head at once?*

- Yes, it's one workflow with a handful of commands → **Shape A**.
- No, it's a domain with 10+ distinct subtopics a reader dips into → **Shape B**.
- A workflow guide whose body is approaching the 500-line cap (§4.4) is usually a router in denial — split the detail into `reference/` and convert rather than compressing prose to stay under the limit.

---

## 2. Directory layout

```text
skills/{skill-name}/
├── SKILL.md              # required — frontmatter + body, ≤ 500 lines
├── reference/            # Shape B (optional for Shape A)
│   ├── {topic}.md        #   flat files, or…
│   └── {group}/{topic}.md#   …one grouping directory, never deeper
├── scripts/              # runnable logic invoked by the body (optional)
└── evals/
    └── {case-id}.md      # one golden prompt per file; ≥ 1 file required
                          #   (format: §7)
```

`reference/` (singular, matching all existing skills) holds the on-demand reference docs a skill's body routes to — loaded only when the task calls for them (§4.4).

---

## 3. Frontmatter

```yaml
---
name: maplarge-widgets
description: Authoritative reference for building MapLarge widget extensions —
  covers scaffolding, the widget lifecycle, config schema, and deploy. Use when
  creating, editing, or debugging any widget in a MapLarge ADK extension.
  Triggers on "widget", "widget config", "deploy widget", "/widget-dev".
metadata:
  owner: "Jane Doe <jane.doe@maplarge.com> · Data Platform team"
  provenance: "ARC-123"
  verified-against: "MapLarge Server 4.138 / ADK CLI 1.0.91"
---
```

**`name`** — kebab-case, matches the directory name exactly, ≤ 64 chars.

**`description`** — the most consequential field in the skill. Assistants with a trigger layer decide whether to load the skill from this string alone, so it must state **what** the skill does *and* **when** to use it, in the vocabulary a user would actually type (keyword-rich: command names, error strings, slash-commands, synonyms). Hard cap 1024 chars. Lead with what it does — some pickers truncate to one line.

Never name an AI assistant in the description or body ("Guide Claude through…"). The reader may be any model, and naming one makes the others treat the skill as not for them. Write in terms of the *task*: "Guides MapLarge ADK project setup…".

**`metadata`** — MapLarge-required fields, all three mandatory:

| Key | Value | Why |
| --- | --- | --- |
| `owner` | A named person, a named team, or both — both preferred | Someone must be answerable when the skill rots. A named person gives one accountable contact; a named team survives that person leaving. Naming both covers each other's gap. |
| `provenance` | Originating ticket or PR | So a future reader can recover the intent and constraints the skill was written under. |
| `verified-against` | Server/framework version(s) the content was last verified on | The platform keeps changing under the skill. This records how stale the content may be: the older the version here, the less a reader should trust the skill without re-verifying it. |

The Agent Skills spec defines `metadata` as an arbitrary map of string keys to string values, for properties not defined by the spec itself.

---

## 4. The five design principles

### 4.1 Specificity tracks task fragility, not model intelligence

Decide how prescriptive to be by asking *what breaks if the model improvises*, never *how smart is the model*.

- **Judgment tasks** (layout, naming, design choices, prose): give goals and constraints, no step lists. A step list here is wrong for every model — strong ones are hobbled by it, weak ones follow it off a cliff the author didn't foresee.
- **Fragile operations** (CLI invocations, version pins, schemas, anything destructive): give exact verbatim rails — the literal command, the literal flag, the literal order. Improvisation here corrupts state regardless of model quality.

Narrated reasoning ("first, think about…", "carefully consider…", "step back and…") is banned everywhere: noise to strong models, no help to weak ones.

The two side by side, from `adk-extension-dev`:

> *Judgment (goals + constraints):* "Keep default guidance customer-safe. Internal-only guidance should be clearly labeled."
>
> *Fragile (verbatim rail):* "For `maplarge adk package` and `maplarge adk deploy`, include `-i <component>` by default… Never use bare `-i`."

### 4.2 Explain why, not just what

A bare rule travels badly: a model that doesn't know the reason can't tell when the rule applies to a situation the author didn't enumerate, so it either over-applies or rationalizes an exception. A rule with its reason generalizes.

> *Brittle:* "NEVER run `tsc` directly."
>
> *Travels:* "Do not run `tsc` directly to build an ADK project. Use `maplarge adk build` so ADK-managed build configuration and artifacts stay in the expected locations."

Reserve hard **MUST**/**NEVER** for safety and data-loss cases (destructive commands, credential handling, overwriting user state).

### 4.3 The body stands alone

Not every assistant routes through the description: some load skill files wholesale into context (or receive them through adapters that strip frontmatter), so nothing has established when the skill applies by the time the model reads the body. Therefore:

- **All** "when to use" routing lives in the frontmatter `description` (for assistants that trigger on it).
- The body **opens with a one-paragraph scope statement** — what this skill covers, what it doesn't, and which sibling skill or doc handles the topics it leaves out — for readers that arrived without the trigger.

The body must never depend on the frontmatter having been read.

### 4.4 Progressive disclosure with hard caps

The body is a working set, not an encyclopedia: **≤ 500 lines (~5k tokens)**. Larger material moves to `reference/` files behind explicit pointers that state the loading condition, not just the link:

> *Good:* "For a specific control, read its doc under `reference/controls/` before wiring it."
>
> *Bad:* "See also: `reference/controls/`."

Nesting is capped at one grouping level: `reference/{topic}.md` or `reference/{group}/{topic}.md`, never deeper. Every reference doc is pointed to from the body directly; reference docs do not point to further reference docs as required reading. Beyond two hops from `SKILL.md`, readers reliably fail to follow pointers, and a file no pointer reaches goes stale unnoticed.

**Related-pointer exception (ARC-12):** a reference doc may end with a short **Related** section of redirect pointers to sibling reference docs — same skill or another skill in the same plugin, via relative paths. These exist for the reader who landed in the wrong doc (the body's routing table cannot catch that after the fact), so each pointer states what the target covers, is terminal (one hop: a Related pointer never asks the reader to follow a second one), and is never a prerequisite for the doc it sits in. Body routing stays the authority: every reference doc must still be reachable from its own skill's body per item 9.

Repeated runnable logic becomes a bundled script under `scripts/` that the body tells the model to run. If described in prose instead, the model rewrites that logic as fresh code every session — slightly differently each time — so the same skill stops behaving the same way twice.

> *Good:* "Run `node scripts/detect_workspace.mjs --cwd "$PWD"` and use its JSON output to classify the folder."
>
> *Bad:* "Walk up from the current directory looking for `.adk/`; if found, parse `.adk/config.json` and compare its CLI version against `maplarge --version`…" — a recipe the model re-implements from scratch, differently, every session.

### 4.5 Examples over rules

Every skill carries **2–3 concrete input→output examples** of its core task: a real prompt/situation and the correct resulting command, code, or config. Models reproduce the format and style of examples more reliably than they infer them from prose descriptions, and an example is testable where a rule is arguable.

**Conflict rule for reviewers:** when a rule and an example disagree in review, the default fix is to expand the example, not to add a clause to the rule.

---

## 5. Body skeleton — Shape A (workflow guide)

```markdown
# {Skill Title}

{Scope paragraph: what this skill covers, what it excludes, and which sibling skill or doc covers the excluded parts. Standalone — assumes the description was never read.}

## Grounding

{How to establish context before acting: detection scripts to run, files whose presence signals project type, what the outputs mean. Use verbatim commands.}

## {Workflow section per major operation}

{Fragile steps as verbatim commands with flags explained by reason. Judgment calls as goals + constraints. Each hard rule carries its why.}

## Examples

{2–3 concrete input→output pairs: "user asks X in state Y" → the exact command/code that is correct, and one sentence on why.}

## Hand-offs

{When to stop and route to a sibling skill instead: "When the task is primarily about {adjacent domain}, use {other-skill} instead of handling it here."}
```

## 6. Body skeleton — Shape B (router + references)

```markdown
# {Skill Title}

{Scope paragraph, standalone, as above.}

## When to use

{Concrete triggers: file patterns, import paths, function names, error strings. This is the body-side mirror of the description's "when".}

## {Task / keywords → reference doc routing table}

| Task / keywords | Reference doc |
| --- | --- |
| {user-vocabulary keywords} | `reference/{topic}.md` |

{Each pointer states its loading condition: "read X before doing Y".}

## Mental model

{The 5–10 load-bearing facts that apply to every subtopic — the things that, if wrong, make every reference doc misleading.}

## Universal rules & gotchas

{Cross-cutting rails with reasons. Subtopic-specific detail belongs in the subtopic's reference doc, not here.}

## Examples

{2–3 concrete input→output pairs exercising the routing + a core task.}
```

---

## 7. Golden prompts

Every skill ships **at least one golden prompt**: a realistic user prompt that should cause the skill to trigger, plus binary checks that make the outcome scoreable by a second person. Ship each one as a file at `evals/{case-id}.md` inside the skill it tests, and never point at `evals/` from the skill body — assistants must not load eval content as guidance, so it is the one directory exempt from the "every file is reachable from the body" rule (§4.4).

A golden prompt is one markdown file with YAML frontmatter. The minimum viable case carries `id` (`{skill-name}/{case-id}`), `skill`, `title`, `owner`, `provenance`, `created`, the verbatim `prompt`, and at least one `required` check: a binary assertion about the run's artifacts or transcript, marked `static` when a regex or exit code can decide it and `judge` when a human must. The verdict is computed, never judged — **pass** when every check passes, **partial** when only `expected` checks fail, **fail** when any `required` check fails or the run does not complete. The markdown body holds why the eval exists and how to run it. The §8 checklist requires only that evals *exist* and stay unreferenced.

---

## 8. Acceptance checklist

Every item is binary. A reviewer answers each pass/fail quickly and unambiguously; any fail blocks merge. "Verify" tells the reviewer — human or AI assistant — exactly how to check the item and what passing looks like.

The automated checks behind item 15 — what they enforce, where they run today, and how to run them before opening a PR — run with `npm run check` from the repo root (`npm install` once per clone); write to them from the start, so the skill passes by construction rather than by rework.

The groups follow the review path: glance at the YAML, glance at the outline and file tree, read the prose, then run the gates.

### Frontmatter · items 1–5

| # | Item | Verify |
| --- | --- | --- |
| 1 | Frontmatter `name` is kebab-case and matches the skill directory name | Compare `name` to the directory name; pass if they match exactly and the name uses only lowercase letters, digits, and single hyphens |
| 2 | Frontmatter `description` states **what** the skill does *and* **when** to use it, keyword-rich, ≤ 1024 chars | Read the `description`; pass if it states both what the skill does and when to use it, includes concrete trigger keywords a user would type, and its character count is ≤ 1024 |
| 3 | `metadata.owner` names a person, a team, or both (both preferred) | Read `metadata.owner`; pass if it names a specific person, a specific team, or both |
| 4 | `metadata.provenance` cites the originating ticket or PR | Open the ticket or PR cited in `metadata.provenance`; pass if it resolves and concerns this skill |
| 5 | `metadata.verified-against` names the server/framework version(s) verified against | Read `metadata.verified-against`; pass if it names at least one concrete server or framework version |

### Structure & shape · items 6–10

| # | Item | Verify |
| --- | --- | --- |
| 6 | Skill is one of the two sanctioned shapes (workflow guide / router + references) | Compare the body's section structure to the §5 and §6 skeletons; pass if it follows exactly one of them |
| 7 | Body opens with a standalone scope paragraph (readable with no frontmatter) | Read the first body paragraph while ignoring the frontmatter; pass if it alone establishes what the skill covers, what it doesn't, and which sibling skill or doc owns the excluded topics |
| 8 | SKILL.md ≤ 500 lines | Count SKILL.md's lines (`wc -l SKILL.md`); pass if ≤ 500 |
| 9 | Every `reference/` doc is pointed to from the body with its loading condition ("read X when doing Y") | List every file under `reference/`; pass if each one is referenced from the body with a stated loading condition ("read X when doing Y"), not a bare link |
| 10 | Reference nesting ≤ one grouping level; reference docs point to other reference docs only via terminal Related pointers (§4.4) | Check directory depth (`find reference/ -mindepth 3` must return nothing) and search each reference doc for pointers to other reference docs; pass if every such pointer sits in a Related section, states what the target covers, targets the same plugin, and is not required reading for the doc it sits in |

### Writing quality & syntax · items 11–14

| # | Item | Verify |
| --- | --- | --- |
| 11 | 2–3 concrete input→output examples present | Count the concrete input→output examples in the body; pass if there are 2–3, each showing a real input and the correct resulting output |
| 12 | No narrated-reasoning instructions | Search SKILL.md and `reference/` for phrasing that tells the model how to think (start from `grep -inE "think about\|first, think\|step back\|carefully consider\|reason through"`); pass if no instruction narrates reasoning steps rather than stating facts or commands |
| 13 | Hard MUST/NEVER appear only on safety/data-loss rails; other rules carry their reason | Find every MUST, NEVER, and ALWAYS; pass if each guards a safety or data-loss case, and every other hard rule states the reason behind it |
| 14 | No AI assistant named in frontmatter or body | Search SKILL.md and `reference/` case-insensitively for assistant names (`claude\|copilot\|codex\|cursor\|gpt`); pass if no hit names an assistant as the skill's audience or actor (manifest paths like `.claude-plugin` are acceptable) |

### Gates · items 15–17

| # | Item | Verify |
| --- | --- | --- |
| 15 | The automated checks pass (`npm run check` from the repo root) | Run `npm run check`; pass if it exits 0 with no blocking findings |
| 16 | ≥ 1 golden prompt present (per §7), and the skill body never references `evals/` | List `evals/`; pass if at least one `.md` case file exists there and no mention of `evals/` appears in SKILL.md or `reference/` (`grep -rn "evals/" SKILL.md reference/` returns nothing) |
| 17 | Skill contains nothing internal-only, or the exception is stated in the PR description | Read every `.md` in the skill for internal hostnames, credentials, customer names, and internal-only ticket context; pass if none appear, or the PR description explicitly states the exception |

---

## Out of scope

Retrofitting existing skills to this checklist is ARC-12. The golden-prompt format is ARC-14. There are no per-model variant files — one template travels; if a real incompatibility between assistants surfaces, record it in the skill's PR and revisit this template rather than forking the skill.
