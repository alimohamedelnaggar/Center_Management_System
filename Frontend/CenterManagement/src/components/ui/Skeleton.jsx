import { cn } from "@/utils/cn";

/** Shimmer placeholder for loading content. */
export default function Skeleton({ className }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-surface-muted", className)}
      aria-hidden="true"
    />
  );
}
