# Server API Access

Use running MapLarge server APIs when the CLI does not expose the needed operation or when the task must interact with an already-running server.

## Source priority

- Prefer the DocPortal root at `https://docs.maplarge.com/dashboard/ext/docportal/portal` and use the section that matches the task.
- For route shapes and request behavior, prefer configured `core` source when it is available.
- Do not use the public `maplarge.com` developer pages as the source of truth for query or server API behavior.

## Query syntax

- Prefer JSON query documents across client code, REST requests, pre-REST requests, and CLI flows that accept query input.
- The fluent API is acceptable when it clearly matches surrounding code, but JSON stays the default in most cases.
- Use SQL-like syntax only when the user explicitly asks for SQL or when it is clearly more appropriate than JSON or the fluent API.
- Do not switch to SQL just because the execution path is server-side.

## Endpoint families

- JavaScript API: browser integrations load the MapLarge client library from `<server>/JS`.
- Legacy pre-REST API: actions live under `<server>/Remote/<Action>`.
- Built-in API controller routes are hosted under `/API/`, `/Api/`, and `/api/`.
- Extension-defined REST endpoints: use the route shape defined by the extension, the live server docs, or configured `core` source. Do not guess route names.

## Legacy pre-REST requests

In `core`, the server hosts the legacy controller under `/Remote/` and `/remote/`.

- base path: `<server>/Remote/`
- action shape: `<server>/Remote/<Action>`
- auth fields: `mluser` plus either `mltoken` or `mlpass`
- response format: JSON, with optional JSONP callback wrapping
- Prefer `mlpass` when it is sufficient. Use `mltoken` only when the endpoint or user requires it, and do not copy tokens into ADK profiles.

Reuse exact parameter names from nearby code or the relevant internal docs instead of inventing them.

## REST requests

- Prefer a live OpenAPI or Swagger description on the target server when one is available.
- In `core`, the REST API definition is generated into `MapLarge.Server/restapi/v1/openapi.json`, and the generated client docs point developers to `<server>/swagger` for the live endpoint catalog.
- If the server does not expose API docs, inspect the local extension code, configured `core` source, or existing client calls for the exact route, auth, and payload shape.
- Keep request and response bodies grounded in nearby code or live docs. Do not invent endpoint paths or field names.

## When CLI is insufficient

- Use the CLI for project creation, init, build, run, package, deploy, and other documented ADK workflows.
- Use server APIs when the task is about a running server capability that the CLI does not expose cleanly, or when the user specifically asks for an API-based interaction.
- If both CLI and API are viable, prefer the one already used by the surrounding code or workflow.

## References

- [DocPortal Root](https://docs.maplarge.com/dashboard/ext/docportal/portal)
- Configured or discovered `core` source:
  `MapLarge.Server.EmbedIO/Hosting/EmbeddedWebServer.cs`
- Configured or discovered `core` source:
  `MapLarge.Server.EmbedIO/Hosting/APIController.cs`
- Configured or discovered `core` source:
  `MapLarge.Server.EmbedIO/Hosting/RemoteController.cs`
- Configured or discovered `core` source:
  `MapLarge.Build.RestApi/README.md`
