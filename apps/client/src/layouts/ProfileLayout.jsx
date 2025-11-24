import { useEffect, useState } from "react";
import { Outlet } from 'react-router-dom';
import { supabase } from "../lib/supabase";
import ProfileSidebar from '../components/ProfileSidebar';

export default function ProfileLayout() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // ---------------------------
    //  Get current JWT access token
    // ---------------------------
    async function getToken() {
        const session = await supabase.auth.getSession();
        return session.data.session?.access_token;
    }

    // ---------------------------
    //   Load profile from backend
    // ---------------------------
    async function loadProfile() {
        setLoading(true);

        const token = await getToken();
        if (!token) {
            console.error("No auth token found.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/api/profile", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                console.log("PROFILE LOADED FROM API (Layout):", data);
                setProfile(data);
            } else {
                console.error("Failed to fetch profile:", res.status);
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadProfile();
    }, []);

    // Helper to get initials
    const getInitials = (p) => {
        if (!p) return "?";
        const name = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || "User";
        return name.charAt(0).toUpperCase();
    };

    const displayName = profile ? (profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "User") : "";
    const email = profile?.email || "";
    const initials = getInitials(profile);

    return (
        <div className="flex min-h-[calc(100vh-64px)] bg-[#F8FDF3]">
            <ProfileSidebar />
            <main className="flex-1 p-8 bg-[#F8FDF3]">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Header Card - Only show if not loading and profile exists */}
                    {!loading && profile && (
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-[#6B6BCE] flex items-center justify-center text-white text-3xl font-medium shadow-sm">
                                {initials}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                                <p className="text-gray-500 text-sm">{email}</p>
                            </div>
                        </div>
                    )}

                    {/* If loading, maybe show a skeleton or just nothing? 
                        ProfilePage handles its own loading state, but we want the header to be consistent.
                        Let's show a simple loading state for the header if strictly needed, 
                        but for now let's just render Outlet.
                    */}

                    <Outlet context={{ profile, setProfile, loading, refreshProfile: loadProfile }} />
                </div>
            </main>
        </div>
    );
}
