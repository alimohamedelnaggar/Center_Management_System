import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarCheck,
  CheckCircle,
  Inbox,
  List,
  Moon,
  Sun,
  Users,
  Wallet,
} from "@/components/icons";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusPill from "@/components/ui/StatusPill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import SidebarPanel from "@/components/layout/SidebarPanel";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import {
  BREAKPOINTS,
  PREVIEW_VIEWPORTS,
  contentMaxWidth,
  layoutMode,
  statColumns,
} from "@/constants/breakpoints";
import { useTheme } from "@/context/useTheme";

const DEMO_NAV = [
  { label: "الطلاب", path: "/components", icon: Users },
  { label: "الحضور", path: "/attendance", icon: CalendarCheck },
  { label: "المدفوعات", path: "/payments", icon: Wallet },
  { label: "الإشعارات", path: "/notifications", icon: Bell },
];

const DEMO_ROWS = [
  { name: "أحمد محمود", group: "مجموعة أ", status: "present", paid: "مدفوع" },
  { name: "سارة علي", group: "مجموعة ب", status: "late", paid: "جزئي" },
  { name: "محمد حسن", group: "مجموعة أ", status: "absent", paid: "متأخر" },
];

const TONE = { present: "success", late: "warning", absent: "danger" };
const STATUS_LABEL = { present: "حاضر", late: "متأخر", absent: "غائب" };

function Section({ id, title, note, children }) {
  return (
    <section
      id={id}
      data-testid={`section-${id}`}
      className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5"
    >
      <div className="mb-4">
        <h2 className="text-lg font-bold text-text-main">{title}</h2>
        {note && <p className="mt-1 text-sm text-text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Showcase() {
  const { setTheme } = useTheme();
  const [tab, setTab] = useState("overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("theme");
    if (requested === "dark" || requested === "light") setTheme(requested);
  }, [setTheme]);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const mode = layoutMode(width);

  return (
    <div
      dir="rtl"
      data-testid="showcase"
      className="min-h-dvh bg-surface-bg text-text-main"
    >
      <div className="content-container space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Design system · B «نبض»
            </p>
            <h1 className="page-title font-bold">مكتبة المكونات الأساسية</h1>
            <p className="mt-1 text-sm text-text-muted">
              كل مكوّن معروض داخل حاوية حقيقية، ويتكيف مع عرض الحاوية لا عرض الشاشة.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-control bg-surface-muted px-3 py-2">
              <p className="text-xs text-text-muted">العرض</p>
              <p className="num text-sm font-bold" data-testid="probe-width">
                {width}
              </p>
            </div>
            <div className="rounded-control bg-surface-muted px-3 py-2">
              <p className="text-xs text-text-muted">الوضع</p>
              <p className="text-sm font-bold" data-testid="probe-mode">
                {mode}
              </p>
            </div>
            <div className="rounded-control bg-surface-muted px-3 py-2">
              <p className="text-xs text-text-muted">أقصى محتوى</p>
              <p className="num text-sm font-bold" data-testid="probe-max">
                {contentMaxWidth(width)}
              </p>
            </div>
          </div>
        </div>

        <Section id="buttons" title="الأزرار" note="أهداف لمس 44px، حواف كبسولية، حركة 150–180ms.">
          <div className="flex flex-wrap items-center gap-2">
            <Button>إجراء أساسي</Button>
            <Button variant="secondary">ثانوي</Button>
            <Button variant="outline">محدد</Button>
            <Button variant="soft">ناعم</Button>
            <Button variant="danger">حذف</Button>
            <Button variant="ghost">شفاف</Button>
            <Button variant="accent">تمييز</Button>
            <Button loading>جارٍ الحفظ</Button>
            <Button size="icon" aria-label="أيقونة">
              <List className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </Section>

        <Section id="fields" title="الحقول والنماذج" note="حقول 44px وخط 16px على الموبايل لمنع تكبير iOS.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="اسم الطالب" htmlFor="demo-name" required>
              <Input id="demo-name" placeholder="اكتب الاسم" />
            </FormField>
            <FormField label="المجموعة" htmlFor="demo-group">
              <Select id="demo-group" defaultValue="a">
                <option value="a">مجموعة أ</option>
                <option value="b">مجموعة ب</option>
              </Select>
            </FormField>
            <FormField
              label="رقم الهاتف"
              htmlFor="demo-phone"
              error="رقم الهاتف غير صحيح"
            >
              <Input id="demo-phone" defaultValue="010" error />
            </FormField>
            <FormField label="ملاحظات" htmlFor="demo-notes" helper="تظهر لولي الأمر فقط">
              <Textarea id="demo-notes" rows={2} />
            </FormField>
          </div>
        </Section>

        <Section id="pills" title="الشارات والحالات">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="success">حاضر</StatusPill>
            <StatusPill tone="warning">متأخر</StatusPill>
            <StatusPill tone="danger">غائب</StatusPill>
            <StatusPill tone="info">بعذر</StatusPill>
            <StatusPill tone="primary">جديد</StatusPill>
            <StatusPill tone="neutral">غير محدد</StatusPill>
          </div>
        </Section>

        <Section id="stats" title="بطاقات الإحصاء" note="شبكة تتكيف مع عرض حاويتها عبر container queries.">
          <div className="cq-host">
            <div className="card-grid">
              {[
                { label: "الطلاب", value: "248", hint: "+12 هذا الشهر", tone: "primary", icon: Users },
                { label: "الحضور", value: "92%", hint: "هذا الأسبوع", tone: "success", icon: CheckCircle },
                { label: "المدفوعات", value: "18,400", hint: "جنيه", tone: "info", icon: Wallet },
                { label: "المتأخرات", value: "7", hint: "طلاب", tone: "danger", icon: Bell },
              ].map((item) => (
                <StatCard key={item.label} {...item} />
              ))}
            </div>
          </div>
          <p className="num mt-3 text-xs text-text-muted" data-testid="stat-columns">
            stat columns probe:{" "}
            {statColumns(Math.min(width - 32, contentMaxWidth(width)))}
          </p>
        </Section>

        <Section id="cards" title="البطاقات">
          <Card>
            <CardHeader
              title="بطاقة أساسية"
              subtitle="عنوان فرعي يلتف بدل أن يُقطع"
              action={<StatusPill tone="primary">نشط</StatusPill>}
            />
            <CardBody>
              <p className="text-sm leading-7 text-text-muted">
                نص توضيحي يوضح أن البطاقة تحافظ على هوامشها الداخلية عند كل
                المقاسات، وتسمح للعنوان بالالتفاف عند ضيق الحاوية.
              </p>
            </CardBody>
            <CardFooter>
              <Button variant="ghost">إلغاء</Button>
              <Button>حفظ</Button>
            </CardFooter>
          </Card>
        </Section>

        <Section id="tabs" title="التبويبات">
          <Tabs
            tabs={[
              { id: "overview", label: "نظرة عامة" },
              { id: "students", label: "الطلاب" },
              { id: "payments", label: "المدفوعات" },
            ]}
            activeId={tab}
            onChange={setTab}
          />
          <p className="mt-3 text-sm text-text-muted">
            التبويب النشط: <span className="font-bold text-text-main">{tab}</span>
          </p>
        </Section>

        <Section
          id="table"
          title="الجدول ↔ الكروت"
          note="التبديل يتم حسب عرض حاوية الجدول (container query) لا عرض الشاشة."
        >
          <div className="responsive-table" data-testid="responsive-table">
            <div className="as-table">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>الطالب</TableHeaderCell>
                    <TableHeaderCell>المجموعة</TableHeaderCell>
                    <TableHeaderCell>الحضور</TableHeaderCell>
                    <TableHeaderCell>الدفع</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DEMO_ROWS.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-semibold">{row.name}</TableCell>
                      <TableCell>{row.group}</TableCell>
                      <TableCell>
                        <StatusPill tone={TONE[row.status]}>
                          {STATUS_LABEL[row.status]}
                        </StatusPill>
                      </TableCell>
                      <TableCell>{row.paid}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="as-cards" data-testid="table-cards">
              {DEMO_ROWS.map((row) => (
                <Card key={row.name} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-text-main">{row.name}</p>
                      <p className="text-sm text-text-muted">{row.group}</p>
                    </div>
                    <StatusPill tone={TONE[row.status]}>
                      {STATUS_LABEL[row.status]}
                    </StatusPill>
                  </div>
                  <p className="mt-2 text-sm text-text-muted">الدفع: {row.paid}</p>
                </Card>
              ))}
            </div>
          </div>
        </Section>

        <Section id="modal" title="النوافذ">
          <Button data-testid="open-modal" onClick={() => setModalOpen(true)}>
            فتح نافذة
          </Button>
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="نافذة تجريبية"
            description="الرأس والتذييل يبقيان ظاهرين، والجسم يمرر داخليًا."
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={() => setModalOpen(false)}>تأكيد</Button>
              </>
            }
          >
            <div className="space-y-3">
              {Array.from({ length: 12 }).map((_, index) => (
                <p key={index} className="text-sm leading-7 text-text-muted">
                  سطر {index + 1}: محتوى طويل لاختبار التمرير الداخلي في الوضع
                  الأفقي القصير.
                </p>
              ))}
            </div>
          </Modal>
        </Section>

        <Section id="states" title="الحالات الفارغة والتحميل">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-dashed border-surface-border">
              <EmptyState
                icon={Inbox}
                title="لا يوجد طلاب"
                description="أضف أول طالب للبدء"
                action={<Button size="sm">إضافة طالب</Button>}
              />
            </div>
            <div className="rounded-card border border-dashed border-surface-border">
              <ErrorState onRetry={() => {}} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Spinner />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </Section>

        <Section id="page-header" title="رأس الصفحة">
          <PageHeader
            title="إدارة الطلاب"
            subtitle="بحث، تصفية، وإجراءات سريعة"
            breadcrumbs={[{ label: "الرئيسية", to: "/" }, { label: "الطلاب" }]}
            actions={
              <>
                <Button variant="secondary">تصدير</Button>
                <Button>إضافة طالب</Button>
              </>
            }
          />
        </Section>

        <Section
          id="shell"
          title="هيكل التنقل"
          note="الشريط الجانبي: rail عند 768، مضغوط عند 1024، كامل عند 1280. وعلى الموبايل يظهر الشريط السفلي."
        >
          <div className="cq-host overflow-hidden rounded-card border border-surface-border">
            <div className="flex min-h-72" dir="rtl">
              <SidebarPanel
                className="app-sidebar sidebar-demo"
                brand={{ initial: "E", name: "مركز تجريبي", title: "مركز تجريبي", caption: "لوحة الإدارة" }}
                items={DEMO_NAV}
                identity={{ icon: <Users className="h-4 w-4" />, title: "صاحب المركز", subtitle: "إدارة" }}
                footer={
                  <Button variant="ghost" block>
                    تسجيل خروج
                  </Button>
                }
              />
              <div className="flex-1 p-4">
                <p className="text-sm text-text-muted">
                  منطقة المحتوى. عند 768px يظهر الشريط كـrail أيقونات فقط، وعند
                  1024px تظهر التسميات، وعند 1280px يكتمل العرض.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-card border border-surface-border">
            <MobileBottomNav items={DEMO_NAV} onMore={() => {}} staticPreview />
            <p className="p-3 text-center text-xs text-text-muted">
              الشريط السفلي يظهر فقط تحت 768px، ويُخفى في الوضع الأفقي القصير.
            </p>
          </div>
        </Section>

        <p className="pb-6 text-center text-xs text-text-muted">
          نقاط التوقف: {Object.entries(BREAKPOINTS).map(([k, v]) => `${k}:${v}`).join(" · ")}
        </p>
      </div>
    </div>
  );
}

function Gallery() {
  const { isDark, toggle } = useTheme();
  const [viewportId, setViewportId] = useState("390");
  const [landscape, setLandscape] = useState(false);
  const previewRef = useRef(null);
  const [available, setAvailable] = useState(1180);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return undefined;
    const update = () => setAvailable(el.clientWidth || 1180);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const viewport = useMemo(
    () => PREVIEW_VIEWPORTS.find((item) => item.id === viewportId) ?? PREVIEW_VIEWPORTS[1],
    [viewportId],
  );

  const width = landscape ? viewport.height : viewport.width;
  const height = landscape ? viewport.width : viewport.height;
  const scale = Math.min(1, available / width);
  const mode = layoutMode(width);

  return (
    <div dir="rtl" className="min-h-dvh bg-surface-bg text-text-main">
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface-card/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Phase 2 · Responsive gallery
            </p>
            <h1 className="text-lg font-bold">معاينة كل نقاط التوقف</h1>
            <p className="text-xs text-text-muted">
              عرض {width}×{height} · الوضع {mode} · أقصى محتوى {contentMaxWidth(width)}px
            </p>
          </div>

          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-surface-border bg-surface-card"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <Button
            variant={landscape ? "primary" : "outline"}
            onClick={() => setLandscape((value) => !value)}
          >
            محاكاة أفقي
          </Button>
        </div>

        <div className="mx-auto mt-3 flex max-w-7xl flex-wrap gap-1.5">
          {PREVIEW_VIEWPORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setViewportId(item.id)}
              aria-pressed={item.id === viewportId}
              className="min-h-11 rounded-full border border-surface-border bg-surface-card px-3 text-xs font-bold transition-colors hover:bg-surface-muted aria-pressed:bg-primary aria-pressed:text-primary-contrast"
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-3 sm:p-5">
        <div ref={previewRef} className="w-full">
          <div
            className="mx-auto overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-card"
            style={{ width: width * scale, maxWidth: "100%", height: height * scale }}
          >
            <div
              style={{
                width,
                height,
                transform: `scale(${scale})`,
                transformOrigin: "top right",
              }}
            >
              <iframe
                key={`${viewportId}-${landscape}-${isDark ? "dark" : "light"}`}
                title="معاينة المكونات"
                src={`/components?embed=1&theme=${isDark ? "dark" : "light"}`}
                width={width}
                height={height}
                className="border-0 bg-surface-bg"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
          <span>
            للتحقق الآلي: افتح <code className="font-numeric">/components?embed=1</code>{" "}
            عند عرض {width}px.
          </span>
          <Link
            className="inline-flex min-h-11 items-center text-sm font-bold text-primary"
            to="/login"
          >
            العودة لتسجيل الدخول
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function DesignComponentsPage() {
  const [params] = useState(() => new URLSearchParams(window.location.search));
  return params.get("embed") === "1" ? <Showcase /> : <Gallery />;
}
