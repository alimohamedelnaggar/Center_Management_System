/**
 * The API answers list endpoints with one of two pagination envelopes, and
 * both are wrapped in `Response<T>`:
 *
 *   Response<PaginatedResult<T>>        Response<PagedResult<T>>
 *   {                                   {
 *     succeeded, statusCode,              succeeded, statusCode,
 *     data: {                             data: {
 *       data: T[],                          items: T[],
 *       currentPage, totalPages,            pageIndex, totalPages,
 *       totalCount, pageSize                totalCount, pageSize
 *     }                                   }
 *   }                                   }
 *
 * A screen that reads only one of them (`res.items` or `res.data`) silently
 * renders an empty list when the endpoint uses the other shape. Normalizing
 * here keeps list screens independent from the envelope an endpoint picked.
 */

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const looksLikePage = (value) =>
  isObject(value) &&
  (Array.isArray(value.data) ||
    Array.isArray(value.items) ||
    "totalCount" in value);

const toCount = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

const toPositive = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

export function normalizePaginated(payload) {
  let page = payload ?? {};

  // Unwrap `Response<T>` when the caller passed the whole body.
  if (looksLikePage(page.data) && !Array.isArray(page.data)) {
    page = page.data;
  }

  if (Array.isArray(page)) {
    return {
      items: page,
      data: page,
      totalCount: page.length,
      totalPages: page.length > 0 ? 1 : 0,
      currentPage: 1,
      pageSize: page.length,
    };
  }

  const items = Array.isArray(page.items)
    ? page.items
    : Array.isArray(page.data)
      ? page.data
      : [];

  const pageSize = toPositive(page.pageSize, items.length || 10);
  const totalCount = toCount(page.totalCount, items.length);
  const currentPage = toPositive(page.currentPage ?? page.pageIndex, 1);
  const totalPages = toCount(
    page.totalPages,
    totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
  );

  return { items, data: items, totalCount, totalPages, currentPage, pageSize };
}
