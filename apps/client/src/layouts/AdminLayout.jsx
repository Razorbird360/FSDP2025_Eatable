import { Link, NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { label: 'Reports', to: '/admin/moderation/reports' },
  { label: 'Vouchers', to: '/admin/vouchers' },
  { label: 'Achievements', to: '/admin/achievements' },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f8fdf3]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 space-y-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">
              Switch between moderation queues and rewards management.
            </p>
          </div>
          <Link
            to="/home"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900"
          >
            Back to site
          </Link>
        </header>

        <nav className="flex flex-wrap gap-2 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive
                  ? 'rounded-full bg-[#21421B] px-4 py-2 font-semibold text-white'
                  : 'rounded-full border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:border-gray-300'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
