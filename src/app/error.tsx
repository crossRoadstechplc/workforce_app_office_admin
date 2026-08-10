"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[50vh] place-items-center p-6">
      <div className="max-w-md rounded-2xl border bg-white p-8 text-center">
        <div className="text-2xl font-bold">Something went wrong</div>
        <p className="mt-2 text-sm text-slate-500">
          The portal could not complete this request. Your data remains on the backend; retry the screen.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
