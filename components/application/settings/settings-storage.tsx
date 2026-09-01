"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  RiDeleteBin6Line,
  RiDownload2Line,
  RiEditLine,
  RiFileCopyLine,
  RiMore2Fill,
  RiSearchLine,
} from "@remixicon/react";
import { Focusable } from "react-aria-components";
import { Chip } from "@/components/base/badges/chip";
import { IconButton } from "@/components/base/buttons/icon-button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/components/base/dropdown/dropdown";
import { FileUpload, formatFileSize } from "@/components/base/file-upload/file-upload";
import { InputBase } from "@/components/base/input/input";
import { Pagination } from "@/components/base/pagination/pagination";
import { Select, SelectItem } from "@/components/base/select/select";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { ChevronSortDown } from "@/components/foundations/icons/chevrons";
import { cx } from "@/utils/cx";

/**
 * Figma sources: Board UI → "Upload file" (node 4105:25269, default),
 * "Upload in progress" (node 4107:27192) and the 100% complete frame
 * (node 4107:30456) — the settings modal's Storage page.
 *
 * Dropzone (533×164, radius/2xl):
 *   default    bg background/secondary, 2px DASHED border/checkbox/default,
 *              40px background/quaternary circle with a white 24px
 *              upload-cloud-2-line, "Drag and drop to upload or select"
 *              (Body 1/Medium, "select" in blue-500) over "PDF, JPG, PNG or
 *              XLSX (max 8 MB)" (Body 2/Regular, text/tertiary).
 *   uploading  bg white; the border becomes the progress indicator: a 2px
 *              border/button/default track with a blue-400 stroke tracing
 *              the rounded-rect perimeter clockwise from top-center
 *              (decoded from Figma's "Rectangle 7519" vector), plus a
 *              blue-400 radius/md badge straddling the top border with the
 *              percentage (Caption 1/Medium, white). Content: 40px
 *              white/1px-bordered circle with the file-type icon, the file
 *              name (Body 1/Medium) and "Uploading N MB…" (Body 2/Regular).
 *   complete   same, ring closed at 100%, copy "Uploaded successfully!" —
 *              held briefly, then everything transitions back to default
 *              and the file lands at the top of the table below.
 *
 * Every phase change cross-fades: outgoing content slides up 10px while
 * fading/blurring out, incoming settles in from -10px — nothing snaps.
 * The upload itself is front-end-only (simulated progress, max 8 MB).
 *
 * The table below is the BoardUI table recipe (same chrome as the
 * dashboard's customers table): toolbar with live filters/search, sortable
 * columns, row selection, per-row delete + a ⋮ dropdown, pagination.
 */

/* ------------------------------------------------------------------ files */

type FileKind = "document" | "spreadsheet" | "video";

const FILE_ICONS: Record<FileKind, { light: string; dark?: string }> = {
  document: {
    light: "/ai-chat/plugin-documents.svg",
    dark: "/ai-chat/plugin-documents-dark.svg",
  },
  spreadsheet: { light: "/ai-chat/plugin-spreadsheets.svg" },
  video: { light: "/ai-chat/plugin-videos.svg" },
};

const KIND_LABELS: Record<FileKind, string> = {
  document: "Documents",
  spreadsheet: "Spreadsheets",
  video: "Videos",
};

interface StoredFile {
  id: string;
  name: string;
  kind: FileKind;
  /** Display label, e.g. "May 11, 2026". */
  uploadedOn: string;
  /** Epoch-ish ordinal used for the Modified sort (bigger = newer). */
  uploadedStamp: number;
  sizeLabel: string;
  bytes: number;
  selected?: boolean;
}

function kindForFile(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xlsx") return "spreadsheet";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  return "document";
}

function StoredFileIcon({ kind }: { kind: FileKind }) {
  const { light, dark } = FILE_ICONS[kind];

  if (dark) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative registry-packaged SVG */}
        <img src={light} alt="" className="theme-asset-light size-6 shrink-0 object-contain" />
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative registry-packaged SVG */}
        <img src={dark} alt="" className="theme-asset-dark size-6 shrink-0 object-contain" />
      </>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- decorative registry-packaged SVG
  return <img src={light} alt="" className="size-6 shrink-0 object-contain" />;
}

/** mulberry32 — deterministic PRNG so the mock inventory is stable across
 *  renders/SSR (same recipe as the customers table). */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GENERATED_NAMES = [
  "Invoice", "Contract", "Payroll Sheet", "Quarterly report", "Pitch deck",
  "Budget plan", "Onboarding video", "Team photo", "Meeting notes", "Roadmap",
];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 1,262 files — the Figma toolbar's "Stored in 1,262 files" is the real
 *  count of this inventory. The first five rows pin Figma's exact examples
 *  (names, dates, sizes, selection); the rest are generated. */
const STORED_FILES: StoredFile[] = (() => {
  const pinned: Array<Omit<StoredFile, "id" | "uploadedStamp">> = [
    { name: "Invoice 1", kind: "document", uploadedOn: "May 11, 2026", sizeLabel: "4 MB", bytes: 4 * 1024 * 1024 },
    { name: "Payroll Sheet", kind: "spreadsheet", uploadedOn: "May 11, 2026", sizeLabel: "539 KB", bytes: 539 * 1024, selected: true },
    { name: "Welcome video", kind: "video", uploadedOn: "May 11, 2026", sizeLabel: "36 MB", bytes: 36 * 1024 * 1024 },
    { name: "Payroll Sheet", kind: "spreadsheet", uploadedOn: "May 11, 2026", sizeLabel: "539 KB", bytes: 539 * 1024, selected: true },
    { name: "Invoice 1", kind: "document", uploadedOn: "May 11, 2026", sizeLabel: "4 MB", bytes: 4 * 1024 * 1024 },
  ];

  const rng = makeRng(26);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const kinds: FileKind[] = ["document", "document", "spreadsheet", "video"];
  const total = 1262;

  return Array.from({ length: total }, (_, i): StoredFile => {
    if (i < pinned.length) {
      return { ...pinned[i], id: `file-${i}`, uploadedStamp: total - i };
    }
    const kind = pick(kinds);
    const bytes = Math.floor(
      kind === "video" ? (4 + rng() * 60) * 1024 * 1024 : 40 * 1024 + rng() * 7 * 1024 * 1024,
    );
    const month = Math.floor(rng() * 5); // Jan–May 2026, before the pinned rows
    const day = 1 + Math.floor(rng() * 28);
    return {
      id: `file-${i}`,
      name: `${pick(GENERATED_NAMES)} ${1 + Math.floor(rng() * 40)}`,
      kind,
      uploadedOn: `${MONTH_LABELS[month]} ${day}, 2026`,
      uploadedStamp: total - i,
      sizeLabel: formatFileSize(bytes),
      bytes,
    };
  });
})();

/* ------------------------------------------------------------------- table */

type SortKey = "name" | "uploadedOn" | "bytes";
type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

const PER_PAGE = 6;

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const active = sort?.key === sortKey;
  return (
    <button
      type="button"
      aria-label={`Sort by ${label}`}
      onClick={() => onSort(sortKey)}
      className="flex cursor-pointer items-center gap-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring"
    >
      <span className={cx("text-body-medium whitespace-nowrap", active ? "text-text-primary" : "text-text-tertiary")}>
        {label}
      </span>
      <span className="flex size-6 shrink-0 items-center justify-center">
        <ChevronSortDown
          className={cx(
            "size-6 transition-[transform,color] duration-150 ease",
            active ? "text-text-secondary" : "text-text-tertiary",
            active && sort?.dir === "asc" && "rotate-180",
          )}
        />
      </span>
    </button>
  );
}

function RowActionButton({ icon, label }: { icon: typeof RiDeleteBin6Line; label: string }) {
  return (
    <TooltipTrigger delay={200}>
      <Focusable>
        <IconButton icon={icon} size="small" aria-label={label} />
      </Focusable>
      <Tooltip size="md">{label}</Tooltip>
    </TooltipTrigger>
  );
}

const MORE_MENU_ACTIONS = [
  { icon: RiDownload2Line, label: "Download file" },
  { icon: RiEditLine, label: "Rename" },
  { icon: RiFileCopyLine, label: "Copy link" },
] as const;

/** The "⋮" action: tooltip on hover, contextual menu on click — same recipe
 *  as the customers table's more-menu (trigger styled as a small secondary
 *  IconButton because nesting the real one would nest <button>s). */
function RowMoreMenu({ name }: { name: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger delay={200}>
        <DropdownTrigger
          aria-label={`More actions for ${name}`}
          className={cx(
            "relative inline-flex size-8 shrink-0 items-center justify-center rounded-2lg",
            "border border-border-button-default bg-background-primary-default text-foreground-icon-primary shadow-xs",
            "transition-[background-color,border-color,box-shadow,color] duration-150 ease",
            "hover:border-border-button-hover hover:bg-background-primary-hover",
            isOpen && "border-border-button-active bg-background-primary-active",
          )}
        >
          <RiMore2Fill className="size-4 shrink-0" aria-hidden />
        </DropdownTrigger>
        <Tooltip size="md">More actions</Tooltip>
      </TooltipTrigger>
      <DropdownPopover aria-label={`More actions for ${name}`} placement="bottom end" className="w-[200px] p-2">
        <DropdownGroup>
          {MORE_MENU_ACTIONS.map(({ icon: Icon, label }) => (
            <DropdownItem key={label} onSelect={() => setIsOpen(false)} className="px-2 py-1.5">
              <Icon className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
              <span className="truncate text-body-medium whitespace-nowrap text-text-primary">{label}</span>
            </DropdownItem>
          ))}
        </DropdownGroup>
      </DropdownPopover>
    </Dropdown>
  );
}

type RowAnimationPhase = "idle" | "entering" | "exiting";
const ROW_EXIT_DURATION_MS = 225;

/** Shared row transition shell. Entry reveals a newly uploaded row from
 *  beneath the header; exit plays the exact structural reverse before the
 *  item is removed from state. */
function AnimatedRow({
  phase,
  children,
}: {
  phase: RowAnimationPhase;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "grid grid-rows-[1fr]",
        phase === "entering" && "animate-row-grow-in",
        phase === "exiting" && "pointer-events-none animate-row-collapse-out",
      )}
    >
      <div className="overflow-hidden">
        <div
          className={cx(
            phase === "entering" && "animate-row-slide-in",
            phase === "exiting" && "animate-row-slide-out",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- page */

export function SettingsStorage() {
  const [files, setFiles] = useState<StoredFile[]>(STORED_FILES);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(STORED_FILES.filter((f) => f.selected).map((f) => f.id)),
  );
  const [page, setPage] = useState(1);
  const [kindFilter, setKindFilter] = useState("all");
  const [recency, setRecency] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  // The row that just arrived from the dropzone — its table row plays the
  // grow-in entrance; cleared once the animation has run so pagination
  // round-trips don't replay it.
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const justAddedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(
    () => () => {
      if (justAddedTimer.current) clearTimeout(justAddedTimer.current);
      for (const timer of deleteTimers.current.values()) clearTimeout(timer);
      deleteTimers.current.clear();
    },
    [],
  );

  const onSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = files.filter(
      (f) =>
        (kindFilter === "all" || f.kind === kindFilter) &&
        (q === "" || f.name.toLowerCase().includes(q)),
    );
    if (sort) {
      const { key, dir } = sort;
      rows.sort((a, b) => {
        const cmp =
          key === "name"
            ? a.name.localeCompare(b.name)
            : key === "bytes"
              ? a.bytes - b.bytes
              : a.uploadedStamp - b.uploadedStamp;
        return dir === "asc" ? cmp : -cmp;
      });
    } else {
      rows.sort((a, b) =>
        recency === "newest" ? b.uploadedStamp - a.uploadedStamp : a.uploadedStamp - b.uploadedStamp,
      );
    }
    return rows;
  }, [files, kindFilter, query, sort, recency]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const selectedOnPage = rows.filter((f) => selected.has(f.id)).length;
  const allOnPageSelected = rows.length > 0 && selectedOnPage === rows.length;
  const someOnPageSelected = selectedOnPage > 0 && !allOnPageSelected;

  const toggleRow = (id: string, isSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllOnPage = (isSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const f of rows) {
        if (isSelected) next.add(f.id);
        else next.delete(f.id);
      }
      return next;
    });
  };

  const deleteFile = (id: string) => {
    if (deleteTimers.current.has(id)) return;
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    deleteTimers.current.set(
      id,
      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        setSelected((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        deleteTimers.current.delete(id);
      }, ROW_EXIT_DURATION_MS),
    );
  };

  return (
    // pt-2.5 gives the percentage badge (which straddles the dropzone's top
    // border, overhanging 9.5px) headroom inside the modal's scroll clip.
    <div className="flex w-full flex-col gap-6 pt-2.5">
      <FileUpload
        renderFileIcon={(file) => <StoredFileIcon kind={kindForFile(file.name)} />}
        onUploadComplete={(file) => {
          const now = new Date();
          const storedFile: StoredFile = {
            id: `upload-${now.getTime()}`,
            name: file.name.replace(/\.[^.]+$/, ""),
            kind: kindForFile(file.name),
            uploadedOn: now.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            uploadedStamp: 10_000 + now.getTime() / 1000,
            sizeLabel: formatFileSize(file.size),
            bytes: file.size,
          };
          setFiles((prev) => [storedFile, ...prev]);
          setPage(1);
          setJustAddedId(storedFile.id);
          if (justAddedTimer.current) clearTimeout(justAddedTimer.current);
          justAddedTimer.current = setTimeout(() => setJustAddedId(null), 700);
        }}
      />

      <section className="flex w-full flex-col rounded-2xl border border-border-table pt-2 pb-3">
        {/* Toolbar */}
        <div className="flex w-full flex-col items-start gap-3 px-3 py-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col justify-center">
            <p className="text-body-medium whitespace-nowrap text-text-tertiary">Stored in</p>
            <p className="text-body-medium whitespace-nowrap text-text-primary">
              {filtered.length.toLocaleString()} files
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Select
              aria-label="Filter by file type"
              className="shrink-0"
              selectedKey={kindFilter}
              onSelectionChange={(k) => {
                setKindFilter(String(k));
                setPage(1);
              }}
            >
              <SelectItem id="all" textValue="File type">
                File type
              </SelectItem>
              {(Object.keys(KIND_LABELS) as FileKind[]).map((kind) => (
                <SelectItem key={kind} id={kind} textValue={KIND_LABELS[kind]}>
                  {KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </Select>
            <Select
              aria-label="Order by"
              className="shrink-0"
              selectedKey={recency}
              onSelectionChange={(k) => {
                setRecency(k as "newest" | "oldest");
                setSort(null);
                setPage(1);
              }}
            >
              <SelectItem id="newest" textValue="Modified">
                Modified
              </SelectItem>
              <SelectItem id="oldest" textValue="Oldest first">
                Oldest first
              </SelectItem>
            </Select>
            <InputBase
              aria-label="Search files"
              placeholder="Search"
              leadingIcon={RiSearchLine}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              fieldClassName="w-[153px] rounded-full bg-background-secondary-default"
              className="text-body-medium"
            />
          </div>
        </div>

        {/* Column headers */}
        <div className="mt-2 flex w-full items-center border-y border-separator-border bg-background-secondary-default pl-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5">
            <Checkbox
              isSelected={allOnPageSelected}
              isIndeterminate={someOnPageSelected}
              onChange={toggleAllOnPage}
              aria-label="Select all files on this page"
            />
            <SortableHeader label="File name" sortKey="name" sort={sort} onSort={onSort} />
          </div>
          <div className="flex w-[150px] shrink-0 items-center px-3 py-2.5">
            <SortableHeader label="Uploaded on" sortKey="uploadedOn" sort={sort} onSort={onSort} />
          </div>
          <div className="flex w-[104px] shrink-0 items-center px-3 py-2.5">
            <SortableHeader label="File size" sortKey="bytes" sort={sort} onSort={onSort} />
          </div>
          <div className="flex w-[116px] shrink-0 items-center px-3 py-2.5">
            <span className="text-body-medium whitespace-nowrap text-text-tertiary">Actions</span>
          </div>
        </div>

        {/* Rows */}
        <div className="flex w-full flex-col pl-3">
          {rows.length > 0 ? (
            rows.map((file) => {
              const phase: RowAnimationPhase = deletingIds.has(file.id)
                ? "exiting"
                : file.id === justAddedId
                  ? "entering"
                  : "idle";
              return (
                <AnimatedRow key={file.id} phase={phase}>
                  <div className="flex w-full items-center border-b border-separator-border">
                    <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5">
                      <Checkbox
                        isSelected={selected.has(file.id)}
                        onChange={(isSelected) => toggleRow(file.id, isSelected)}
                        aria-label={`Select ${file.name}`}
                      />
                      <div className="flex min-w-0 items-center gap-2">
                        <StoredFileIcon kind={file.kind} />
                        <span className="truncate text-body-medium text-text-primary">
                          {file.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex w-[150px] shrink-0 items-center px-3 py-2.5">
                      <span className="text-body-medium whitespace-nowrap text-text-primary">
                        {file.uploadedOn}
                      </span>
                    </div>
                    <div className="flex w-[104px] shrink-0 items-center px-3 py-2.5">
                      <Chip variant="subtle" color="gray">
                        {file.sizeLabel}
                      </Chip>
                    </div>
                    <div className="flex w-[116px] shrink-0 items-center justify-end gap-2.5 px-3 py-2.5">
                      <span onClick={() => deleteFile(file.id)}>
                        <RowActionButton icon={RiDeleteBin6Line} label="Delete file" />
                      </span>
                      <RowMoreMenu name={file.name} />
                    </div>
                  </div>
                </AnimatedRow>
              );
            })
          ) : (
            <div className="flex w-full items-center justify-center py-10 pr-3">
              <span className="text-body-medium text-text-tertiary">No files match your filters.</span>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="px-3 pt-3">
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </div>
      </section>
    </div>
  );
}
