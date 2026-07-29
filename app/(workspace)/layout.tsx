import { auth } from "@clerk/nextjs/server";

// Every route under this group requires a signed-in user. Per Clerk's
// current guidance, auth is enforced per-resource here rather than via
// middleware route matching (createRouteMatcher is deprecated).
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();

  return <>{children}</>;
}
