import { useEffect, useRef, type ReactNode } from "react";
import { X, Check, AlertTriangle } from "lucide-react";
export function IconButton({
  title,
  onClick,
  children,
  disabled = false,
  className = "",
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">ATTENDANCE WORKSPACE</span>
          <h2>{title}</h2>
        </div>
        <IconButton title="Close dialog" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </header>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  message,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-message">
        <AlertTriangle size={20} />
        {message}
      </p>
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button
          className="danger"
          onClick={async () => {
            if (ref.current) return;
            ref.current = true;
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              ref.current = false;
              alert(String(e));
            }
          }}
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${status}`}>
      <i />
      {(
        {
          present: "Present",
          incomplete: "Incomplete",
          absent: "Absent",
          off: "Shift off",
        } as Record<string, string>
      )[status] || status}
    </span>
  );
}
export function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function copyText(value: string) {
  if (!navigator.clipboard)
    throw new Error("Clipboard memerlukan localhost atau HTTPS.");
  await navigator.clipboard.writeText(value);
}
export function Saved({ text }: { text: string }) {
  return (
    <span className="saved">
      <Check size={13} />
      {text}
    </span>
  );
}
