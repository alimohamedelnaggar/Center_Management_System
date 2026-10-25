import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from "@/api/axios";
import { parentPortalService } from "@/services/parentPortalService";

describe("parentPortalService", () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.put.mockReset();
    apiClient.post.mockReset();
    apiClient.get.mockResolvedValue({ data: { succeeded: true, data: {} } });
  });

  it("getChildren hits the children endpoint", async () => {
    const res = await parentPortalService.getChildren();
    expect(apiClient.get).toHaveBeenCalledWith("/ParentPortal/Children");
    expect(res.succeeded).toBe(true);
  });

  it("child sections hit the per-child endpoints", async () => {
    await parentPortalService.getChildSummary("abc");
    await parentPortalService.getChildAttendance("abc");
    await parentPortalService.getChildGrades("abc");
    await parentPortalService.getChildExams("abc");
    await parentPortalService.getChildPayments("abc");

    expect(apiClient.get.mock.calls.map((call) => call[0])).toEqual([
      "/ParentPortal/Children/abc",
      "/ParentPortal/Children/abc/Attendance",
      "/ParentPortal/Children/abc/Grades",
      "/ParentPortal/Children/abc/Exams",
      "/ParentPortal/Children/abc/Payments",
    ]);
  });

  it("notification helpers hit the parent notification endpoints", async () => {
    apiClient.put.mockResolvedValue({ data: { succeeded: true } });
    apiClient.post.mockResolvedValue({ data: { succeeded: true } });

    await parentPortalService.getNotifications({ pageNumber: 2, pageSize: 5 });
    await parentPortalService.getUnreadCount();
    await parentPortalService.markRead("n-1");
    await parentPortalService.markAllRead();

    expect(apiClient.get.mock.calls.map((call) => call[0])).toEqual([
      "/ParentPortal/Notifications?pageNumber=2&pageSize=5",
      "/ParentPortal/Notifications/Unread-Count",
    ]);
    expect(apiClient.put).toHaveBeenCalledWith("/ParentPortal/Notifications/n-1/Read");
    expect(apiClient.post).toHaveBeenCalledWith("/ParentPortal/Notifications/Read-All");
  });
});
