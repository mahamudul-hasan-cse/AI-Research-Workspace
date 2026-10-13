"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { ModalDialog } from "@/components/modal-dialog";

export const WORKSPACE_NAME_MIN = 3;
export const WORKSPACE_NAME_MAX = 60;

/** Returns the error to show for a workspace name, or null if it is valid. */
export function validateWorkspaceName(value: string): string | null {
  const name = value.trim();
  if (name === "") return "Enter a workspace name.";
  if (name.length < WORKSPACE_NAME_MIN) {
    return `Use at least ${WORKSPACE_NAME_MIN} characters.`;
  }
  if (name.length > WORKSPACE_NAME_MAX) {
    return `Use ${WORKSPACE_NAME_MAX} characters or fewer.`;
  }
  return null;
}

export function ModalDemo() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateWorkspaceName(name);
    if (error) {
      setNameError(error);
      nameRef.current?.focus();
      return;
    }
    const label = name.trim();
    setSaved(pinned ? `${label} (pinned)` : label);
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setNameError(null);
          setOpen(true);
        }}
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
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="workspace-name" className="block text-sm font-medium">
              Workspace name
            </label>
            <input
              ref={nameRef}
              id="workspace-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                // Once shown, the error tracks the field so it clears as soon as the name is fixed.
                if (nameError) setNameError(validateWorkspaceName(event.target.value));
              }}
              required
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? errorId : undefined}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm aria-invalid:border-danger"
            />
            {nameError ? (
              <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-danger">
                {nameError}
              </p>
            ) : null}
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
