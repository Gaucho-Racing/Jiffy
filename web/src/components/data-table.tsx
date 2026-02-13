import React from "react";

import {
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  ColumnFiltersState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { PurchaseRequest, PurchaseRequestStatus } from "@/models/pr";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useUser } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface DataTableProps {
  data: PurchaseRequest[];
}

export function DataTable({ data }: DataTableProps) {
  const currentUser = useUser();
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "id", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility] = React.useState({ user_id: false });
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [viewMineOnly, setViewMineOnly] = React.useState(false);
  const [subteamFilters, setSubteamFilters] = React.useState<string[]>([]);
  const [statusFilters, setStatusFilters] = React.useState<
    PurchaseRequestStatus[]
  >([]);
  const [subteamOpen, setSubteamOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const subteamCloseTimeout = React.useRef<number | null>(null);
  const statusCloseTimeout = React.useRef<number | null>(null);

  const expandRow = (rowId: number) => {
    setSelectedRow((prev) => (prev === rowId ? null : rowId));
  };

  const subteamOptions = React.useMemo(() => {
    const unique = new Set<string>();
    data.forEach((pr) => {
      if (pr.department_id) {
        unique.add(pr.department_id);
      }
    });
    return Array.from(unique).sort();
  }, [data]);

  const subteamCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((pr) => {
      if (!pr.department_id) {
        return;
      }
      counts[pr.department_id] = (counts[pr.department_id] ?? 0) + 1;
    });
    return counts;
  }, [data]);

  const statusOptions = React.useMemo(
    () => Object.values(PurchaseRequestStatus),
    [],
  );

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((pr) => {
      if (!pr.status) {
        return;
      }
      counts[pr.status] = (counts[pr.status] ?? 0) + 1;
    });
    return counts;
  }, [data]);

  const isPartialSubteam =
    subteamFilters.length > 0 && subteamFilters.length < subteamOptions.length;
  const isPartialStatus =
    statusFilters.length > 0 && statusFilters.length < statusOptions.length;

  const toggleSubteam = (value: string) => {
    setSubteamFilters((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const toggleStatus = (value: PurchaseRequestStatus) => {
    setStatusFilters((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const getStatusStyle = (status: PurchaseRequestStatus) => {
    switch (status) {
      case PurchaseRequestStatus.PurchaseRequestApproved:
        return "bg-green-600/70 border-green-600 text-green-100";
      case PurchaseRequestStatus.PurchaseRequestRejected:
        return "bg-red-600/50 border-red-600 text-red-100";
      case PurchaseRequestStatus.PurchaseRequestPending:
        return "bg-cyan-600/70 border-cyan-500/50 text-cyan-100";
      case PurchaseRequestStatus.PurchaseRequestOrdered:
        return "bg-blue-600/60 border-blue-600 text-white";
      case PurchaseRequestStatus.PurchaseRequestCollected:
        return "bg-gr-purple/60 border-gr-purple text-white";
      case PurchaseRequestStatus.PurchaseRequestReimbursed:
        return "bg-gr-pink/50 border-gr-pink text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  const openSubteam = () => {
    if (subteamCloseTimeout.current) {
      window.clearTimeout(subteamCloseTimeout.current);
      subteamCloseTimeout.current = null;
    }
    setSubteamOpen(true);
  };

  const closeSubteam = () => {
    if (subteamCloseTimeout.current) {
      window.clearTimeout(subteamCloseTimeout.current);
    }
    subteamCloseTimeout.current = window.setTimeout(() => {
      setSubteamOpen(false);
    }, 150);
  };

  const openStatus = () => {
    if (statusCloseTimeout.current) {
      window.clearTimeout(statusCloseTimeout.current);
      statusCloseTimeout.current = null;
    }
    setStatusOpen(true);
  };

  const closeStatus = () => {
    if (statusCloseTimeout.current) {
      window.clearTimeout(statusCloseTimeout.current);
    }
    statusCloseTimeout.current = window.setTimeout(() => {
      setStatusOpen(false);
    }, 150);
  };

  const columns = React.useMemo<ColumnDef<PurchaseRequest>[]>(
    () => [
      {
        accessorKey: "user_id",
        header: "",
        size: 0,
        enableSorting: false,
        enableHiding: true,
        filterFn: (row, id, value) => row.getValue(id) === value,
        cell: () => null,
      },
      {
        id: "expand",
        header: "",
        size: 50,
        maxSize: 50,
        cell: ({ row }) => {
          const value = row.original.id;
          const isExpanded = selectedRow === value;
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                expandRow(value);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          );
        },
      },
      {
        accessorKey: "id",
        header: "ID",
        size: 48,
        maxSize: 48,
        minSize: 48,
        cell: ({ row }) => {
          const value = row.original.id;
          return <div>{value}</div>;
        },
      },
      {
        id: "requester",
        accessorFn: (row) =>
          row.user ? `${row.user.first_name} ${row.user.last_name}` : "",
        header: "Requester",
        size: 140,
        maxSize: 140,
        minSize: 140,
        cell: ({ row }) => {
          const value =
            row.original.user?.first_name + " " + row.original.user?.last_name;
          return <div className="truncate whitespace-nowrap">{value}</div>;
        },
      },
      {
        accessorKey: "department_id",
        header: () => <span>Subteam</span>,
        size: 84,
        maxSize: 84,
        minSize: 84,
        filterFn: (row, id, value) =>
          Array.isArray(value)
            ? value.includes(row.getValue(id))
            : row.getValue(id) === value,
        cell: ({ row }) => {
          const value = row.original.department_id;
          return <div className="truncate whitespace-nowrap">{value}</div>;
        },
      },
      {
        accessorKey: "component",
        header: "Component",
        size: 250,
        maxSize: 9999,
        minSize: 250,
        cell: ({ row }) => {
          const value = row.original.component;
          return <div className="truncate whitespace-nowrap">{value}</div>;
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        size: 300,
        maxSize: 9999,
        minSize: 300,
        enableSorting: false,
        cell: ({ row }) => {
          const value = row.original.description;
          return <div className="truncate whitespace-nowrap">{value}</div>;
        },
      },
      {
        accessorKey: "needed_by_date",
        header: "Needed By",
        size: 100,
        maxSize: 100,
        minSize: 100,
        cell: ({ row }) => {
          const value = row.original.needed_by_date;
          return (
            <div className="truncate whitespace-nowrap">
              <span>{value ? new Date(value).toLocaleDateString() : ""}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "priority",
        header: "Priority",
        size: 72,
        maxSize: 72,
        minSize: 72,
        cell: ({ row }) => {
          const value = row.original.priority;
          return <div className="whitespace-nowrap">{value}</div>;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 140,
        maxSize: 140,
        minSize: 140,
        filterFn: (row, id, value) =>
          Array.isArray(value)
            ? value.includes(row.getValue(id))
            : row.getValue(id) === value,
        cell: ({ row }) => {
          const status = row.original.status;
          const displayText =
            status === PurchaseRequestStatus.PurchaseRequestReimbursed
              ? `Reimbursed - (${row.original.reimbursement_type || "?"})`
              : status;

          return (
            <span
              className={`whitespace-nowrap rounded-md border px-1 py-0.5 text-xs font-medium ${getStatusStyle(status)}`}
            >
              {displayText}
            </span>
          );
        },
      },
    ],
    [selectedRow],
  );

  React.useEffect(() => {
    const filters: { id: string; value: unknown }[] = [];

    if (viewMineOnly && currentUser.id) {
      filters.push({ id: "user_id", value: currentUser.id });
    }
    if (subteamFilters.length > 0) {
      filters.push({ id: "department_id", value: subteamFilters });
    }
    if (statusFilters.length > 0) {
      filters.push({ id: "status", value: statusFilters });
    }

    setColumnFilters(filters);
  }, [viewMineOnly, currentUser.id, subteamFilters, statusFilters]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: "includesString",
    debugTable: false,
    onSortingChange: setSorting,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <div className="">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm rounded-md border bg-black px-3 py-2"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMineOnly((prev) => !prev)}
          aria-pressed={viewMineOnly}
          className={
            viewMineOnly ? "h-10 bg-accent text-accent-foreground" : "h-10"
          }
        >
          View My PRs
        </Button>
        <Popover open={subteamOpen} onOpenChange={setSubteamOpen}>
          <div onMouseEnter={openSubteam} onMouseLeave={closeSubteam}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={
                  isPartialSubteam
                    ? "h-10 bg-accent text-accent-foreground"
                    : "h-10"
                }
              >
                Subteam
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-60 p-2"
              onMouseEnter={openSubteam}
              onMouseLeave={closeSubteam}
            >
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-xs text-muted-foreground">
                  Filter by Subteam
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setSubteamFilters([])}
                >
                  Reset
                </Button>
              </div>
              <div className="max-h-56 overflow-auto">
                {subteamOptions.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground">
                    No subteams found
                  </div>
                ) : (
                  subteamOptions.map((option) => {
                    const selected = subteamFilters.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleSubteam(option)}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <Check
                          className={
                            selected
                              ? "h-4 w-4 opacity-100"
                              : "h-4 w-4 opacity-0"
                          }
                        />
                        <span>{option}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {subteamCounts[option] ?? 0}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </div>
        </Popover>
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <div onMouseEnter={openStatus} onMouseLeave={closeStatus}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={
                  isPartialStatus
                    ? "h-10 bg-accent text-accent-foreground"
                    : "h-10"
                }
              >
                Status
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-60 p-2"
              onMouseEnter={openStatus}
              onMouseLeave={closeStatus}
            >
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-xs text-muted-foreground">
                  Filter by Status
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setStatusFilters([])}
                >
                  Reset
                </Button>
              </div>
              <div className="max-h-56 overflow-auto">
                {statusOptions.map((option) => {
                  const selected = statusFilters.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleStatus(option)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <Check
                        className={
                          selected ? "h-4 w-4 opacity-100" : "h-4 w-4 opacity-0"
                        }
                      />
                      <span
                        className={`whitespace-nowrap rounded-md border px-1.5 py-0.5 text-xs font-medium ${getStatusStyle(option)}`}
                      >
                        {option}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {statusCounts[option] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </div>
        </Popover>
      </div>
      <div className="overflow-auto rounded-md border">
        <table className="w-full table-fixed">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                      className="whitespace-nowrap px-2 py-2 text-left text-sm"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? "cursor-pointer select-none"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                          title={
                            header.column.getCanSort()
                              ? header.column.getNextSortingOrder() === "asc"
                                ? "Sort ascending"
                                : header.column.getNextSortingOrder() === "desc"
                                  ? "Sort descending"
                                  : "Clear sort"
                              : undefined
                          }
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {{
                            asc: "",
                            desc: "",
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="">
            {table.getRowModel().rows.map((row) => (
              <>
                <tr
                  key={row.id}
                  className="cursor-pointer hover:bg-gray-700/30"
                  onClick={() =>
                    (window.location.href = `/pr/${row.original.id}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="overflow-hidden border-t px-2 text-sm"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>

                {selectedRow === row.original.id && (
                  <tr>
                    <td colSpan={columns.length} className="border-t px-4 py-1">
                      <div>
                        <div className="space-y-1">
                          {row.original.items &&
                          row.original.items.length > 0 ? (
                            row.original.items.map(
                              (item: any, index: number) => (
                                <div
                                  key={index}
                                  className="font-sm grid grid-cols-[1.2fr_14fr_3.2fr_1.5fr_0.5fr] gap-2 text-sm"
                                >
                                  <div className="text-sm">
                                    Item #{index + 1}:
                                  </div>
                                  <div className="text-sm">{item.name}</div>
                                  <div className="">
                                    Unit Price: $
                                    {(item.unit_price_cents / 100).toFixed(2)}
                                  </div>
                                  <div className="">Qty: {item.quantity}</div>
                                  <div>
                                    {item.url && (
                                      <a
                                        href={
                                          item.url.match(/^https?:\/\//)
                                            ? item.url
                                            : `https://${item.url}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 underline"
                                      >
                                        Link
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ),
                            )
                          ) : (
                            <span>No items found</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
