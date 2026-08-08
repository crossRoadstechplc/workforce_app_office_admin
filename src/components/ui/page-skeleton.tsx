import { Skeleton } from "@/components/ui/skeleton";
export function PageSkeleton(){return <div className="space-y-4"><Skeleton className="h-10 w-56"/><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28"/><Skeleton className="h-28"/><Skeleton className="h-28"/></div><Skeleton className="h-96"/></div>}
