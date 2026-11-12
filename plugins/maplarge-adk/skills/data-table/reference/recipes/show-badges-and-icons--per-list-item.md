# Data Table recipe - One badge per list item

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

### show-badges-and-icons#per-list-item

**One badge per list item.** Show one colored badge for each item of a list field, such as an issue's labels or an asset's tags, and none for an empty list.

Apply the recipe above, then:

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    virtualColumn({
        key: "tagBadges",
        header: "Tags",
        width: toPixels(220),
        transformValue: ({ row }) => {
            if (row.tags === undefined) return undefined;
            const badge = (tag: string | undefined) => ({
                text: tag ?? "",
                show: tag !== undefined,
                isCritical: tag === "critical",
                isRepair: tag === "repair",
                isInspect: tag === "inspect",
                isNew: tag === "new",
            });
            return { first: badge(row.tags[0]), second: badge(row.tags[1]), third: badge(row.tags[2]) };
        },
        contentTemplates: ({ s, bindingPaths }) => {
            s.div({ flex: { dFlex: true, gap: 1 } }).contentTemplates((cell) => {
                for (const slot of ["first", "second", "third"]) {
                    const path = bindingPaths.displayValue + "." + slot;
                    cell.span({
                        badge: true,
                        bindings: {
                            text: path + ".text",
                            visible: path + ".show",
                            css: {
                                classes: {
                                    "bg-danger": path + ".isCritical",
                                    "bg-warning": path + ".isRepair",
                                    "text-dark": path + ".isRepair",
                                    "bg-info": path + ".isInspect",
                                    "bg-success": path + ".isNew",
                                },
                            },
                        },
                    });
                }
            });
        },
    }),
],
```

- A binding is a dot path: "labels[0].name" and "color == 'red'" never resolve, so no badge shows. transformValue turns the list into named slots (first, second, third) and each item's value into true/false color flags.
- Make one slot for each item of the longest list. An item that is missing has show false, so an empty list shows no badge.
- A color stored in the row (each label's or person's own color) works the same way: compare it in transformValue (isRed: item.color === "red") and bind the class to that flag.
- The guard on row.tags matters: transformValue also runs for empty row slots, and reading an item of a missing list throws and blanks the table.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [show-badges-and-icons](show-badges-and-icons.md): Show badges, icons and other cell content
- [cell-templates](../cell-templates.md): Cell Templates
