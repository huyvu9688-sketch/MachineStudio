import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * Landing page after `deleteAccountAction` succeeds (Unit 5.5). Deliberately
 * public (no `auth.protect()`) — the Clerk session itself is untouched by
 * account deletion (only MachineStudio's own `User` row and everything it
 * owned are gone), so this page must render whether or not that session is
 * still active, and offers `SignOutButton` to end it explicitly rather than
 * leaving the caller signed into an account with no data.
 */
export default function AccountDeletedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base px-6 text-center">
      <p className="text-[16px] font-medium text-text-primary">
        Your account and all its data have been deleted.
      </p>
      <p className="max-w-sm text-[14px] text-text-muted">
        Every project, calculation, and baseline you owned is permanently gone.
        Manufacturer catalog data is unaffected — it was never yours alone.
      </p>
      <div className="mt-2 flex gap-2">
        <SignOutButton redirectUrl="/sign-in">
          <Button type="button" variant="outline">
            Sign out
          </Button>
        </SignOutButton>
        <Button type="button" asChild>
          <Link href="/workspace">Start a new account</Link>
        </Button>
      </div>
    </div>
  );
}
