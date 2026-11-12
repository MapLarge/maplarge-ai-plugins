# Data Table recipe - Add links and images

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## add-links

**Add links and images.** Make a cell a clickable link to a URL or another page, or show a thumbnail from an image URL field: the href or src is bound to a path, never built inside the binding.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({
        field: "docsUrl",
        header: "Docs",
        transformValue: ({ value }) => ({ href: String(value ?? ""), hasLink: typeof value === "string" && value !== "" }),
        contentTemplates: ({ s, bindingPaths }) => {
            s.anchor({ text: "Open", target: "_blank", bindings: { visible: bindingPaths.displayValue + ".hasLink", attr: { href: bindingPaths.displayValue + ".href" } } });
        },
    }),
    column({
        field: "name",
        key: "nameSearch",
        header: "Search",
        transformValue: ({ value }) => ({ href: "https://example.com/search?q=" + encodeURIComponent(String(value ?? "")), text: "Find " + String(value ?? "") }),
        contentTemplates: ({ s, bindingPaths }) => {
            s.anchor({ bindings: { text: bindingPaths.displayValue + ".text", attr: { href: bindingPaths.displayValue + ".href" } } });
        },
    }),
    column({
        field: "name",
        key: "nameEmail",
        header: "Email",
        transformValue: ({ value }) => {
            const address = String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, ".") + "@example.com";
            return { href: "mailto:" + address, text: address };
        },
        contentTemplates: ({ s, bindingPaths }) => {
            s.anchor({ bindings: { text: bindingPaths.displayValue + ".text", attr: { href: bindingPaths.displayValue + ".href" } } });
        },
    }),
],
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: columns[0] (its transformValue and contentTemplates are code); columns[1] (its transformValue and contentTemplates are code); columns[2] (its transformValue and contentTemplates are code).

- attr.href binds to a path. Docs is a column on the URL field itself, so transformValue receives the URL as value; it returns the href and a hasLink flag, and visible hides Open on rows with no URL. Search and Email build the link in transformValue and bind its href and text.
- A link needs a column on its URL field (or bindingPaths.row + ".field"): a virtual column has no field, so its rawValue is empty.
- target: "_blank" opens the link in a new tab, as Docs does. It is a plain option on the anchor, not a binding: written inside bindings.attr, "_blank" is read as a path, and the link opens in the same tab.
- For an email field, build "mailto:" + the address inside transformValue as Email does. Never write "mailto:" + bindingPaths.rawValue in a binding: a binding is a path, so that string is not evaluated and the link gets no href.

Reference: `cell-templates`

Variants, each in its own file with this recipe: `add-links#image` (An image from a URL field).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [cell-templates](../cell-templates.md): Cell Templates
- [add-links#image](add-links--image.md): An image from a URL field
