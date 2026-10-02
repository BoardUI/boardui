/** Private data helpers bundled with the Data Grid registry item. */
export type GridCell = { rowId: string; columnKey: string };
export type GridEdit<T> = { rowId: string; key: keyof T; before: T[keyof T]; after: T[keyof T] };

export function columnLetter(index: number): string {
  let result = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
  }
  return result;
}

export function parseGridValue(value: string, column: { type?: "text" | "number" | "select"; options?: readonly string[]; min?: number; max?: number }): string | number {
  if (column.type === "number") {
    const number = Number(value.trim());
    if (!value.trim() || !Number.isFinite(number)) throw new Error("Enter a valid number.");
    if (column.min !== undefined && number < column.min) throw new Error(`The minimum is ${column.min}.`);
    if (column.max !== undefined && number > column.max) throw new Error(`The maximum is ${column.max}.`);
    return number;
  }
  if (column.type === "select" && !column.options?.includes(value)) throw new Error("Choose one of the available options.");
  return value;
}

export function applyGridEdits<T>(data: readonly T[], getRowId: (row: T) => string, edits: readonly GridEdit<T>[], undo = false): T[] {
  const byRow = new Map<string, GridEdit<T>[]>();
  for (const edit of edits) {
    const row = byRow.get(edit.rowId) ?? [];
    row.push(edit);
    byRow.set(edit.rowId, row);
  }
  return data.map((row) => {
    const changes = byRow.get(getRowId(row));
    if (!changes) return row;
    const next = { ...row };
    for (const change of changes) next[change.key] = undo ? change.before : change.after;
    return next;
  });
}

/** Round-trips quotes, tabs, and newlines copied from a spreadsheet. */
export function parseGridClipboard(text: string): string[][] {
  const rows: string[][] = [[]];
  let field = "", quoted = false;
  const source = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"' && (quoted || field === "")) {
      if (quoted && source[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === "\t" || char === "\n")) {
      rows[rows.length - 1].push(field);
      field = "";
      if (char === "\n") rows.push([]);
    } else field += char;
  }
  rows[rows.length - 1].push(field);
  if (source.endsWith("\n") && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") rows.pop();
  return rows;
}

export function serializeGridRows(rows: readonly (readonly unknown[])[], separator = ","): string {
  return rows.map((row) => row.map((value) => {
    let text = String(value ?? "");
    // Keep text values literal when opened by spreadsheet applications.
    if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return text.includes(separator) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(separator)).join("\r\n");
}
