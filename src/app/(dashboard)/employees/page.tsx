"use client";
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { employeeApi } from "@/features/employees/employee-api";
import { PageHeader } from "@/components/layout/page-header";
import { CreateEmployeeDialog } from "@/components/employees/create-employee-dialog";
import { EmployeeTable } from "@/components/employees/employee-table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
export default function EmployeesPage(){const [search,setSearch]=useState("");const [status,setStatus]=useState("");const [page,setPage]=useState(1);const deferred=useDeferredValue(search);const query=useQuery({queryKey:["employees",page,deferred,status],queryFn:()=>{const p=new URLSearchParams({page:String(page),pageSize:"20"});if(deferred)p.set("search",deferred);if(status)p.set("status",status);return employeeApi.list(p)}}); return <><PageHeader title="Employees" description="Register employees, manage access, and review workforce assignments." action={<CreateEmployeeDialog/>}/><Card><div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input className="pl-9" placeholder="Search name, code, or email" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div><select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}} className="h-10 rounded-lg border bg-white px-3 text-sm"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="TERMINATED">Terminated</option></select></div>{query.isLoading?<div className="space-y-2 p-4">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-14"/>)}</div>:query.data?.items.length?<><EmployeeTable data={query.data.items}/><div className="flex items-center justify-between border-t p-4 text-sm"><p className="text-slate-500">{query.data.meta.total} employees</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</Button><Button variant="outline" size="sm" disabled={page>=query.data.meta.totalPages} onClick={()=>setPage(p=>p+1)}>Next</Button></div></div></>:<EmptyState title="No employees found" description="Adjust your filters or register the first employee."/>}</Card></>}
