import { createContext, useContext, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from "react";
import type { SortDirection } from "../services/text/textService";
import type { TextCleanerOptions } from "../services/text/textWorkflowService";

export const TEXT_WORKFLOW_TOOLS = ["text-cleaner", "remove-duplicate-lines", "sort-lines"] as const;
export type TextWorkflowToolId = typeof TEXT_WORKFLOW_TOOLS[number];

interface TextWorkflowOptions {
  cleaner?: TextCleanerOptions;
  ignoreCase?: boolean;
  sortDirection?: SortDirection;
}

export interface TextWorkflowDraft {
  input: string;
  output: string | null;
  options: TextWorkflowOptions;
}

function emptyDraft(): TextWorkflowDraft {
  return { input: "", output: null, options: {} };
}

function emptyWorkflow() {
  return {
    drafts: {
      "text-cleaner": emptyDraft(),
      "remove-duplicate-lines": emptyDraft(),
      "sort-lines": emptyDraft(),
    },
    originalInput: null as string | null,
  };
}

interface TextWorkflowContextValue extends ReturnType<typeof emptyWorkflow> {
  setDraft: (tool: TextWorkflowToolId, update: SetStateAction<TextWorkflowDraft>) => void;
  transfer: (source: TextWorkflowToolId, target: TextWorkflowToolId) => void;
  clear: () => void;
}

const TextWorkflowContext = createContext<TextWorkflowContextValue | null>(null);

export function TextWorkflowProvider({ children }: PropsWithChildren): JSX.Element {
  const [workflow, setWorkflow] = useState(emptyWorkflow);

  const setDraft: TextWorkflowContextValue["setDraft"] = (tool, update) => {
    setWorkflow((current) => {
      const previous = current.drafts[tool];
      const draft = typeof update === "function" ? update(previous) : update;
      return {
        drafts: { ...current.drafts, [tool]: draft },
        originalInput: current.originalInput ?? (draft.output !== null ? draft.input : null),
      };
    });
  };

  const transfer: TextWorkflowContextValue["transfer"] = (source, target) => {
    setWorkflow((current) => {
      const output = current.drafts[source].output;
      if (!output) return current;
      return {
        ...current,
        drafts: {
          ...current.drafts,
          [target]: { ...current.drafts[target], input: output, output: null },
        },
      };
    });
  };

  return (
    <TextWorkflowContext.Provider value={{ ...workflow, setDraft, transfer, clear: () => setWorkflow(emptyWorkflow()) }}>
      {children}
    </TextWorkflowContext.Provider>
  );
}

export function useTextWorkflow(): TextWorkflowContextValue {
  const context = useContext(TextWorkflowContext);
  if (!context) throw new Error("Text workflow requires TextWorkflowProvider");
  return context;
}

export function useTextWorkflowDraft(tool?: TextWorkflowToolId): [TextWorkflowDraft, Dispatch<SetStateAction<TextWorkflowDraft>>] {
  const workflow = useContext(TextWorkflowContext);
  const [localDraft, setLocalDraft] = useState(emptyDraft);
  if (!tool) return [localDraft, setLocalDraft];
  if (!workflow) throw new Error("Text workflow requires TextWorkflowProvider");
  return [workflow.drafts[tool], (update) => workflow.setDraft(tool, update)];
}
