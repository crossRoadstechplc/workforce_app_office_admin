"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { ApiDocView } from "@/components/developer/api-doc-view";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { findApiDoc } from "@/features/developer/registry";

export default function DeveloperDocPage() {
  const params = useParams<{ slug: string }>();
  const doc = findApiDoc(params?.slug);
  return (
    <CompanyAdminGate>
      {doc ? (
        <ApiDocView doc={doc} />
      ) : (
        <EmptyState
          title="Guide not found"
          description="This developer guide does not exist or was moved."
          action={
            <Button asChild variant="outline">
              <Link href="/developer">Back to Developer</Link>
            </Button>
          }
        />
      )}
    </CompanyAdminGate>
  );
}
