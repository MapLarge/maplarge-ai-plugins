# Raptor Cookbook

## Search Box Bound To View Model

```ts
s.input({
  placeholder: "Search",
  inputType: "text",
  bindings: { textInput: s.getTypedProp("FilterText") },
});
```

## Repeated List

```ts
s.foreach(s.getTypedProp("Items"), item => {
  item.div().contentTemplates(row => {
    row.span({ bindings: { text: row.getTypedProp("Name") } });
  });
});
```

## Button Handler

```ts
s.button({
  text: "Refresh",
  events: [{ event: "pointerup", handler: s.getTypedProp("onRefresh") }],
});
```

## Conditional Visibility

```ts
s.div({
  bindings: {
    css: {
      classes: {
        "d-none": s.getTypedProp("hidden"),
      },
    },
  },
});
```

## Dynamic Cell Style

```ts
s.td({
  bindings: {
    text: s.getTypedProp("DisplayValue"),
    attr: { style: s.getTypedProp("CellStyle") },
  },
});
```

## Dialog Close Handler

```ts
public closeDialog(dialogModelKey: string): void {
  this.raptorDom.destroyDialog(dialogModelKey);
  this.raptorEngine.destroyViewModelInstanceByModelKey(dialogModelKey);
}
```

## Chart Refresh After Async Data

```ts
const chartNode = this.raptorDom?.node("MyChart") as any;
chartNode?._chartInstance?.setOption({ series: this.Series }, false);
chartNode?._chartInstance?.resize();
```
