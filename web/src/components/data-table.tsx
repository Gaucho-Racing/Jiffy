import React from "react";

import {
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { PurchaseRequest, PurchaseRequestStatus } from "@/models/pr";
import { ExternalLink } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface DataTableProps {
  data: PurchaseRequest[];
}

export function DataTable({ data }: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);

  const expandRow = (rowId: number) => {
    setSelectedRow((prev) => (prev === rowId ? null : rowId));
  };

  const columns = React.useMemo<ColumnDef<PurchaseRequest>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => {
          const value = row.original.id;
          return (
            <div>
              <div className="pl-2 hover:bg-white"> </div>
              <div className="min-w-6">{value}</div>
            </div>
          );
        },
      },
      {
        id: "requester",
        header: "Requester",
        cell: ({ row }) => {
          const value =
            row.original.user?.first_name + " " + row.original.user?.last_name;
          return (
            <div className="min-w-32 overflow-auto whitespace-nowrap">
              {value}
            </div>
          );
        },
      },
      {
        accessorKey: "department_id",
        header: () => <span>Subteam</span>,
        cell: ({ row }) => {
          const value = row.original.department_id;
          return (
            <div className="min-w-16 overflow-auto whitespace-nowrap">
              {value}
            </div>
          );
        },
      },
      {
        accessorKey: "component",
        header: "Component",
        cell: ({ row }) => {
          const value = row.original.component;
          return (
            <div className="min-w-32 overflow-auto whitespace-nowrap">
              {value}
            </div>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        enableSorting: false,
        cell: ({ row }) => {
          const value = row.original.description;
          return (
            <div className="h-8 min-w-96 place-self-center overflow-auto pt-1">
              {value}
            </div>
          );
        },
      },
      {
        accessorKey: "needed_by_date",
        header: "Needed By",
        cell: ({ row }) => {
          const value = row.original.needed_by_date;
          return (
            <div className="min-w-24 overflow-auto whitespace-nowrap">
              <span>{value ? new Date(value).toLocaleDateString() : ""}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => {
          const value = row.original.priority;
          return (
            <div className="min-w-16 overflow-auto whitespace-nowrap">
              {value}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
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

          return (
            <span
              className={` inline-flex max-h-8 items-center justify-center overflow-auto whitespace-nowrap rounded-md border px-1 py-0.5 text-xs font-medium ${getStatusStyle(status)}`}
            >
              {status}
            </span>
          );
        },
      },
      {
        id: "navigate",
        header: "",
        cell: ({ row }) => {
          return (
            <button
              onClick={() => (window.location.href = `/pr/${row.original.id}`)}
              className=" rounded text-sm"
            >
              <div className="px-2">
                <ExternalLink className="h-4 w-4" />
              </div>
            </button>
          );
        },
      },
    ],
    [],
  );


  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    debugTable: true,
    onSortingChange: setSorting,
    state: {
      sorting,
      globalFilter,
    },
  });

  return (
    <div className="">
      <div className="mb-4">
        <Input
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm rounded-md border bg-black px-3 py-2"
        />
      </div>
      <div className="overflow-auto rounded-md border pl-1">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className="px-2 py-2 text-left text-sm"
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
                  onClick={() => expandRow(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="overflow-hidden border-t px-2 text-sm hover:bg-gray-700/30 hover:outline hover:outline-2 hover:outline-offset-1"
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
                    <td colSpan={columns.length} className="border-t px-6 py-2">
                      <div>
                        <div className="space-y-1">
                          {row.original.items &&
                          row.original.items.length > 0 ? (
                            row.original.items.map(
                              (item: any, index: number) => (
                                <div
                                  key={index}
                                  className="font-sm grid grid-cols-[1fr_2fr_2fr_7fr] gap-2 text-sm"
                                >
                                  <div className="font-medium">
                                    Item {index + 1}: {item.name}
                                  </div>
                                  <div className="">
                                    Unit Price: $
                                    {(item.unit_price_cents / 100).toFixed(2)}
                                  </div>
                                  <div className="">
                                    Quantity: {item.quantity}
                                  </div>
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
                                        className="text-blue-600 hover:underline"
                                      >
                                        URL: {item.url}
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
