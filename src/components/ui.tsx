"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, X, AlertTriangle, Info } from "lucide-react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* -------------------------------------------------- buttons */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
};

const VARIANTS: Record<string, string> = {
  primary:
    "bg-gradient-to-r from-primary to-secondary text-white shadow-[0_8px_30px_-10px_rgba(99,102,241,0.9)] hover:brightness-110",
  secondary: "bg-elevated/80 text-ink border border-line/80 hover:bg-elevated",
  ghost: "text-muted hover:text-ink hover:bg-elevated/60",
  danger: "bg-danger/90 text-white hover:bg-danger",
  success: "bg-success/90 text-white hover:bg-success",
};

const SIZES: Record<string, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-9 items-center justify-center rounded-xl border border-line/70 bg-elevated/60 text-muted transition hover:border-primary/60 hover:text-ink active:scale-95",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------- inputs */

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium tracking-wide text-muted">
      {children}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cx(
        "h-11 w-full rounded-xl border border-line/80 bg-surface/80 px-3.5 text-sm text-ink placeholder:text-muted/60 transition focus:border-primary focus:bg-surface focus:outline-none",
        className,
      )}
    />
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cx(
        "w-full resize-none rounded-xl border border-line/80 bg-surface/80 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 transition focus:border-primary focus:bg-surface focus:outline-none",
        className,
      )}
    />
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
      <AlertTriangle className="size-3.5" aria-hidden />
      {children}
    </p>
  );
}

/* -------------------------------------------------- chips + avatars */

const TAG_TONES: Record<string, string> = {
  family: "border-highlight/40 bg-highlight/15 text-pink-200",
  close: "border-highlight/40 bg-highlight/15 text-pink-200",
  friends: "border-info/40 bg-info/15 text-sky-200",
  work: "border-success/40 bg-success/15 text-emerald-200",
  important: "border-warning/40 bg-warning/15 text-amber-200",
  college: "border-secondary/40 bg-secondary/15 text-violet-200",
  "lost touch": "border-line bg-elevated/70 text-muted",
};

export function Tag({ children, onRemove }: { children: string; onRemove?: () => void }) {
  const tone = TAG_TONES[children.toLowerCase()] ?? "border-primary/35 bg-primary/12 text-indigo-200";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tone,
      )}
    >
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove tag ${children}`} className="opacity-70 hover:opacity-100">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 40,
  ring = "rgba(99,102,241,0.9)",
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  ring?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <span
      className={cx("relative inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${ring}, 0 0 18px -4px ${ring}` }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full rounded-full object-cover"
        />
      ) : (
        <span
          className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-secondary/70 font-semibold text-white"
          style={{ fontSize: Math.max(10, size * 0.36) }}
        >
          {initials(name) || "?"}
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------- overlays */

export function Overlay({
  open,
  onClose,
  children,
  title,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close dialog" onClick={onClose} className="absolute inset-0 bg-bg/80 backdrop-blur-sm" />
      <div
        className={cx(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line/70 cm-glass p-5 cm-sheet-up cm-scroll sm:rounded-3xl sm:cm-fade-up",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <Overlay open={open} onClose={onCancel} title={title}>
      <p className="text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Overlay>
  );
}

/* -------------------------------------------------- states */

export function EmptyState({
  icon,
  title,
  body,
  action,
  compact,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line/70 bg-surface/30 text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
      )}
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">{icon}</div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("cm-skeleton rounded-xl", className)} />;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted" role="status">
      <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
      {label}
    </div>
  );
}

/* -------------------------------------------------- segmented control */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line/70 bg-surface/80 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full font-medium transition",
            size === "sm" ? "h-7 px-3 text-[11px]" : "h-8 px-4 text-xs",
            value === o.value
              ? "bg-gradient-to-r from-primary to-secondary text-white shadow-[0_6px_20px_-8px_rgba(99,102,241,0.9)]"
              : "text-muted hover:text-ink",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------- toasts */

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx(
              "pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm shadow-xl cm-glass cm-fade-up",
              t.tone === "error"
                ? "border-danger/50 text-red-200"
                : t.tone === "info"
                  ? "border-info/50 text-sky-200"
                  : "border-success/50 text-emerald-200",
            )}
          >
            {t.tone === "error" ? (
              <AlertTriangle className="size-4 shrink-0" />
            ) : t.tone === "info" ? (
              <Info className="size-4 shrink-0" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
