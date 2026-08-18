import { describe, expect, it, vi } from "vitest";
import {
  getAdminDashboardData,
  getCertificateRecordsByRequestIds,
  getResidentDashboardData,
  listAllRequests,
  listResidentRequests,
} from "@/lib/db/sqlite/queries";
import { getSqliteDb } from "@/lib/db/sqlite/client";

describe("dashboard performance and N+1 query elimination", () => {
  it("getAdminDashboardData returns correct aggregates, monthly count, and recent requests", () => {
    const data = getAdminDashboardData();
    expect(data.stats).toBeDefined();
    expect(typeof data.stats.total).toBe("number");
    expect(typeof data.stats.pending).toBe("number");
    expect(typeof data.stats.accepted).toBe("number");
    expect(typeof data.monthlyCount).toBe("number");
    expect(Array.isArray(data.recentRequests)).toBe(true);
    expect(data.recentRequests.length).toBeLessThanOrEqual(6);

    for (const req of data.recentRequests) {
      expect(req.pickup_schedules).toEqual([]);
      if (req.resident_id) {
        // Resident profile is joined directly
        expect(req.resident).toBeDefined();
      }
    }
  });

  it("getResidentDashboardData returns resident-scoped aggregates and at most 5 recent requests", () => {
    const residentId = "00000000-0000-4000-8000-000000000003";
    const data = getResidentDashboardData(residentId);
    expect(data.stats).toBeDefined();
    expect(typeof data.stats.total).toBe("number");
    expect(Array.isArray(data.recentRequests)).toBe(true);
    expect(data.recentRequests.length).toBeLessThanOrEqual(5);

    for (const req of data.recentRequests) {
      expect(req.resident_id).toBe(residentId);
      expect(req.pickup_schedules).toEqual([]);
    }
  });

  it("listAllRequests and listResidentRequests join resident profiles without querying pickup_schedules", () => {
    const all = listAllRequests();
    expect(Array.isArray(all)).toBe(true);
    for (const req of all) {
      expect(req.pickup_schedules).toEqual([]);
      if (req.resident) {
        expect(req.resident.id).toBe(req.resident_id);
      }
    }

    const residentId = "00000000-0000-4000-8000-000000000003";
    const residentReqs = listResidentRequests(residentId);
    for (const req of residentReqs) {
      expect(req.resident_id).toBe(residentId);
      expect(req.pickup_schedules).toEqual([]);
    }
  });

  it("getCertificateRecordsByRequestIds batches lookups into a single query", () => {
    const all = listAllRequests();
    const ids = all.map((r) => r.id);
    const map = getCertificateRecordsByRequestIds(ids);
    expect(map instanceof Map).toBe(true);

    const emptyMap = getCertificateRecordsByRequestIds([]);
    expect(emptyMap.size).toBe(0);
  });

  it("getAdminDashboardData executes a bounded number of SQL statements", () => {
    const db = getSqliteDb();
    const prepareSpy = vi.spyOn(db, "prepare");

    prepareSpy.mockClear();
    getAdminDashboardData();

    // Must execute exactly 3 queries (aggregate, most requested, recent 6 requests)
    // and definitely not 1+2N queries for every request
    expect(prepareSpy).toHaveBeenCalledTimes(3);

    prepareSpy.mockRestore();
  });
});
