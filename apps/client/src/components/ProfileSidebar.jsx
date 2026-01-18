import { Link, useLocation } from "react-router-dom";
import logoFull from "../assets/logo/logo_full.png";
import {
  Award,
  Briefcase,
  Clock,
  DollarSign,
  Gift,
  HelpCircle,
  Settings,
  Shield,
  UploadCloud,
  User,
} from "lucide-react";
import { useAuth } from "../features/auth/useAuth";

export default function ProfileSidebar() {
  const location = useLocation();
  const { profile } = useAuth();

  const SidebarItem = ({ icon: Icon, label, to, match }) => {
    const active = match
      ? location.pathname.startsWith(match)
      : location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
          active
            ? "bg-[#E7F3E6] text-[#21421B]"
            : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        <Icon
          className={`w-5 h-5 ${
            active ? "text-[#21421B]" : "text-gray-500"
          }`}
        />
        {label}
      </Link>
    );
  };

  return (
    <aside className="w-full md:w-64 bg-white border-b md:border-r border-gray-100 flex flex-row md:flex-col py-2 md:py-6 sticky top-16 z-10 md:h-[calc(100vh-64px)] overflow-x-auto md:overflow-visible no-scrollbar">
      <div className="hidden md:block px-6 mb-8">
        <img src={logoFull} alt="Eatable" className="h-8" />
      </div>

      <div className="flex flex-row md:flex-col md:w-full px-2 md:px-0">
        <nav className="flex flex-row md:flex-col md:px-3 space-x-2 md:space-x-0 md:space-y-1">
          <SidebarItem icon={User} label="Profile" to="/profile" />
          <SidebarItem icon={Clock} label="Order History" to="/orders" />
          <SidebarItem
            icon={UploadCloud}
            label="Uploads History"
            to="/my-collection"
          />
          <SidebarItem icon={Gift} label="Vouchers" to="/vouchers" />
          <SidebarItem icon={Award} label="Achievements" to="/achievements" />
          <SidebarItem
            icon={DollarSign}
            label="Spending Budget"
            to="/spendingsPage"
          />
        </nav>

        <div className="flex flex-row md:flex-col md:px-3 md:mt-6 md:pt-6 border-l md:border-l-0 md:border-t border-gray-100 space-x-2 md:space-x-0 md:space-y-1 ml-2 md:ml-0 pl-2 md:pl-0">
          {profile?.role === "admin" && (
            <SidebarItem icon={Shield} label="Admin" to="/admin" match="/admin" />
          )}
          <SidebarItem icon={Settings} label="Settings" to="/settings" />
          <SidebarItem icon={Briefcase} label="For Business" to="/business" />
          <SidebarItem icon={HelpCircle} label="Help Center" to="/help" />
        </div>
      </div>
    </aside>
  );
}
