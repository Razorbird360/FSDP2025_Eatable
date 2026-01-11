import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FiCheck, FiEdit3 } from "react-icons/fi";
import api from "../lib/api";

export default function ProfilePage() {
  const { profile, setProfile, loading } = useOutletContext();
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  async function saveProfile() {
    setSaving(true);

    try {
      const res = await api.post("/profile/update", profile);
      const data = res.data;

      setIsEditing(false);
      alert("Profile updated!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 min-h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21421B]"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 min-h-[300px] flex items-center justify-center">
        <p className="text-gray-500">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 md:p-8 shadow-sm border border-gray-100">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-900">Personal Information</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#21421B] hover:bg-[#E7F3E6] rounded-lg transition-colors"
          >
            <FiEdit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        )}
      </div>

      {/* Form Section */}
      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-6">

        {/* Full Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Full Name</label>
          <input
            type="text"
            value={profile.display_name || ""}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            disabled={!isEditing}
            className={`w-full px-4 py-3 md:py-2.5 rounded-xl md:rounded-lg border text-gray-900 outline-none transition-all text-base ${
              isEditing 
                ? 'border-gray-300 focus:ring-2 focus:ring-[#21421B] focus:border-transparent bg-white' 
                : 'border-gray-100 bg-gray-50 cursor-not-allowed'
            }`}
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
            disabled={!isEditing}
            className={`w-full px-4 py-3 md:py-2.5 rounded-xl md:rounded-lg border text-gray-900 outline-none transition-all text-base ${
              isEditing 
                ? 'border-gray-300 focus:ring-2 focus:ring-[#21421B] focus:border-transparent bg-white' 
                : 'border-gray-100 bg-gray-50 cursor-not-allowed'
            }`}
            placeholder="Enter username"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Email</label>
          <input
            type="email"
            value={profile.email || ""}
            readOnly
            className="w-full px-4 py-3 md:py-2.5 rounded-xl md:rounded-lg border border-gray-100 text-gray-900 bg-gray-50 cursor-not-allowed text-base"
          />
          <p className="text-xs text-gray-400">Email cannot be changed</p>
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Phone Number</label>
          <input
            type="tel"
            value={profile.phone || ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            disabled={!isEditing}
            className={`w-full px-4 py-3 md:py-2.5 rounded-xl md:rounded-lg border text-gray-900 outline-none transition-all text-base ${
              isEditing 
                ? 'border-gray-300 focus:ring-2 focus:ring-[#21421B] focus:border-transparent bg-white' 
                : 'border-gray-100 bg-gray-50 cursor-not-allowed'
            }`}
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
              disabled={!isEditing}
              className={`w-full px-4 py-3 md:py-2.5 rounded-xl md:rounded-lg border text-gray-900 outline-none appearance-none transition-all text-base ${
                isEditing 
                  ? 'border-gray-300 focus:ring-2 focus:ring-[#21421B] focus:border-transparent bg-white' 
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed'
              }`}
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

      {/* Action Buttons */}
      {isEditing && (
        <div className="mt-6 md:mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={() => setIsEditing(false)}
            className="w-full sm:w-auto px-6 py-3 md:py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl md:rounded-lg hover:bg-gray-50 transition-colors text-base"
          >
            Cancel
          </button>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 md:py-2.5 bg-[#1B3C18] text-white font-medium rounded-xl md:rounded-lg hover:bg-[#142d12] active:bg-[#0f210d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-base"
          >
            <FiCheck className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
