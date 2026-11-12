# Data Table recipe - Initials in a colored circle

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

### show-badges-and-icons#initials

**Initials in a colored circle.** Show a small round avatar with each row's initials, each row given one of a few colors, with no images.

Apply the recipe above, then:

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    virtualColumn({
        key: "avatar",
        header: "",
        width: toPixels(48),
        transformValue: ({ row }) => {
            const name = String(row.name ?? "");
            const pick = [...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 4;
            return {
                initials: name.split(" ").map((part) => part.charAt(0)).join("").slice(0, 2).toUpperCase(),
                isBlue: pick === 0,
                isGreen: pick === 1,
                isRed: pick === 2,
                isGray: pick === 3,
            };
        },
        contentTemplates: ({ s, bindingPaths }) => {
            s.div({
                width: 32,
                height: 32,
                border: { rounded: "circle" },
                flex: { dFlex: true, alignItemsCenter: true, justifyContentCenter: true },
                textColor: "white",
                fontSize: "small",
                fontWeight: "bold",
                bindings: {
                    text: bindingPaths.displayValue + ".initials",
                    css: {
                        classes: {
                            "bg-primary": bindingPaths.displayValue + ".isBlue",
                            "bg-success": bindingPaths.displayValue + ".isGreen",
                            "bg-danger": bindingPaths.displayValue + ".isRed",
                            "bg-secondary": bindingPaths.displayValue + ".isGray",
                        },
                    },
                },
            });
        },
    }),
],
```

- When each person's color is stored in the row, compare it in transformValue (isRed: row.color === "red") and bind the class to the flag. A comparison inside a binding (".color == 'red'") never matches, which leaves white initials on no background.
- String(row.name ?? "") keeps transformValue safe on empty row slots, which pass an empty row.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [show-badges-and-icons](show-badges-and-icons.md): Show badges, icons and other cell content
- [cell-templates](../cell-templates.md): Cell Templates
