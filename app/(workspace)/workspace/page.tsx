import { UserButton } from "@clerk/nextjs";

// Empty authenticated workspace placeholder. The real application shell
// (app bar, navigator, canvas, status bar) is Unit 3.1, a later unit.
export default function WorkspacePage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-base">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-default bg-bg-appbar px-4 text-text-on-accent">
        <span className="text-[16px] font-semibold">MachineStudio</span>
        <UserButton />
      </header>

      <main className="flex flex-1 items-center justify-center">
        <p className="text-[14px] text-text-muted">
          Workspace is empty. Machine projects will appear here.
        </p>
      </main>
    </div>
  );
}
