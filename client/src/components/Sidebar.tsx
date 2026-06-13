import { NavLink, useLocation } from 'react-router-dom';
import { Upload, List, Download } from 'lucide-react';

const nav = [
  { to: '/', label: 'Upload Menu', icon: Upload, exact: true },
  { to: '/products', label: 'Products', icon: List },
  { to: '/export', label: 'Export', icon: Download },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-56 bg-brand-teal text-white flex flex-col shrink-0 h-screen sticky top-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <img
          src="/logo.png"
          alt="CatalogPilot"
          className="w-8 h-8 object-contain rounded"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="font-bold text-base leading-tight">CatalogPilot</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-brand-orange text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
