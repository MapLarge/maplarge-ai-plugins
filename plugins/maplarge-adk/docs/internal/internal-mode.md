# Internal Mode

Internal mode is optional and should never be the default behavior.

When `internalMode` is enabled, the plugin may:

- use additional docs from configured local repos
- prefer source-aware setup guidance when a local server repo is available
- provide deeper guidance for internal extension repositories and tooling

Customer-safe behavior should remain the default path even when these files are present. Internal mode must not infer source repo paths from filesystem layout.
