import React, { useEffect, FC } from "react";

interface DialogProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  onCancel?: () => void;
  onOk?: () => void;
  cancelText?: string | null;
  okText?: string | null;
  show?: boolean;
  footerExtra?: React.ReactNode;
  className?: string;
}

const Dialog: FC<DialogProps> = ({
  title,
  children,
  onCancel = () => {},
  onOk = () => {},
  cancelText,
  okText,
  show = true,
  footerExtra,
  className = "max-w-md",
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  if (!show) return null;

  const hasFooter = cancelText || okText || footerExtra;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-[100] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className={`bg-[rgb(var(--ui-surface))] rounded-2xl shadow-2xl p-8 w-full ${className} transform transition-all animate-slide-up relative overflow-hidden border border-[rgb(var(--ui-border))]`}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {title && (
          <h3 className="text-xl font-black text-[rgb(var(--ui-text-main))] tracking-tight uppercase italic mb-6 relative z-10">
            {title}
          </h3>
        )}
        
        <div className="mb-8 relative z-10 text-[rgb(var(--ui-text-muted))] font-medium leading-relaxed">
          {children}
        </div>
        
        {hasFooter && (
          <div className="space-y-6 relative z-10">
            {footerExtra && <div>{footerExtra}</div>}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              {cancelText && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="prof-btn-secondary px-8 py-3 text-[10px] uppercase tracking-widest font-black"
                >
                  {cancelText}
                </button>
              )}

              {okText && (
                <button
                  type="button"
                  onClick={onOk}
                  className="prof-btn-primary px-8 py-3 text-[10px] uppercase tracking-widest font-black"
                >
                  {okText}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dialog;
