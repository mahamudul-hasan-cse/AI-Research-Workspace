"use client";

import { useState, type FormEvent } from "react";
import { ModalDialog } from "@/components/modal-dialog";

export function ModalDemo() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = name.trim() || "Untitled workspace";
    setSaved(pinned ? `${label} (pinned)` : label);
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        Open modal
      </button>
      <p aria-live="polite" className="text-sm text-muted">
        {saved ? `Saved: ${saved}` : "Nothing saved yet."}
      </p>

      <ModalDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create workspace"
        description="Name your new research workspace. Press Escape or Close to cancel."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="workspace-name" className="block text-sm font-medium">
              Workspace name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(event) => setPinned(event.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Pin to sidebar
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
            >
              Close
            </button>
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Save
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
