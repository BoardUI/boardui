"use client";

import { cloneElement, createContext, isValidElement, useContext, useMemo, type ReactNode } from "react";

export type TemplateCopyTranslator = (text: string) => string;
const CopyContext = createContext<TemplateCopyTranslator | null>(null);

/** Optional application copy for templates. Without a provider, source copy is unchanged. */
export function TemplateCopyProvider({ translate, children }: { translate: TemplateCopyTranslator; children: ReactNode }) {
  return <CopyContext.Provider value={translate}>{children}</CopyContext.Provider>;
}

// Only display copy is translated. IDs, form values, data keys, URLs, styles,
// event handlers and application state retain their original values.
const textProps = new Set([
  "children", "title", "subtitle", "description", "label", "textValue", "placeholder", "alt",
  "aria-label", "aria-description", "metricLabel", "emptyMessage", "caption", "heading", "text", "content", "renderValue",
]);
const dataProps = new Set(["items", "options", "tabs", "columns", "series", "ranges", "stats", "data", "nodes", "bar", "line"]);
const dataText = new Set(["label", "title", "description", "subtitle", "header", "role", "joined"]);
const renderProps = new Set(["children", "cell", "header", "formatter", "tickFormatter", "labelFormatter", "renderItem", "node", "link", "tick", "label", "content", "renderValue"]);

/** Translate rendered copy while preserving React nodes, collection IDs and callbacks. */
export function translateTemplateCopy<T>(value: T, translate: TemplateCopyTranslator): T {
  function visit(value: unknown, data = false): unknown {
    if (typeof value === "string") return data ? value : translate(value);
    if (Array.isArray(value)) {
      const result = value.map(item => visit(item, data));
      return result.every((item, index) => item === value[index]) ? value : result;
    }
    if (isValidElement<Record<string, unknown>>(value)) {
      if (typeof value.type === "string" && ["pre", "code", "kbd", "script", "style"].includes(value.type)) return value;
      const updates: Record<string, unknown> = {};
      for (const [key, original] of Object.entries(value.props)) {
        if (textProps.has(key)) updates[key] = renderProps.has(key) && typeof original === "function"
          ? (...args: unknown[]) => visit(original(...args)) : visit(original);
        else if (dataProps.has(key)) updates[key] = visit(original, true);
        else if (renderProps.has(key) && typeof original === "function") updates[key] = (...args: unknown[]) => visit(original(...args));
      }
      return Object.entries(updates).some(([key, result]) => result !== value.props[key]) ? cloneElement(value, updates) : value;
    }
    if (data && value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      const result: Record<string, unknown> = { ...value };
      for (const [key, original] of Object.entries(result)) {
        if (renderProps.has(key) && typeof original === "function") result[key] = (...args: unknown[]) => visit(original(...args));
        else if (dataText.has(key)) result[key] = visit(original);
        else if (original && typeof original === "object") result[key] = visit(original, true);
      }
      return Object.entries(result).some(([key, item]) => item !== (value as Record<string, unknown>)[key]) ? result : value;
    }
    return value;
  }
  return visit(value) as T;
}

/** Apply to a template component's returned JSX; copy updates through React, including portals. */
export function useTemplateCopy() {
  const translate = useContext(CopyContext);
  return useMemo(() => <T,>(node: T): T => translate ? translateTemplateCopy(node, translate) : node, [translate]);
}
