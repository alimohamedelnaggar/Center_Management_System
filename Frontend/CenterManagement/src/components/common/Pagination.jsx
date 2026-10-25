import { ChevronLeft, ChevronRight } from "@/components/icons";

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  name = "الكل",
  onPageChange,
}) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const getPages = () => {
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (currentPage > 3) pages.push("...");

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push("...");

    pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex items-center justify-between border-t border-surface-border px-4 py-4 sm:px-6">
      {/* Mobile */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-text-main transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          السابق
        </button>

        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-text-main transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          التالي
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          عرض <span className="font-semibold text-text-main">{start}</span> إلى{" "}
          <span className="font-semibold text-text-main">{end}</span> من أصل{" "}
          <span className="font-semibold text-text-main">{totalItems}</span>{" "}
          {name}
        </p>

        <nav className="inline-flex overflow-hidden rounded-lg border border-surface-border shadow-sm">
          {/* Previous */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex h-10 w-10 items-center justify-center border-e border-surface-border bg-surface-card text-text-main transition hover:bg-primary-subtle hover:text-primary disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50"
          >
            <ChevronLeft size={18} />
          </button>

          {getPages().map((page, index) =>
            page === "..." ? (
              <span
                key={index}
                className="flex h-10 min-w-10 items-center justify-center border-e border-surface-border bg-surface-card px-3 text-text-muted"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`flex h-10 min-w-10 items-center justify-center border-e border-surface-border px-4 text-sm font-medium transition ${
                  page === currentPage
                    ? "bg-primary text-text-inverse"
                    : "bg-surface-card text-text-main hover:bg-primary-subtle hover:text-primary"
                }`}
              >
                {page}
              </button>
            ),
          )}

          {/* Next */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex h-10 w-10 items-center justify-center bg-surface-card text-text-main transition hover:bg-primary-subtle hover:text-primary disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50"
          >
            <ChevronRight size={18} />
          </button>
        </nav>
      </div>
    </div>
  );
}
