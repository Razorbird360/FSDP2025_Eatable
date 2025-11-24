import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProfilePage() {
  const { profile, setProfile, loading } = useOutletContext();
  const [saving, setSaving] = useState(false);

  // ---------------------------
  //  Get current JWT access token
  // ---------------------------
  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token;
  }

  // ---------------------------
  //   Update Profile
  // ---------------------------
  async function saveProfile() {
    setSaving(true);

    const token = await getToken();

    try {
      const res = await fetch("http://localhost:3000/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      console.log("UPDATE RESPONSE:", data);

      alert("Profile updated!");
      // profile state is already updated via setProfile (controlled inputs)
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-10 text-center">Loading profile...</div>;
  if (!profile) return <div className="p-10 text-center">Profile not found.</div>;

  return (
    <>
      {/* Header Card REMOVED (now in ProfileLayout) */}

      {/* Form Section */}
      <div className="bg-white rounded-xl p-8 shadow-sm relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Full Name</label>
            <input
              type="text"
              value={profile.display_name || ""}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-[#21421B] focus:border-transparent outline-none transition-all"
              placeholder="Enter full name"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Username</label>
            <input
              type="text"
              value={profile.username || ""}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-[#21421B] focus:border-transparent outline-none transition-all"
              placeholder="Enter username"
            />
          </div>

          {/* Gmail */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Gmail</label>
            <input
              type="email"
              value={profile.email || ""}
              readOnly // Often email is not editable directly
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 bg-gray-50 cursor-not-allowed"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Phone Number</label>
            <input
              type="tel"
              value={profile.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-[#21421B] focus:border-transparent outline-none transition-all"
              placeholder="Enter phone number"
            />
          </div>

          {/* Language */}
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-600">Language</label>
            <div className="relative">
              <select
                value={profile.language || "English"}
                onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-[#21421B] focus:border-transparent outline-none appearance-none bg-white transition-all"
              >
                <option value="English">English</option>
                <option value="Chinese">Chinese</option>
                <option value="Malay">Malay</option>
                <option value="Tamil">Tamil</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

        </div>

        {/* Edit Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-8 py-2.5 bg-[#1B3C18] text-white font-medium rounded-lg hover:bg-[#142d12] active:bg-[#0f210d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Edit"}
          </button>
        </div>
      </div>
    </>
  );
}
