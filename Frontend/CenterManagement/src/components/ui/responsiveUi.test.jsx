import { describe, expect, it } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import Button from "./Button";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "./Table";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import SidebarPanel from "@/components/layout/SidebarPanel";

const navItems = [
  { label: "الطلاب", path: "/students", icon: () => h("span") },
  { label: "الحضور", path: "/attendance", icon: () => h("span") },
  { label: "المدفوعات", path: "/payments", icon: () => h("span") },
  { label: "الإشعارات", path: "/notifications", icon: () => h("span") },
  { label: "التقارير", path: "/reports", icon: () => h("span") },
];

describe("base components meet the responsive contract", () => {
  it("every button size is a 44px touch target with a pill radius", () => {
    for (const size of ["sm", "md", "lg", "icon"]) {
      const html = renderToStaticMarkup(
        h(Button, { size }, "حفظ"),
      );
      expect(html).toMatch(/min-h-1[12]/);
      expect(html).toContain("rounded-action");
    }
  });

  it("the modal exposes an internal scroll region and a footer", () => {
    const html = renderToStaticMarkup(
      h(
        Modal,
        {
          isOpen: true,
          onClose: () => {},
          title: "نافذة",
          footer: h(Button, null, "تأكيد"),
        },
        h("p", null, "محتوى"),
      ),
    );

    expect(html).toContain('data-scroll-region="modal-body"');
    expect(html).toContain("modal-scroll");
    expect(html).toContain("modal-panel");
    expect(html).toContain("modal-footer");
    expect(html).toContain("تأكيد");
  });

  it("tables keep their own horizontal scroll instead of widening the page", () => {
    const html = renderToStaticMarkup(
      h(
        Table,
        null,
        h(
          TableHead,
          null,
          h(TableRow, null, h(TableHeaderCell, null, "الطالب")),
        ),
        h(TableBody, null, h(TableRow, null, h(TableCell, null, "أحمد"))),
      ),
    );

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("min-w-[36rem]");
  });

  it("page-header actions become full width on phones", () => {
    const html = renderToStaticMarkup(
      h(PageHeader, {
        title: "الطلاب",
        actions: h(Button, null, "إضافة"),
      }),
    );

    expect(html).toContain("w-full");
    expect(html).toContain("sm:w-auto");
  });

  it("the mobile bottom bar keeps four destinations plus a more button", () => {
    const html = renderToStaticMarkup(
      h(
        MemoryRouter,
        { initialEntries: ["/attendance"] },
        h(MobileBottomNav, { items: navItems, onMore: () => {} }),
      ),
    );

    expect(html).toContain('aria-label="التنقل السريع"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("المزيد");
    expect((html.match(/<a /g) ?? []).length).toBe(4);
  });

  it("the sidebar panel carries rail/compact hooks and accessible nav", () => {
    const html = renderToStaticMarkup(
      h(
        MemoryRouter,
        null,
        h(SidebarPanel, {
          brand: { initial: "E", name: "Edu", title: "مركز", caption: "إدارة" },
          items: navItems,
          identity: { icon: h("span"), title: "صاحب المركز", subtitle: "إدارة" },
          footer: h("button", null, "خروج"),
        }),
      ),
    );

    expect(html).toContain('aria-label="التنقل الرئيسي"');
    expect(html).toContain("sidebar-link");
    expect(html).toContain("sidebar-label");
    expect(html).toContain("sidebar-identity");
  });
});
