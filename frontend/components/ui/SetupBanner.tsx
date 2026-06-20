import { AlertCircle } from "lucide-react";

interface SetupBannerProps {
  message: string;
}

export default function SetupBanner({ message }: SetupBannerProps) {
  return (
    <div className="flex items-start gap-3 p-4 border border-amber-500/30 bg-amber-500/5 rounded-sm mb-6">
      <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">Setup needed</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1 font-mono leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}
