"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolInvocation: {
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    state: "partial-call" | "call" | "result";
    result?: unknown;
  };
}

function extractFilename(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1] || path;
}

function getToolMessage(
  toolName: string,
  args: Record<string, unknown>
): string {
  if (toolName === "str_replace_editor") {
    const command = args?.command as string | undefined;
    const path = args?.path as string | undefined;
    const filename = path ? extractFilename(path) : "file";

    switch (command) {
      case "create":
        return `Creating ${filename}`;
      case "str_replace":
      case "insert":
        return `Editing ${filename}`;
      case "view":
        return `Viewing ${filename}`;
      case "undo_edit":
        return `Undoing edit on ${filename}`;
      default:
        return `Working on ${filename}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args?.command as string | undefined;
    const path = args?.path as string | undefined;
    const filename = path ? extractFilename(path) : "file";

    switch (command) {
      case "rename":
        return `Renaming ${filename}`;
      case "delete":
        return `Deleting ${filename}`;
      default:
        return `Managing ${filename}`;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({
  toolInvocation,
}: ToolInvocationBadgeProps) {
  const { toolName, args, state, result } = toolInvocation;
  const isComplete = state === "result" && result !== undefined;
  const message = getToolMessage(toolName, args || {});

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{message}</span>
    </div>
  );
}
