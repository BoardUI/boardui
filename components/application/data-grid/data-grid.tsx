"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, CSSProperties, KeyboardEvent, ReactNode } from "react";
import { RiArrowDownLine, RiArrowGoBackLine, RiArrowGoForwardLine, RiArrowUpLine, RiCheckLine, RiDeleteBinLine, RiDownload2Line, RiFileCopyLine, RiFilter3Line, RiLayoutColumnLine, RiLayoutRowLine, RiSearchLine } from "@remixicon/react";
import { Focusable } from "react-aria-components";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { Button, buttonStyles } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown, DropdownGroup, DropdownItem, DropdownPopover, DropdownTrigger } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { SegmentedControl, SegmentedControlItem } from "@/components/base/segmented-control/segmented-control";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { useDirection } from "@/components/foundations/direction/direction";
import { cx } from "@/utils/cx";
import { applyGridEdits, columnLetter, parseGridClipboard, parseGridValue, serializeGridRows } from "./data-grid-utils";
import type { GridCell, GridEdit } from "./data-grid-utils";

export interface DataGridColumn<T> {
  key: Extract<keyof T, string>;
  header: string;
  /** Width in pixels. Columns can also be resized with the pointer or keyboard. */
  width?: number;
  type?: "text" | "number" | "select";
  options?: readonly string[];
  editable?: boolean;
  /** Adds an exact-value filter to the Filter menu. */
  filterable?: boolean;
  min?: number;
  max?: number;
  align?: "start" | "end";
  summary?: "sum" | "average" | "count";
  format?: (value: T[keyof T]) => ReactNode;
  formatSummary?: (value: number) => ReactNode;
  /** Return an error message to reject an edit or an entire paste transaction. */
  validate?: (value: string | number, row: T) => string | undefined;
}

export interface DataGridProps<T extends object> {
  "aria-label": string;
  data: readonly T[];
  columns: readonly DataGridColumn<T>[];
  /** Unique, stable identity; edits and selection survive sorting and filtering. */
  getRowId: (row: T) => string;
  /** Omit to make the grid read-only. The owner is responsible for persisting data. */
  onDataChange?: (data: T[]) => void;
  height?: number;
  className?: string;
  exportFileName?: string;
  emptyState?: ReactNode;
}

type Range = { anchor: GridCell; focus: GridCell };
type Bounds = { top: number; bottom: number; start: number; end: number };
type GridTransaction<T> = { type: "edit"; edits: GridEdit<T>[] } | { type: "delete"; rows: { row: T; index: number }[] };
const GUTTER = 48;
const OVERSCAN = 4;
const menuTrigger = cx(buttonStyles.base, buttonStyles.size.small, buttonStyles.iconOnlySize.small, buttonStyles.variant.secondary);
const compactMenuItem = "px-2 py-1.5 text-body-regular";
const neutralButton = "bg-transparent text-text-secondary hover:bg-background-secondary-hover active:bg-background-secondary-hover disabled:bg-transparent disabled:text-text-tertiary";

function GridMenuTrigger({ label, icon: Icon, count }: { label: string; icon: typeof RiSearchLine; count?: number }) {
  return <TooltipTrigger>
    <DropdownTrigger aria-label={label} className={cx(menuTrigger, "relative overflow-visible")}>
      <Icon className={buttonStyles.icon.small} aria-hidden />
      {!!count && <span aria-hidden className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-accent-100 text-caption-1-semibold text-accent-700">{count}</span>}
    </DropdownTrigger>
    <Tooltip>{label}</Tooltip>
  </TooltipTrigger>;
}

function GridAction({ label, icon, disabled, onClick }: { label: string; icon: typeof RiSearchLine; disabled?: boolean; onClick: () => void }) {
  return <TooltipTrigger><Focusable><Button variant="secondary" size="small" iconOnly leadingIcon={icon} aria-label={label} disabled={disabled} onClick={onClick} /></Focusable><Tooltip>{label}</Tooltip></TooltipTrigger>;
}

function GridToolbarContent({ children }: { children: ReactNode }) {
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();
  return <motion.div
    data-grid-toolbar-content
    aria-hidden={!isPresent}
    inert={!isPresent}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeInOut" }}
    className={cx("col-start-1 row-start-1 flex min-w-0 flex-wrap items-center justify-between gap-2", !isPresent && "pointer-events-none")}
  >{children}</motion.div>;
}

function GridScrollFade({ scrollTop }: { scrollTop: number }) {
  const opacity = Math.min(1, Math.max(0, scrollTop) / 24);
  return <div aria-hidden data-grid-scroll-fade className="pointer-events-none absolute inset-x-0 top-0 z-30 h-6">
    <div className="absolute inset-0 backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,black,transparent)]" style={{ opacity }} />
    <div className="absolute inset-x-0 top-0 h-4 backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,black,transparent)]" style={{ opacity }} />
    <div className="absolute inset-0 bg-linear-to-b from-background-primary-default to-transparent" style={{ opacity }} />
  </div>;
}

function GridFilters<T>({ columns, options, filters, onChange }: {
  columns: readonly DataGridColumn<T>[]; options: Record<string, readonly string[]>; filters: Record<string, string>; onChange: (filters: Record<string, string>) => void;
}) {
  const [columnKey, setColumnKey] = useState(columns[0]?.key);
  const [search, setSearch] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const column = columns.find((item) => item.key === columnKey) ?? columns[0];
  function changeFilter(value?: string) {
    if (!column) return;
    const next = { ...filters };
    if (value === undefined) delete next[column.key]; else next[column.key] = value;
    onChange(next);
  }
  return <div className="flex flex-col gap-2">
    {column ? <>
      <SegmentedControl aria-label="Filter column" selectedKeys={[column.key]} className="w-full flex-wrap" onSelectionChange={(keys) => {
        const key = Array.from(keys)[0];
        if (key !== undefined) setColumnKey(String(key) as DataGridColumn<T>["key"]);
        setSearch(""); setScrollTop(0); if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }}>{columns.map((item) => <SegmentedControlItem key={item.key} id={item.key} className="flex-1 gap-1.5">{item.header}{filters[item.key] !== undefined && <span aria-label="Filtered" className="size-1.5 rounded-full bg-accent-500" />}</SegmentedControlItem>)}</SegmentedControl>
      <Input aria-label={`Search ${column.header} filters`} placeholder={`Search ${column.header.toLowerCase()}`} value={search} onChange={(value) => { setSearch(value); if (scrollRef.current) scrollRef.current.scrollTop = 0; setScrollTop(0); }} leadingIcon={RiSearchLine} size="small" className="px-1" fieldClassName="bg-background-secondary-default" />
      <div className="relative">
        <div ref={scrollRef} aria-label={`${column.header} filter values`} className="flex max-h-64 flex-col gap-0.5 overflow-y-auto [scrollbar-width:thin]" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
          <DropdownItem className={compactMenuItem} selected={filters[column.key] === undefined} onSelect={() => changeFilter()}><span className="flex-1">All {column.header.toLowerCase()}</span>{filters[column.key] === undefined && <RiCheckLine className="size-4" aria-hidden />}</DropdownItem>
          {options[column.key].filter((option) => option.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((option) => <DropdownItem key={option} className={compactMenuItem} selected={filters[column.key] === option} onSelect={() => changeFilter(option)}><span className="min-w-0 flex-1 truncate">{option || "Empty"}</span>{filters[column.key] === option && <RiCheckLine className="size-4 shrink-0" aria-hidden />}</DropdownItem>)}
        </div>
        <GridScrollFade scrollTop={scrollTop} />
      </div>
    </> : <p className="p-2 text-body-2-regular text-text-secondary">Add filterable columns to enable filters.</p>}
    {Object.keys(filters).length > 0 && <div className="border-t border-separator-border pt-1"><Button variant="ghost" size="small" className={cx(neutralButton, "w-full")} onClick={() => onChange({})}>Clear filters</Button></div>}
  </div>;
}

function GridEditor<T>({ column, row, autoFocus = true, onCommit, onCancel }: {
  column: DataGridColumn<T>; row: T; autoFocus?: boolean; onCommit: (value: string, move?: number) => boolean; onCancel: () => void;
}) {
  const [value, setValue] = useState(String(row[column.key] ?? ""));
  const input = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  useEffect(() => { if (autoFocus) { input.current?.focus(); input.current?.select(); } }, [autoFocus]);
  function finish(move?: number) {
    if (column.type === "select") { onCommit(String(row[column.key] ?? ""), move); return; }
    if (finished.current) return;
    finished.current = onCommit(value, move);
  }
  function keyDown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); finished.current = true; onCancel(); }
    else if (event.key === "Enter" && column.type !== "select") { event.preventDefault(); finish(event.shiftKey ? -1 : 1); }
    else if (event.key === "Tab") { event.preventDefault(); finish(event.shiftKey ? -2 : 2); }
  }
  return (
    <div className="h-full w-full" onKeyDown={keyDown} onPointerDown={(event) => event.stopPropagation()}>
      {column.type === "select" ? (
        <Select aria-label={`Edit ${column.header}`} selectedKey={String(row[column.key] ?? "")} autoFocus={autoFocus} size="sm" className="h-full" popoverClassName="p-1" triggerClassName="h-full rounded-none border-0 bg-transparent px-2.5 text-body-regular shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" onSelectionChange={(key) => {
          if (key !== null) { finished.current = true; onCommit(String(key)); }
        }}>
          {(column.options ?? []).map((option) => <SelectItem key={option} id={option} className="text-body-regular">{option}</SelectItem>)}
        </Select>
      ) : (
        <Input ref={input} aria-label={`Edit ${column.header}`} value={value} onChange={setValue} type={column.type === "number" ? "number" : "text"} onBlur={() => finish()} className="h-full" fieldClassName="h-full rounded-none bg-transparent px-1.5 ring-0" />
      )}
    </div>
  );
}

/** Spreadsheet-style grid with fixed-height row virtualization and source-owned controls. */
export function DataGrid<T extends object>({
  "aria-label": label, data, columns, getRowId, onDataChange, height = 396, className,
  exportFileName = "data-grid.csv", emptyState = "No matching rows. Try another search or clear your filters.",
}: DataGridProps<T>) {
  const direction = useDirection();
  const reducedMotion = useReducedMotion();
  const id = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<{ key: string; descending: boolean } | null>(null);
  const [compact, setCompact] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [range, setRange] = useState<Range | null>(() => {
    if (!data.length || !columns.length) return null;
    const cell = { rowId: getRowId(data[0]), columnKey: columns[0].key };
    return { anchor: cell, focus: cell };
  });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<GridCell | null>(null);
  const [history, setHistory] = useState<{ undo: GridTransaction<T>[]; redo: GridTransaction<T>[] }>({ undo: [], redo: [] });
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const rowHeight = compact ? 36 : 44;
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const observer = new ResizeObserver(([entry]) => setViewportWidth(entry.contentRect.width));
    observer.observe(body);
    return () => observer.disconnect();
  }, []);
  const visibleColumns = useMemo(() => columns.filter((column) => !hidden.has(column.key)), [columns, hidden]);
  const rows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    const filtered = data.filter((row) =>
      (!search || columns.some((column) => String(row[column.key] ?? "").toLocaleLowerCase().includes(search))) &&
      columns.every((column) => filters[column.key] === undefined || String(row[column.key] ?? "") === filters[column.key]),
    );
    if (!sort) return filtered;
    const key = sort.key as keyof T;
    return filtered.sort((a, b) => {
      const left = a[key], right = b[key];
      const result = typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true });
      return sort.descending ? -result : result;
    });
  }, [data, columns, filters, query, sort]);
  const rowIndices = useMemo(() => new Map(rows.map((row, index) => [getRowId(row), index])), [rows, getRowId]);
  const columnIndices = useMemo(() => new Map(visibleColumns.map((column, index) => [column.key as string, index])), [visibleColumns]);
  const bounds: Bounds | null = useMemo(() => {
    if (!range) return null;
    const a = rowIndices.get(range.anchor.rowId), b = rowIndices.get(range.focus.rowId);
    const c = columnIndices.get(range.anchor.columnKey), d = columnIndices.get(range.focus.columnKey);
    return a === undefined || b === undefined || c === undefined || d === undefined ? null : {
      top: Math.min(a, b), bottom: Math.max(a, b), start: Math.min(c, d), end: Math.max(c, d),
    };
  }, [range, rowIndices, columnIndices]);
  const columnWidths = visibleColumns.map((column) => widths[column.key] ?? column.width ?? 160);
  const freezeFirstColumn = viewportWidth === 0 || viewportWidth >= GUTTER + (columnWidths[0] ?? 0) + 96;
  const totalWidth = GUTTER + columnWidths.reduce((sum, width) => sum + width, 0);
  const rowStyle: CSSProperties = { gridTemplateColumns: `${GUTTER}px ${columnWidths.map((width) => `${width}px`).join(" ")}`, width: totalWidth, minWidth: "100%" };
  const firstRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const lastRow = Math.min(rows.length, Math.ceil((scrollTop + height) / rowHeight) + OVERSCAN);
  const filterCount = Object.keys(filters).length;
  const visibleSelected = rows.reduce((count, row) => count + Number(selectedRows.has(getRowId(row))), 0);
  const filterColumns = columns.filter((column) => column.filterable || column.type === "select");
  const filterOptions = useMemo(() => Object.fromEntries(columns.filter((column) => column.filterable || column.type === "select").map((column) => [column.key, column.options ?? Array.from(new Set(data.map((row) => String(row[column.key] ?? "")))).sort()])), [columns, data]);
  const summaries = useMemo(() => Object.fromEntries(visibleColumns.map((column) => {
    if (!column.summary) return [column.key, null];
    const values = rows.map((row) => row[column.key]).filter((value): value is T[Extract<keyof T, string>] & number => typeof value === "number" && Number.isFinite(value));
    const sum = values.reduce((total, value) => total + value, 0);
    return [column.key, column.summary === "count" ? rows.length : column.summary === "average" ? (values.length ? sum / values.length : null) : sum];
  })), [rows, visibleColumns]);
  const selectionStats = useMemo(() => {
    if (!bounds) return { count: 0, sum: null as number | null, average: null as number | null };
    let count = 0, sum = 0, numbers = 0;
    for (let r = bounds.top; r <= bounds.bottom; r++) for (let c = bounds.start; c <= bounds.end; c++) {
      const value = rows[r][visibleColumns[c].key];
      if (value !== null && value !== undefined && value !== "") count++;
      if (typeof value === "number" && Number.isFinite(value)) { sum += value; numbers++; }
    }
    return { count, sum: numbers ? sum : null, average: numbers ? sum / numbers : null };
  }, [bounds, rows, visibleColumns]);
  const focusRow = range ? rowIndices.get(range.focus.rowId) : undefined;
  const focusColumn = range ? columnIndices.get(range.focus.columnKey) : undefined;
  useEffect(() => {
    if (!freezeFirstColumn && focusColumn === 0 && bodyRef.current) bodyRef.current.scrollLeft = 0;
  }, [freezeFirstColumn, focusColumn]);
  const cellId = (r: number, c: number) => `${id}-cell-${r}-${c}`;
  const activeId = focusRow !== undefined && focusColumn !== undefined && focusRow >= firstRow && focusRow < lastRow ? cellId(focusRow, focusColumn) : undefined;
  const selectionAddress = bounds ? `${columnLetter(bounds.start)}${bounds.top + 1}${bounds.top !== bounds.bottom || bounds.start !== bounds.end ? `:${columnLetter(bounds.end)}${bounds.bottom + 1}` : ""}` : "—";

  function resetScroll() {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    setScrollTop(0);
    setEditing(null);
    setErrorMessage("");
  }

  function selectCell(r: number, c: number, extend = false) {
    if (!rows.length || !visibleColumns.length) return;
    r = Math.max(0, Math.min(rows.length - 1, r));
    c = Math.max(0, Math.min(visibleColumns.length - 1, c));
    const cell = { rowId: getRowId(rows[r]), columnKey: visibleColumns[c].key };
    setRange((previous) => ({ anchor: extend && previous && bounds ? previous.anchor : cell, focus: cell }));
    setErrorMessage("");
    gridRef.current?.focus({ preventScroll: true });
    const body = bodyRef.current;
    if (body) {
      const top = r * rowHeight;
      if (top < body.scrollTop) body.scrollTop = top;
      else if (top + rowHeight > body.scrollTop + body.clientHeight) body.scrollTop = top + rowHeight - body.clientHeight;
      if (c > 0 || !freezeFirstColumn) {
        const start = GUTTER + columnWidths.slice(0, c).reduce((sum, width) => sum + width, 0);
        const offset = Math.abs(body.scrollLeft);
        const frozenWidth = GUTTER + (freezeFirstColumn ? columnWidths[0] : 0);
        if (start < offset + frozenWidth) body.scrollLeft = (direction === "rtl" ? -1 : 1) * Math.max(0, start - frozenWidth);
        else if (start + columnWidths[c] > offset + body.clientWidth) body.scrollLeft = (direction === "rtl" ? -1 : 1) * (start + columnWidths[c] - body.clientWidth);
      }
    }
  }

  function commitEdits(edits: GridEdit<T>[]) {
    if (!onDataChange || !edits.length) return;
    onDataChange(applyGridEdits(data, getRowId, edits));
    setHistory((previous) => ({ undo: [...previous.undo.slice(-99), { type: "edit", edits }], redo: [] }));
    setMessage(`${edits.length.toLocaleString()} ${edits.length === 1 ? "cell updated" : "cells updated"}.`);
    setErrorMessage("");
  }

  function travelHistory(undo: boolean) {
    const source = undo ? history.undo : history.redo;
    const transaction = source.at(-1);
    if (!transaction || !onDataChange) return;
    // External updates must not be overwritten by an old local history entry.
    const current = new Map(data.map((row) => [getRowId(row), row]));
    const stale = transaction.type === "edit"
      ? transaction.edits.some((edit) => !current.has(edit.rowId) || !Object.is(current.get(edit.rowId)![edit.key], undo ? edit.after : edit.before))
      : transaction.rows.some(({ row }) => undo ? current.has(getRowId(row)) : current.get(getRowId(row)) !== row);
    if (stale) {
      setHistory({ undo: [], redo: [] });
      setMessage("The data changed outside this grid. Change history has been cleared.");
      return;
    }
    if (transaction.type === "edit") onDataChange(applyGridEdits(data, getRowId, transaction.edits, undo));
    else if (undo) {
      const next = [...data];
      for (const { row, index } of transaction.rows) next.splice(Math.min(index, next.length), 0, row);
      onDataChange(next);
    } else {
      const removed = new Set(transaction.rows.map(({ row }) => getRowId(row)));
      onDataChange(data.filter((row) => !removed.has(getRowId(row))));
    }
    setHistory((previous) => undo ? { undo: previous.undo.slice(0, -1), redo: [...previous.redo, transaction] } : { undo: [...previous.undo, transaction], redo: previous.redo.slice(0, -1) });
    setEditing(null);
    setMessage(undo ? "Change undone." : "Change redone.");
    setErrorMessage("");
  }

  function startEditing(r = focusRow ?? 0, c = focusColumn ?? 0) {
    if (!onDataChange || !rows[r] || !visibleColumns[c] || visibleColumns[c].editable === false) return;
    selectCell(r, c);
    setEditing({ rowId: getRowId(rows[r]), columnKey: visibleColumns[c].key });
    setMessage("");
  }

  function commitCell(row: T, column: DataGridColumn<T>, text: string, move?: number) {
    try {
      const value = parseGridValue(text, column);
      const error = column.validate?.(value, row);
      if (error) throw new Error(error);
      if (!Object.is(row[column.key], value)) commitEdits([{ rowId: getRowId(row), key: column.key, before: row[column.key], after: value as T[keyof T] }]);
      setEditing(null);
      if (move) {
        const r = rowIndices.get(getRowId(row)) ?? 0, c = columnIndices.get(column.key) ?? 0;
        if (Math.abs(move) === 2) {
          const next = r * visibleColumns.length + c + (move > 0 ? 1 : -1);
          selectCell(Math.floor(Math.max(0, next) / visibleColumns.length), Math.max(0, next) % visibleColumns.length);
        } else selectCell(r + move, c);
      } else gridRef.current?.focus({ preventScroll: true });
      return true;
    } catch (error) {
      const message = `${column.header}: ${error instanceof Error ? error.message : "Invalid value."}`;
      setMessage(message);
      setErrorMessage(message);
      return false;
    }
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== gridRef.current || editing) return;
    const command = event.ctrlKey || event.metaKey;
    if (command && event.key.toLowerCase() === "z") { event.preventDefault(); travelHistory(!event.shiftKey); return; }
    if (command && event.key.toLowerCase() === "y") { event.preventDefault(); travelHistory(false); return; }
    if (command && event.key.toLowerCase() === "a") {
      event.preventDefault();
      if (rows.length && visibleColumns.length) setRange({ anchor: { rowId: getRowId(rows[0]), columnKey: visibleColumns[0].key }, focus: { rowId: getRowId(rows[rows.length - 1]), columnKey: visibleColumns[visibleColumns.length - 1].key } });
      return;
    }
    if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); startEditing(); return; }
    if (event.key === "Escape") { setRange(null); return; }
    let r = focusRow ?? 0, c = focusColumn ?? 0;
    if (event.key === "ArrowUp") r--;
    else if (event.key === "ArrowDown") r++;
    else if (event.key === "ArrowLeft") c += direction === "rtl" ? 1 : -1;
    else if (event.key === "ArrowRight") c += direction === "rtl" ? -1 : 1;
    else if (event.key === "PageDown") r += Math.floor(height / rowHeight);
    else if (event.key === "PageUp") r -= Math.floor(height / rowHeight);
    else if (event.key === "Home") { c = 0; if (command) r = 0; }
    else if (event.key === "End") { c = visibleColumns.length - 1; if (command) r = rows.length - 1; }
    else return;
    event.preventDefault();
    selectCell(r, c, event.shiftKey);
  }

  function copy(event: ClipboardEvent) {
    if (event.target !== gridRef.current || !bounds || editing) return;
    event.preventDefault();
    event.clipboardData.setData("text/plain", serializeGridRows(rows.slice(bounds.top, bounds.bottom + 1).map((row) => visibleColumns.slice(bounds.start, bounds.end + 1).map((column) => row[column.key])), "\t"));
    setMessage(`${(bounds.bottom - bounds.top + 1) * (bounds.end - bounds.start + 1)} cells copied.`);
  }

  function paste(event: ClipboardEvent) {
    if (event.target !== gridRef.current || !onDataChange || !bounds || editing) return;
    event.preventDefault();
    const matrix = parseGridClipboard(event.clipboardData.getData("text/plain"));
    const edits: GridEdit<T>[] = [];
    try {
      for (let r = 0; r < matrix.length; r++) for (let c = 0; c < matrix[r].length; c++) {
        const row = rows[bounds.top + r], column = visibleColumns[bounds.start + c];
        if (!row || !column) throw new Error("The pasted cells extend beyond the grid.");
        if (column.editable === false) throw new Error(`${column.header} is read-only.`);
        const value = parseGridValue(matrix[r][c], column);
        const error = column.validate?.(value, row);
        if (error) throw new Error(`${column.header}: ${error}`);
        if (!Object.is(row[column.key], value)) edits.push({ rowId: getRowId(row), key: column.key, before: row[column.key], after: value as T[keyof T] });
      }
      commitEdits(edits);
    } catch (error) { const message = `Paste cancelled. ${error instanceof Error ? error.message : "Invalid value."}`; setMessage(message); setErrorMessage(message); }
  }

  function exportCsv() {
    const exportRows = visibleSelected ? rows.filter((row) => selectedRows.has(getRowId(row))) : rows;
    const csv = serializeGridRows([visibleColumns.map((column) => column.header), ...exportRows.map((row) => visibleColumns.map((column) => row[column.key]))]);
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url; link.download = exportFileName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`${exportRows.length.toLocaleString()} rows exported.`);
  }

  function toggleRow(rowId: string, selected: boolean) {
    setSelectedRows((previous) => { const next = new Set(previous); if (selected) next.add(rowId); else next.delete(rowId); return next; });
  }

  async function copySelectedRows() {
    const selected = rows.filter((row) => selectedRows.has(getRowId(row)));
    try {
      await navigator.clipboard.writeText(serializeGridRows(selected.map((row) => visibleColumns.map((column) => row[column.key])), "\t"));
      setMessage(`${selected.length.toLocaleString()} ${selected.length === 1 ? "row copied" : "rows copied"}.`);
      setErrorMessage("");
    } catch { setErrorMessage("Could not copy rows. Allow clipboard access and try again."); }
  }

  function deleteSelectedRows() {
    if (!onDataChange || !visibleSelected) return;
    const removed = new Set(rows.filter((row) => selectedRows.has(getRowId(row))).map(getRowId));
    const deleted = data.flatMap((row, index) => removed.has(getRowId(row)) ? [{ row, index }] : []);
    onDataChange(data.filter((row) => !removed.has(getRowId(row))));
    setHistory((previous) => ({ undo: [...previous.undo.slice(-99), { type: "delete", rows: deleted }], redo: [] }));
    setSelectedRows((previous) => new Set([...previous].filter((rowId) => !removed.has(rowId))));
    setRange((previous) => previous && (removed.has(previous.anchor.rowId) || removed.has(previous.focus.rowId)) ? null : previous);
    setEditing(null);
    setErrorMessage("");
    setMessage(`${deleted.length.toLocaleString()} ${deleted.length === 1 ? "row deleted" : "rows deleted"}.`);
  }

  function resizeColumn(key: string, width: number) { setWidths((previous) => ({ ...previous, [key]: Math.max(96, Math.min(480, width)) })); }
  function stickyStyle(c: number): CSSProperties | undefined { return c === 0 && freezeFirstColumn ? { insetInlineStart: GUTTER } : undefined; }
  // Isolate content layers so scrolling text and editors stay below frozen cells.
  const cellClass = (c: number) => cx("relative isolate flex min-w-0 items-center border-e border-border-table px-3 text-body-regular text-text-primary", c === 0 && freezeFirstColumn && "sticky z-10 bg-background-primary-default");

  return (
    <div dir={direction} data-data-grid className={cx("w-full min-w-0 overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default", className)}>
      <div data-grid-toolbar className="grid border-b border-border-table px-2 py-[7px]">
        <AnimatePresence initial={false}>
        {visibleSelected > 0 ? <GridToolbarContent key="selection">
          <div className="flex min-h-10 min-w-0 items-center gap-2">
            <span className="text-body-medium text-text-primary">{visibleSelected.toLocaleString()} {visibleSelected === 1 ? "row selected" : "rows selected"}</span>
            <TooltipTrigger><Focusable><CloseButton size="2xs" aria-label="Clear row selection" onClick={() => setSelectedRows(new Set())} /></Focusable><Tooltip>Clear row selection</Tooltip></TooltipTrigger>
          </div>
          <div className="ms-auto flex items-center gap-1.5">
            <GridAction label="Delete selected rows" icon={RiDeleteBinLine} disabled={!onDataChange} onClick={deleteSelectedRows} />
            <GridAction label="Copy selected rows" icon={RiFileCopyLine} onClick={copySelectedRows} />
            <GridAction label="Export" icon={RiDownload2Line} onClick={exportCsv} />
          </div>
        </GridToolbarContent> : <GridToolbarContent key="default">
          <div className="order-1 flex min-h-10 shrink-0 flex-col justify-center">
            <span className="whitespace-nowrap text-body-medium text-text-tertiary">Total Results</span>
            <span data-grid-row-count className="whitespace-nowrap text-body-medium text-text-primary">{rows.length.toLocaleString()} {rows.length === 1 ? "row" : "rows"}</span>
          </div>
          <div className="order-3 ms-auto flex basis-full flex-wrap items-center justify-end gap-1.5 sm:order-2 sm:basis-auto sm:flex-1 sm:flex-nowrap">
            <TooltipTrigger><Focusable><Button variant="secondary" size="small" iconOnly leadingIcon={RiArrowGoBackLine} aria-label="Undo edit" disabled={!history.undo.length || !onDataChange} onClick={() => travelHistory(true)} /></Focusable><Tooltip>Undo</Tooltip></TooltipTrigger>
            <TooltipTrigger><Focusable><Button variant="secondary" size="small" iconOnly leadingIcon={RiArrowGoForwardLine} aria-label="Redo edit" disabled={!history.redo.length || !onDataChange} onClick={() => travelHistory(false)} /></Focusable><Tooltip>Redo</Tooltip></TooltipTrigger>
            <div className="mx-1 h-5 w-px bg-separator-border" />
            <Dropdown>
              <GridMenuTrigger label="Filter" icon={RiFilter3Line} count={filterCount} />
              <DropdownPopover aria-label="Filter rows" className="w-72 p-1" dialogClassName="gap-0.5">
                <GridFilters columns={filterColumns} options={filterOptions} filters={filters} onChange={(next) => { setFilters(next); resetScroll(); }} />
              </DropdownPopover>
            </Dropdown>
            <Dropdown>
              <GridMenuTrigger label="Columns" icon={RiLayoutColumnLine} />
              <DropdownPopover aria-label="Visible columns" className="p-1" dialogClassName="gap-0.5">
                <DropdownGroup label="Visible columns">
                  {columns.map((column) => <Checkbox key={column.key} isSelected={!hidden.has(column.key)} isDisabled={!hidden.has(column.key) && visibleColumns.length === 1} className="rounded-lg px-2 py-1.5 hover:bg-background-secondary-hover" onChange={(selected) => {
                    setHidden((previous) => { const next = new Set(previous); if (selected) next.delete(column.key); else next.add(column.key); return next; }); setEditing(null);
                  }}>{column.header}</Checkbox>)}
                </DropdownGroup>
              </DropdownPopover>
            </Dropdown>
            <Dropdown>
              <GridMenuTrigger label="Row density" icon={RiLayoutRowLine} />
              <DropdownPopover aria-label="Row density" className="w-48 p-1" dialogClassName="gap-0.5">
                <DropdownGroup>{[false, true].map((dense) => <DropdownItem key={String(dense)} className={compactMenuItem} selected={compact === dense} onSelect={() => { setCompact(dense); resetScroll(); }}><span className="flex-1">{dense ? "Compact" : "Comfortable"}</span>{compact === dense && <RiCheckLine className="size-4" aria-hidden />}</DropdownItem>)}</DropdownGroup>
              </DropdownPopover>
            </Dropdown>
            <TooltipTrigger><Focusable><Button variant="secondary" size="small" iconOnly leadingIcon={RiDownload2Line} aria-label="Export" disabled={!rows.length} onClick={exportCsv} /></Focusable><Tooltip>Export</Tooltip></TooltipTrigger>
          </div>
          <Input aria-label={`Search ${label}`} placeholder="Search" leadingIcon={RiSearchLine} value={query} onChange={(value) => { setQuery(value); resetScroll(); }} className="order-2 ms-auto w-40 min-w-24 flex-1 sm:order-3 sm:w-56 sm:flex-none" fieldClassName="rounded-full bg-background-secondary-default ring-0" />
        </GridToolbarContent>}
        </AnimatePresence>
      </div>

      <div ref={gridRef} role="grid" aria-label={label} aria-rowcount={rows.length + 1} aria-colcount={visibleColumns.length + 1} aria-multiselectable aria-readonly={!onDataChange} aria-activedescendant={activeId} aria-describedby={`${id}-instructions`} tabIndex={0} onKeyDown={keyDown} onCopy={copy} onPaste={paste} onFocus={(event) => { if (event.target === event.currentTarget && !range && rows.length) selectCell(0, 0); }} className="outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring">
        <p id={`${id}-instructions`} className="sr-only">Use arrow keys to navigate, Shift and arrows to select cells, and Enter or F2 to edit. Copy and paste cells with your keyboard. Column headings sort; column separators resize with arrow keys.</p>
        <div ref={headerRef} role="rowgroup" className="overflow-hidden border-b border-border-table bg-background-secondary-default">
          <div role="row" aria-rowindex={1} className="grid h-10" style={rowStyle}>
            <div role="columnheader" aria-colindex={1} className="sticky start-0 z-20 flex items-center justify-center border-e border-border-table bg-background-secondary-default">
              <Checkbox aria-label="Select all filtered rows" isSelected={rows.length > 0 && visibleSelected === rows.length} isIndeterminate={visibleSelected > 0 && visibleSelected < rows.length} isDisabled={!rows.length} onChange={(selected) => { setSelectedRows((previous) => { const next = new Set(previous); for (const row of rows) { if (selected) next.add(getRowId(row)); else next.delete(getRowId(row)); } return next; }); }} />
            </div>
            {visibleColumns.map((column, c) => (
              <div key={column.key} role="columnheader" aria-colindex={c + 2} aria-sort={sort?.key === column.key ? sort.descending ? "descending" : "ascending" : "none"} className={cx(cellClass(c), "group bg-background-secondary-default px-0")} style={stickyStyle(c)}>
                <button type="button" className={cx("flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-body-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring", (column.align === "end" || (column.align === undefined && column.type === "number")) && "justify-end")} onClick={() => { setSort((previous) => previous?.key === column.key ? previous.descending ? null : { key: column.key, descending: true } : { key: column.key, descending: false }); resetScroll(); }}>
                  <span className="truncate">{column.header}</span>
                  {sort?.key === column.key && (sort.descending ? <RiArrowDownLine className="size-3.5 shrink-0" aria-hidden /> : <RiArrowUpLine className="size-3.5 shrink-0" aria-hidden />)}
                </button>
                <div role="separator" aria-label={`Resize ${column.header}`} aria-orientation="vertical" aria-valuemin={96} aria-valuemax={480} aria-valuenow={columnWidths[c]} tabIndex={0} className="absolute inset-y-0 -end-1 z-20 w-2 cursor-col-resize outline-none hover:bg-accent-200 focus-visible:bg-accent-200" onDoubleClick={() => resizeColumn(column.key, column.width ?? 160)} onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); resizeColumn(column.key, columnWidths[c] + (event.key === (direction === "rtl" ? "ArrowLeft" : "ArrowRight") ? 16 : -16)); }
                }} onPointerDown={(event) => {
                  event.preventDefault(); const handle = event.currentTarget, start = event.clientX, width = columnWidths[c]; handle.setPointerCapture(event.pointerId);
                  const move = (next: PointerEvent) => resizeColumn(column.key, width + (next.clientX - start) * (direction === "rtl" ? -1 : 1));
                  const stop = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("lostpointercapture", stop); };
                  handle.addEventListener("pointermove", move); handle.addEventListener("lostpointercapture", stop);
                }} />
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <motion.div layoutScroll ref={bodyRef} data-grid-scroll role="rowgroup" style={{ height }} onScroll={(event) => {
            const body = event.currentTarget; setScrollTop(body.scrollTop);
            if (headerRef.current) headerRef.current.scrollLeft = body.scrollLeft;
            if (summaryRef.current) summaryRef.current.scrollLeft = body.scrollLeft;
          }} className="overflow-auto overscroll-contain [scrollbar-width:thin]">
            <div className="relative" style={{ height: rows.length ? rows.length * rowHeight : height, width: totalWidth, minWidth: "100%" }}>
              {rows.slice(firstRow, lastRow).map((row, index) => {
                const r = firstRow + index, rowId = getRowId(row), rowSelected = selectedRows.has(rowId);
                return (
                  <div key={rowId} role="row" aria-rowindex={r + 2} aria-selected={rowSelected} className="group/row absolute inset-x-0 grid border-b border-border-table" style={{ ...rowStyle, top: r * rowHeight, height: rowHeight }}>
                    <div role="gridcell" aria-colindex={1} className={cx("sticky start-0 z-20 flex items-center justify-center border-e border-border-table bg-background-primary-default text-caption-1-regular text-text-tertiary", rowSelected && "bg-background-secondary-default")}>
                      <span aria-hidden className={cx("pointer-events-none group-hover/row:opacity-0 group-focus-within/row:opacity-0", rowSelected && "opacity-0")}>{r + 1}</span>
                      <Checkbox aria-label={`Select row ${r + 1}`} isSelected={rowSelected} onChange={(selected) => toggleRow(rowId, selected)} className={cx("absolute opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100", rowSelected && "opacity-100")} />
                    </div>
                    {visibleColumns.map((column, c) => {
                      const active = range?.focus.rowId === rowId && range.focus.columnKey === column.key;
                      const selected = !!bounds && r >= bounds.top && r <= bounds.bottom && c >= bounds.start && c <= bounds.end;
                      const isEditing = editing?.rowId === rowId && editing.columnKey === column.key;
                      const showEditor = isEditing || (active && column.type === "select" && !!onDataChange && column.editable !== false);
                      return (
                        <div key={column.key} id={cellId(r, c)} role="gridcell" aria-colindex={c + 2} aria-selected={selected} aria-readonly={!onDataChange || column.editable === false} data-grid-cell={`${r}:${c}`} className={cx(cellClass(c), "cursor-cell bg-background-primary-default transition-colors duration-150 ease-out motion-reduce:transition-none", (column.align === "end" || (column.align === undefined && column.type === "number")) && "justify-end text-end tabular-nums", (selected || rowSelected) && "bg-background-secondary-default", active && !(c === 0 && freezeFirstColumn) && "z-5")} style={stickyStyle(c)} onPointerDown={(event) => {
                          if (isEditing || event.button !== 0) return;
                          // Touch keeps native swipe scrolling; clicking still selects the cell.
                          if (event.pointerType === "mouse") event.preventDefault();
                          selectCell(r, c, event.shiftKey);
                        }} onPointerEnter={(event) => { if (event.pointerType === "mouse" && event.buttons === 1 && !editing) selectCell(r, c, true); }} onDoubleClick={() => startEditing(r, c)}>
                          {/* Keep the moving outline transparent so it never masks another cell's text. */}
                          {active && <motion.span aria-hidden data-grid-highlight layoutId={`${id}-cell-highlight`} initial={false} transition={{ layout: reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 38, mass: 0.7 } }} className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-border-button-active" />}
                          {showEditor ? <div className="absolute inset-0.5 z-10"><GridEditor key={isEditing ? "editing" : "selected"} column={column} row={row} autoFocus={isEditing} onCommit={(text, move) => commitCell(row, column, text, move)} onCancel={() => { setEditing(null); setErrorMessage(""); gridRef.current?.focus({ preventScroll: true }); }} /></div> : <span className="relative z-10 truncate" title={String(row[column.key] ?? "")}>{column.format ? column.format(row[column.key]) : String(row[column.key] ?? "")}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {!rows.length && <div className="flex h-full items-center p-6 text-body-regular text-text-tertiary">{emptyState}</div>}
            </div>
          </motion.div>
          <GridScrollFade scrollTop={scrollTop} />
        </div>
      </div>
      <div ref={summaryRef} data-grid-summaries className="overflow-hidden border-t border-border-table">
        <div className="grid h-11" style={rowStyle}>
          <div className="sticky start-0 z-20 border-e border-border-table bg-background-primary-default" />
          {visibleColumns.map((column, c) => {
            const summary = summaries[column.key];
            return <div key={column.key} className={cx(cellClass(c), "gap-2 text-body-regular text-text-tertiary", column.summary && "justify-end text-end tabular-nums")} style={stickyStyle(c)}>
              {column.summary ? <><span>{column.summary === "average" ? "Avg" : column.summary === "sum" ? "Sum" : "Count"}</span><span className="text-body-medium text-text-primary">{summary === null ? "—" : column.formatSummary ? column.formatSummary(summary) : summary.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span></> : null}
            </div>;
          })}
        </div>
      </div>
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border-table px-4 py-2 text-body-regular text-text-tertiary">
        <div className="flex flex-wrap items-center gap-4"><span dir="ltr" className="min-w-8 text-body-medium text-text-primary">{selectionAddress}</span><span>Count <span className="ms-1 text-text-primary">{selectionStats.count.toLocaleString()}</span></span>{selectionStats.sum !== null && <><span>Sum <span className="ms-1 text-text-primary">{selectionStats.sum.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span></span><span>Avg <span className="ms-1 text-text-primary">{selectionStats.average?.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span></span></>}{!onDataChange && <span>Read-only</span>}</div>
        <span role="status" aria-live="polite" className="sr-only">{message}</span>
      </div>
      {errorMessage && <p role="alert" className="border-t border-border-table px-4 py-2 text-body-2-regular text-text-error-primary">{errorMessage}</p>}
    </div>
  );
}
