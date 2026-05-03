import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  requested: "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100",
  unpaid: "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100",
  scheduled: "bg-blue-200 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100",
  processing: "bg-blue-200 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100",
  completed: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100",
  approved: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100",
  paid: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100",
  cancelled: "bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-100",
  rejected: "bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-100",
  failed: "bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-100",
  sent: "bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-foreground",
  draft: "bg-muted text-foreground dark:text-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || "bg-muted text-foreground";
  return (
    <Badge
      variant="outline"
      className={`border-0 capitalize ${style}`}
      data-testid={`badge-status-${status}`}
      aria-label={`Status: ${status}`}
    >
      {status}
    </Badge>
  );
}
