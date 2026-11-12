# Data Table starter - Editable table

<!-- Automatically generated, do not edit -->

Rows held in code that users edit in place, with a dropdown column, an Add button, checkboxes to delete or retire several rows, and a Save button that sends the rows edited in cells. Rows retired, added or deleted with the buttons do not reach Save (store.mutations does not call onRowUpdate); start from save-added-changed-and-deleted-rows when they must.

Built from the base table and these recipes, in order: `edit-with-a-dropdown`, `save-edits-with-a-button`, `add-rows`, `act-on-checked-rows`.

## view-model.ts

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { actions, createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Asset = {
    readonly id: number;
    readonly name: string;
    readonly category: string;
    readonly status: string;
    readonly cost: number;
    readonly utilization: number;
    readonly rating: number;
    readonly lastInspected: string;
    readonly inService: boolean;
    readonly location: string;
    readonly lengthMeters: number;
    readonly notes: string;
    readonly docsUrl: string;
    readonly photoUrl: string;
    readonly trend: readonly number[];
    readonly tags: readonly string[];
};

export const assets: Asset[] = [
    { id: 1, name: "North Pump Station", category: "Pump", status: "active", cost: 182500, utilization: 0.82, rating: 4, lastInspected: "2026-08-14T09:30:00Z", inService: true, location: "POINT(-80.1918 25.7617)", lengthMeters: 1250, notes: "Primary intake for the north district. Bearings were replaced in the spring and vibration readings are back within tolerance.", docsUrl: "https://example.com/assets/1", photoUrl: "https://example.com/assets/1.jpg", trend: [62, 70, 75, 81, 82], tags: ["critical", "inspect"] },
    { id: 2, name: "Bayfront Valve 12", category: "Valve", status: "maintenance", cost: 14200, utilization: 0.35, rating: 2, lastInspected: "2026-07-02T14:00:00Z", inService: false, location: "POINT(-80.1867 25.7743)", lengthMeters: 40, notes: "Actuator sticks under load. A replacement part is on order.", docsUrl: "https://example.com/assets/2", photoUrl: "https://example.com/assets/2.jpg", trend: [55, 48, 40, 37, 35], tags: ["repair"] },
    { id: 3, name: "Hydrant 4471", category: "Hydrant", status: "active", cost: 3800, utilization: 0.12, rating: 5, lastInspected: "2026-09-21T08:15:00Z", inService: true, location: "POINT(-80.2101 25.7489)", lengthMeters: 15, notes: "Flow test passed.", docsUrl: "https://example.com/assets/3", photoUrl: "https://example.com/assets/3.jpg", trend: [10, 11, 12, 12, 12], tags: [] },
    { id: 4, name: "Coral Way Main", category: "Pipe", status: "active", cost: 920000, utilization: 0.67, rating: 3, lastInspected: "2026-05-30T10:45:00Z", inService: true, location: "POINT(-80.2297 25.7502)", lengthMeters: 4800, notes: "Cast iron segment scheduled for lining next fiscal year.", docsUrl: "https://example.com/assets/4", photoUrl: "https://example.com/assets/4.jpg", trend: [71, 69, 68, 66, 67], tags: ["critical", "repair", "inspect"] },
    { id: 5, name: "South Reservoir Pump", category: "Pump", status: "retired", cost: 0, utilization: 0, rating: 1, lastInspected: "2025-11-11T16:20:00Z", inService: false, location: "POINT(-80.3201 25.6802)", lengthMeters: 900, notes: "Decommissioned after the reservoir upgrade.", docsUrl: "https://example.com/assets/5", photoUrl: "https://example.com/assets/5.jpg", trend: [20, 12, 5, 0, 0], tags: [] },
    { id: 6, name: "Harbor Valve 3", category: "Valve", status: "active", cost: 21750, utilization: 0.91, rating: 4, lastInspected: "2026-09-02T11:05:00Z", inService: true, location: "POINT(-80.1702 25.7781)", lengthMeters: 60, notes: "Runs near capacity during peak hours.", docsUrl: "https://example.com/assets/6", photoUrl: "https://example.com/assets/6.jpg", trend: [80, 84, 88, 90, 91], tags: ["new"] },
];

export const assetSchemaEntries = {
    id: schema.number(),
    name: schema.string(),
    category: schema.string(),
    status: schema.string(),
    cost: schema.number(),
    utilization: schema.number(),
    rating: schema.number(),
    lastInspected: schema.datetime(),
    inService: schema.boolean(),
    location: schema.string(),
    lengthMeters: schema.number(),
    notes: schema.string(),
    docsUrl: schema.string(),
    photoUrl: schema.string(),
};

const { column } = dataTable.viewModel.defineColumns<Asset>();

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Asset> | null = null;
    public store: DataTableStore<Asset> | null = null;
    private readonly changedAssets = new Map<number, Asset>();

    public readonly saveChanges = async (): Promise<void> => {
        this.store?.commitCurrentEdit();
        const changed = [...this.changedAssets.values()];
        this.changedAssets.clear();
        await fetch("/api/assets", { method: "PATCH", body: JSON.stringify(changed) });
    };

    public readonly addAsset = async (): Promise<void> => {
        await this.store?.mutations.insert({
            row: { id: Date.now(), name: "New asset", category: "Pump", status: "active", cost: 0, utilization: 0, rating: 0, lastInspected: new Date().toISOString(), inService: true, location: "", lengthMeters: 0, notes: "", docsUrl: "", photoUrl: "", trend: [], tags: [] },
        }).run();
    };

    public nothingChecked = true;
    private readonly unsubscribeCheckedRows: (() => void)[] = [];

    private updateNothingChecked(): void {
        this.nothingChecked = (this.store?.getCheckboxRowsSelectedIndices().length ?? 0) === 0;
        this.update();
    }

    public readonly deleteChecked = async (): Promise<void> => {
        const store = this.store;
        if (!store) return;
        const indices = [...store.getCheckboxRowsSelectedIndices()];
        await store.mutations.removeBulk(indices.map((rowIndex) => ({ rowIndex }))).run();
        store.checkboxRowsUnselectAll();
    };

    public readonly retireChecked = async (): Promise<void> => {
        const store = this.store;
        if (!store) return;
        const indices = [...store.getCheckboxRowsSelectedIndices()];
        const rows = await store.getRowsFromDataEngine({ rowIndices: indices, checkCache: true });
        const updates = indices.flatMap((rowIndex, position) => {
            const row = rows[position];
            return row === undefined ? [] : [store.mutations.update({ rowIndex, row: { ...row, status: "retired" }, fields: ["status"] })];
        });
        await store.mutations.compose(updates).run();
        store.checkboxRowsUnselectAll();
    };

    public async initialize(): Promise<void> {
        const { options, store } = createDataTable<Asset>({
            data: dataTable.viewModel.data.arrayData({ data: assets, getRowId: (asset) => asset.id }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    ...assetSchemaEntries,
                    status: schema.string({
                        editing: {
                            descriptor: {
                                type: "Select",
                                options: [
                                    { value: "active", label: "Active" },
                                    { value: "maintenance", label: "In Maintenance" },
                                    { value: "retired", label: "Retired" },
                                ],
                                clearable: false,
                            },
                        },
                    }),
                },
            }),
            columns: [
                column({ field: "name", header: "Name", width: toPixels(220) }),
                column({ field: "category", header: "Category", width: toPixels(120) }),
                column({ field: "status", header: "Status", editing: true }),
            ],
            editable: true,
            onRowUpdate: async ({ row }) => {
                this.changedAssets.set(row.id, row);
            },
            checkboxRows: { showSelectAll: true },
        });
        this.dataTableOptions = options;
        this.store = store;
        this.unsubscribeCheckedRows.push(
            store.subscribe(actions.checkboxToggleRow, () => this.updateNothingChecked()),
            store.subscribe(actions.checkboxSelectAll, () => this.updateNothingChecked()),
            store.subscribe(actions.checkboxUnselectAll, () => this.updateNothingChecked()),
            store.subscribe(actions.sortDone, () => store.checkboxRowsUnselectAll()),
            store.subscribe(actions.setFilterDone, () => store.checkboxRowsUnselectAll()),
            store.subscribe(actions.clearFiltersDone, () => store.checkboxRowsUnselectAll()),
            store.subscribe(actions.setConstraintDone, () => store.checkboxRowsUnselectAll()),
        );
        this.update();
    }

    public destroy(): void {
        for (const unsubscribe of this.unsubscribeCheckedRows) unsubscribe();
        super.destroy();
    }
}
```

## view.ts

```ts
import { RSScriptor } from "index";
import type { ViewDefinitions } from "index";
import { dataTableOptions } from "data-ui/data-table";
import type { Asset, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("AssetTable", "Assets");
    s.view("main", (s) => {
        s.div({ heightPercentage: 100 }).contentTemplates((s) => {
            s.button({ kind: "primary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "saveChanges" }] })
                .contentTemplates((button) => { button.span({ text: "Save" }); });
            s.button({ kind: "primary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "addAsset" }] })
                .contentTemplates((button) => { button.span({ text: "Add asset" }); });
            s.button({ kind: "danger", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "deleteChecked" }], bindings: { disable: "nothingChecked" } })
                .contentTemplates((button) => { button.span({ text: "Delete checked" }); });
            s.button({ kind: "secondary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "retireChecked" }], bindings: { disable: "nothingChecked" } })
                .contentTemplates((button) => { button.span({ text: "Retire checked" }); });
            s.div({ height: 400 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Asset>({
                    bindings: { data: "dataTableOptions" },
                }));
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [edit-with-a-dropdown](../recipes/edit-with-a-dropdown.md): Edit with a dropdown
- [save-edits-with-a-button](../recipes/save-edits-with-a-button.md): Save changes with a button
- [add-rows](../recipes/add-rows.md): Add rows
- [act-on-checked-rows](../recipes/act-on-checked-rows.md): Act on checked rows: delete, change or move them
