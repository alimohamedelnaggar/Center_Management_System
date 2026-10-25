// @vitest-environment node
import { describe, expect, it } from "vitest";

import { mapImportCommit, mapImportPreview } from "./studentService";

/**
 * Fixtures are byte-for-byte shaped like the API response:
 * Core/Bases/Response.cs + StudentImportModels.cs + StudentImportCommands.cs,
 * serialized with the default System.Text.Json camelCase policy.
 */
const envelope = (data, overrides = {}) => ({
  statusCode: 200,
  meta: null,
  succeeded: true,
  message: null,
  code: null,
  errors: null,
  errorsBag: null,
  data,
  ...overrides,
});

const row = (overrides = {}) => ({
  rowNumber: 2,
  fullName: "أحمد محمد",
  phone: "01012345678",
  phoneParent: "01112345678",
  groupName: "المجموعة أ",
  groupId: "11111111-1111-1111-1111-111111111111",
  subscriptionType: "",
  customMonthlyPrice: "",
  school: "",
  notes: "",
  phoneNormalized: "01012345678",
  phoneParentNormalized: "01112345678",
  errors: [],
  isValid: true,
  isDuplicateInFile: false,
  isDuplicateInDb: false,
  canUpdate: false,
  groupWillBeCreated: false,
  ...overrides,
});

describe("mapImportPreview", () => {
  it("reads the real StudentImportPreviewResult field names", () => {
    const rows = [
      row(),
      row({
        rowNumber: 3,
        fullName: "",
        errors: ["الاسم الكامل مطلوب"],
        isValid: false,
      }),
      row({
        rowNumber: 4,
        errors: ["رقم الهاتف مكرر"],
        isValid: false,
        isDuplicateInDb: true,
        canUpdate: true,
      }),
    ];

    const mapped = mapImportPreview(
      envelope({
        sessionId: "session-1",
        totalRows: 3,
        validRows: 1,
        duplicateInFile: 0,
        duplicateInDb: 1,
        errorRows: 2,
        rows,
        headers: ["الاسم الكامل"],
      }),
    );

    expect(mapped.succeeded).toBe(true);
    expect(mapped.data.sessionId).toBe("session-1");
    expect(mapped.data.total).toBe(3);
    expect(mapped.data.valid).toBe(1);
    expect(mapped.data.duplicate).toBe(1);
    expect(mapped.data.error).toBe(1);
    expect(mapped.data.errorRows).toBe(2);
    expect(mapped.data.rows).toHaveLength(3);
  });

  it("derives row status from isValid/duplicate flags (there is no status field)", () => {
    const mapped = mapImportPreview(
      envelope({
        sessionId: "s",
        totalRows: 3,
        validRows: 1,
        duplicateInFile: 1,
        duplicateInDb: 0,
        errorRows: 2,
        rows: [
          row(),
          row({ rowNumber: 3, errors: ["رقم الهاتف غير صالح"], isValid: false }),
          row({
            rowNumber: 4,
            errors: ["رقم الهاتف مكرر"],
            isValid: false,
            isDuplicateInFile: true,
          }),
        ],
        headers: [],
      }),
    );

    expect(mapped.data.rows[0].status).toBe("valid");
    expect(mapped.data.rows[1].status).toBe("error");
    expect(mapped.data.rows[1].errorMessage).toBe("رقم الهاتف غير صالح");
    expect(mapped.data.rows[2].status).toBe("duplicate");
  });

  it("keeps CanUpdate only for in-database duplicates", () => {
    const mapped = mapImportPreview(
      envelope({
        sessionId: "s",
        totalRows: 2,
        validRows: 0,
        duplicateInFile: 1,
        duplicateInDb: 1,
        errorRows: 2,
        rows: [
          row({
            isValid: false,
            isDuplicateInFile: true,
            canUpdate: false,
            errors: ["رقم الهاتف مكرر"],
          }),
          row({
            isValid: false,
            isDuplicateInDb: true,
            canUpdate: true,
            errors: ["رقم الهاتف مكرر"],
          }),
        ],
        headers: [],
      }),
    );

    expect(mapped.data.rows[0].canUpdate).toBe(false);
    expect(mapped.data.rows[1].canUpdate).toBe(true);
  });

  it("detects GroupWillBeCreated so the UI can offer creating the group", () => {
    const mapped = mapImportPreview(
      envelope({
        sessionId: "s",
        totalRows: 1,
        validRows: 1,
        duplicateInFile: 0,
        duplicateInDb: 0,
        errorRows: 0,
        rows: [row({ groupId: null, groupWillBeCreated: true })],
        headers: [],
      }),
    );

    expect(mapped.data.hasGroupWillBeCreated).toBe(true);
    expect(mapped.data.rows[0].groupWillBeCreated).toBe(true);
  });
});

describe("mapImportCommit", () => {
  it("reads the real StudentImportCommitResult field names", () => {
    const mapped = mapImportCommit(
      envelope({
        created: 2,
        updated: 1,
        skipped: 3,
        failed: 1,
        errors: [
          { rowNumber: 5, fullName: "سارة", reason: "رقم الهاتف غير صالح" },
        ],
        createdStudents: [{ id: "s1" }],
        createdGroups: ["المجموعة ب"],
        studentAccounts: [
          {
            id: "s1",
            fullName: "أحمد محمد",
            username: "01012345678",
            temporaryPassword: "01012345678",
            reason: null,
          },
        ],
        parentAccounts: [
          {
            studentId: "s1",
            studentName: "أحمد محمد",
            parentPhone: "01112345678",
            status: "Created",
            temporaryPassword: "01112345678",
            passwordChanged: false,
            reason: null,
          },
        ],
        alreadyCompleted: false,
      }),
    );

    expect(mapped.data.created).toBe(2);
    expect(mapped.data.updated).toBe(1);
    expect(mapped.data.skipped).toBe(3);
    expect(mapped.data.failed).toBe(1);
    expect(mapped.data.createdGroups).toEqual(["المجموعة ب"]);
    expect(mapped.data.errors[0].reason).toBe("رقم الهاتف غير صالح");

    expect(mapped.data.studentAccounts[0]).toMatchObject({
      kind: "student",
      studentName: "أحمد محمد",
      username: "01012345678",
      temporaryPassword: "01012345678",
    });
    expect(mapped.data.parentAccounts[0]).toMatchObject({
      kind: "parent",
      studentName: "أحمد محمد",
      phone: "01112345678",
      username: "01112345678",
      temporaryPassword: "01112345678",
      passwordChanged: false,
    });
    // The export helper reads one unified list.
    expect(mapped.data.createdAccounts).toHaveLength(2);
  });

  it("flags a cached (already completed) result", () => {
    const mapped = mapImportCommit(
      envelope({
        created: 1,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
        createdStudents: [],
        createdGroups: [],
        studentAccounts: null,
        parentAccounts: null,
        alreadyCompleted: true,
      }),
    );

    expect(mapped.data.alreadyCompleted).toBe(true);
    expect(mapped.data.createdAccounts).toEqual([]);
  });
});
