# Data Table type definitions

<!-- Automatically generated, do not edit -->

Every declaration has its own `## TypeName` heading: search this file for the name you need rather than reading it whole.

## FilterExpression

```ts
/**
 * A single filter condition involving one field against one operator.
 * Depending on the operator, there may be one or more values.
 */
export interface FilterCondition<TFilterOps extends string = string> {
    readonly field: string;
    readonly operator: TFilterOps;
    readonly values: Readonly<Record<string, unknown>>;
}

/**
 * A composite filter condition involving one or more filter conditions and a single logical operator.
 */
export interface CompositeFilterCondition<TFilterOps extends string = string> {
    readonly logic: "and" | "or";
    readonly filters: readonly FilterExpression<TFilterOps>[];
}

/**
 * A filter expression is either a single filter condition or a composite filter condition, which may contain recursive filter expressions.
 */
export type FilterExpression<TFilterOps extends string = string> = FilterCondition<TFilterOps> | CompositeFilterCondition<TFilterOps>;
```

## FilterCapabilities

```ts
/**
 * Declares which filter operators a data engine supports.
 */
export interface FilterCapabilities<TFilterOps extends string = string> {
    readonly operators: readonly TFilterOps[];
}

/**
 * Extracts which filter operators a data engine supports.
 */
export type FilterOpsOf<TDataEngine> = TDataEngine extends {
    filterCapabilities: FilterCapabilities<infer TFilterOps>;
} ? TFilterOps : string;
```

## SortState

```ts
/**
 * Sort directions.
 */
export type SortDirection = "asc" | "desc";

/**
 * Sort state for a single column.
 */
export interface SortState {
    /** column key */
    readonly key: string;
    /** row field */
    readonly field: string;
    /** sort direction */
    readonly direction: SortDirection;
}
```

## DefaultSortInput

```ts
/**
 * User-facing input shape for `defaultSort` on `createDataTable`. Either a full `SortState`
 * or the simpler `{ key, direction }` form (which resolves `field` to `key`).
 */
export type DefaultSortInput = SortState | {
    readonly key: string;
    readonly direction: SortDirection;
};
```

## RowMutationsFactory

```ts
/**
 * Creaties bound, reversible `RowMutation` instances.
 */
export interface RowMutationsFactory<TRow extends UnknownObject> {
    /**
     * Creates a remove mutation.
     */
    remove(args: {
        readonly rowIndex: number;
    }): RowMutation<TRow>;
    /**
     * Creates an insert mutation.
     */
    insert(args: {
        readonly row: TRow;
    }): RowMutation<TRow>;
    /**
     * Creates an update mutation.
     */
    update(args: {
        readonly rowIndex: number;
        readonly row: TRow;
        readonly fields: readonly (keyof TRow)[];
    }): RowMutation<TRow>;
    /**
     * Creates a bulk remove mutation that resolves to a single engine call and reverts all
     * view patches atomically on failure.
     */
    removeBulk(args: readonly {
        readonly rowIndex: number;
    }[]): RowMutation<TRow, readonly TRow[]>;
    /** Combines multiple mutations into one reversible unit. */
    compose(mutations: readonly RowMutation<TRow>[]): RowMutation<TRow>;
    /**
     * Creates a `MutationReconciler` pre-bound to this store's dispatch.
     */
    reconciler(opts?: {
        readonly optimistic?: boolean;
        readonly overlay?: boolean;
        readonly refresh?: boolean;
    }): MutationReconciler;
}

/**
 * An atomic, reversible view mutation.
 */
export interface RowMutation<TRow extends UnknownObject = UnknownObject, TPersistArg = TRow | undefined> {
    readonly apply: () => void;
    readonly revert: () => void;
    run(opts?: RowMutationRunOptions<TRow, TPersistArg>): Promise<void>;
}

export interface RowMutationRunOptions<TRow extends UnknownObject = UnknownObject, TPersistArg = TRow | undefined> {
    /**
     * Optional reconciler controlling how the data table updates in response to the mutation.
     */
    readonly reconciler?: MutationReconciler;
    /**
     * Optional persistence override.
     */
    readonly persist?: (arg: TPersistArg) => Promise<void>;
}

/**
 * Lifecycle hooks for a mutation execution.
 */
export interface MutationReconciler {
    /** When true, updates immediately and reverts if the async call fails. When false, only updates after the async call succeeds. */
    readonly optimistic: boolean;
    /** When true, dispatches a full refresh after persist succeeds so sort and filter are re-applied by the data engine. */
    readonly refresh: boolean;
    /** Called before the mutation executes. */
    readonly onStart: () => void;
    /** Called after the mutation succeeds (persist resolved), after any refresh is dispatched. */
    readonly onSuccess: () => void;
    /** Called after the mutation fails (persist rejected) */
    readonly onError: () => void;
}
```

## DiscoveredColumnEntry

```ts
/**
 * A single column entry returned by a data engine's column metadata method.
 */
export interface DiscoveredColumnEntry {
    /** column name/key */
    readonly name: string;
    /** column type already resolved to a UI type - set by non-server data engines (e.g. ArrayDataEngine) */
    readonly columnType?: string;
    /** raw server-side type string - set by server-backed data engines; createDiscoverableSchema maps it to a UI type */
    readonly serverType?: string;
    /** column human-readable label */
    readonly label?: string;
    /** unit metadata from server column metadata */
    readonly unitInfo?: IUnitInfo;
    /** the display format the table's own metadata gives the column */
    readonly displayFormat?: string;
}
```

## AsyncOffsetFetchRowsArgs

```ts
export interface AsyncOffsetFetchRowsArgs<TFilterOps extends string = string> {
    readonly start: number;
    readonly count: number;
    readonly sort: SortState | null;
    readonly filter: FilterExpression<TFilterOps> | null;
}

/**
 * A single filter condition involving one field against one operator.
 * Depending on the operator, there may be one or more values.
 */
export interface FilterCondition<TFilterOps extends string = string> {
    readonly field: string;
    readonly operator: TFilterOps;
    readonly values: Readonly<Record<string, unknown>>;
}

/**
 * A composite filter condition involving one or more filter conditions and a single logical operator.
 */
export interface CompositeFilterCondition<TFilterOps extends string = string> {
    readonly logic: "and" | "or";
    readonly filters: readonly FilterExpression<TFilterOps>[];
}

/**
 * A filter expression is either a single filter condition or a composite filter condition, which may contain recursive filter expressions.
 */
export type FilterExpression<TFilterOps extends string = string> = FilterCondition<TFilterOps> | CompositeFilterCondition<TFilterOps>;

/**
 * Sort directions.
 */
export type SortDirection = "asc" | "desc";

/**
 * Sort state for a single column.
 */
export interface SortState {
    /** column key */
    readonly key: string;
    /** row field */
    readonly field: string;
    /** sort direction */
    readonly direction: SortDirection;
}
```

## ColumnSchemaEntry

```ts
/**
 * A single entry in a column schema.
 */
export interface ColumnSchemaEntry<TColumnType extends string = string> {
    readonly type: TColumnType;
    readonly descriptor?: ColumnTypeDefinition<TColumnType>;
    readonly filtering?: {
        readonly type?: string;
        readonly adapter?: FilterAdapter;
        readonly descriptor?: AnyDescriptor;
    };
    readonly editing?: {
        readonly type?: string;
        readonly descriptor?: AnyDescriptor;
    };
    readonly unitInfo?: IUnitInfo;
}

/**
 * Translates a user's filter intent (operator + values) into a FilterExpression.
 * `field` is the column key.
 */
export type FilterAdapter = (args: {
    readonly operator: string;
    readonly values: Readonly<Record<string, unknown>>;
    readonly field: string;
}) => FilterExpression | null;

export interface SchemaOverrides {
    readonly filtering?: {
        readonly type?: string;
        readonly adapter?: FilterAdapter;
        readonly descriptor?: AnyDescriptor;
    };
    readonly editing?: {
        readonly type?: string;
        readonly descriptor?: AnyDescriptor;
    };
    readonly unitInfo?: IUnitInfo;
}
```

## InputRenderArgs

```ts
export interface InputRenderArgs {
    readonly s: IRootScriptor<unknown>;
    readonly bindings: InputRenderBindings;
    readonly events?: readonly InputRenderEvent[];
    readonly noAutoEvent?: boolean;
}

/**
 * Typed bindings shape passed to renderInput. Structurally assignable to the bindings accepted
 * by s.input, s.textArea, s.select, and other Raptor single-value elements.
 */
export type InputRenderBindings = Bindings.IRaptorUniversalBindings<ForScriptorTrue> & Bindings.IRaptorTextInputBinding<ForScriptorTrue> & Bindings.IRaptorValueBinding<ForScriptorTrue> & Bindings.IRaptorAttrBindings_ForInput<ForScriptorTrue>;

/**
 * Event type passed to renderInput. Matches the event union accepted by s.input (includes
 * "change" and "input"). For Raptor elements whose typed event union is narrower (e.g.
 * s.textArea, s.select), use passEvents() to coerce the type at the call site.
 */
export type InputRenderEvent = Events.IEvent_Input<ForScriptorTrue>;
```

## ColumnTypeDefinition

```ts
export interface ColumnTypeDefinition<TColumnType extends string = string> {
    readonly columnType: TColumnType;
    readonly renderInput: (args: InputRenderArgs) => void;
    /** default filter operators for this column type; used if the column does not specify its own */
    readonly defaultFilterOperators?: readonly string[];
    /** coerces a raw DOM input value to the appropriate JS type; omit for string pass-through */
    readonly coerceEditValue?: (rawValue: unknown) => unknown;
    /** server-side type strings (case-insensitive) that map to this column type */
    readonly serverTypes?: readonly string[];
    /** factory returning the default descriptor for filter and edit surfaces */
    readonly descriptor?: () => AnyDescriptor;
    /** default column alignment applied during column assembly when not explicitly set */
    readonly defaultAlign?: "left" | "right" | "center";
    /** default formatter key applied during column assembly when not explicitly set */
    readonly defaultFormatter?: string;
}
```

## ViewModelMatcher

```ts
/**
 * Matches a column by exact name
 */
export interface ExactMatcher {
    readonly type: "exact";
    readonly value: string;
}

/**
 * Matches a column name against a regex pattern string (NOTE: not RegExp, needs to be a primitive string to be serializable)
 */
export interface RegexMatcher {
    readonly type: "regex";
    readonly pattern: string;
}

/**
 * Matches a column name with an arbitrary function, not serializable
 */
export interface FunctionMatcher {
    readonly type: "function";
    readonly fn: (columnName: string) => boolean;
}

/**
 * Matchers usable in View rules (serializable)
 */
export type ViewMatcher = ExactMatcher | RegexMatcher;

/**
 * Matchers usable in ViewModel rules (allows non-serializable matchers)
 */
export type ViewModelMatcher = ViewMatcher | FunctionMatcher;
```

## ExactMatcher

```ts
/**
 * Matches a column by exact name
 */
export interface ExactMatcher {
    readonly type: "exact";
    readonly value: string;
}
```

## RegexMatcher

```ts
/**
 * Matches a column name against a regex pattern string (NOTE: not RegExp, needs to be a primitive string to be serializable)
 */
export interface RegexMatcher {
    readonly type: "regex";
    readonly pattern: string;
}
```

## FunctionMatcher

```ts
/**
 * Matches a column name with an arbitrary function, not serializable
 */
export interface FunctionMatcher {
    readonly type: "function";
    readonly fn: (columnName: string) => boolean;
}
```

## ViewMatcher

```ts
/**
 * Matchers usable in View rules (serializable)
 */
export type ViewMatcher = ExactMatcher | RegexMatcher;
```

## SchemaRuleConfig

```ts
/**
 * Configuration that can be applied to columns by a schema rule
 */
export type SchemaRuleConfig = Partial<Pick<ColumnBase, "sort" | "filtering" | "resize" | "width" | "hide" | "header">>;
```

## SchemaRule

```ts
/**
 * A rule that applies sideEffects to matched columns
 */
export interface IncludeRule<TMatcher, TSideEffects> {
    readonly effect?: "include";
    readonly match?: TMatcher;
    readonly sideEffects?: TSideEffects;
}

/**
 * A rule that excludes matched columns
 */
export interface ExcludeRule<TMatcher> {
    readonly effect: "exclude";
    readonly match?: TMatcher;
}

/**
 * A rule to include or exclude columns
 */
export type Rule<TMatcher, TSideEffects> = IncludeRule<TMatcher, TSideEffects> | ExcludeRule<TMatcher>;

/**
 * A ViewModel-side schema rule.
 * Generic over config to allow discovery rules to extend with extra properties (e.g. columnType).
 */
export type SchemaRule<TConfig extends SchemaRuleConfig = SchemaRuleConfig> = Rule<ViewModelMatcher, TConfig>;
```

## DiscoveryRule

```ts
/**
 * Extension of SchemaRuleConfig that also allows overriding the inferred column type.
 */
export type DiscoveryRuleConfig = SchemaRuleConfig & {
    readonly columnType?: string;
};

/**
 * A rule that governs how discovered columns are filtered or configured.
 */
export type DiscoveryRule = SchemaRule<DiscoveryRuleConfig>;
```

## DataEngine

```ts
export type DataEngine<TRow extends UnknownObject, TFilterOps extends string = string> = IOffsetDataEngine<TRow, TFilterOps> | ICursorDataEngine<TRow, TFilterOps>;

/**
 * An offset-based data engine that gives data in pages with an offset and a count, like SQL.
 */
export interface IOffsetDataEngine<TRow extends UnknownObject, TFilterOps extends string = string> {
    readonly type: "offset";
    readonly getRows: (args: {
        readonly start: number;
        readonly count: number;
    }) => Promise<RowsResult<TRow>>;
    readonly rowCount?: number;
    readonly setSort: (args: {
        readonly sort: SortState | null;
    }) => void | Promise<void>;
    readonly setFilters: (args: {
        readonly filter: FilterExpression<TFilterOps> | null;
        /** Ambient constraints ANDed onto the query alongside the user's filter. */
        readonly constraints?: readonly FilterExpression[];
    }) => void | Promise<void>;
    readonly updateRow?: (args: {
        readonly row: TRow;
        readonly changedFields: readonly (keyof TRow)[];
    }) => Promise<Outcome<void, unknown>>;
    readonly removeRow?: (args: {
        readonly rowIndex: GlobalRowIndex;
        readonly row?: TRow;
    }) => Promise<Outcome<void, unknown>>;
    readonly createRow?: (args: {
        readonly row: TRow;
        readonly atIndex?: GlobalRowIndex;
    }) => Promise<Outcome<void, unknown>>;
    readonly removeRows?: (args: {
        readonly rowIndices: readonly GlobalRowIndex[];
        readonly rows: readonly TRow[];
    }) => Promise<Outcome<void, unknown>>;
    readonly filterCapabilities?: FilterCapabilities<TFilterOps>;
    readonly getDistinctValues?: (args: {
        readonly field: string;
    }) => Promise<readonly unknown[]>;
    readonly getColumnEmptiness?: (args: {
        readonly fields: readonly string[];
    }) => Promise<ReadonlyMap<string, boolean>>;
    readonly getColumnMetadata?: () => readonly DiscoveredColumnEntry[];
    readonly freshness?: () => DataFreshness | null;
    readonly getDataSource?: () => ml.data.IDataSource | null;
    readonly getExportSource?: () => ml.data.IDataSource | null;
    /** the field holding geometry */
    readonly getDefaultGeoField?: () => string | undefined;
    /** optional reactive signal - subscribe to be notified when the engine's underlying data changes externally. returns an unsubscribe function. */
    readonly onDataChanged?: (callback: () => void) => () => void;
    /**
     * Called by `createDataTable` after the schema is resolved from descriptors.
     * Implement when the engine needs schema type information.
     */
    readonly setSchema?: (schema: Schema) => void;
}

/**
 * A cursor-based data engine that gives data in pages with a cursor and a count, like NoSQL.
 */
export interface ICursorDataEngine<TRow extends UnknownObject, TFilterOps extends string = string> {
    readonly type: "cursor";
    readonly getRows: (args: {
        readonly cursor: string | null;
        readonly count: number;
        readonly direction?: "forward" | "backward";
    }) => Promise<CursorRowsResult<TRow>>;
    readonly rowCount?: number;
    readonly setFilters: (args: {
        readonly filter: FilterExpression<TFilterOps> | null;
        /** Ambient constraints ANDed onto the query alongside the user's filter. */
        readonly constraints?: readonly FilterExpression[];
    }) => void | Promise<void>;
    readonly updateRow?: (args: {
        readonly row: TRow;
        readonly changedFields: readonly (keyof TRow)[];
    }) => Promise<Outcome<void, unknown>>;
    readonly removeRow?: (args: {
        readonly rowIndex: GlobalRowIndex;
        readonly row?: TRow;
    }) => Promise<Outcome<void, unknown>>;
    readonly createRow?: (args: {
        readonly row: TRow;
        readonly atIndex?: GlobalRowIndex;
    }) => Promise<Outcome<void, unknown>>;
    readonly removeRows?: (args: {
        readonly rowIndices: readonly GlobalRowIndex[];
        readonly rows: readonly TRow[];
    }) => Promise<Outcome<void, unknown>>;
    readonly filterCapabilities?: FilterCapabilities<TFilterOps>;
    readonly getDistinctValues?: (args: {
        readonly field: string;
    }) => Promise<readonly unknown[]>;
    readonly getColumnEmptiness?: (args: {
        readonly fields: readonly string[];
    }) => Promise<ReadonlyMap<string, boolean>>;
    readonly getColumnMetadata?: () => readonly DiscoveredColumnEntry[];
    readonly freshness?: () => DataFreshness | null;
    readonly getDataSource?: () => ml.data.IDataSource | null;
    readonly getExportSource?: () => ml.data.IDataSource | null;
    /** the field holding geometry */
    readonly getDefaultGeoField?: () => string | undefined;
    /** optional reactive signal - subscribe to be notified when the engine's underlying data changes externally. returns an unsubscribe function. */
    readonly onDataChanged?: (callback: () => void) => () => void;
    readonly setSchema?: (schema: Schema) => void;
}
```

## ColumnBase

```ts
/**
 * Base column definition.
 */
export interface ColumnBase<TColumnKey extends string = string, TFilterOps extends string = string> {
    /** canonical internal name for this column. for data columns, defaults to the field name via defineColumn. */
    readonly key: TColumnKey;
    /** display name for the column header. defaults to the key. */
    header?: string;
    /** overrides the schema's type for this column */
    columnType?: string;
    /** groups this column under a heading in the column configurator. */
    group?: string;
    /** key of the registered formatter that renders this column's values */
    formatter?: string;
    /** arguments handed to the formatter */
    formatterArgs?: FormatterArgs;
    /** binding to a function that transforms the header text */
    headerTransform?: ViewDefinitionBinding;
    /** fixed width of the column. takes precedence over flex. */
    width?: Pixels;
    /** proportional share of the leftover viewport space after fixed columns. clamped by minWidth/maxWidth. */
    flex?: number;
    /** minimum width of the column. clamps resizing and flex sizing. */
    minWidth?: Pixels;
    /** maximum width of the column. clamps resizing and flex sizing. */
    maxWidth?: Pixels;
    /** whether the column is sortable */
    sort?: boolean;
    /** whether the column is filterable */
    filtering?: boolean | ColumnFilterConfig<ForScriptorFalse, TFilterOps>;
    /** whether the column is resizable. defaults to true. */
    resize?: boolean;
    /** whether the column is hidden */
    hide?: boolean;
    /**
     * fixed content height for this column in pixels. When set, row height heuristics
     * can use this value directly instead of measuring the DOM or estimating from data.
     */
    contentHeight?: Pixels;
    /**
     * when true, body cells in this column wrap their text onto multiple lines instead
     * of truncating with an ellipsis. ignored when fixedRowHeight is passed to the scroll
     * engine, where the row height is fixed and wrapping text would clip silently.
     */
    textWrap?: boolean;
    /** horizontal alignment for this column's body cells. applied as flex justify-content on the column slot and text-align on the cell span. */
    align?: HorizontalAlignment;
    /** horizontal alignment for this column's header cell. applied as flex justify-content on the header cell and header content. */
    headerAlign?: HorizontalAlignment;
    /** vertical alignment for this column's body cells. applied as flex align-items on the column slot. */
    verticalAlign?: VerticalAlignment;
    /** vertical alignment for this column's header cell. applied as flex align-items on the header cell. */
    verticalHeaderAlign?: VerticalAlignment;
    /** per-trigger editing configuration. maps each editing trigger to a CellEditor instance. `true` uses the default triggers. `false` disables editing. */
    editing?: ColumnEditConfig | boolean;
}

/**
 * Configuration for column filtering.
 */
export interface ColumnFilterConfig<TForScriptor extends ForScriptor = ForScriptorFalse, TFilterOps extends string = string, TScope extends Record<string, ViewDefinitionBinding> = Record<never, never>> {
    /** operators available for filtering */
    readonly operators?: readonly TFilterOps[];
    /**
     * ViewModel binding references made available inside the filter `contentTemplates` callback.
     * Each entry maps a local name to a ViewModel binding path.
     */
    readonly scope?: TScope;
    readonly contentTemplates?: ViewDefinitionBindingProp<TForScriptor, (ctx: FilterConditionContentTemplatesContext) => void>;
}

/** VM-side transform callback */
export type ColumnTransformValueFn<TRow extends UnknownObject, TField extends StringKeyOf<TRow>> = (ctx: {
    value: TRow[TField];
    row: TRow;
    field: TField;
    rowIndex: RowSlotIndex;
}) => unknown;

/** VM-side contentTemplates callback */
export type ContentTemplatesFn<TRow extends UnknownObject, TField extends StringKeyOf<TRow> | undefined = StringKeyOf<TRow> | undefined> = (cell: CellContext<TRow, TField>) => void;

/**
 * Data columns are backed by a single specific field in the underlying TRow data.
 */
export type DataColumn<TRow extends UnknownObject, TForScriptor extends ForScriptor = ForScriptorFalse, TField extends StringKeyOf<TRow> = StringKeyOf<TRow>, TColumnKey extends string = string, TFilterOps extends string = string, TScope extends Record<string, unknown> = Record<never, never>> = Omit<ColumnBase<TColumnKey, TFilterOps>, "headerTransform" | "filtering" | "editing"> & {
    field: TField;
    transformValue?: ViewDefinitionBindingProp<TForScriptor, ColumnTransformValueFn<TRow, TField>>;
    scope?: TScope;
    contentTemplates?: ViewDefinitionBindingProp<TForScriptor, ContentTemplatesFn<TRow, TField>> | InlineContentTemplates;
    /** css classes applied to the .ml-dt-cell span inside this column's slots */
    customCssClasses?: string | string[];
    /** css classes applied to the .ml-dt-column-slot element for this column */
    customSlotCssClasses?: string | string[];
    headerTransform?: ViewDefinitionBindingProp<TForScriptor, (header: string) => string>;
    filtering?: boolean | ColumnFilterConfig<TForScriptor, TFilterOps>;
    editing?: ColumnEditConfig<TForScriptor> | boolean;
};

/**
 * Virtual columns are not backed by a specific field in the underlying TRow data, but could be.
 */
export type VirtualColumn<TRow extends UnknownObject, TForScriptor extends ForScriptor = ForScriptorFalse, TColumnKey extends string = string, TFilterOps extends string = string, TScope extends Record<string, unknown> = Record<never, never>> = Omit<ColumnBase<TColumnKey, TFilterOps>, "headerTransform" | "filtering" | "editing"> & {
    field?: never;
    /** row field to sort by. required for a virtual column to be sortable */
    sortField?: StringKeyOf<TRow>;
    transformValue?: ViewDefinitionBindingProp<TForScriptor, (ctx: {
        value: unknown;
        row: TRow;
        rowIndex: RowSlotIndex;
    }) => unknown>;
    scope?: TScope;
    contentTemplates?: ViewDefinitionBindingProp<TForScriptor, ContentTemplatesFn<TRow, undefined>> | InlineContentTemplates;
    /** css classes applied to the .ml-dt-cell span inside this column's slots */
    customCssClasses?: string | string[];
    /** css classes applied to the .ml-dt-column-slot element for this column */
    customSlotCssClasses?: string | string[];
    headerTransform?: ViewDefinitionBindingProp<TForScriptor, (header: string) => string>;
    filtering?: boolean | ColumnFilterConfig<TForScriptor, TFilterOps>;
    editing?: ColumnEditConfig<TForScriptor> | boolean;
};
```

## ColumnEditConfig

```ts
export interface ColumnEditConfig<T extends ForScriptor = ForScriptorFalse> {
    readonly triggers: Partial<Record<EditTrigger, TriggerEditConfig<T>>>;
}

export interface TriggerEditConfig<T extends ForScriptor = ForScriptorFalse> {
    readonly editor: CellEditorDef | ViewDefinitionBinding;
    readonly transformEditValue?: ViewDefinitionBindingProp<T, (ctx: EditTransformContext) => unknown> | DeclarativeRule<unknown>;
}
```

## EditTrigger

```ts
export type EditTrigger = "dblclick" | "enter" | "contextMenu" | "programmatic";

export interface ActiveEditState {
    readonly rowIndex: GlobalRowIndex;
    readonly columnKey: string;
    readonly trigger: EditTrigger;
    /** the value the editor opened on */
    readonly editValue?: unknown;
}
```

## EditTransformContext

```ts
export interface EditTransformContext<TRow = unknown> {
    /** post-coerce value, before commit */
    readonly value: unknown;
    /** pre-update row snapshot */
    readonly row: TRow;
    readonly field: string;
    readonly columnKey: string;
    readonly rowIndex: GlobalRowIndex;
    /** the trigger that initiated the edit */
    readonly trigger: EditTrigger;
}

export type EditTrigger = "dblclick" | "enter" | "contextMenu" | "programmatic";
```

## CellEditorInitContext

```ts
export interface CellEditorInitContext {
    readonly store: DataTableStore;
    readonly raptorDom?: RaptorDom;
    readonly hostViewModel?: RaptorViewModel;
    readonly schema: Schema;
    readonly testIds?: boolean;
    readonly createScriptor?: () => IRootScriptor<any>;
}
```

## CellEditorStartContext

```ts
export interface CellEditorStartContext {
    readonly rowIndex: GlobalRowIndex;
    readonly columnKey: string;
    readonly field: string | undefined;
    readonly editType: string | undefined;
    /** schema entry for the column being edited (provides editing.descriptor for descriptor-driven editors) */
    readonly schemaEntry?: ColumnSchemaEntry;
    readonly row: UnknownObject;
    readonly pristineValue: unknown;
    readonly displayValue: unknown;
    readonly cellElement: HTMLElement | undefined;
    readonly trigger: EditTrigger;
    readonly getPendingEditValue: () => unknown;
    readonly setPendingEditValue: (value: unknown) => void;
    /** registers or clears the BindingData slot on the extension for descriptor-driven editors */
    readonly setDescriptorBindingData: (data: IBindingData | null) => void;
    readonly getColumnTypeDefinition: (editType: string | undefined) => ColumnTypeDefinition;
    readonly resolveDescriptor: (args: {
        readonly schemaEntry: ColumnSchemaEntry;
        readonly surface: ColumnSurface;
    }) => AnyDescriptor | undefined;
    /**
     * The full column type registry for the data table instance.
     */
    readonly columnTypeDescriptorRegistry?: ReadonlyMap<string, ColumnTypeDefinition>;
    /**
     * Provider for the user's preferences.
     */
    readonly getGlobalUserContext?: GlobalUserContextProvider;
}

export type EditTrigger = "dblclick" | "enter" | "contextMenu" | "programmatic";
```

## CellEditor

```ts
export interface CellEditor {
    initialize?(context: CellEditorInitContext): void;
    startEdit(context: CellEditorStartContext): void;
    /** returns the current edited value without side effects */
    getEditValue(): unknown;
    /**
     * Returns false when the current edited value violates the descriptor's rules.
     */
    isValid?(): boolean;
    /** removes editor DOM or tears down Raptor content */
    endEdit(): void;
    cancelEdit(): void;
    syncDialogs?(): void;
    destroy?(): void;
    /**
     * When true, the DataTable immediately patches the segment cache and re-renders the row
     * after commit, before the updateRow handler completes its server round-trip.
     */
    readonly optimisticUpdate?: boolean;
    /**
     * When true, the Enter key is passed through to the editor's input element instead of
     * triggering a commit.
     */
    readonly suppressEnterCommit?: boolean;
}

/** Descriptor identifying which editor to use and how to configure it. */
export interface CellEditorDef {
    readonly kind: string;
}

/** Registers a live CellEditor factory for a given editor kind. */
export interface CellEditorRegistration<TDef extends CellEditorDef = CellEditorDef> {
    readonly kind: TDef["kind"];
    build(def: TDef): CellEditor;
}

export interface CellEditorInitContext {
    readonly store: DataTableStore;
    readonly raptorDom?: RaptorDom;
    readonly hostViewModel?: RaptorViewModel;
    readonly schema: Schema;
    readonly testIds?: boolean;
    readonly createScriptor?: () => IRootScriptor<any>;
}

export interface CellEditorStartContext {
    readonly rowIndex: GlobalRowIndex;
    readonly columnKey: string;
    readonly field: string | undefined;
    readonly editType: string | undefined;
    /** schema entry for the column being edited (provides editing.descriptor for descriptor-driven editors) */
    readonly schemaEntry?: ColumnSchemaEntry;
    readonly row: UnknownObject;
    readonly pristineValue: unknown;
    readonly displayValue: unknown;
    readonly cellElement: HTMLElement | undefined;
    readonly trigger: EditTrigger;
    readonly getPendingEditValue: () => unknown;
    readonly setPendingEditValue: (value: unknown) => void;
    /** registers or clears the BindingData slot on the extension for descriptor-driven editors */
    readonly setDescriptorBindingData: (data: IBindingData | null) => void;
    readonly getColumnTypeDefinition: (editType: string | undefined) => ColumnTypeDefinition;
    readonly resolveDescriptor: (args: {
        readonly schemaEntry: ColumnSchemaEntry;
        readonly surface: ColumnSurface;
    }) => AnyDescriptor | undefined;
    /**
     * The full column type registry for the data table instance.
     */
    readonly columnTypeDescriptorRegistry?: ReadonlyMap<string, ColumnTypeDefinition>;
    /**
     * Provider for the user's preferences.
     */
    readonly getGlobalUserContext?: GlobalUserContextProvider;
}
```

## ViewColumnRuleConfig

```ts
/**
 * The set of properties that can be set by a column rule.
 */
export type ViewColumnRuleConfig<T extends ForScriptor = ForScriptorFalse> = {
    readonly header?: string;
    readonly headerTransform?: ViewDefinitionBindingProp<T, (header: string) => string>;
} & Partial<Pick<ColumnBase, "sort" | "resize" | "width" | "flex" | "minWidth" | "maxWidth" | "hide" | "align" | "headerAlign" | "verticalAlign" | "verticalHeaderAlign">> & Partial<Pick<DataColumn<UnknownObject>, "customCssClasses" | "customSlotCssClasses">> & {
    readonly contentTemplates?: ViewDefinitionBindingProp<T, ContentTemplatesFn<UnknownObject>> | (T extends ForScriptorFalse ? never : never);
    readonly transformValue?: ViewDefinitionBindingProp<T, (ctx: unknown) => unknown>;
    readonly scope?: T extends ForScriptorFalse ? Record<string, ViewDefinitionBinding> : Record<string, (ctx: unknown) => unknown>;
    readonly filtering?: boolean | {
        readonly operators?: readonly string[];
        readonly contentTemplates?: ViewDefinitionBindingProp<T, (ctx: FilterConditionContentTemplatesContext) => void>;
    };
    readonly editing?: ColumnEditConfig<T>;
};

/**
 * A column rule.
 * When match is omitted, the rule applies to all columns in the target array.
 */
export interface ViewColumnRule<T extends ForScriptor = ForScriptorFalse> {
    readonly match?: ViewMatcher;
    readonly sideEffects?: ViewColumnRuleConfig<T>;
}
```

## InlineContentTemplates

```ts
/**
 * Custom cell content for a column.
 */
export interface InlineContentTemplates {
    readonly type: "inlineContentTemplates";
    readonly viewDef: ViewDefinitions.IDiv;
}
```

## ColumnDescriptor

```ts
export type ColumnExtras<TRow extends UnknownObject, Field extends StringKeyOf<TRow>> = Omit<DataColumn<TRow, ForScriptorTrue, Field>, "field" | "key" | "header" | "formatter"> & {
    readonly headerOverride?: string;
    readonly formatter?: FormattersForType<DescriptorTypeName>;
};

/**
 * The descriptor `type` literal is the source of truth. Supply `toDescriptor`/`fromDescriptor` only
 * when the row's storage format has no auto-bridge (e.g. "Y"/"N" strings as booleans).
 */
export type ColumnDescriptor<TRow extends UnknownObject, Field extends StringKeyOf<TRow>> = (DtTextDescriptor<TRow, Field, string> | DtTextAreaDescriptor<TRow, Field, string> | DtNumberDescriptor<TRow, Field, number> | DtDateTimeDescriptor<TRow, Field, ml.luxon.DateTime> | DtCheckboxDescriptor<TRow, Field, boolean> | DtSwitchDescriptor<TRow, Field, boolean> | DtSelectDescriptor<TRow, Field, TRow[Field]> | DtMultiSelectDescriptor<TRow, Field, MultiSelectValueFor<TRow[Field]>>) & {
    readonly column?: ColumnExtras<TRow, Field>;
};
```

## ColumnDescriptors

```ts
export type ColumnDescriptors<TRow extends UnknownObject> = {
    readonly [Field in StringKeyOf<TRow>]?: ColumnDescriptor<TRow, Field>;
};
```

## DescriptorAdapter

```ts
/** Adapter function that turns a ColumnDescriptors map into a schema and columns. */
export type DescriptorAdapter<TRow extends UnknownObject, TColumnType extends string = string> = (args: {
    readonly descriptors: ColumnDescriptors<TRow>;
}) => {
    readonly schema: StaticSchema<TColumnType>;
    readonly columns: readonly DataColumn<TRow, ForScriptorTrue>[];
};
```

## FormatterArgs

```ts
export type FormatterArgs = Record<string, FormatterArgValue>;
```

## DataTableValueFormatter

```ts
export type DataTableValueFormatter = (args: {
    value: unknown;
    formatterArgs?: FormatterArgs;
}) => string | Promise<string>;
```

## CellContext

```ts
/**
 * Binding path strings for a cell.
 */
export interface CellBindingPaths<TScope extends Record<string, string> = Record<string, string>> {
    readonly displayValue: string;
    readonly rawValue: string;
    readonly row: string;
    readonly scope: TScope;
}

/**
 * Context passed to contentTemplates for a cell.
 */
export interface CellContext<TRow extends UnknownObject, TField extends StringKeyOf<TRow> | undefined = StringKeyOf<TRow>, TViewEngineViewModel = unknown, TScope extends Record<string, ViewDefinitionBinding> = Record<never, never>> {
    s: IRootScriptor<TViewEngineViewModel>;
    field: TField;
    bindingPaths: CellBindingPaths<{
        [K in keyof TScope]: string;
    }>;
}
```

## CellBindingPaths

```ts
/**
 * Binding path strings for a cell.
 */
export interface CellBindingPaths<TScope extends Record<string, string> = Record<string, string>> {
    readonly displayValue: string;
    readonly rawValue: string;
    readonly row: string;
    readonly scope: TScope;
}
```

## ColumnFilterConfig

```ts
/**
 * Configuration for column filtering.
 */
export interface ColumnFilterConfig<TForScriptor extends ForScriptor = ForScriptorFalse, TFilterOps extends string = string, TScope extends Record<string, ViewDefinitionBinding> = Record<never, never>> {
    /** operators available for filtering */
    readonly operators?: readonly TFilterOps[];
    /**
     * ViewModel binding references made available inside the filter `contentTemplates` callback.
     * Each entry maps a local name to a ViewModel binding path.
     */
    readonly scope?: TScope;
    readonly contentTemplates?: ViewDefinitionBindingProp<TForScriptor, (ctx: FilterConditionContentTemplatesContext) => void>;
}
```

## OperatorSet

```ts
/**
 * Describes the UI for a single operator.
 */
export interface OperatorDescriptor {
    readonly label: string;
    readonly descriptors: Readonly<Record<string, FilterInputDescriptor>>;
}

/**
 * A set of operators
 */
export interface OperatorSet<TFilterOps extends string = string> {
    readonly descriptors: Readonly<Record<TFilterOps, OperatorDescriptor>>;
    readonly operators: readonly TFilterOps[];
}
```

## FilterEngineColumnDescriptor

```ts
/**
 * Minimal description of a column as seen by a filter engine.
 */
export interface FilterEngineColumnDescriptor {
    readonly key: string;
    readonly header: string;
    readonly field: string | undefined;
    readonly filterable: boolean;
    readonly filterType: string | undefined;
}
```

## FilterEngineContext

```ts
/**
 * Context provided to a filter engine on initialization.
 */
export interface FilterEngineContext<TFilterOps extends string = string> {
    readonly store: DataTableStore;
    readonly columns: readonly FilterEngineColumnDescriptor[];
    readonly activeFilters: ReadonlyMap<string, FilterExpression<TFilterOps>>;
    /** apply or clear a single column's filter */
    readonly applyFilter: (key: string, filter: FilterExpression<TFilterOps> | null) => void;
    readonly clearAllFilters: () => void;
    readonly schema: Schema;
    /**
     * the filter operator keys that the underlying data engine supports.
     * engines should use this to limit which operators they offer in their UI.
     */
    readonly supportedFilterOps: readonly TFilterOps[];
    /**
     * if provided, returns the distinct values for the given field name.
     * engines can use this to populate checkbox/dropdown filter options.
     */
    readonly getDistinctValues?: (field: string) => Promise<readonly unknown[]>;
}

/**
 * A single filter condition involving one field against one operator.
 * Depending on the operator, there may be one or more values.
 */
export interface FilterCondition<TFilterOps extends string = string> {
    readonly field: string;
    readonly operator: TFilterOps;
    readonly values: Readonly<Record<string, unknown>>;
}

/**
 * A composite filter condition involving one or more filter conditions and a single logical operator.
 */
export interface CompositeFilterCondition<TFilterOps extends string = string> {
    readonly logic: "and" | "or";
    readonly filters: readonly FilterExpression<TFilterOps>[];
}

/**
 * A filter expression is either a single filter condition or a composite filter condition, which may contain recursive filter expressions.
 */
export type FilterExpression<TFilterOps extends string = string> = FilterCondition<TFilterOps> | CompositeFilterCondition<TFilterOps>;

/**
 * Minimal description of a column as seen by a filter engine.
 */
export interface FilterEngineColumnDescriptor {
    readonly key: string;
    readonly header: string;
    readonly field: string | undefined;
    readonly filterable: boolean;
    readonly filterType: string | undefined;
}
```

## ActiveFilterIndicator

```ts
/**
 * Describes one active filter for a column, as raw state.
 * Indicator engines are responsible for deriving any display text from the expression.
 */
export interface ActiveFilterIndicator<TFilterOps extends string = string> {
    readonly columnKey: string;
    readonly columnHeader: string;
    /** the raw committed filter expression for this column */
    readonly expression: FilterExpression<TFilterOps>;
    /**
     * when true, this filter was set by an external component (e.g. a dashboard panel via IDataStore)
     * and cannot be cleared from within the grid.
     */
    readonly isExternal?: boolean;
}

/**
 * A single filter condition involving one field against one operator.
 * Depending on the operator, there may be one or more values.
 */
export interface FilterCondition<TFilterOps extends string = string> {
    readonly field: string;
    readonly operator: TFilterOps;
    readonly values: Readonly<Record<string, unknown>>;
}

/**
 * A composite filter condition involving one or more filter conditions and a single logical operator.
 */
export interface CompositeFilterCondition<TFilterOps extends string = string> {
    readonly logic: "and" | "or";
    readonly filters: readonly FilterExpression<TFilterOps>[];
}

/**
 * A filter expression is either a single filter condition or a composite filter condition, which may contain recursive filter expressions.
 */
export type FilterExpression<TFilterOps extends string = string> = FilterCondition<TFilterOps> | CompositeFilterCondition<TFilterOps>;
```

## FilterEngine

```ts
/**
 * Contract for a filter engine.
 * All methods that accept parameters are single-arity (one object argument).
 */
export interface FilterEngine<TFilterOps extends string = string> extends ViewModelExtensionProvider {
    /** called once after the DataTable is set up, before the first render */
    initialize(context: FilterEngineContext<TFilterOps>): void;
    /** called on every render with the current committed active filters; may be async */
    update(args: {
        readonly activeFilters: ReadonlyMap<string, FilterExpression<TFilterOps>>;
    }): Promise<void> | void;
    /** open the filter UI for the given column (e.g. a dialog, panel, etc.) */
    openForColumn(args: {
        readonly columnKey: string;
    }): void;
    /**
     * returns a human-readable summary of the active filter for a column.
     * optional: engines that cannot produce a meaningful text summary may omit this.
     * the expression parameter is provided for convenience but engines may use internal
     * state (e.g. UI view-model) to produce richer label text.
     */
    summarizeExpression?: SummarizeFilterExpressionFn<TFilterOps>;
    /** returns true if the given column can be filtered by this engine */
    isColumnFilterable(args: {
        readonly columnKey: string;
    }): boolean;
    /**
     * returns the current set of active filter indicators, one per filtered column.
     * called after update() so the DataTable can reflect filter state in its chrome.
     */
    getActiveFilterIndicators(): readonly ActiveFilterIndicator<TFilterOps>[];
    /**
     * called by the DataTable to synchronize open filter dialogs after a render.
     * optional: engines that do not use Raptor dialogs can omit this.
     */
    syncDialogs?(): void;
    /**
     * optional: return this engine's extension for the DataTable's vm.extensions map.
     * engines that need to wire up their own UI through the host view model system
     * (e.g. Raptor dialog handlers) return their extension state here.
     */
    getViewModelExtension?(): object;
    /** tear down any UI or subscriptions owned by this engine */
    destroy(): void;
}

/**
 * A single filter condition involving one field against one operator.
 * Depending on the operator, there may be one or more values.
 */
export interface FilterCondition<TFilterOps extends string = string> {
    readonly field: string;
    readonly operator: TFilterOps;
    readonly values: Readonly<Record<string, unknown>>;
}

/**
 * A composite filter condition involving one or more filter conditions and a single logical operator.
 */
export interface CompositeFilterCondition<TFilterOps extends string = string> {
    readonly logic: "and" | "or";
    readonly filters: readonly FilterExpression<TFilterOps>[];
}

/**
 * A filter expression is either a single filter condition or a composite filter condition, which may contain recursive filter expressions.
 */
export type FilterExpression<TFilterOps extends string = string> = FilterCondition<TFilterOps> | CompositeFilterCondition<TFilterOps>;

/**
 * Minimal description of a column as seen by a filter engine.
 */
export interface FilterEngineColumnDescriptor {
    readonly key: string;
    readonly header: string;
    readonly field: string | undefined;
    readonly filterable: boolean;
    readonly filterType: string | undefined;
}

/**
 * Context provided to a filter engine on initialization.
 */
export interface FilterEngineContext<TFilterOps extends string = string> {
    readonly store: DataTableStore;
    readonly columns: readonly FilterEngineColumnDescriptor[];
    readonly activeFilters: ReadonlyMap<string, FilterExpression<TFilterOps>>;
    /** apply or clear a single column's filter */
    readonly applyFilter: (key: string, filter: FilterExpression<TFilterOps> | null) => void;
    readonly clearAllFilters: () => void;
    readonly schema: Schema;
    /**
     * the filter operator keys that the underlying data engine supports.
     * engines should use this to limit which operators they offer in their UI.
     */
    readonly supportedFilterOps: readonly TFilterOps[];
    /**
     * if provided, returns the distinct values for the given field name.
     * engines can use this to populate checkbox/dropdown filter options.
     */
    readonly getDistinctValues?: (field: string) => Promise<readonly unknown[]>;
}

/**
 * Describes one active filter for a column, as raw state.
 * Indicator engines are responsible for deriving any display text from the expression.
 */
export interface ActiveFilterIndicator<TFilterOps extends string = string> {
    readonly columnKey: string;
    readonly columnHeader: string;
    /** the raw committed filter expression for this column */
    readonly expression: FilterExpression<TFilterOps>;
    /**
     * when true, this filter was set by an external component (e.g. a dashboard panel via IDataStore)
     * and cannot be cleared from within the grid.
     */
    readonly isExternal?: boolean;
}
```

## RowHeightEstimate

```ts
/**
 * A pure function that estimates the height of unmeasured rows given the
 * engine's current state. Used by variable-height engines to size
 * the scroll container and compute row offsets for rows not yet in the DOM.i
 */
export type RowHeightEstimate = (context: RowHeightEstimateContext) => Pixels;

/**
 * Context passed to an RowHeightEstimate when estimating the height
 * of rows that have not yet been measured by the DOM.
 */
export interface RowHeightEstimateContext {
    readonly measuredHeights: ReadonlyMap<number, Pixels>;
    readonly measuredHeightSum: Pixels;
    readonly totalRows: number | undefined;
    readonly loadedRows: number;
}
```

## RowScrollEngine

```ts
/**
 * Controls how the view engine handles row scrolling.
 */
export interface RowScrollEngine {
    /**
     * Returns the height of a single row in pixels.
     * For fixed-height engines, this is a constant, same for all rows.
     * For variable-height engines, this returns the known or estimated height for the given row index.
     */
    readonly getRowHeight: (args: {
        readonly globalRowIndex: number;
    }) => Pixels;
    /**
     * Returns the pixel offset of the top of a row from the top of the scroll container.
     */
    readonly computeRowOffset: (args: {
        readonly globalRowIndex: number;
    }) => Pixels;
    /**
     * Returns the capped-coordinate scrollTop that brings the given row to the top of the viewport.
     * Used for programmatic scroll-into-view. When no coordinate scaling is active this equals computeRowOffset.
     */
    readonly getRowScrollTopPosition: (args: {
        readonly globalRowIndex: number;
        readonly totalRows: number | undefined;
        readonly loadedRows: number;
    }) => Pixels;
    /**
     * Computes the total scrollable container height.
     */
    readonly computeContainerHeight: (args: {
        readonly totalRows: number | undefined;
        readonly loadedRows: number;
    }) => Pixels;
    /**
     * Returns the range of global row indices currently visible in the viewport.
     */
    readonly computeVisibleRange: (args: {
        readonly scrollTop: Pixels;
        readonly clientHeight: Pixels;
        readonly totalRows: number | undefined;
        readonly loadedRows: number;
    }) => {
        readonly firstRow: GlobalRowIndex;
        readonly lastRow: GlobalRowIndex;
    };
    /**
     * Keeps the zoned scroll coordinate mapping in sync with where the user has actually scrolled to.
     */
    readonly reconcileScroll: (args: {
        readonly scrollTop: Pixels;
        readonly clientHeight: Pixels;
        readonly totalRows: number | undefined;
        readonly loadedRows: number;
        readonly preferContinuous?: boolean;
    }) => ReconcileScrollResult;
    /**
     * Reports whether large-dataset coordinate remapping is currently active and, if so, where
     * the viewport sits within it.
     */
    readonly getZoneInfo: (args: {
        readonly totalRows: number | undefined;
        readonly loadedRows: number;
        readonly viewportHeight: Pixels;
    }) => ZoneInfo;
    /**
     * Returns whether additional rows should be loaded based on the current scroll position.
     */
    readonly shouldLoadMoreBasedOnScrollPosition: (args: {
        readonly scrollTop: Pixels;
        readonly clientHeight: Pixels;
        readonly loadedRows: number;
        readonly totalRows: number | undefined;
        readonly isLoading: boolean;
    }) => boolean;
    /**
     * Builds the scroll state for the status bar and scroll tracking.
     */
    readonly computeScrollState: (args: {
        readonly totalRows: number | undefined;
        readonly loadedRows: number;
        readonly firstVisibleRow: GlobalRowIndex;
        readonly lastVisibleRow: GlobalRowIndex;
    }) => ScrollState;
    /**
     * Whether all rows share the same fixed height. When true, the view engine skips per-row
     * DOM measurement and uses simple offset math.
     */
    readonly isFixedHeight: boolean;
    /**
     * Whether this engine requires the data engine to provide a known total row count.
     */
    readonly requiresKnownRowCount: boolean;
    /**
     * Reports an actual measured DOM height for a row after it has been rendered.
     * Only present on variable-height engines (isFixedHeight: false).
     */
    readonly setMeasuredRowHeight?: (args: {
        readonly globalRowIndex: number;
        readonly measuredHeight: Pixels;
    }) => boolean;
    /**
     * Clears all stored row height measurements.
     * Only present on variable-height engines (isFixedHeight: false).
     */
    readonly clearMeasuredHeights?: () => void;
}

export interface ScrollState {
    readonly loadedRows: number;
    readonly totalRows: number;
    readonly hasMore: boolean;
    readonly statusText: string;
}

/**
 * A pure function that estimates the height of unmeasured rows given the
 * engine's current state. Used by variable-height engines to size
 * the scroll container and compute row offsets for rows not yet in the DOM.i
 */
export type RowHeightEstimate = (context: RowHeightEstimateContext) => Pixels;

/**
 * Context passed to an RowHeightEstimate when estimating the height
 * of rows that have not yet been measured by the DOM.
 */
export interface RowHeightEstimateContext {
    readonly measuredHeights: ReadonlyMap<number, Pixels>;
    readonly measuredHeightSum: Pixels;
    readonly totalRows: number | undefined;
    readonly loadedRows: number;
}
```

## RowHeightHeuristic

```ts
/**
 * Context provided to a RowHeightHeuristic when determining the height of a row.
 */
export interface RowHeightHeuristicContext {
    /**
     * The global row index of the row being measured.
     */
    readonly globalRowIndex: number;
    /**
     * The raw row data object.
     * @todo type this
     */
    readonly row: unknown;
    /**
     * Projection of all non-hidden columns.
     */
    readonly activeColumns: readonly {
        readonly key: string;
        readonly field?: string;
        readonly contentHeight?: string;
        readonly textWrap?: boolean;
    }[];
    /**
     * Total number of non-hidden columns.
     */
    readonly activeColumnCount: number;
    /**
     * Index of the first column currently visible in the horizontal viewport.
     */
    readonly viewportColumnStart: number;
    /**
     * End index (exclusive) of the columns currently visible in the horizontal viewport.
     */
    readonly viewportColumnEnd: number;
    /**
     * The height assigned to this row the last time it was measured, or undefined if it
     * has never been measured.
     */
    readonly previousRowHeight: Pixels | undefined;
    /**
     * Returns the natural content height of the column slot at the given index into activeColumns.
     * Only slots that are currently in the DOM (within the viewport slot window) can be measured;
     * slots outside the window return 0 since they don't exist in the DOM.
     */
    readonly measureColumnHeightByIndex: (activeColumnIndex: number) => Pixels;
    /**
     * Returns the natural content height of the column slot with the given column key.
     * Equivalent to measureColumnHeightByIndex but looks up by key instead of position.
     * Returns 0 if the column is not currently in the DOM slot window.
     */
    readonly measureColumnHeightByKey: (columnKey: string) => Pixels;
    /**
     * Returns the resolved pixel width of the column at the given active column index.
     * This is the effective width after applying column definitions, view state overrides,
     * and defaults. Available for all columns, not just those currently in the DOM.
     */
    readonly resolveColumnWidthByIndex: (activeColumnIndex: number) => Pixels;
    /**
     * Previously DOM-measured heights for this row's columns, keyed by column key.
     * Populated incrementally as columns are measured while they are in the DOM slot window.
     * Persists across horizontal scroll so that off-screen heuristics can use exact values
     * for columns that have already been seen, instead of estimating.
     */
    readonly cachedColumnHeights: ReadonlyMap<string, Pixels>;
}

/**
 * Strategy for determining the height of a rendered row when using a
 * variable-height row scroll engine (e.g. infiniteScroll).
 *
 * Called after cell content has been rendered but before the height is applied to the
 * DOM and reported to the scroll engine. The return value is used as the row's content
 * height. Since cells are positioned absolutely, the row needs to be told how tall it should be.
 *
 * Defaults to rowHeightHeuristics.linearScan().
 */
export type RowHeightHeuristic = (context: RowHeightHeuristicContext) => Pixels;

/**
 * Context provided to an OffscreenColumnHeightHeuristic for a single off-screen column.
 */
export interface OffscreenColumnHeightHeuristicContext {
    readonly key: string;
    readonly row: unknown;
    readonly columnWidth: Pixels;
    /**
     * Previously DOM-measured heights for this row's columns, keyed by column key.
     */
    readonly cachedColumnHeights: ReadonlyMap<string, Pixels>;
    /**
     * Projection of all non-hidden columns in active-column order.
     */
    readonly activeColumns: readonly {
        readonly key: string;
        readonly textWrap?: boolean;
    }[];
}

/**
 * Fallback height strategy for columns that are currently scrolled out of the horizontal
 * viewport and therefore have no DOM slot to measure. Receives the column key, raw row
 * data, and the column's resolved pixel width so the caller can estimate height from
 * cell content and column dimensions without needing to duplicate column configuration.
 */
export type OffscreenColumnHeightHeuristic = (context: OffscreenColumnHeightHeuristicContext) => Pixels;
```

## OffscreenColumnHeightHeuristicContext

```ts
/**
 * Context provided to an OffscreenColumnHeightHeuristic for a single off-screen column.
 */
export interface OffscreenColumnHeightHeuristicContext {
    readonly key: string;
    readonly row: unknown;
    readonly columnWidth: Pixels;
    /**
     * Previously DOM-measured heights for this row's columns, keyed by column key.
     */
    readonly cachedColumnHeights: ReadonlyMap<string, Pixels>;
    /**
     * Projection of all non-hidden columns in active-column order.
     */
    readonly activeColumns: readonly {
        readonly key: string;
        readonly textWrap?: boolean;
    }[];
}

/**
 * Fallback height strategy for columns that are currently scrolled out of the horizontal
 * viewport and therefore have no DOM slot to measure. Receives the column key, raw row
 * data, and the column's resolved pixel width so the caller can estimate height from
 * cell content and column dimensions without needing to duplicate column configuration.
 */
export type OffscreenColumnHeightHeuristic = (context: OffscreenColumnHeightHeuristicContext) => Pixels;
```

## ColumnRecycleOperation

```ts
export interface ColumnRecycleOperation {
    readonly columnSlotIndex: ColumnSlotIndex;
    readonly activeColumnIndex: number;
}
```

## ColumnSlotEngine

```ts
export interface ColumnSlotEngine {
    /**
     * Compute how many column slots to allocate given the total number of active (non-hidden) columns.
     */
    readonly computeSlotCount: (args: {
        activeColumnCount: number;
    }) => number;
    /**
     * Given the current viewport and slot assignments, compute which slots should be
     * reassigned to different active column indices. Returns an empty array when no
     * recycling should occur.
     */
    readonly computeRecycleOperations: (args: {
        readonly viewportStart: number;
        readonly viewportEnd: number;
        readonly activeColumnCount: number;
        readonly slotCount: number;
        readonly columnIndexBySlotIndex: ReadonlyMap<number, number>;
        readonly slotIndexByColumnIndex: ReadonlyMap<number, number>;
    }) => readonly ColumnRecycleOperation[];
}

export interface ColumnRecycleOperation {
    readonly columnSlotIndex: ColumnSlotIndex;
    readonly activeColumnIndex: number;
}
```

## RecycleOperation

```ts
/**
 * A single recycling instruction to reassign a row slot to a different global row.
 */
export interface RecycleOperation {
    /** the row slot (DOM element index) being reassigned */
    readonly rowSlotIndex: RowSlotIndex;
    /** the global row index this slot should now display */
    readonly globalRowIndex: GlobalRowIndex;
}
```

## RowSlotEngine

```ts
/**
 * Controls how the view engine manages row DOM slots.
 */
export interface RowSlotEngine {
    /**
     * Compute how many row slots to allocate given the total number of data rows.
     */
    readonly computeSlotCount: (args: {
        readonly totalRows: number;
    }) => number;
    /**
     * Given the current viewport and slot assignments, compute which slots should be
     * reassigned to different global row indices. (Returns an empty array when no
     * recycling should occur)
     */
    readonly computeRecycleOperations: (args: {
        readonly firstVisibleGlobalRow: number;
        readonly lastVisibleGlobalRow: number;
        readonly effectiveTotalRows: number;
        readonly activeRowSlotCount: number;
        readonly recycleBuffer: number;
        readonly globalRowIndexBySlotIndex: ReadonlyMap<RowSlotIndex, GlobalRowIndex>;
        readonly slotIndexByGlobalRowIndex: ReadonlyMap<GlobalRowIndex, RowSlotIndex>;
    }) => readonly RecycleOperation[];
    /**
     * Whether this engine recycles row slots as visibility changes.
     */
    readonly recyclesSlots: boolean;
}

/**
 * A single recycling instruction to reassign a row slot to a different global row.
 */
export interface RecycleOperation {
    /** the row slot (DOM element index) being reassigned */
    readonly rowSlotIndex: RowSlotIndex;
    /** the global row index this slot should now display */
    readonly globalRowIndex: GlobalRowIndex;
}
```

## CellContextMenuEngine

```ts
/**
 * Column info available to context menu contributors.
 */
export type ContextMenuColumnInfo = Column<UnknownObject> & {
    readonly editConfig?: BoundColumnEditConfig;
};

/** Context passed to cell context menu contributors. */
export interface CellContextMenuContext {
    readonly rowIndex: GlobalRowIndex | undefined;
    readonly displayText: string;
    readonly column: ContextMenuColumnInfo;
    readonly onAction: OnAction;
}

/** Contributes items to a cell right-click context menu. */
export type CellContextMenuContributor = (ctx: CellContextMenuContext) => readonly Renderer.IMenuItem[];

/** Reorders all context menu items before rendering. */
export type ContextMenuItemsArranger = (items: readonly Renderer.IMenuItem[]) => readonly Renderer.IMenuItem[];

/** Manages cell right-click context menu contributors. */
export interface CellContextMenuEngine {
    addContributor(c: CellContextMenuContributor): {
        dispose(): void;
    };
    show(args: {
        readonly ev: MouseEvent;
        readonly ctx: CellContextMenuContext;
        readonly raptorDom: RaptorDom;
        readonly tracker: ContextMenuTracker;
        readonly arrange?: ContextMenuItemsArranger;
    }): void;
}
```

## HeaderContextMenuEngine

```ts
export interface HeaderContextMenuContext {
    readonly column: ContextMenuColumnInfo;
    readonly onAction: OnAction;
}

/** Contributes items to a header right-click context menu. */
export type HeaderContextMenuContributor = (ctx: HeaderContextMenuContext) => readonly Renderer.IMenuItem[];

/** Manages header right-click context menu contributors. */
export interface HeaderContextMenuEngine {
    addContributor(c: HeaderContextMenuContributor): {
        dispose(): void;
    };
    show(args: {
        readonly ev: MouseEvent;
        readonly ctx: HeaderContextMenuContext;
        readonly raptorDom: RaptorDom;
        readonly tracker: ContextMenuTracker;
        readonly arrange?: ContextMenuItemsArranger;
    }): void;
}

/**
 * Column info available to context menu contributors.
 */
export type ContextMenuColumnInfo = Column<UnknownObject> & {
    readonly editConfig?: BoundColumnEditConfig;
};

/** Reorders all context menu items before rendering. */
export type ContextMenuItemsArranger = (items: readonly Renderer.IMenuItem[]) => readonly Renderer.IMenuItem[];
```

## HeaderContextMenuContext

```ts
export interface HeaderContextMenuContext {
    readonly column: ContextMenuColumnInfo;
    readonly onAction: OnAction;
}

/**
 * Column info available to context menu contributors.
 */
export type ContextMenuColumnInfo = Column<UnknownObject> & {
    readonly editConfig?: BoundColumnEditConfig;
};
```

## CellContextMenuContext

```ts
/** Context passed to cell context menu contributors. */
export interface CellContextMenuContext {
    readonly rowIndex: GlobalRowIndex | undefined;
    readonly displayText: string;
    readonly column: ContextMenuColumnInfo;
    readonly onAction: OnAction;
}

/**
 * Column info available to context menu contributors.
 */
export type ContextMenuColumnInfo = Column<UnknownObject> & {
    readonly editConfig?: BoundColumnEditConfig;
};
```

## ContextMenuItemsArranger

```ts
/** Reorders all context menu items before rendering. */
export type ContextMenuItemsArranger = (items: readonly Renderer.IMenuItem[]) => readonly Renderer.IMenuItem[];
```

## ContextMenuColumnInfo

```ts
/**
 * Column info available to context menu contributors.
 */
export type ContextMenuColumnInfo = Column<UnknownObject> & {
    readonly editConfig?: BoundColumnEditConfig;
};
```

## HeaderContextMenuContributor

```ts
/** Contributes items to a header right-click context menu. */
export type HeaderContextMenuContributor = (ctx: HeaderContextMenuContext) => readonly Renderer.IMenuItem[];
```

## CellContextMenuContributor

```ts
/** Contributes items to a cell right-click context menu. */
export type CellContextMenuContributor = (ctx: CellContextMenuContext) => readonly Renderer.IMenuItem[];
```

## SelectionState

```ts
export interface SelectionCoordinates {
    readonly row: GlobalRowIndex;
    readonly column: ActiveColumnIndex;
}

/**
 * Active selection state
 */
export interface SelectionState {
    readonly coordinates: SelectionCoordinates;
    readonly selectionMode: "row" | "cell";
}
```

## OverlaySelectionConfig

```ts
export type OverlaySelectionConfig = {
    readonly type: "cell";
    readonly theme?: DataTableThemeStyling;
} | {
    readonly type: "row";
    readonly theme?: DataTableThemeStyling;
} | {
    readonly type: "cell-or-row";
    readonly cellTheme?: DataTableThemeStyling;
    readonly rowTheme?: DataTableThemeStyling;
};
```

## SelectionEngine

```ts
export interface SelectionEngine {
    readonly resolveClickSelection: (args: {
        readonly clickedCoordinates: SelectionCoordinates;
        readonly currentState: SelectionState | null;
    }) => SelectionState;
    readonly resolveDblClickSelection?: (args: {
        readonly clickedCoordinates: SelectionCoordinates;
    }) => SelectionState | null;
    readonly resolveKeyNavigation: (args: {
        readonly current: SelectionState;
        readonly key: string;
        readonly totalRowCount: number;
        readonly activeColumnCount: number;
    }) => SelectionState | null;
    /** returns overlay descriptors to render */
    readonly computeOverlayDescriptors: (args: {
        readonly cell: ElementGeometry;
        readonly row: ElementGeometry;
        readonly selectionMode: "row" | "cell";
    }) => readonly SelectionOverlayDescriptor[];
}

export interface SelectionCoordinates {
    readonly row: GlobalRowIndex;
    readonly column: ActiveColumnIndex;
}

/**
 * Active selection state
 */
export interface SelectionState {
    readonly coordinates: SelectionCoordinates;
    readonly selectionMode: "row" | "cell";
}

export interface ElementGeometry {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
}

export type SelectionOverlayDescriptor = ElementGeometry & {
    readonly className: string;
    readonly theme?: DataTableThemeStyling;
};
```

## OverlayRenderContext

```ts
/**
 * Context passed to templateOverlayEngine's contentTemplates callback.
 */
export interface OverlayRenderContext<TViewModel = unknown, TScope extends Record<string, ViewDefinitionBinding> = Record<never, never>> {
    readonly s: IRootScriptor<TViewModel>;
    readonly bindingPaths: {
        readonly scope: {
            readonly [K in keyof TScope]: string;
        };
    };
}
```

## OverlaySlotDescriptor

```ts
/**
 * Whether the overlay covers the full table or only the scroll body.
 */
export type OverlayCoverage = "full" | "body";

/**
 * All static data that fully describes one overlay slot, at either authoring surface.
 */
export interface OverlaySlotDescriptor<T extends ForScriptor = ForScriptorTrue> {
    readonly type: string;
    readonly cssClass: string;
    /** fallback text shown when no engine is provided; only needed for built-in slots */
    readonly defaultText?: string;
    /** fallback coverage used when no engine is provided; only needed for built-in slots */
    readonly defaultCoverage?: OverlayCoverage;
    /** optional test id emitted on the container element when testIds mode is enabled */
    readonly testId?: string;
    /**
     * Whether this slot is visible
     */
    readonly computeVisibility?: AuthorableVRB<T, boolean, OverlayVisibilityState>;
    readonly containerBaseTheme?: DataTableThemeStyling;
}
```

## ConfiguratorEngineInitContext

```ts
export interface ConfiguratorEngineInitContext {
    readonly store: DataTableStore;
    readonly raptorDom: RaptorDom | undefined;
    readonly hostViewModel: object | undefined;
    readonly dataEngine?: DataEngine<UnknownObject>;
    readonly getColumns: () => readonly Pick<ColumnBase, "key" | "hide">[];
}
```

## ConfiguratorEngineClickContext

```ts
export interface ConfiguratorEngineClickContext {
    readonly anchorElement: HTMLElement;
    readonly clickEvent: MouseEvent;
}
```

## ConfiguratorEngine

```ts
/**
 * Contract for a configurator engine.
 */
export interface ConfiguratorEngine {
    /** called once when the ViewEngine sets up, before the first render */
    readonly initialize: (context: ConfiguratorEngineInitContext) => void;
    /** called each time the configurator button is clicked */
    readonly handleConfiguratorClick: (context: ConfiguratorEngineClickContext) => void;
    readonly destroy?: () => void;
}

export interface ConfiguratorEngineInitContext {
    readonly store: DataTableStore;
    readonly raptorDom: RaptorDom | undefined;
    readonly hostViewModel: object | undefined;
    readonly dataEngine?: DataEngine<UnknownObject>;
    readonly getColumns: () => readonly Pick<ColumnBase, "key" | "hide">[];
}

export interface ConfiguratorEngineClickContext {
    readonly anchorElement: HTMLElement;
    readonly clickEvent: MouseEvent;
}
```

## ViewportBounds

```ts
/**
 * A geographic bounding box - the platform's own, so a map's getVisibleBB() is already one.
 * Vocabulary of the geometry-based integrations, not of the seam.
 */
export type ViewportBounds = ml.geo.ILatLngBB;
```

## TableIntegrationContext

```ts
/**
 * Context provided to an integration when it starts.
 */
export interface TableIntegrationContext {
    /** the table's store */
    readonly store: DataTableStore;
    /** the table's data engine */
    readonly dataEngine: DataEngine<UnknownObject>;
    /** this integration's resolved key */
    readonly key: string;
}
```

## TableIntegration

```ts
/**
 * Contract for a table integration.
 */
export interface TableIntegration {
    /** default key for entries that don't declare one; built-ins set it to their strategy name */
    readonly integrationKey?: string;
    /**
     * Begins syncing; applying the current state immediately (or once ready, for async integrations),
     * then keeping up with it. Returns a cleanup function, which is where an integration undoes
     * whatever it applied. Throws on fatal errors.
     */
    start(context: TableIntegrationContext): (() => void) | Promise<() => void>;
}

/**
 * Context provided to an integration when it starts.
 */
export interface TableIntegrationContext {
    /** the table's store */
    readonly store: DataTableStore;
    /** the table's data engine */
    readonly dataEngine: DataEngine<UnknownObject>;
    /** this integration's resolved key */
    readonly key: string;
}
```

## ContextMenuConfiguratorOptions

```ts
export interface ContextMenuConfiguratorOptions {
    readonly extraItems?: (context: ConfiguratorEngineInitContext) => Renderer.IMenuItem[];
    readonly configureColumns?: boolean;
}

export interface ConfiguratorEngineInitContext {
    readonly store: DataTableStore;
    readonly raptorDom: RaptorDom | undefined;
    readonly hostViewModel: object | undefined;
    readonly dataEngine?: DataEngine<UnknownObject>;
    readonly getColumns: () => readonly Pick<ColumnBase, "key" | "hide">[];
}
```

## DataTableThemeStyling

```ts
export type DataTableThemeStyling = ViewDefinitions.IViewDefinition;
```

## GetRowThemeStylingContext

```ts
export interface GetRowThemeStylingContext<TRow> {
    readonly row: TRow;
    readonly globalRowIndex: GlobalRowIndex;
}
```

## GetColumnThemeStylingContext

```ts
export interface GetColumnThemeStylingContext<TRow extends object = object> {
    readonly columnKey: string;
    readonly column?: Column<TRow, ForScriptor>;
}
```

## GetCellThemeStylingContext

```ts
/** context passed to each `getCellThemeStyling` callback */
export interface GetCellThemeStylingContext<TRow extends object> {
    readonly row: TRow;
    readonly globalRowIndex: GlobalRowIndex;
    readonly column: Column<TRow, ForScriptor>;
}
```

## GetHeaderThemeStylingContext

```ts
/** context passed to each `getHeaderThemeStyling` callback */
export interface GetHeaderThemeStylingContext<TRow extends object> {
    readonly column: Column<TRow, ForScriptor>;
}
```

## DeclarativeRule

```ts
/**
 * A fully declarative alternative to a binding for something that needs a simple "evaluate -> apply" operation.
 * - `where` is evaluated directly against a subject
 * - `applyValue` is used when the `where` matches
 */
export interface DeclarativeRule<T> {
    readonly where: WhereCondition;
    readonly applyValue: T;
}

export type WhereCondition<TFilterOps extends string = string> = WhereConditionLeaf<TFilterOps> | CompositeWhereCondition<TFilterOps>;

/**
 * A single declarative condition
 */
export interface WhereConditionLeaf<TFilterOps extends string = string> {
    readonly field: string;
    readonly test: TFilterOps;
    readonly value?: unknown;
}

/** AND/OR composition */
export interface CompositeWhereCondition<TFilterOps extends string = string> {
    readonly logic: "and" | "or";
    readonly filters: readonly WhereCondition<TFilterOps>[];
}
```

## CellThemeEntry

```ts
/**
 * One per-cell theming rule. Multiple entries coexist and their additions stack in declaration order.
 */
export type CellThemeEntry<T extends ForScriptor = ForScriptorFalse, TRow extends object = object> = {
    readonly callback?: ViewDefinitionBindingProp<T, GetCellThemeStyling<TRow>>;
    /** @deprecated use `callback` instead */
    readonly getCellThemeStyling?: ViewDefinitionBindingProp<T, GetCellThemeStyling<TRow>>;
    readonly rule?: undefined;
    readonly matchColumns?: CellThemeColumnsSelector;
    /** @deprecated use matchColumns */
    readonly rules?: CellThemeColumnsSelector;
} | {
    readonly callback?: undefined;
    readonly getCellThemeStyling?: undefined;
    readonly rule: DeclarativeRule<DataTableThemeStyling>;
    readonly matchColumns?: CellThemeColumnsSelector;
    /** @deprecated use matchColumns */
    readonly rules?: CellThemeColumnsSelector;
};

/** Selector type used to target specific columns in cell/header theme rules */
export type CellThemeColumnsSelector = ViewMatcher;

/**
 * Matchers usable in View rules (serializable)
 */
export type ViewMatcher = ExactMatcher | RegexMatcher;

/**
 * A fully declarative alternative to a binding for something that needs a simple "evaluate -> apply" operation.
 * - `where` is evaluated directly against a subject
 * - `applyValue` is used when the `where` matches
 */
export interface DeclarativeRule<T> {
    readonly where: WhereCondition;
    readonly applyValue: T;
}
```

## HeaderThemeEntry

```ts
/**
 * One registered per-header-cell theming rule. `target` selects "headerCell" (the outer
 * element) or "headerContent" (the inner label wrapper).
 */
export type HeaderThemeEntry<T extends ForScriptor = ForScriptorFalse, TRow extends object = object> = {
    readonly callback?: ViewDefinitionBindingProp<T, GetHeaderThemeStyling<TRow>>;
    /** @deprecated use `callback` instead */
    readonly getHeaderThemeStyling?: ViewDefinitionBindingProp<T, GetHeaderThemeStyling<TRow>>;
    readonly rule?: undefined;
    readonly target?: ColumnHeaderStylingTarget;
    /** @deprecated scope to columns via context.column in the callback, or rule.where, instead */
    readonly rules?: ViewMatcher;
} | {
    readonly callback?: undefined;
    readonly getHeaderThemeStyling?: undefined;
    readonly rule: DeclarativeRule<DataTableThemeStyling>;
    readonly target?: ColumnHeaderStylingTarget;
    /** @deprecated scope to columns via context.column in the callback, or rule.where, instead */
    readonly rules?: ViewMatcher;
};

export type ColumnHeaderStylingTarget = (typeof columnHeaderStylingTargets)[number];

/**
 * Matchers usable in View rules (serializable)
 */
export type ViewMatcher = ExactMatcher | RegexMatcher;

/**
 * A fully declarative alternative to a binding for something that needs a simple "evaluate -> apply" operation.
 * - `where` is evaluated directly against a subject
 * - `applyValue` is used when the `where` matches
 */
export interface DeclarativeRule<T> {
    readonly where: WhereCondition;
    readonly applyValue: T;
}
```

## RowThemeEntry

```ts
/**
 * One row-theme styling source: exactly one of `callback` or `rule`.
 */
export type RowThemeEntry<T extends ForScriptor = ForScriptorFalse, TRow extends object = object> = {
    readonly callback?: ViewDefinitionBindingProp<T, GetRowThemeStyling<TRow>>;
    readonly rule?: undefined;
} | {
    readonly callback?: undefined;
    readonly rule: DeclarativeRule<DataTableThemeStyling>;
};

/**
 * A fully declarative alternative to a binding for something that needs a simple "evaluate -> apply" operation.
 * - `where` is evaluated directly against a subject
 * - `applyValue` is used when the `where` matches
 */
export interface DeclarativeRule<T> {
    readonly where: WhereCondition;
    readonly applyValue: T;
}
```

## ColumnThemeEntry

```ts
/** One column-theme styling source, applied to the column-slot element. Exactly one of `callback` or `rule`. */
export type ColumnThemeEntry<T extends ForScriptor = ForScriptorFalse, TRow extends object = object> = {
    readonly callback?: ViewDefinitionBindingProp<T, GetColumnThemeStyling<TRow>>;
    readonly rule?: undefined;
} | {
    readonly callback?: undefined;
    readonly rule: DeclarativeRule<DataTableThemeStyling>;
};

/**
 * A fully declarative alternative to a binding for something that needs a simple "evaluate -> apply" operation.
 * - `where` is evaluated directly against a subject
 * - `applyValue` is used when the `where` matches
 */
export interface DeclarativeRule<T> {
    readonly where: WhereCondition;
    readonly applyValue: T;
}
```

## BoundCellThemeEntry

```ts
/** the resolved form of {@link CellThemeEntry} */
export type BoundCellThemeEntry<TRow extends object = object> = CellThemeEntry<ForScriptorTrue, TRow>;

/** context passed to each `getCellThemeStyling` callback */
export interface GetCellThemeStylingContext<TRow extends object> {
    readonly row: TRow;
    readonly globalRowIndex: GlobalRowIndex;
    readonly column: Column<TRow, ForScriptor>;
}

export type DataTableThemeStyling = ViewDefinitions.IViewDefinition;

/**
 * Matchers usable in View rules (serializable)
 */
export type ViewMatcher = ExactMatcher | RegexMatcher;

/**
 * A fully declarative alternative to a binding for something that needs a simple "evaluate -> apply" operation.
 * - `where` is evaluated directly against a subject
 * - `applyValue` is used when the `where` matches
 */
export interface DeclarativeRule<T> {
    readonly where: WhereCondition;
    readonly applyValue: T;
}
```

## BoundHeaderThemeEntry

```ts
/** the resolved form of {@link HeaderThemeEntry} */
export type BoundHeaderThemeEntry<TRow extends object = object> = HeaderThemeEntry<ForScriptorTrue, TRow>;

export type ColumnHeaderStylingTarget = (typeof columnHeaderStylingTargets)[number];

/** context passed to each `getHeaderThemeStyling` callback */
export interface GetHeaderThemeStylingContext<TRow extends object> {
    readonly column: Column<TRow, ForScriptor>;
}

export type DataTableThemeStyling = ViewDefinitions.IViewDefinition;

/**
 * Matchers usable in View rules (serializable)
 */
export type ViewMatcher = ExactMatcher | RegexMatcher;

/**
 * A fully declarative alternative to a binding for something that needs a simple "evaluate -> apply" operation.
 * - `where` is evaluated directly against a subject
 * - `applyValue` is used when the `where` matches
 */
export interface DeclarativeRule<T> {
    readonly where: WhereCondition;
    readonly applyValue: T;
}
```

## BoundRowThemeEntry

```ts
/** the resolved form of {@link RowThemeEntry} */
export type BoundRowThemeEntry<TRow extends object = object> = RowThemeEntry<ForScriptorTrue, TRow>;

export interface GetRowThemeStylingContext<TRow> {
    readonly row: TRow;
    readonly globalRowIndex: GlobalRowIndex;
}

export type DataTableThemeStyling = ViewDefinitions.IViewDefinition;

/**
 * A fully declarative alternative to a binding for something that needs a simple "evaluate -> apply" operation.
 * - `where` is evaluated directly against a subject
 * - `applyValue` is used when the `where` matches
 */
export interface DeclarativeRule<T> {
    readonly where: WhereCondition;
    readonly applyValue: T;
}
```

## BoundColumnThemeEntry

```ts
/** the resolved form of {@link ColumnThemeEntry} */
export type BoundColumnThemeEntry<TRow extends object = object> = ColumnThemeEntry<ForScriptorTrue, TRow>;

export interface GetColumnThemeStylingContext<TRow extends object = object> {
    readonly columnKey: string;
    readonly column?: Column<TRow, ForScriptor>;
}

export type DataTableThemeStyling = ViewDefinitions.IViewDefinition;

/**
 * A fully declarative alternative to a binding for something that needs a simple "evaluate -> apply" operation.
 * - `where` is evaluated directly against a subject
 * - `applyValue` is used when the `where` matches
 */
export interface DeclarativeRule<T> {
    readonly where: WhereCondition;
    readonly applyValue: T;
}
```

## BoundDataTableTheme

```ts
/** the resolved form of {@link DataTableTheme}: every callback is a real function */
export type BoundDataTableTheme<TRow extends object = object> = DataTableTheme<ForScriptorTrue, TRow>;

export type DataTableThemeStyling = ViewDefinitions.IViewDefinition;

export interface GetRowThemeStylingContext<TRow> {
    readonly row: TRow;
    readonly globalRowIndex: GlobalRowIndex;
}

export interface GetColumnThemeStylingContext<TRow extends object = object> {
    readonly columnKey: string;
    readonly column?: Column<TRow, ForScriptor>;
}

/** the resolved form of {@link RowThemeEntry} */
export type BoundRowThemeEntry<TRow extends object = object> = RowThemeEntry<ForScriptorTrue, TRow>;

/** the resolved form of {@link ColumnThemeEntry} */
export type BoundColumnThemeEntry<TRow extends object = object> = ColumnThemeEntry<ForScriptorTrue, TRow>;

/** the resolved form of {@link CellThemeEntry} */
export type BoundCellThemeEntry<TRow extends object = object> = CellThemeEntry<ForScriptorTrue, TRow>;

/** the resolved form of {@link HeaderThemeEntry} */
export type BoundHeaderThemeEntry<TRow extends object = object> = HeaderThemeEntry<ForScriptorTrue, TRow>;
```

## DataTableTheme

```ts
/**
 * Theming and styles.
 */
export interface DataTableTheme<T extends ForScriptor = ForScriptorFalse, TRow extends object = object> {
    readonly container?: DataTableThemeStyling;
    readonly header?: DataTableThemeStyling;
    readonly headerRow?: DataTableThemeStyling;
    readonly headerCell?: DataTableThemeStyling;
    readonly scrollBody?: DataTableThemeStyling;
    readonly row?: DataTableThemeStyling;
    readonly columnSlot?: DataTableThemeStyling;
    readonly cell?: DataTableThemeStyling;
    readonly footer?: DataTableThemeStyling;
    readonly statusBar?: DataTableThemeStyling;
    readonly getRowThemeStyling?: ViewDefinitionBindingProp<T, GetRowThemeStyling<TRow>>;
    readonly getColumnThemeStyling?: ViewDefinitionBindingProp<T, GetColumnThemeStyling<TRow>>;
    readonly rowThemes?: readonly RowThemeEntry<T, TRow>[];
    readonly columnThemes?: readonly ColumnThemeEntry<T, TRow>[];
    readonly cellThemes?: readonly CellThemeEntry<T, TRow>[];
    readonly headerThemes?: readonly HeaderThemeEntry<T, TRow>[];
}

/**
 * One row-theme styling source: exactly one of `callback` or `rule`.
 */
export type RowThemeEntry<T extends ForScriptor = ForScriptorFalse, TRow extends object = object> = {
    readonly callback?: ViewDefinitionBindingProp<T, GetRowThemeStyling<TRow>>;
    readonly rule?: undefined;
} | {
    readonly callback?: undefined;
    readonly rule: DeclarativeRule<DataTableThemeStyling>;
};

/** One column-theme styling source, applied to the column-slot element. Exactly one of `callback` or `rule`. */
export type ColumnThemeEntry<T extends ForScriptor = ForScriptorFalse, TRow extends object = object> = {
    readonly callback?: ViewDefinitionBindingProp<T, GetColumnThemeStyling<TRow>>;
    readonly rule?: undefined;
} | {
    readonly callback?: undefined;
    readonly rule: DeclarativeRule<DataTableThemeStyling>;
};

/**
 * One per-cell theming rule. Multiple entries coexist and their additions stack in declaration order.
 */
export type CellThemeEntry<T extends ForScriptor = ForScriptorFalse, TRow extends object = object> = {
    readonly callback?: ViewDefinitionBindingProp<T, GetCellThemeStyling<TRow>>;
    /** @deprecated use `callback` instead */
    readonly getCellThemeStyling?: ViewDefinitionBindingProp<T, GetCellThemeStyling<TRow>>;
    readonly rule?: undefined;
    readonly matchColumns?: CellThemeColumnsSelector;
    /** @deprecated use matchColumns */
    readonly rules?: CellThemeColumnsSelector;
} | {
    readonly callback?: undefined;
    readonly getCellThemeStyling?: undefined;
    readonly rule: DeclarativeRule<DataTableThemeStyling>;
    readonly matchColumns?: CellThemeColumnsSelector;
    /** @deprecated use matchColumns */
    readonly rules?: CellThemeColumnsSelector;
};

/**
 * One registered per-header-cell theming rule. `target` selects "headerCell" (the outer
 * element) or "headerContent" (the inner label wrapper).
 */
export type HeaderThemeEntry<T extends ForScriptor = ForScriptorFalse, TRow extends object = object> = {
    readonly callback?: ViewDefinitionBindingProp<T, GetHeaderThemeStyling<TRow>>;
    /** @deprecated use `callback` instead */
    readonly getHeaderThemeStyling?: ViewDefinitionBindingProp<T, GetHeaderThemeStyling<TRow>>;
    readonly rule?: undefined;
    readonly target?: ColumnHeaderStylingTarget;
    /** @deprecated scope to columns via context.column in the callback, or rule.where, instead */
    readonly rules?: ViewMatcher;
} | {
    readonly callback?: undefined;
    readonly getHeaderThemeStyling?: undefined;
    readonly rule: DeclarativeRule<DataTableThemeStyling>;
    readonly target?: ColumnHeaderStylingTarget;
    /** @deprecated scope to columns via context.column in the callback, or rule.where, instead */
    readonly rules?: ViewMatcher;
};

export type DataTableThemeStyling = ViewDefinitions.IViewDefinition;
```

## DataTableStore

```ts
/**
 * Developer-facing command surface for a DataTable instance.
 * Decoupled from the binding options - holds the store and can grow
 * to expose state-reading methods over time.
 */
export interface DataTableStore<TRow extends UnknownObject> {
    readonly dispatch: (action: ActionBase) => void;
    readonly subscribe: <T extends ActionBase>(actionCreator: ActionCreator<(...args: any[]) => T>, handler: (action: T) => void) => () => void;
    readonly checkboxRowsSelectAll: () => void;
    readonly checkboxRowsUnselectAll: () => void;
    readonly hideEmptyColumns: () => void;
    readonly showEmptyColumns: () => void;
    readonly getCheckboxRowsSelectedIndices: () => readonly number[];
    readonly updateConfig: (partial: Readonly<Record<string, unknown>>) => void;
    readonly getRow: (rowIndex: number) => TRow | undefined;
    readonly getRowsFromDataEngine: (args: {
        readonly rowIndices: readonly number[];
        readonly checkCache?: boolean;
    }) => Promise<readonly (TRow | undefined)[]>;
    readonly getCellByCoordinates: (coordinates: SelectionCoordinates) => Cell<TRow> | undefined;
    readonly getCellByKey: (rowIndex: number, columnKey: string) => Cell<TRow> | undefined;
    readonly getState: () => ViewStateData | undefined;
    /** the exportable source behind the table, with its current filters applied; null when the data engine has none */
    readonly getExportSource: () => ml.data.IDataSource | null;
    readonly isIntegrationEnabled: (args: {
        readonly key: string;
    }) => boolean;
    readonly commitCurrentEdit: () => void;
    readonly rowSlotIndexToGlobalRowIndex: (rowSlotIndex: RowSlotIndex) => GlobalRowIndex | undefined;
    readonly rows: {
        readonly applyInsert: (args: {
            readonly atIndex: number;
            readonly row: TRow;
        }) => void;
        readonly applyUpdate: (args: {
            readonly rowIndex: number;
            readonly row: TRow;
            readonly fields: readonly (keyof TRow)[];
        }) => void;
        readonly applyRemove: (args: {
            readonly rowIndex: number;
        }) => void;
        readonly applyRemoveBulk: (args: {
            readonly rowIndices: readonly number[];
        }) => void;
    };
    readonly cells: {
        readonly update: (args: {
            readonly rowIndex: number;
            readonly key: string;
            readonly value: unknown;
        }) => void;
    };
    readonly mutations: RowMutationsFactory<TRow>;
}

export interface SelectionCoordinates {
    readonly row: GlobalRowIndex;
    readonly column: ActiveColumnIndex;
}
```

## ReapplyThemesKind

```ts
export type ReapplyThemesKind = "all" | "rows" | "cells" | "headers" | "columns";
```

## ReapplyThemesAction

```ts
export interface ReapplyThemesAction {
    readonly type: "reapplyThemes";
    readonly kind: ReapplyThemesKind;
    readonly columnKeys?: readonly string[];
    readonly globalRowIndexes?: readonly GlobalRowIndex[];
}

export type ReapplyThemesKind = "all" | "rows" | "cells" | "headers" | "columns";
```

## DataTableSavedState

```ts
/** Serialized state that can be persisted for a DataTable. */
export interface DataTableSavedState {
    readonly sort?: {
        readonly key: string;
        readonly field: string;
        readonly direction: "asc" | "desc";
    };
    readonly columnVisibility?: Record<string, boolean>;
    readonly columnOrder?: readonly string[];
    readonly columnHeaders?: Record<string, string>;
    readonly columnFormatters?: Record<string, SavedColumnFormat>;
    readonly columnDisplayUnits?: Record<string, string>;
    /** whether empty columns were hidden; the keys themselves are re-probed on restore rather than saved */
    readonly emptyColumnsMode?: EmptyColumnsMode;
    readonly columnWidths?: Record<string, string>;
    readonly filters?: Record<string, FilterExpression>;
    readonly metadata?: {
        readonly version: string;
        readonly savedAt: string;
    };
}
```

## IPersistenceEngine

```ts
/**
 * Interface for pluggable DataTable persistence backends.
 */
export interface IPersistenceEngine {
    load(): Outcome<DataTableSavedState | undefined, Error>;
    save(state: DataTableSavedState): Outcome<void, Error>;
    clear(): Outcome<void, Error>;
}

/** Serialized state that can be persisted for a DataTable. */
export interface DataTableSavedState {
    readonly sort?: {
        readonly key: string;
        readonly field: string;
        readonly direction: "asc" | "desc";
    };
    readonly columnVisibility?: Record<string, boolean>;
    readonly columnOrder?: readonly string[];
    readonly columnHeaders?: Record<string, string>;
    readonly columnFormatters?: Record<string, SavedColumnFormat>;
    readonly columnDisplayUnits?: Record<string, string>;
    /** whether empty columns were hidden; the keys themselves are re-probed on restore rather than saved */
    readonly emptyColumnsMode?: EmptyColumnsMode;
    readonly columnWidths?: Record<string, string>;
    readonly filters?: Record<string, FilterExpression>;
    readonly metadata?: {
        readonly version: string;
        readonly savedAt: string;
    };
}

export type Outcome<V, E> = Ok<V> | NotOk<E>;
```

## StatusBarArgs

```ts
export interface StatusBarArgs {
    readonly firstVisible: number;
    readonly lastVisible: number;
    readonly totalRows: number | undefined;
    readonly loadedRows: number;
}
```

## StatusBarRenderContext

```ts
export interface StatusBarRenderContext {
    readonly scriptor: IRootScriptor<DataTableScriptorVM>;
    readonly bindings: DataTableBindings;
}
```

## StatusBarEngine

```ts
export interface StatusBarEngine extends MountableEngine {
    readonly type?: typeof STATUS_BAR_ENGINE_TYPE;
    readonly formatStatusText?: (args: StatusBarArgs) => string;
    readonly contentTemplates?: (context: StatusBarRenderContext) => void;
}

export interface StatusBarArgs {
    readonly firstVisible: number;
    readonly lastVisible: number;
    readonly totalRows: number | undefined;
    readonly loadedRows: number;
}

export interface StatusBarRenderContext {
    readonly scriptor: IRootScriptor<DataTableScriptorVM>;
    readonly bindings: DataTableBindings;
}

/**
 * Lifecycle for an engine that fills its container imperatively rather than through the view
 * definition. Mounting re-runs on every view render, so an engine tears down what it wired last
 * time before wiring it again.
 */
export interface MountableEngine {
    readonly mount?: (context: EngineMountContext) => void;
    readonly unmount?: () => void;
    readonly dispose?: () => void;
}

/**
 * Context provided to an engine that renders its own markup into a container the view engine owns.
 */
export interface EngineMountContext {
    readonly containerEl: HTMLElement;
    readonly createScriptor: () => IRootScriptor<unknown>;
    readonly renderView: (element: HTMLElement, viewDefinition: unknown) => void;
    readonly store: DataTableStore;
    readonly dataEngine: unknown;
    readonly testIds: boolean;
}
```

## DataFreshness

```ts
/**
 * How current a data engine's rows are: the raw refresh state, which the footer turns into text.
 */
export interface DataFreshness {
    /** the source's name, used to say which source is updating */
    readonly sourceName?: string | null;
    /** how the source refreshes: on its own, on an interval, or only when asked */
    readonly mode?: "auto" | "throttle" | "manual";
    /** true when the source is updating rapidly enough to count as live */
    readonly isEphemeral?: boolean;
    /** epoch ms of the last refresh, or null when the source has never refreshed */
    readonly lastRefreshedAt: number | null;
    /** observed updates per minute, when the engine can reach the store tracking the source */
    readonly ratePerMin?: number | null;
    /** refresh interval the source is honoring, when it refreshes on a schedule */
    readonly intervalMs?: number | null;
    /** epoch ms of the next scheduled refresh */
    readonly nextRefreshAt?: number | null;
}
```

## FreshnessStatus

```ts
export interface FreshnessStatus {
    /** the single line shown in the footer */
    readonly inlineStatus: string;
    /** the fuller explanation, shown on hover */
    readonly tooltipBody: string;
}
```

## FreshnessTemplateContext

```ts
/**
 * Context for laying out the readout yourself. The pieces emit wherever the scriptor currently is,
 * so calling one inside a contentTemplates callback puts it in that container.
 */
export interface FreshnessTemplateContext {
    /** scriptor for the readout's contents */
    readonly s: IRootScriptor<unknown>;
    /** emits the element the status line is written into; the readout is blank without it */
    readonly statusText: () => void;
    /** emits the default clock icon */
    readonly icon: () => void;
}
```

## MountableEngine

```ts
/**
 * Lifecycle for an engine that fills its container imperatively rather than through the view
 * definition. Mounting re-runs on every view render, so an engine tears down what it wired last
 * time before wiring it again.
 */
export interface MountableEngine {
    readonly mount?: (context: EngineMountContext) => void;
    readonly unmount?: () => void;
    readonly dispose?: () => void;
}

/**
 * Context provided to an engine that renders its own markup into a container the view engine owns.
 */
export interface EngineMountContext {
    readonly containerEl: HTMLElement;
    readonly createScriptor: () => IRootScriptor<unknown>;
    readonly renderView: (element: HTMLElement, viewDefinition: unknown) => void;
    readonly store: DataTableStore;
    readonly dataEngine: unknown;
    readonly testIds: boolean;
}
```

## FooterContext

```ts
/**
 * Context passed to a footer content template.
 */
export interface FooterContext<TViewEngineViewModel = unknown, TScope extends Record<string, ViewDefinitionBinding> = Record<never, never>> {
    readonly s: IRootScriptor<TViewEngineViewModel>;
    readonly bindingPaths: {
        readonly scope: {
            readonly [K in keyof TScope]: string;
        };
    };
}
```

## FooterMountContext

```ts
/**
 * Context provided to an engine that renders its own markup into a container the view engine owns.
 */
export interface EngineMountContext {
    readonly containerEl: HTMLElement;
    readonly createScriptor: () => IRootScriptor<unknown>;
    readonly renderView: (element: HTMLElement, viewDefinition: unknown) => void;
    readonly store: DataTableStore;
    readonly dataEngine: unknown;
    readonly testIds: boolean;
}

/**
 * Context provided to a footer engine when it mounts.
 */
export type FooterMountContext = EngineMountContext;
```

## FooterEngine

```ts
/**
 * Contract for a footer engine: fills the footer content region that sits beside the status bar.
 */
export interface FooterEngine extends MountableEngine {
    readonly mount: (context: FooterMountContext) => void;
}

/**
 * Context provided to a footer engine when it mounts.
 */
export type FooterMountContext = EngineMountContext;

/**
 * Lifecycle for an engine that fills its container imperatively rather than through the view
 * definition. Mounting re-runs on every view render, so an engine tears down what it wired last
 * time before wiring it again.
 */
export interface MountableEngine {
    readonly mount?: (context: EngineMountContext) => void;
    readonly unmount?: () => void;
    readonly dispose?: () => void;
}

/**
 * Context provided to an engine that renders its own markup into a container the view engine owns.
 */
export interface EngineMountContext {
    readonly containerEl: HTMLElement;
    readonly createScriptor: () => IRootScriptor<unknown>;
    readonly renderView: (element: HTMLElement, viewDefinition: unknown) => void;
    readonly store: DataTableStore;
    readonly dataEngine: unknown;
    readonly testIds: boolean;
}
```
