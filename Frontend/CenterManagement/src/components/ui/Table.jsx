import { cn } from "@/utils/cn";

/**
 * Presentational table primitives with a sticky, token-based header and
 * consistent row states. Compose them inside <Table>.
 *
 * For data that can be empty/loading, render <TableEmpty> / <TableSkeleton>
 * in place of <TableBody> content.
 */
export function Table({ className, children }) {
  return (
    <div className="w-full overflow-x-auto rounded-card border border-surface-border bg-surface-card shadow-soft">
      <table className={cn("w-full text-right text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, children }) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-surface-muted text-text-muted",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function TableBody({ className, children }) {
  return <tbody className={cn(className)}>{children}</tbody>;
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr
      className={cn(
        "border-t border-surface-border transition-colors hover:bg-surface-muted/60",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({ className, children, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn("px-5 py-3.5 text-text-main", className)} {...props}>
      {children}
    </td>
  );
}

export function TableEmpty({ colSpan, children = "لا توجد بيانات لعرضها" }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-10 text-center text-text-muted">
        {children}
      </TableCell>
    </TableRow>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c}>
              <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-surface-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

export default Table;
