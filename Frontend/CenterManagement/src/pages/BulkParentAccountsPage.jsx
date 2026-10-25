import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  Download,
  Printer,
  RefreshCw,
  UserPlus,
  Users,
  UserCheck,
  UserX,
} from "@/components/icons";

import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import StatusPill from "@/components/ui/StatusPill";
import PageHeader from "@/components/ui/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import Tabs from "@/components/ui/Tabs";
import ConfirmModal from "@/components/common/ConfirmModal";

import { useBranding } from "@/context/useBranding";
import { useBulkParentAccounts } from "@/hooks/students/useBulkParentAccounts";
import {
  exportParentAccountsToExcel,
  printParentAccounts,
} from "@/utils/parentAccountsExport";

const STATUS_TABS = [
  { id: "created", label: "حسابات جديدة" },
  { id: "linked", label: "ربط بحسابات موجودة" },
  { id: "skipped", label: "تم تخطيهم" },
];

export default function BulkParentAccountsPage() {
  const branding = useBranding();
  const centerName = branding?.center?.name || "";

  const {
    search,
    setSearch,
    group,
    setGroup,
    status,
    setStatus,
    skipAlreadyLinked,
    setSkipAlreadyLinked,
    resetFilters,
    groups,
    loadingGroups,
    running,
    run,
    result,
    message,
    clearResult,
  } = useBulkParentAccounts();

  const [activeTab, setActiveTab] = useState("created");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const created = useMemo(() => result?.created ?? [], [result]);
  const linked = useMemo(() => result?.linked ?? [], [result]);
  const skipped = useMemo(() => result?.skipped ?? [], [result]);

  const total = created.length + linked.length + skipped.length;

  const rows = useMemo(() => {
    if (activeTab === "created") return created;
    if (activeTab === "linked") return linked;
    return skipped;
  }, [activeTab, created, linked, skipped]);

  const hasResult = total > 0;

  function handleExportExcel() {
    try {
      const exported = exportParentAccountsToExcel(
        { created, linked, skipped, centerName },
        "حسابات_أولياء_الأمور",
      );

      if (exported) toast.success("تم تصدير الملف بنجاح");
      else toast.error("لا توجد بيانات للتصدير");
    } catch {
      toast.error("تعذّر تصدير الملف");
    }
  }

  function handlePrint() {
    try {
      const printed = printParentAccounts({
        created,
        linked,
        skipped,
        centerName,
      });

      if (printed) toast.success("تم تجهيز التقرير للطباعة");
      else toast.error("تعذّر فتح نافذة الطباعة");
    } catch {
      toast.error("تعذّر تجهيز التقرير للطباعة");
    }
  }

  async function handleRun() {
    const data = await run();

    if (!data) return;

    if (data.created.length) setActiveTab("created");
    else if (data.linked.length) setActiveTab("linked");
    else if (data.skipped.length) setActiveTab("skipped");
  }

  function handleConfirmRun() {
    setConfirmOpen(false);
    handleRun();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="حسابات أولياء الأمور"
        subtitle="إنشاء حسابات دخول لأولياء أمور الطلاب دفعة واحدة، ثم تصدير النتيجة Excel و PDF."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              disabled={!hasResult}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              تصدير Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              disabled={!hasResult}
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              تصدير PDF
            </Button>
          </>
        }
      />

      {/* ================= Filters ================= */}
      <Card>
        <CardHeader
          title="نطاق التنفيذ"
          subtitle="اترك المجموعة فارغة لتنفيذ الإجراء على كل طلاب المركز."
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label
                htmlFor="bulk-parent-search"
                className="block text-xs font-semibold text-text-muted"
              >
                بحث بالاسم أو رقم الهاتف
              </label>
              <Input
                id="bulk-parent-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="اسم الطالب أو رقم الهاتف"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="bulk-parent-group"
                className="block text-xs font-semibold text-text-muted"
              >
                المجموعة
              </label>
              <Select
                id="bulk-parent-group"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                disabled={loadingGroups}
              >
                <option value="">كل المجموعات</option>
                {groups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="bulk-parent-status"
                className="block text-xs font-semibold text-text-muted"
              >
                حالة الطالب
              </label>
              <Select
                id="bulk-parent-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">الكل</option>
                <option value="true">نشط</option>
                <option value="false">غير نشط</option>
              </Select>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-main">
            <input
              type="checkbox"
              checked={skipAlreadyLinked}
              onChange={(e) => setSkipAlreadyLinked(e.target.checked)}
              className="h-4 w-4 rounded border-surface-border text-primary focus:ring-primary"
            />
            تخطي الطلاب الذين跟他们 ولي أمر مرتبط بالفعل
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetFilters();
                clearResult();
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              إعادة تعيين
            </Button>

            <Button
              size="sm"
              loading={running}
              onClick={() => setConfirmOpen(true)}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              إنشاء الحسابات
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ================= Result ================= */}
      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="حسابات جديدة"
              value={created.length}
              icon={UserPlus}
              tone="success"
            />
            <StatCard
              label="ربط بحسابات موجودة"
              value={linked.length}
              icon={UserCheck}
              tone="info"
            />
            <StatCard
              label="تم تخطيهم"
              value={skipped.length}
              icon={UserX}
              tone={skipped.length ? "warning" : "neutral"}
            />
            <StatCard
              label="إجمالي الطلاب"
              value={total}
              icon={Users}
              tone="primary"
            />
          </div>

          {message && (
            <p className="rounded-card border border-surface-border bg-surface-card px-4 py-3 text-sm text-text-muted shadow-soft">
              {message}
            </p>
          )}

          <Card>
            <Tabs
              tabs={STATUS_TABS.map((tab) => ({
                ...tab,
                label: `${tab.label} (${tab.id === "created" ? created.length : tab.id === "linked" ? linked.length : skipped.length})`,
              }))}
              activeId={activeTab}
              onChange={setActiveTab}
              className="px-3"
            />

            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell className="w-12">م</TableHeaderCell>
                  <TableHeaderCell>اسم الطالب</TableHeaderCell>
                  <TableHeaderCell>المجموعة</TableHeaderCell>
                  <TableHeaderCell>هاتف ولي الأمر</TableHeaderCell>
                  <TableHeaderCell>رقم الدخول</TableHeaderCell>
                  {activeTab === "created" && (
                    <TableHeaderCell>كلمة المرور المؤقتة</TableHeaderCell>
                  )}
                  {activeTab === "skipped" && (
                    <TableHeaderCell>سبب التخطي</TableHeaderCell>
                  )}
                </tr>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmpty colSpan={activeTab === "created" ? 6 : 5}>
                    لا توجد نتائج في هذا القسم
                  </TableEmpty>
                ) : (
                  rows.map((item, index) => (
                    <TableRow key={item.studentId ?? index}>
                      <TableCell className="text-text-muted tabular-nums">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {item.studentName}
                      </TableCell>
                      <TableCell className="text-text-muted">
                        {item.groupName || "-"}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right font-mono">
                        {item.parentPhone || "-"}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right font-mono">
                        {item.username || "-"}
                      </TableCell>
                      {activeTab === "created" && (
                        <TableCell dir="ltr" className="text-right font-mono font-bold">
                          {item.temporaryPassword || "-"}
                        </TableCell>
                      )}
                      {activeTab === "skipped" && (
                        <TableCell className="text-text-muted">
                          <StatusPill tone="warning">
                            {item.reason || "سبب غير معروف"}
                          </StatusPill>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRun}
        loading={running}
        title="تأكيد إنشاء حسابات أولياء الأمور"
        message="سيتم إنشاء حساب دخول لولي أمر كل طالب مطابق للفلتر، وربط الطلاب الذين لولي أمرهم لديه حساب في نفس المركز بالحساب الموجود."
        confirmText="ابدأ الإنشاء"
        cancelText="إلغاء"
        details={[
          { label: "المجموعة", value: groupNameOf(group, groups) },
          { label: "البحث", value: search || "الكل" },
          { label: "حالة الطالب", value: statusLabelOf(status) },
          {
            label: "تخطي المرتبطين",
            value: skipAlreadyLinked ? "نعم" : "لا",
          },
        ]}
      />
    </div>
  );
}

function groupNameOf(groupId, groups) {
  if (!groupId) return "كل المجموعات";
  const found = groups.find((item) => item.id === groupId);
  return found?.name || "كل المجموعات";
}

function statusLabelOf(status) {
  if (status === "true") return "نشط";
  if (status === "false") return "غير نشط";
  return "الكل";
}
