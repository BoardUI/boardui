"use client";

import { TreeView, TreeViewItem } from "@/components/base/tree-view/tree-view";

/** Shared by the documentation and free component gallery. */
export function TreeViewPreview({ compact = false }: { compact?: boolean }) {
  return (
    <TreeView
      aria-label="Project files"
      defaultExpandedKeys={["src", "components"]}
      defaultSelectedKeys={["components"]}
      className="max-w-sm"
    >
      <TreeViewItem id="src" label="src">
        <TreeViewItem id="components" label="components">
          <TreeViewItem id="button" label="button.tsx" iconClassName="text-accent-700" />
          <TreeViewItem id="button-styles" label="button.module.css" iconClassName="text-chart-5-active" />
          {!compact && <TreeViewItem id="input" label="input.tsx" iconClassName="text-accent-700" />}
        </TreeViewItem>
        {!compact && (
          <TreeViewItem id="hooks" label="hooks">
            <TreeViewItem id="use-theme" label="use-theme.ts" iconClassName="text-accent-700" />
            <TreeViewItem id="use-media-query" label="use-media-query.ts" iconClassName="text-accent-700" />
          </TreeViewItem>
        )}
        <TreeViewItem id="page" label="page.tsx" iconClassName="text-accent-700" />
      </TreeViewItem>
      {!compact && (
        <TreeViewItem id="public" label="public">
          <TreeViewItem id="logo" label="logo.svg" iconClassName="text-chart-5-active" />
          <TreeViewItem id="favicon" label="favicon.ico" />
        </TreeViewItem>
      )}
      <TreeViewItem id="readme" label="README.md" iconClassName="text-chart-1-active" />
      {!compact && <TreeViewItem id="package" label="package.json" />}
      {!compact && <TreeViewItem id="tsconfig" label="tsconfig.json" />}
    </TreeView>
  );
}
