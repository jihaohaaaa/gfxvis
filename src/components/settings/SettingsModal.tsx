import { useEffect, useState } from "react";
import SettingsView from "./SettingsView";

export default function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleOpenEvent() {
      setIsOpen(true);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    }

    window.addEventListener("gfx:open-settings", handleOpenEvent);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("gfx:open-settings", handleOpenEvent);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-label="GFXVis 偏好设置"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/90 bg-surface/98 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl dark:border-border/80 dark:bg-surface/98"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <h2 className="text-base font-bold text-ink">全站偏好设置</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-alt hover:text-ink"
            aria-label="关闭设置"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 设置内容表单 */}
        <SettingsView onClose={() => setIsOpen(false)} />
      </div>
    </div>
  );
}
