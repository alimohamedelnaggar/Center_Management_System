import { describe, expect, it } from "vitest";
import { normalizePaginated } from "./paginated";

const ASSISTANT = { id: "a1", fullName: "أ. منى حسن" };

describe("normalizePaginated", () => {
  it("reads Response<PaginatedResult<T>> (rows under data.data)", () => {
    const result = normalizePaginated({
      succeeded: true,
      statusCode: 200,
      data: {
        data: [ASSISTANT],
        currentPage: 1,
        totalPages: 1,
        totalCount: 1,
        pageSize: 6,
      },
    });

    expect(result.items).toEqual([ASSISTANT]);
    expect(result.totalCount).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.pageSize).toBe(6);
  });

  it("reads Response<PagedResult<T>> (rows under data.items)", () => {
    const result = normalizePaginated({
      succeeded: true,
      data: {
        items: [ASSISTANT],
        pageIndex: 2,
        totalPages: 3,
        totalCount: 21,
        pageSize: 10,
      },
    });

    expect(result.items).toEqual([ASSISTANT]);
    expect(result.totalCount).toBe(21);
    expect(result.currentPage).toBe(2);
  });

  it("accepts an already unwrapped PaginatedResult", () => {
    const result = normalizePaginated({
      data: [ASSISTANT],
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
      pageSize: 6,
    });

    expect(result.items).toEqual([ASSISTANT]);
  });

  it("returns an empty page when the envelope has no rows", () => {
    const result = normalizePaginated({
      succeeded: true,
      data: { data: [], currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 6 },
    });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("never throws on null/undefined bodies", () => {
    expect(normalizePaginated(null).items).toEqual([]);
    expect(normalizePaginated(undefined).items).toEqual([]);
  });
});
