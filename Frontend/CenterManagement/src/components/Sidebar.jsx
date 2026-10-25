import { NavLink } from 'react-router-dom'
import { 
  Home, 
  CalendarDays, 
  Star, 
  Wallet, 
  GraduationCap, 
  Settings,
  AlertTriangle
} from '@/components/icons'

export default function Sidebar() {
  const navItems = [
    { title: 'الرئيسية', path: '/dashboard', icon: Home },
    { title: 'الحضور', path: '/attendance', icon: CalendarDays },
    { title: 'الدرجات', path: '/grades', icon: Star },
    { title: 'المالية', path: '/finance', icon: Wallet },
    { title: 'المتأخرين', path: '/overdue', icon: AlertTriangle },
    { title: 'التقارير', path: '/reports', icon: GraduationCap },
    { title: 'الإعدادات', path: '/settings', icon: Settings },
  ]

  return (
    <aside className="w-64 bg-surface-card border-l border-surface-border p-4 h-screen sticky top-0 flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center gap-3 px-3 mb-8 pt-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-text-inverse font-bold text-lg shadow-sm">
            Edu
          </div>
          <h2 className="text-lg font-bold text-text-main">نظام الإدارة</h2>
        </div>
        
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-text-inverse shadow-sm'
                      : 'text-text-muted hover:bg-surface-muted hover:text-text-main'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-surface-border pt-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-subtle text-primary font-bold flex items-center justify-center text-sm">
            ADMIN
          </div>
          <div className="text-xs">
            <p className="font-semibold text-text-main">لوحة التحكم</p>
            <p className="text-text-muted">مشرف النظام</p>
          </div>
        </div>
      </div>
    </aside>
  )
}