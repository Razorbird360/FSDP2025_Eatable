import { Link, useLocation } from 'react-router-dom';
import {
    FiUser,
    FiClock,
    FiUploadCloud,
    FiHeart,
    FiGift,
    FiAward,
    FiSettings,
    FiBriefcase,
    FiHelpCircle
} from "react-icons/fi";

export default function ProfileSidebar() {
    const location = useLocation();

    const SidebarItem = ({ icon: Icon, label, to }) => {
        const active = location.pathname === to;
        return (
            <Link
                to={to}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active
                        ? "bg-[#E7F3E6] text-[#21421B]"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
            >
                <Icon className={`w-5 h-5 ${active ? "text-[#21421B]" : "text-gray-500"}`} />
                {label}
            </Link>
        );
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col py-6">
            <div className="px-4 mb-2">
                <h2 className="text-xl font-bold text-[#21421B] px-2 mb-6 hidden">Eatable</h2>
            </div>

            <nav className="flex-1 px-3 space-y-1">
                <SidebarItem icon={FiUser} label="Profile" to="/profile" />
                <SidebarItem icon={FiClock} label="Order History" to="/orders" />
                <SidebarItem icon={FiUploadCloud} label="Uploads History" to="/my-collection" />
                <SidebarItem icon={FiHeart} label="Favourite Stalls" to="/my-collection" />
                <SidebarItem icon={FiGift} label="Vouchers" to="/vouchers" />
                <SidebarItem icon={FiAward} label="Achievements" to="/achievements" />
            </nav>

            <div className="px-3 mt-6 pt-6 border-t border-gray-100 space-y-1">
                <SidebarItem icon={FiSettings} label="Settings" to="/settings" />
                <SidebarItem icon={FiBriefcase} label="For Business" to="/business" />
                <SidebarItem icon={FiHelpCircle} label="Help Center" to="/help" />
            </div>
        </aside>
    );
}
