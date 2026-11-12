# Data Table - How It Works - Bindings and Events

<!-- Automatically generated, do not edit -->

## Bindings and Events

A binding connects a node option to a value by path. In the View the path names a ViewModel member (summaryText, activeRange.today); in a cell template it starts from bindingPaths.

```ts
s.div({ bindings: { text: "summaryText" } });                       // a ViewModel member
s.button({ kind: "primary", outline: true, bindings: { disable: "nothingChecked", css: { classes: { active: "activeRange.today" } } } });
cell.anchor({ bindings: { text: bindingPaths.displayValue + ".text", attr: { href: bindingPaths.displayValue + ".href" } } });
```

What a binding cannot do, and what to write instead:

```ts
// does nothing or breaks: a binding is a path, never an expression or a value
bindings: { visible: "!" + bindingPaths.displayValue + ".isDone" }
bindings: { attr: { href: "mailto:" + bindingPaths.displayValue } }
bindings: { css: { classes: { "text-muted": true } } }   // a literal throws and blanks the column

// works: compute in code, bind the path; an always-on class goes in customCssClasses
transformValue: ({ value }) => ({ isNotDone: value !== "Done", href: "mailto:" + String(value ?? "") }),
bindings: { visible: bindingPaths.displayValue + ".isNotDone", attr: { href: bindingPaths.displayValue + ".href" } }
customCssClasses: "text-muted"
```

Events name their handler instead of holding it: a ViewModel member's name in the View, a scope path in a cell.

```ts
// view-model.ts
public readonly showRange = (range: InspectedRange): void => { /* ... */ this.update(); };
public readonly search = (): void => { /* reads this.searchText */ };

// view.ts
s.button({ kind: "primary", size: "small", events: [{ event: "click", handler: "showRange", param: "last30" }] })
    .contentTemplates((button) => { button.span({ text: "Last 30 days" }); });
s.input({ placeholder: "Search", bindings: { value: "searchText" }, events: [{ event: "input", handler: "search" }] });
```

Before you finish, search view.ts:

- Every checkbox for `checked:` in its bindings rather than `value:`.

## Related

- [how-it-works-the-pieces](how-it-works-the-pieces.md): How It Works - The Pieces and more
