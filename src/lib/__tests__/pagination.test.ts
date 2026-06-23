import { describe, expect, it } from "vitest";

import { toPaginatedResponse, toQueryParams } from "../pagination";

describe("toPaginatedResponse", () => {
  it("maps DRF paginated response correctly", () => {
    const drfResponse = {
      count: 50,
      next: "http://localhost/api/items/?page=3",
      previous: "http://localhost/api/items/?page=1",
      results: [{ id: 1, name: "test" }],
    };

    const result = toPaginatedResponse(drfResponse, 2, 20);
    expect(result).toEqual({
      data: [{ id: 1, name: "test" }],
      total: 50,
      page: 2,
      perPage: 20,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });

  it("handles first page with no previous", () => {
    const drfResponse = {
      count: 10,
      next: "http://localhost/api/items/?page=2",
      previous: null,
      results: [{ id: 1 }],
    };

    const result = toPaginatedResponse(drfResponse, 1, 10);
    expect(result).toEqual({
      data: [{ id: 1 }],
      total: 10,
      page: 1,
      perPage: 10,
      totalPages: 1,
      hasNext: true,
      hasPrev: false,
    });
  });

  it("handles last page with no next", () => {
    const drfResponse = {
      count: 25,
      next: null,
      previous: "http://localhost/api/items/?page=1",
      results: [{ id: 1 }],
    };

    const result = toPaginatedResponse(drfResponse, 2, 20);
    expect(result).toEqual({
      data: [{ id: 1 }],
      total: 25,
      page: 2,
      perPage: 20,
      totalPages: 2,
      hasNext: false,
      hasPrev: true,
    });
  });

  it("handles empty results", () => {
    const drfResponse = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };

    const result = toPaginatedResponse(drfResponse, 1, 20);
    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  });
});

describe("toQueryParams", () => {
  it("converts pagination params to query params", () => {
    const result = toQueryParams({ page: 2, perPage: 10 });
    expect(result).toEqual({ page: 2, per_page: 10 });
  });

  it("converts sort with desc order", () => {
    const result = toQueryParams({ sort: "name", order: "desc" });
    expect(result).toEqual({ ordering: "-name" });
  });

  it("converts sort with asc order", () => {
    const result = toQueryParams({ sort: "name", order: "asc" });
    expect(result).toEqual({ ordering: "name" });
  });

  it("handles search param", () => {
    const result = toQueryParams({ search: "علی" });
    expect(result).toEqual({ search: "علی" });
  });

  it("combines all params", () => {
    const result = toQueryParams({
      page: 2,
      perPage: 10,
      search: "test",
      sort: "name",
      order: "desc",
    });
    expect(result).toEqual({ page: 2, per_page: 10, search: "test", ordering: "-name" });
  });

  it("returns empty object for empty params", () => {
    const result = toQueryParams({});
    expect(result).toEqual({});
  });
});
