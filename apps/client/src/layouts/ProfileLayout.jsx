import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, Link, useLocation } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import {
    Award,
    Briefcase,
    Clock,
    Gift,
    HelpCircle,
    Settings,
    UploadCloud,
    User,
    DollarSign,
    Edit3,
} from "lucide-react";
import api from "@lib/api";

const mobileNavItems = [
    { icon: User, label: "Profile", to: "/profile" },
    { icon: Clock, label: "Orders", to: "/orders" },
    { icon: UploadCloud, label: "Uploads", to: "/my-collection" },
    { icon: DollarSign, label: "Budget", to: "/spendingsPage" },
    { icon: Gift, label: "Vouchers", to: "/vouchers" },
    { icon: Award, label: "Achievements", to: "/achievements" },
];

const mobileSecondaryNavItems = [
    { icon: Settings, label: "Settings", to: "/settings" },
    { icon: Briefcase, label: "Business", to: "/business" },
    { icon: HelpCircle, label: "Help", to: "/help" },
];

export default function ProfileLayout() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef(null);
    const location = useLocation();

    const loadProfile = useCallback(async () => {
        setLoading(true);

        try {
            const res = await api.get("/profile");
            setProfile(res.data);
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // Helper to get initials
    const getInitials = (p) => {
        if (!p) return "?";
        const name = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || "User";
        return name.charAt(0).toUpperCase();
    };

    const displayName = profile ? (profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "User") : "";
    const email = profile?.email || "";
    const initials = getInitials(profile);
    const profilePicUrl =
        profile?.profile_pic_url || profile?.profilePicUrl || null;

    const isActive = (path) => location.pathname === path;

    const handleAvatarChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            const res = await api.post("/profile/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 35000,
            });
            const profilePicUrl = res.data?.profilePicUrl ?? null;
            if (profilePicUrl) {
                setProfile((prev) => ({
                    ...prev,
                    profile_pic_url: profilePicUrl,
                }));
            }
            await loadProfile();
        } catch (error) {
            console.error("Error uploading profile picture:", error);
        } finally {
            setAvatarUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-64px)] bg-[#F8FDF3]">
            {/* Desktop Sidebar - hidden on mobile */}
            <div className="hidden md:block">
                <ProfileSidebar />
            </div>

            <main className="flex-1 p-4 md:p-8 bg-[#F8FDF3]">
                <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

                    {/* Header Card */}
                    {!loading && profile && (
                        <div className="mt-4 md:mt-0 bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4 md:gap-6">
                                {/* Avatar */}
                                <div className="relative">
                                    {profilePicUrl ? (
                                        <img
                                            src={profilePicUrl}
                                            alt={displayName || 'Profile'}
                                            className="w-14 h-14 md:w-20 md:h-20 rounded-full object-cover border border-gray-100 shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-[#21421B] flex items-center justify-center text-white text-xl md:text-3xl font-medium shadow-lg">
                                            {initials}
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={avatarUploading}
                                        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#21421B] shadow-md border border-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        aria-label="Edit profile photo"
                                    >
                                        <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{displayName}</h1>
                                    <p className="text-gray-500 text-xs md:text-sm truncate">{email}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mobile Navigation Tabs - hidden on desktop */}
                    <div className="md:hidden space-y-3">
                        {/* Primary navigation - vertical list for thin screens */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                            <div className="grid grid-cols-3 gap-2">
                                {mobileNavItems.map((item) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.to);
                                    return (
                                        <Link
                                            key={item.to}
                                            to={item.to}
                                            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all ${active
                                                ? 'bg-[#E7F3E6] text-[#21421B]'
                                                : 'text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Icon className={`w-6 h-6 mb-1.5 ${active ? 'text-[#21421B]' : 'text-gray-400'}`} />
                                            <span className={`text-xs font-medium ${active ? 'text-[#21421B]' : 'text-gray-500'}`}>
                                                {item.label}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Secondary navigation - stacked for thin screens */}
                        <div className="grid grid-cols-3 gap-2">
                            {mobileSecondaryNavItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.to);
                                return (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all ${active
                                            ? 'bg-[#E7F3E6] border-[#21421B] text-[#21421B]'
                                            : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 mb-1 ${active ? 'text-[#21421B]' : 'text-gray-400'}`} />
                                        <span className={`text-xs font-medium ${active ? 'text-[#21421B]' : 'text-gray-500'}`}>
                                            {item.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <Outlet context={{ profile, setProfile, loading, refreshProfile: loadProfile }} />
                </div>
            </main>
        </div>
    );
}
