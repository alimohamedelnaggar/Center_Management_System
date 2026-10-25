import { cn } from "@/utils/cn";

/**
 * Controlled tabs.
 *
 * @param {object} props
 * @param {{ id: string, label: string, icon?: import("react").ComponentType }[]} props.tabs
 * @param {string} props.activeId
 * @param {(id: string) => void} props.onChange
 */
export default function Tabs({ tabs, activeId, onChange, className }) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 overflow-x-auto border-b border-surface-border",
        className,
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange?.(tab.id)}
            className={cn(
              "relative flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-text-muted hover:text-text-main",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
