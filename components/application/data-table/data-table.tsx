"use client";

import { useMemo, useState } from "react";
import {
  RiArchiveLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiEditLine,
  RiFileCopyLine,
  RiMore2Fill,
  RiSearchLine,
  RiUserLine,
} from "@remixicon/react";
import { Focusable } from "react-aria-components";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import { Avatar } from "@/components/base/avatar/avatar";
import { Chip } from "@/components/base/badges/chip";
import { StatusDot } from "@/components/base/badges/status-dot";
import { IconButton } from "@/components/base/buttons/icon-button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/components/base/dropdown/dropdown";
import { InputBase } from "@/components/base/input/input";
import { Pagination } from "@/components/base/pagination/pagination";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/base/segmented-control/segmented-control";
import { Select, SelectItem } from "@/components/base/select/select";
import type { SelectSize } from "@/components/base/select/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/components/base/table/table";
import type { TableSize } from "@/components/base/table/table";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { ChevronSortDown } from "@/components/foundations/icons/chevrons";
import { cx } from "@/utils/cx";

/**
 * Advanced Data Table - the react-aria `Table` primitive rendered from a
 * @tanstack/react-table instance, styled to match the dashboard template's
 * customers table (node 3731:3201). TanStack owns sorting / pagination / row
 * selection; the price/product/region/search filters pre-filter the rows.
 */

type StatusColor = "lime" | "yellow" | "rose" | "cyan";
type Status = { label: string; color: StatusColor };

const STATUSES: Status[] = [
  { label: "Shipped", color: "lime" },
  { label: "Delivery waiting", color: "yellow" },
  { label: "Delivery failed", color: "rose" },
  { label: "Confirmed", color: "cyan" },
];

const PRODUCTS = ["Sneakers", "Backpack", "Smart watch", "Headphones", "Sunglasses", "Wallet"];
const REGIONS = ["North America", "Europe", "Asia", "Oceania"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PRICE_BUCKETS: { id: string; label: string; test: (p: number) => boolean }[] = [
  { id: "all", label: "All prices", test: () => true },
  { id: "under-100", label: "Under $100", test: (p) => p < 100 },
  { id: "100-500", label: "$100 – $500", test: (p) => p >= 100 && p <= 500 },
  { id: "500-1000", label: "$500 – $1,000", test: (p) => p > 500 && p <= 1000 },
  { id: "over-1000", label: "Over $1,000", test: (p) => p > 1000 },
];

type Customer = {
  id: string;
  name: string;
  avatar?: string;
  initialsColor: "neutral" | "blue";
  purchase: "completed" | "waiting" | "processing";
  status: Status;
  product: string;
  region: string;
  price: number;
  updated: string;
  updatedTs: number;
};

const PHOTO_PEOPLE: { name: string; avatar: string }[] = [
  { name: "John Clarkson", avatar: "/avatars/john-clarkson.webp" },
  { name: "Aspen Lubin", avatar: "/avatars/aspen-lubin.webp" },
  { name: "Michael Ekstrom", avatar: "/avatars/michael-ekstrom.webp" },
  { name: "Kianna Vaccaro", avatar: "/avatars/kianna-vaccaro.webp" },
  { name: "Livia Saris", avatar: "/avatars/livia-saris.webp" },
  { name: "Jaydon Aminoff", avatar: "/avatars/jaydon-aminoff.webp" },
  { name: "Maria Lubin", avatar: "/avatars/maria-lubin.webp" },
  { name: "Ann Press", avatar: "/avatars/ann-press.webp" },
];

const FIRST_NAMES = ["Marcus", "Cheyenne", "Alfredo", "Talan", "Roger", "Cristofer", "Emery", "Kadin", "Nolan", "Ruben", "Skylar", "Hanna", "Corey", "Miracle", "Zaire", "Cooper", "Leilani", "Alena", "Terry", "Jaxson"];
const LAST_NAMES = ["Culhane", "Herwitz", "Septimus", "Bergson", "Curtis", "Vetrovs", "Rhiel", "Dokidis", "Kenter", "Stanton", "Baptista", "Workman", "Torff", "Calzoni", "Rosser", "Geidt", "Bator", "Vaccaro", "Lipshutz", "Botosh"];

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

function formatPrice(n: number) {
  return n >= 1000 ? `$${Math.floor(n / 1000)}.${String(n % 1000).padStart(3, "0")}` : `$${n}`;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const CUSTOMERS: Customer[] = (() => {
  const rng = makeRng(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  return Array.from({ length: 48 }, (_, i) => {
    const status = pick(STATUSES);
    const purchase: Customer["purchase"] =
      rng() < 0.24
        ? "processing"
        : status.label === "Shipped" || status.label === "Confirmed"
          ? "completed"
          : "waiting";
    const price = 20 + Math.floor(rng() * 3980);
    const monthIdx = Math.floor(rng() * 12);
    const day = 1 + Math.floor(rng() * 28);
    const updated = `${MONTHS[monthIdx]} ${String(day).padStart(2, "0")}, 2026`;
    const updatedTs = new Date(2026, monthIdx, day).getTime();
    const base = {
      id: String(i),
      purchase,
      status,
      product: pick(PRODUCTS),
      region: pick(REGIONS),
      price,
      updated,
      updatedTs,
    };
    if (i < PHOTO_PEOPLE.length) {
      return { ...base, name: PHOTO_PEOPLE[i].name, avatar: PHOTO_PEOPLE[i].avatar, initialsColor: "neutral" as const };
    }
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    return { ...base, name, initialsColor: rng() > 0.5 ? ("blue" as const) : ("neutral" as const) };
  });
})();

const PER_PAGE = 8;

function PurchaseSelect({
  value,
  name,
  size = "md",
}: {
  value: Customer["purchase"];
  name: string;
  size?: SelectSize;
}) {
  return (
    <Select
      aria-label={`Purchase status for ${name}`}
      defaultSelectedKey={value}
      size={size}
      className={size === "sm" ? "w-[132px]" : "w-[142px]"}
    >
      <SelectItem id="completed" textValue="Completed">
        <StatusDot color="green" />
        Completed
      </SelectItem>
      <SelectItem id="waiting" textValue="Waiting">
        <StatusDot color="yellow" />
        Waiting
      </SelectItem>
      <SelectItem id="processing" textValue="Processing">
        <StatusDot color="indigo" />
        Processing
      </SelectItem>
    </Select>
  );
}

function SortChevron({ dir }: { dir: false | "asc" | "desc" }) {
  return (
    <ChevronSortDown
      className={cx(
        "size-6 shrink-0 transition-[transform,color] duration-150",
        dir === "asc" && "rotate-180",
        dir ? "text-text-secondary" : "text-text-tertiary",
      )}
    />
  );
}

/** Icon-only row action with a tooltip label - `IconButton` (a plain
 *  `<button>`) is wrapped in `Focusable` so react-aria's `TooltipTrigger`
 *  can attach hover/focus behavior. */
function RowActionButton({
  icon,
  label,
}: {
  icon: typeof RiEditLine;
  label: string;
}) {
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
  { icon: RiUserLine, label: "View profile" },
  { icon: RiFileCopyLine, label: "Duplicate row" },
  { icon: RiDownload2Line, label: "Download invoice" },
  { icon: RiArchiveLine, label: "Archive customer" },
] as const;

/** The "⋮" action: tooltip on hover, contextual dropdown menu on click. The
 *  trigger is styled to match `IconButton`'s small secondary recipe (nesting
 *  the real IconButton inside DropdownTrigger would nest <button>s). */
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
      <DropdownPopover aria-label={`More actions for ${name}`} placement="bottom end" className="w-[220px] p-2">
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

export function DataTableExample({
  showSizeToggle = true,
  pageSize = PER_PAGE,
}: {
  /** Show the Normal / Compact density control below the table. */
  showSizeToggle?: boolean;
  /** Rows per page - the landing collage shows the 5-row crop from Figma. */
  pageSize?: number;
} = {}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({ "1": true, "2": true });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
  const [priceFilter, setPriceFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<TableSize>("md");
  const avatarSize = size === "sm" ? "xs" : "sm";

  const data = useMemo(() => {
    const bucket = PRICE_BUCKETS.find((b) => b.id === priceFilter) ?? PRICE_BUCKETS[0];
    const q = query.trim().toLowerCase();
    return CUSTOMERS.filter(
      (c) =>
        bucket.test(c.price) &&
        (productFilter === "all" || c.product === productFilter) &&
        (regionFilter === "all" || c.region === regionFilter) &&
        (q === "" || c.name.toLowerCase().includes(q)),
    );
  }, [priceFilter, productFilter, regionFilter, query]);

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Customer name",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Checkbox
                slot={null}
                aria-label={`Select ${c.name}`}
                isSelected={row.getIsSelected()}
                onChange={(v) => row.toggleSelected(!!v)}
              />
              {c.avatar ? (
                <Avatar size={avatarSize} src={c.avatar} alt="" />
              ) : (
                <Avatar size={avatarSize} color={c.initialsColor} initials={initialsOf(c.name)} />
              )}
              <span className="truncate text-body-medium text-text-primary">{c.name}</span>
            </div>
          );
        },
      },
      {
        id: "purchase",
        enableSorting: false,
        header: "Purchase",
        cell: ({ row }) => (
          <PurchaseSelect value={row.original.purchase} name={row.original.name} size={size} />
        ),
      },
      {
        id: "status",
        enableSorting: false,
        header: "Status",
        cell: ({ row }) => (
          <Chip variant={size === "sm" ? "caption" : "bold"} color={row.original.status.color}>
            {row.original.status.label}
          </Chip>
        ),
      },
      {
        accessorKey: "updatedTs",
        header: "Last updated",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-body-medium text-text-primary">{row.original.updated}</span>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => (
          <Chip variant={size === "sm" ? "caption" : "subtle"} color="gray">
            {formatPrice(row.original.price)}
          </Chip>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2.5">
            <RowActionButton icon={RiDeleteBin6Line} label="Delete" />
            <RowActionButton icon={RiEditLine} label="Edit" />
            <RowMoreMenu name={row.original.name} />
          </div>
        ),
      },
    ],
    [avatarSize, size],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, rowSelection, pagination },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
  });

  const resetPage = () => table.setPageIndex(0);
  const headers = table.getHeaderGroups()[0].headers;
  const rows = table.getRowModel().rows;
  const totalPages = table.getPageCount();
  const colWidths: Record<string, string> = {
    name: "w-[240px]",
    purchase: "w-[172px]",
    status: "w-[168px]",
    updatedTs: "w-[160px]",
    price: "w-[140px]",
    actions: "w-[132px]",
  };

  return (
    <div className="flex w-full flex-col items-center gap-5">
    <section
      className={cx(
        "flex w-full flex-col rounded-2xl border border-border-table pt-2",
        totalPages > 1 ? "pb-3" : "pb-0",
      )}
    >
      {/* Toolbar */}
      <div className="flex w-full flex-col items-start gap-3 px-3 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col justify-center">
          <p className="text-body-medium whitespace-nowrap text-text-tertiary">Total Results</p>
          <p className="text-body-medium whitespace-nowrap text-text-primary">
            {data.length.toLocaleString()} customers
          </p>
        </div>
        <div className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-2.5 overflow-x-auto px-3 sm:mx-0 sm:w-auto sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0">
          <Select
            aria-label="Filter by price"
            className="shrink-0"
            popoverClassName="min-w-40"
            selectedKey={priceFilter}
            onSelectionChange={(k) => {
              setPriceFilter(String(k));
              resetPage();
            }}
          >
            {PRICE_BUCKETS.map((b) => (
              <SelectItem key={b.id} id={b.id} textValue={b.label}>
                {b.label}
              </SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Filter by product"
            className="shrink-0"
            popoverClassName="min-w-40"
            selectedKey={productFilter}
            onSelectionChange={(k) => {
              setProductFilter(String(k));
              resetPage();
            }}
          >
            <SelectItem id="all" textValue="All products">
              All products
            </SelectItem>
            {PRODUCTS.map((p) => (
              <SelectItem key={p} id={p} textValue={p}>
                {p}
              </SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Filter by region"
            className="shrink-0"
            popoverClassName="min-w-40"
            selectedKey={regionFilter}
            onSelectionChange={(k) => {
              setRegionFilter(String(k));
              resetPage();
            }}
          >
            <SelectItem id="all" textValue="All regions">
              All regions
            </SelectItem>
            {REGIONS.map((r) => (
              <SelectItem key={r} id={r} textValue={r}>
                {r}
              </SelectItem>
            ))}
          </Select>
          <InputBase
            aria-label="Search customers"
            placeholder="Search"
            leadingIcon={RiSearchLine}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            fieldClassName="min-w-[153px] flex-1 rounded-full bg-background-secondary-default sm:w-[153px] sm:min-w-0 sm:flex-none"
            className="text-body-medium"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-2">
        <Table aria-label="Customers" size={size} selectionMode="none" className="min-w-[1000px]">
          <TableHeader>
            {headers.map((header) => {
              const id = header.column.id;
              const canSort = header.column.getCanSort();
              const label = flexRender(header.column.columnDef.header, header.getContext());
              return (
                <TableColumn key={header.id} id={header.id} isRowHeader={id === "name"} className={colWidths[id]}>
                  {id === "name" ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        slot={null}
                        aria-label="Select all customers on this page"
                        isSelected={table.getIsAllPageRowsSelected()}
                        isIndeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
                        onChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                      />
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex cursor-pointer items-center gap-0.5"
                      >
                        {label}
                        <SortChevron dir={header.column.getIsSorted()} />
                      </button>
                    </div>
                  ) : canSort ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="flex cursor-pointer items-center gap-0.5"
                    >
                      {label}
                      <SortChevron dir={header.column.getIsSorted()} />
                    </button>
                  ) : (
                    label
                  )}
                </TableColumn>
              );
            })}
          </TableHeader>
          <TableBody
            renderEmptyState={() => (
              <div className="flex h-40 items-center justify-center text-body-medium text-text-tertiary">
                No customers match your filters.
              </div>
            )}
          >
            {rows.map((row) => {
              const selected = row.getIsSelected();
              return (
                <TableRow
                  key={row.id}
                  id={row.id}
                  style={
                    selected
                      ? { backgroundColor: "var(--color-background-secondary-default)" }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={colWidths[cell.column.id]}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div className="px-3 pt-3">
          <Pagination
            page={pagination.pageIndex + 1}
            totalPages={totalPages}
            onChange={(p) => table.setPageIndex(p - 1)}
          />
        </div>
      )}
    </section>

      {showSizeToggle && (
        <SegmentedControl
          aria-label="Table density"
          selectedKeys={new Set([size])}
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (next) setSize(next as TableSize);
          }}
        >
          <SegmentedControlItem id="md">Normal</SegmentedControlItem>
          <SegmentedControlItem id="sm">Compact</SegmentedControlItem>
        </SegmentedControl>
      )}
    </div>
  );
}
