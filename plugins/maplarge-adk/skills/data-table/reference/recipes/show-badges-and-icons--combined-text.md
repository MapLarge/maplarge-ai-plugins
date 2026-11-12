# Data Table recipe - Several fields in one cell

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## show-badges-and-icons

**Show badges, icons and other cell content.** Show a value as a colored badge, an icon, a dot, initials in a circle, one badge per list item or text built from several fields: transformValue decides what each row shows, and the cell template binds it.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({
        field: "status",
        header: "Status",
        transformValue: ({ value }) => ({
            label: value,
            isActive: value === "active",
            isMaintenance: value === "maintenance",
            isRetired: value === "retired",
        }),
        contentTemplates: ({ s, bindingPaths }) => {
            s.span({
                badge: true,
                bindings: {
                    text: bindingPaths.displayValue + ".label",
                    css: {
                        classes: {
                            "bg-success": bindingPaths.displayValue + ".isActive",
                            "bg-warning": bindingPaths.displayValue + ".isMaintenance",
                            "text-dark": bindingPaths.displayValue + ".isMaintenance",
                            "bg-secondary": bindingPaths.displayValue + ".isRetired",
                        },
                    },
                },
            });
        },
    }),
    column({
        field: "inService",
        header: "In service",
        transformValue: ({ value }) => ({ isIn: value === true, isOut: value === false }),
        contentTemplates: ({ s, bindingPaths }) => {
            s.div({ flex: { dFlex: true, gap: 1 } }).contentTemplates((cell) => {
                cell.span({ text: "\u{2713}", textColor: "success", fontWeight: "bold", bindings: { visible: bindingPaths.displayValue + ".isIn" } });
                cell.span({ text: "Out", badge: true, background: "secondary", bindings: { visible: bindingPaths.displayValue + ".isOut" } });
            });
        },
    }),
],
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: columns[0] (its transformValue and contentTemplates are code); columns[1] (its transformValue and contentTemplates are code).

- transformValue hands the template an object, and the template binds its parts: text to the label, CSS classes to the flags. An icon node binds the same way.
- A cell that looks different per value (a check mark on some rows, a badge on others, nothing on the rest) is one wrapper div holding a node for each look, each shown by its own visible flag, as In service does. A cell template keeps only its first root node, so looks side by side without the wrapper show only the first. "\u{2713}" is an ASCII escape for a check mark; keep the braces, because a file tool can turn the four-digit form into the character itself.
- bindingPaths.displayValue points at what transformValue returned (here the object, so + ".label" reads its label); bindingPaths.rawValue at the stored value; bindingPaths.row at the whole row, so bindingPaths.row + ".name" reads another field.
- Badge colors are Bootstrap classes: bg-success, bg-danger, bg-primary, bg-secondary and bg-dark take white text; bg-warning, bg-info and bg-light are light, so add text-dark.
- In css.classes each key is one class bound to its own true/false flag from transformValue; a path cannot hold "!" or a comparison. For a two-way look, one flag can switch two class sets: css: { property: bindingPaths.displayValue + ".isOver", trueClasses: ["text-danger"], falseClasses: ["text-success"] }.
- To show a badge on some rows only (Review over $500), return a flag such as showReview and bind visible: bindingPaths.displayValue + ".showReview" on the badge; rows with the flag false show nothing.
- A badge beside a text (a Stale badge next to the title, New beside a name) is a template on that text's column, not on the column where the flag is worked out: its transformValue reads the other fields of the row (({ value, row }) => ({ label: value, isStale: row.isStale })) and the template holds a span for the text and a badge span with visible bound to the flag. The badge goes where the request puts it.
- Every variant below is the same shape with a different look: transformValue returns the text and true/false flags for the row, and the template binds text, visible and css.classes to them.
- A color stored in the row (any hex value or CSS color name) can be bound with the style binding: return it from transformValue and bind bindings: { style: { trueStyles: { backgroundColor: bindingPaths.displayValue + ".color" } } } (camelCase CSS properties, each a path to a string). Bootstrap classes bound to flags cover a fixed set of colors.

Reference: `cell-templates`

### show-badges-and-icons#combined-text

**Several fields in one cell.** Show several fields together in one cell, such as a name with its category underneath.

Apply the recipe above, then:

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    virtualColumn({
        key: "summary",
        header: "Asset",
        width: toPixels(260),
        sortField: "name",
        contentTemplates: ({ s, bindingPaths }) => {
            s.div().contentTemplates((cell) => {
                cell.div({ fontWeight: "bold", bindings: { text: bindingPaths.row + ".name" } });
                cell.div({ fontSize: "small", bindings: { text: bindingPaths.row + ".category" } });
            });
        },
    }),
],
rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(44) }),
```

View definition JSON for this variant's options, merged over the recipe's:

```json
{ "rowScrolling": { "strategy": "virtualScroll", "args": { "fixedRowHeight": 44 } } }
```

- bindingPaths.row is the path to the whole row, so a template can bind to any of its fields without a transformValue. Two lines need a taller row, hence the fixedRowHeight.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [show-badges-and-icons](show-badges-and-icons.md): Show badges, icons and other cell content
- [cell-templates](../cell-templates.md): Cell Templates
