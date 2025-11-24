import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      const token = await getToken();
      if (!token) {
        console.error("No auth token found.");
        return;
      }

      const res = await fetch("http://localhost:3000/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      console.log("PROFILE LOADED FROM API:", data);
      setProfile(data);
      setLoading(false);
    }

    loadProfile();
  }, []);

  // ---------------------------
  //   Update Profile
  // ---------------------------
  async function saveProfile() {
    setSaving(true);

    const token = await getToken();

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
    setSaving(false);
  }

  if (loading || !profile) return <div className="p-6">Loading...</div>;

  return (
    <div className="flex max-w-6xl mx-auto p-6 gap-6 font-[Sansation]">

      {/* LEFT SIDEBAR */}
      <div className="w-1/4 bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">Settings</h2>

        <div className="space-y-3">
          <button className="w-full py-2 text-white rounded-lg" 
            style={{ backgroundColor: "#21421B" }}>
            Account Preferences
          </button>

          <button className="w-full py-2 bg-white rounded-lg shadow">
            Sign in & Security
          </button>

          <button className="w-full py-2 bg-white rounded-lg shadow">
            Privacy
          </button>

          <button className="w-full py-2 bg-white rounded-lg shadow">
            Notification
          </button>

          <button className="w-full py-2 bg-white rounded-lg shadow">
            Orders & Activity
          </button>
        </div>
      </div>

      {/* MAIN PROFILE PANEL */}
      <div className="flex-1 bg-white p-8 rounded-xl shadow">

        <h2 className="text-xl font-bold mb-6">Account Preferences</h2>

        {/* PROFILE PICTURE */}
        <div className="flex justify-center mb-6">
          <div className="w-28 h-28 rounded-full bg-purple-500 text-white 
            flex items-center justify-center text-4xl font-bold">
            {profile.display_name?.charAt(0)?.toUpperCase()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">

          {/* FIRST NAME */}
          <div>
            <label className="block mb-1 font-medium">First Name</label>
            <input
              type="text"
              className="w-full border rounded-md p-2"
              value={profile.first_name || ""}
              onChange={(e) =>
                setProfile({ ...profile, first_name: e.target.value })
              }
            />
          </div>

          {/* LAST NAME */}
          <div>
            <label className="block mb-1 font-medium">Last Name</label>
            <input
              type="text"
              className="w-full border rounded-md p-2"
              value={profile.last_name || ""}
              onChange={(e) =>
                setProfile({ ...profile, last_name: e.target.value })
              }
            />
          </div>

          {/* LOCATION */}
          <div>
            <label className="block mb-1 font-medium">Location</label>
            <input
              type="text"
              className="w-full border rounded-md p-2"
              value={profile.location || ""}
              onChange={(e) =>
                setProfile({ ...profile, location: e.target.value })
              }
            />
          </div>

          {/* DESCRIPTION */}
          <div className="col-span-2">
            <label className="block mb-1 font-medium">Description</label>
            <textarea
              className="w-full border rounded-md p-2 h-32"
              value={profile.description || ""}
              onChange={(e) =>
                setProfile({ ...profile, description: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button className="px-6 py-2 bg-gray-200 rounded-lg">Cancel</button>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-6 py-2 text-white rounded-lg"
            style={{ backgroundColor: "#21421B" }}
          >
            {saving ? "Updating..." : "Update"}
          </button>
        </div>

      </div>
    </div>
  );
}
