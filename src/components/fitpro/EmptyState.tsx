import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("fp-empty-state", className)}>
      {icon && <div className="fp-empty-icon" aria-hidden="true">{icon}</div>}
      <h3 className="fp-empty-title">{title}</h3>
      {description && <p className="fp-empty-description">{description}</p>}
      {action && <div className="fp-empty-action">{action}</div>}
    </div>
  );
}
