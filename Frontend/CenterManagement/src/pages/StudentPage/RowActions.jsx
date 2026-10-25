import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle,
  CircleDollarSign,
  Eye,
  MoreVertical,
  Pencil,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserRound,
  X,
} from "@/components/icons";

const MENU_BUTTON_CLASS =
  "flex w-full items-center gap-3 px-3 py-2.5 text-right text-sm transition-colors hover:bg-surface-muted focus:outline-none focus:bg-surface-muted";

const MOBILE_BUTTON_CLASS =
  "flex w-full items-center gap-3 px-4 py-3.5 text-right text-base transition-colors active:bg-surface-muted";

const MENU_WIDTH = 208;

export default function RowActions({
  student,
  onView,
  onEdit,
  onDelete,
  onPayment,
  onActive,
  onCreateParentAccount,
  showPayment = true,
  name,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, openUp: false });
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!menuOpen || isMobile || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const estimatedMenuHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedMenuHeight;

    setPosition({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: rect.right - MENU_WIDTH,
      openUp,
    });
  }, [menuOpen, isMobile]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleOutsideClick = (event) => {
      const clickedButton = buttonRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);
      if (!clickedButton && !clickedMenu) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen]);

  const runAction = (action) => {
    setMenuOpen(false);
    action(student);
  };

  const actions = [
    showPayment && {
      key: "payment",
      onClick: onPayment,
      icon: student.isPaid ? CheckCircle : CircleDollarSign,
      label: student.isPaid ? "تحديد كغير مدفوع" : "تسجيل كمدفوع",
      color: student.isPaid ? "text-green-600" : "text-amber-600",
    },
    {
      key: "view",
      onClick: onView,
      icon: Eye,
      label: "عرض الطالب",
      color: "text-sky-600",
    },
    {
      key: "edit",
      onClick: onEdit,
      icon: Pencil,
      label: "تعديل الطالب",
      color: "text-amber-600",
    },
    onCreateParentAccount && {
      key: "parentAccount",
      onClick: onCreateParentAccount,
      icon: UserRound,
      label: "إنشاء حساب ولي الأمر",
      color: "text-indigo-600",
    },
    {
      key: "delete",
      onClick: onDelete,
      icon: Trash2,
      label: "حذف الطالب",
      color: "text-red-600",
    },
    {
      key: "active",
      onClick: onActive,
      icon: student.isActive ? ShieldX : ShieldCheck,
      label: student.isActive ? "تعطيل الطالب" : "تفعيل الطالب",
      color: student.isActive ? "text-red-600" : "text-green-600",
    },
  ].filter(Boolean);

  return (
    <>
      <div className="relative flex justify-end">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={`Actions for ${name}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {menuOpen &&
        !isMobile &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: position.openUp ? undefined : position.top,
              bottom: position.openUp
                ? window.innerHeight - position.top
                : undefined,
              left: position.left,
              width: MENU_WIDTH,
            }}
            className="z-50 overflow-hidden rounded-lg border border-surface-border bg-surface-card py-1 text-text-main shadow-lg"
          >
            {actions.map(({ key, onClick, icon: Icon, label, color }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => runAction(onClick)}
                className={`${MENU_BUTTON_CLASS} ${color}`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}

      {menuOpen &&
        isMobile &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
            <div
              ref={menuRef}
              className="w-full max-w-md rounded-t-2xl bg-surface-card pb-[env(safe-area-inset-bottom)] shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
                <span className="text-sm font-bold text-text-main">{name}</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-1">
                {actions.map(({ key, onClick, icon: Icon, label, color }) => (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    onClick={() => runAction(onClick)}
                    className={`${MOBILE_BUTTON_CLASS} ${color}`}
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
