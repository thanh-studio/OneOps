
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/* =========================================================
 * Workspace Context
 * ======================================================= */

interface WorkspaceContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;

  openCreate: () => void;
  closeModal: () => void;

  notify: (message: string) => void;
}

const WorkspaceContext =
  createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: ReactNode;

  renderCreate?: (close: () => void) => ReactNode;

  onNotify?: (message: string) => void;
}

export function WorkspaceProvider({
  children,
  renderCreate,
  onNotify,
}: WorkspaceProviderProps) {
  const [open, setOpen] = useState(false);

  const openCreate = useCallback(() => {
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  const notify = useCallback(
    (message: string) => {
      if (onNotify) {
        onNotify(message);
      } else if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("workspace:notify", {
            detail: { message },
          }),
        );
      }
    },
    [onNotify],
  );

  const value: WorkspaceContextValue = {
    open,
    setOpen,
    openCreate,
    closeModal,
    notify,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      <div>{children}</div>

      {open && renderCreate && (
        <>
          {renderCreate(closeModal)}
        </>
      )}
    </WorkspaceContext.Provider>
  );
}

/* =========================================================
 * useWorkspace
 * ======================================================= */

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useWorkspace must be used within WorkspaceProvider",
    );
  }

  return context;
}

/* =========================================================
 * Modal
 * ======================================================= */

interface ModalProps {
  title?: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({
  title,
  children,
  onClose,
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "workspace-modal-title" : undefined}
        className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {title && (
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2
              id="workspace-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h2>

            <button
              type="button"
              aria-label="Đóng"
              className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
