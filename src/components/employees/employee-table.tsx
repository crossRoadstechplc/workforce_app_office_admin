"use client";

import Link from "next/link";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import type { Employee } from "@/types/employee";
import { StatusBadge } from "@/components/ui/badge";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableRow, Td, Th } from "@/components/ui/table-shell";

export function EmployeeTable({ data, onEdit }: { data: Employee[]; onEdit?: (employee: Employee) => void }) {
  const table = useReactTable({ data, columns: buildColumns(onEdit), getCoreRowModel: getCoreRowModel() });
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[850px]">
        <TableHead>
          {table.getHeaderGroups().map((h) => (
            <tr key={h.id}>
              {h.headers.map((x) => (
                <Th key={x.id}>{flexRender(x.column.columnDef.header, x.getContext())}</Th>
              ))}
            </tr>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map((r) => (
            <TableRow key={r.id}>
              {r.getVisibleCells().map((c) => (
                <Td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</Td>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function buildColumns(onEdit?: (employee: Employee) => void): ColumnDef<Employee>[] {
  return [
    {
      header: "Employee",
      cell: ({ row }) => (
        <div>
          <Link className="font-semibold text-slate-950 hover:text-blue-600" href={`/employees/${row.original.id}`}>
            {row.original.firstName} {row.original.lastName}
          </Link>
          <p className="text-xs text-slate-500">
            {row.original.employeeCode} · {row.original.user.email}
          </p>
        </div>
      )
    },
    { header: "Department", accessorFn: (r) => r.department?.name ?? "—" },
    { header: "Office", accessorFn: (r) => r.office?.name ?? "Unassigned" },
    { header: "Schedule", accessorFn: (r) => r.schedule?.name ?? "Unassigned" },
    { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      cell: ({ row }) => (
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="sm" aria-label={`Actions for ${row.original.firstName}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end">
            <DropdownItem asChild>
              <Link href={`/employees/${row.original.id}`}>View employee</Link>
            </DropdownItem>
            {onEdit ? (
              <DropdownItem onClick={() => onEdit(row.original)}>Edit employee</DropdownItem>
            ) : null}
          </DropdownContent>
        </Dropdown>
      )
    }
  ];
}
