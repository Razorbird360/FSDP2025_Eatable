import { useEffect, useMemo, useState } from "react";
import UpvoteIcon from "../assets/upvote.svg";
import DownvoteIcon from "../assets/downvote.svg";
import { useParams } from "react-router-dom";
import api from "../../../lib/api";
import { supabase } from "../../../lib/supabase";

export default function StallGallery() {
  const { stallId } = useParams();

  // ===== Auth: current user id from Supabase =====
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const { data} = await supabase.auth.getSession();

      if (cancelled) return;

      const userId = data?.session?.user?.id ?? null;
      if (userId) {
        console.log("User ID:", userId);
      } else {
        console.log("No Supabase session found.");
      }
      setCurrentUserId(userId);
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // ===== API data state =====
  const [items, setItems] = useState([]); // normalized items used everywhere
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== Relations now use value: 1 (upvote) or 0 (downvote) =====
  const [relations, setRelations] = useState([]);

  // NEW: keep track of which images this user has reported
  const [reportedIds, setReportedIds] = useState([]);

  // NEW: report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  // ===== Notification bar state =====
  const [notice, setNotice] = useState(null);

  // ===== Image Popup =====
  const [popupId, setPopupId] = useState(null);

  // ===== Fetch gallery from API =====
  useEffect(() => {
    async function fetchGallery() {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/stalls/${stallId}/gallery`);
        const data = res.data;

        const normalized = data.map((u) => ({
          id: u.id,
          src: u.imageUrl,
          upvoteCount: u.upvoteCount ?? 0,
          downvoteCount: u.downvoteCount ?? 0,
          caption: u.caption || u.menuItem?.name || "Photo",
          verified: u.validationStatus === "approved",
          raw: u,
        }));

        setItems(normalized);
      } catch (err) {
        console.error("   message :", err.message);
        console.error("   response:", err.response?.status, err.response?.data);
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (stallId) {
      fetchGallery();
    } else {
      console.log("⚠️ stallId is falsy, not fetching");
    }
  }, [stallId]);

  // ===== Fetch user's votes from API =====
  useEffect(() => {
    async function fetchVotes() {
      try {
        if (!currentUserId) {
          // if not logged in, clear any previous relations
          setRelations([]);
          return;
        }

        const res = await api.get(`/media/getVotes`);
        const data = res.data;
        // data.votes is expected to be:
        // [
        //   { uploadId, userId, vote: 1 | -1, ... }
        // ]

        console.log("Fetched votes for user:", data);

        const normalizedRelations =
          (data.votes || []).map((v) => ({
            userId: data.userId,
            uploadId: v.uploadId,
            // internal value: 1 = upvote, 0 = downvote
            value: v.vote === 1 ? 1 : 0,
          })) ?? [];

        setRelations(normalizedRelations);
      } catch (err) {
        console.error(err);
        // We don't show an error banner for votes; gallery still works
      }
    }

    fetchVotes();
  }, [currentUserId]);


    // ===== Fetch user's existing reports from API =====
  useEffect(() => {
    async function fetchReports() {
      try {
        if (!currentUserId) {
          // if not logged in, clear previous reported IDs
          setReportedIds([]);
          return;
        }

        const res = await api.get("/moderation/reports");
        const data = res.data || [];

        // data is: [{ id, uploadId, reporterId, reason, status, ... }, ...]
        const ids = data.map((r) => r.uploadId);

        setReportedIds(ids);
      } catch (err) {
        console.error("Failed to fetch reports:", err.response || err);
        // don't block gallery if this fails
      }
    }

    fetchReports();
  }, [currentUserId]);

  // ===== Frozen display order: SORT BY UPVOTES ONLY =====
  const displayOrder = useMemo(() => {
    return [...items]
      .sort((a, b) => b.upvoteCount - a.upvoteCount)
      .map((it) => it.id);
  }, [items]);

  // ===== Lookup maps =====
  const itemById = useMemo(() => {
    const m = new Map();
    items.forEach((it) => m.set(it.id, it));
    return m;
  }, [items]);

  const voteMap = useMemo(() => {
    const map = new Map();
    relations.forEach((r) => map.set(`${r.userId}::${r.uploadId}`, r.value));
    return map;
  }, [relations]);

  const getVoteValue = (id) =>
    currentUserId ? voteMap.get(`${currentUserId}::${id}`) : undefined;

  // ===== Bento shape logic unchanged =====
  const weightedPool = useMemo(
    () => ["2x1", "2x1", "2x1", "1x1", "1x1", "1x2", "1x2"],
    []
  );

  const shapeById = useMemo(() => {
    const map = new Map();
    const hash = (id) => {
      let h = 0;
      for (let i = 0; i < id.length; i++)
        h = (h * 31 + id.charCodeAt(i)) >>> 0;
      return h % weightedPool.length;
    };
    displayOrder.forEach((id) => map.set(id, weightedPool[hash(id)]));
    return map;
  }, [displayOrder, weightedPool]);

  // ===== Update vote counters =====
  const updateCounts = (id, upDelta, downDelta) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              upvoteCount: Math.max(0, it.upvoteCount + upDelta),
              downvoteCount: Math.max(0, it.downvoteCount + downDelta),
            }
          : it
      )
    );
  };

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000); // auto dismiss after 3 sec
  };

  // ===== Voting Actions =====
  const handleUpvote = async (id) => {
    if (!currentUserId) {
      showNotice("Please log in to vote on photos.");
      return;
    }

    const val = getVoteValue(id);
    console.log("Upvote:", id, "current val:", val);

    // already upvoted -> remove upvote
    if (val === 1) {
      try {
        const res = await api.delete(`/media/removeupvote/${id}`);
        if (res.status < 200 || res.status >= 300) {
          throw new Error(`Server responded ${res.status}`);
        }

        // only update UI after successful response
        updateCounts(id, -1, 0);
        setRelations((prev) =>
          prev.filter(
            (r) => !(r.userId === currentUserId && r.uploadId === id)
          )
        );
      } catch (err) {
        console.error(err);
        showNotice("Failed to update upvote on server.");
      }
      return;
    }

    // already downvoted
    if (val === 0) {
      showNotice("You cannot upvote a picture you already downvoted.");
      return;
    }

    // new upvote
    try {
      const res = await api.post(`/media/upvote/${id}`);
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Server responded ${res.status}`);
      }

      updateCounts(id, +1, 0);
      setRelations((prev) => [
        ...prev,
        { userId: currentUserId, uploadId: id, value: 1 },
      ]);
    } catch (err) {
      console.error(err);
      showNotice("Failed to update upvote on server.");
    }
  };

  const handleDownvote = async (id) => {
    if (!currentUserId) {
      showNotice("Please log in to vote on photos.");
      return;
    }

    const val = getVoteValue(id);
    console.log("Downvote:", id, "current val:", val);

    // already downvoted -> remove downvote
    if (val === 0) {
      try {
        const res = await api.delete(`/media/removedownvote/${id}`);
        if (res.status < 200 || res.status >= 300) {
          throw new Error(`Server responded ${res.status}`);
        }

        // only update UI after successful response
        updateCounts(id, 0, -1);
        setRelations((prev) =>
          prev.filter(
            (r) => !(r.userId === currentUserId && r.uploadId === id)
          )
        );
      } catch (err) {
        console.error(err);
        showNotice("Failed to update downvote on server.");
      }
      return;
    }

    // already upvoted
    if (val === 1) {
      showNotice("You cannot downvote a picture you already upvoted.");
      return;
    }

    // new downvote
    try {
      const res = await api.post(`/media/downvote/${id}`);
      console.log(res);
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Server responded ${res.status}`);
      }

      updateCounts(id, 0, +1);
      setRelations((prev) => [
        ...prev,
        { userId: currentUserId, uploadId: id, value: 0 },
      ]);
    } catch (err) {
      console.error(err);
      showNotice("Failed to update downvote on server.");
    }
  };

  // ===== Report Actions =====
  const openReportModal = () => {
    if (!popupId) return;

    if (reportedIds.includes(popupId)) {
      showNotice("You've already reported this photo. Our team is reviewing it.");
      return;
    }

    setReportReason("");
    setReportDetails("");
    setReportModalOpen(true);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!popupId) return;

    if (!reportReason) {
      showNotice("Please select a reason to report this photo.");
      return;
    }

    try {
      await api.post(`/moderation/report/${popupId}`, {
        reason: reportReason,
        details: reportDetails,
      });

      setReportedIds((prev) =>
        prev.includes(popupId) ? prev : [...prev, popupId]
      );
      setReportModalOpen(false);
      showNotice("Thanks for reporting. We'll review this photo shortly.");
    } catch (err) {
      console.error("Failed to submit report:", err.response || err);
      showNotice("Failed to submit report: " + (err.response?.data?.error || err.message));
    }
  };


  // ===== Loading / Error States =====
  if (loading) {
    return (
      <section className="mt-12 mb-20 px-4 md:px-8">
        <h2 className="text-center text-3xl font-bold text-emerald-900 mb-8">
          Customer Favourites
        </h2>
        <div className="text-center text-gray-600">Loading gallery…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-12 mb-20 px-4 md:px-8">
        <h2 className="text-center text-3xl font-bold text-emerald-900 mb-8">
          Customer Favourites
        </h2>
        <div className="text-center text-red-600">
          Failed to load gallery: {error}
        </div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="mt-12 mb-20 px-4 md:px-8">
        <h2 className="text-center text-3xl font-bold text-emerald-900 mb-8">
          Customer Favourites
        </h2>
        <div className="text-center text-gray-600">
          No photos uploaded for this stall yet.
        </div>
      </section>
    );
  }

  // ===== Popup item (for convenience) =====
  const popupItem = popupId ? itemById.get(popupId) : null;
  const uploaderName =
    popupItem?.raw?.user?.displayName || "Anonymous foodie";

  // ===== Render =====
  return (
    <section className="mt-12 mb-20 px-4 md:px-8">
      <h2 className="text-center text-3xl font-bold text-emerald-900 mb-8">
        Customer Favourites
      </h2>

      <div className="bento-grid max-w-7xl mx-auto">
        {displayOrder.map((id) => {
          const it = itemById.get(id);
          if (!it) return null;
          const voteVal = getVoteValue(id);
          const shape = shapeById.get(id);

          return (
            <div
              key={id}
              className={`bento-item span-${shape} group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] duration-300`}
            >
              <img
                src={it.src}
                alt={it.caption}
                onClick={() => setPopupId(id)}
                className="w-full h-full object-cover cursor-pointer group-hover:scale-110 duration-500"
              />

              {/* Upvote/Downvote count pill (with SVG icons) */}
              <div className="absolute top-3 left-3 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-white opacity-0 group-hover:opacity-100 duration-200 text-sm flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <img src={UpvoteIcon} alt="Upvotes" className="h-6 w-6 invert" />
                  {it.upvoteCount}
                </span>
                <span className="flex items-center gap-1">
                  <img
                    src={DownvoteIcon}
                    alt="Downvotes"
                    className="h-6 w-6 invert translate-y-[3px]"
                  />
                  {it.downvoteCount}
                </span>
              </div>

              {/* Upvote (icon → expand on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpvote(id);
                }}
                className={`absolute bottom-3 left-3
                  flex items-center gap-2 px-2 py-1
                  rounded-full text-white text-sm
                  backdrop-blur border border-white/10 shadow
                  transition-all duration-200 overflow-hidden
                  w-[34px] hover:w-[110px]
                  ${
                    voteVal === 1
                      ? "bg-emerald-700/70"
                      : "bg-black/50 hover:bg-black/70"
                  }
                  ${
                    voteVal === 1
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
              >
                <img
                  src={UpvoteIcon}
                  alt="Upvote"
                  className="h-6 w-6 invert"
                />
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Upvote
                </span>
              </button>

              {/* Downvote (icon → expand on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownvote(id);
                }}
                className={`absolute bottom-3 right-3
                  flex items-center gap-2 px-2 py-1
                  rounded-full text-white text-sm
                  backdrop-blur border border-white/10 shadow
                  transition-all duration-200 overflow-hidden
                  w-[34px] hover:w-[120px]
                  ${
                    voteVal === 0
                      ? "bg-rose-700/70"
                      : "bg-black/50 hover:bg-black/70"
                  }
                  ${
                    voteVal === 0
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
              >
                <img
                  src={DownvoteIcon}
                  alt="Downvote"
                  className="h-6 w-6 invert translate-y-[3px]"
                />
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Downvote
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ===== IMAGE PREVIEW POPUP ===== */}
      {popupId && popupItem && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPopupId(null)}
        >
          <div
            className="relative bg-white rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20"
              onClick={() => setPopupId(null)}
            >
              ✕
            </button>

            <img
              src={popupItem.src}
              className="w-full max-h-[70vh] object-cover"
            />

            <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  {popupItem.caption}
                </div>
                {/* NEW: uploader display name */}
                <div className="text-xs text-gray-500">
                  Uploaded by <span className="font-medium">{uploaderName}</span>
                </div>
              </div>

              <div className="flex flex-col items-start md:flex-row md:items-center md:gap-6 gap-2">
                <div className="font-medium text-gray-700 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    {/* FIX: no invert so they show clearly on white background */}
                    <img
                      src={UpvoteIcon}
                      alt="Upvotes"
                      className="h-6 w-6"
                    />
                    {popupItem.upvoteCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <img
                      src={DownvoteIcon}
                      alt="Downvotes"
                      className="h-6 w-6 translate-y-[3px]"
                    />
                    {popupItem.downvoteCount}
                  </span>
                </div>

                {/* Open report form popup */}
                <button
                  onClick={openReportModal}
                  className={`text-[11px] md:text-xs px-2.5 py-1 rounded-full border whitespace-nowrap
                    ${
                      reportedIds.includes(popupId)
                        ? "border-rose-300 bg-rose-50 text-rose-500 cursor-default"
                        : "border-rose-400 text-rose-600 hover:bg-rose-50"
                    }`}
                >
                  {reportedIds.includes(popupId) ? "✓ Reported" : "⚑ Report Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== REPORT POPUP FORM ===== */}
      {reportModalOpen && popupId && (
        <div
          className="fixed inset-0 bg-black/60 z-50 
             flex items-start justify-center p-4 pt-20"
          onClick={() => setReportModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-1">
              Report photo
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Help us keep the community safe. This report will be reviewed by our team.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-4 ">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select a reason</option>
                  <option value="wrong-stall">Not from this stall</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="spam">Spam / misleading</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Additional details (optional)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  placeholder="Tell us what’s wrong with this photo..."
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                >
                  Submit report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Bottom Notification Bar ===== */}
      {notice && (
        <div
          className="
            fixed bottom-4 left-1/2 -translate-x-1/2
            bg-rose-600 text-white px-6 py-3 rounded-xl shadow-lg
            z-[9999] text-sm font-medium
          "
        >
          {notice}
        </div>
      )}
    </section>
  );
}
