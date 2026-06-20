import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  subValuePositive?: boolean;
  icon?: ReactNode;
  className?: string;
  mono?: boolean;
}

export default function StatCard({
  label,
  value,
  subValue,
  subValuePositive,
  icon,
  className,
  mono = true,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 p-4 border border-[var(--border)] rounded-sm bg-[var(--card)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span className="text-[var(--muted-foreground)]">{icon}</span>
        )}
      </div>
      <span
        className={cn(
          "text-fluid-xl font-medium text-[var(--foreground)] leading-tight",
          mono && "font-mono"
        )}
      >
        {value}
      </span>
      {subValue && (
        <span
          className={cn(
            "text-xs font-mono",
            subValuePositive === true
              ? "text-emerald-600 dark:text-emerald-400"
              : subValuePositive === false
              ? "text-red-500"
              : "text-[var(--muted-foreground)]"
          )}
        >
          {subValue}
        </span>
      )}
    </div>
  );
}
