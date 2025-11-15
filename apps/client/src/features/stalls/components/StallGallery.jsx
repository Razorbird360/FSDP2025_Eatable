import { useMemo, useState } from "react";
import UpvoteIcon from "../assets/upvote.svg";
import DownvoteIcon from "../assets/downvote.svg";

export default function StallGallery() {
  // ===== Simulate logged-in user =====
  const currentUserId = "u1";

  // ===== Base content =====
  const baseItems = [
    {
      id: "h1",
      src: "https://images.unsplash.com/photo-1604908176997-125f2dd03a37?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 156,
      downvoteCount: 4,
      caption: "Kaya Toast Set",
      verified: true,
    },
    {
      id: "h2",
      src: "https://images.unsplash.com/photo-1574482620828-158b0b94f50b?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 122,
      downvoteCount: 3,
      caption: "French Toast with Kaya",
      verified: true,
    },
    {
      id: "h3",
      src: "https://images.unsplash.com/photo-1508737027454-e6454ef45afd?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 188,
      downvoteCount: 6,
      caption: "Soft-Boiled Eggs",
      verified: true,
    },
    {
      id: "h4",
      src: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 141,
      downvoteCount: 8,
      caption: "Tuna Mayo Toastwich",
      verified: true,
    },
    {
      id: "h5",
      src: "https://images.unsplash.com/photo-1603048565287-4325c36a16c6?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 115,
      downvoteCount: 4,
      caption: "Ham & Cheese Sandwich",
      verified: false,
    },
    {
      id: "h4",
      src: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 141,
      downvoteCount: 8,
      caption: "Tuna Mayo Toastwich",
      verified: true,
    },
    {
      id: "h5",
      src: "https://images.unsplash.com/photo-1603048565287-4325c36a16c6?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 115,
      downvoteCount: 4,
      caption: "Ham & Cheese Sandwich",
      verified: false,
    },
    {
      id: "h6",
      src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 220,
      downvoteCount: 9,
      caption: "Chicken Rice",
      verified: true,
    },
    {
      id: "h7",
      src: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 174,
      downvoteCount: 7,
      caption: "Laksa",
      verified: true,
    },
    {
      id: "h8",
      src: "https://images.unsplash.com/photo-1626074353765-4230baf9fc94?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 196,
      downvoteCount: 10,
      caption: "Char Kway Teow",
      verified: false,
    },
    {
      id: "h9",
      src: "https://images.unsplash.com/photo-1604908554028-094f7d2ec76c?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 163,
      downvoteCount: 5,
      caption: "Mee Rebus",
      verified: true,
    },
    {
      id: "h10",
      src: "https://images.unsplash.com/photo-1631515242808-49755d0dcdf6?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 137,
      downvoteCount: 8,
      caption: "Mee Siam",
      verified: false,
    },
    {
      id: "h11",
      src: "https://images.unsplash.com/photo-1604908554843-b4aa751a93ce?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 152,
      downvoteCount: 4,
      caption: "Fishball Noodle Soup",
      verified: true,
    },
    {
      id: "h12",
      src: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 130,
      downvoteCount: 3,
      caption: "Fried Carrot Cake (White)",
      verified: true,
    },
    {
      id: "h13",
      src: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 148,
      downvoteCount: 5,
      caption: "Roti Prata with Curry",
      verified: false,
    },
    {
      id: "h14",
      src: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 201,
      downvoteCount: 2,
      caption: "Kopi C",
      verified: true,
    },
    {
      id: "h15",
      src: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 190,
      downvoteCount: 4,
      caption: "Teh Tarik",
      verified: true,
    },
    {
      id: "h16",
      src: "https://images.unsplash.com/photo-1613478881243-97d28942f2ca?q=80&w=1200&auto=format&fit=crop",
      upvoteCount: 175,
      downvoteCount: 6,
      caption: "Iced Milo Dinosaur",
      verified: false,
    },
  ];

  // ===== Relations now use value: 1 (upvote) or 0 (downvote) =====
  const initialRelations = [
    { userId: "u1", uploadId: "a2", value: 1 },
    { userId: "u1", uploadId: "a9", value: 1 },
    { userId: "u1", uploadId: "a4", value: 0 },
  ];

  const [items, setItems] = useState(baseItems);
  const [relations, setRelations] = useState(initialRelations);

  // NEW: keep track of which images this user has reported
  const [reportedIds, setReportedIds] = useState([]);

  // NEW: report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  // ===== Frozen display order: SORT BY UPVOTES ONLY =====
  const [displayOrder] = useState(() =>
    [...baseItems]
      .sort((a, b) => b.upvoteCount - a.upvoteCount)
      .map((it) => it.id)
  );

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

  const getVoteValue = (id) => voteMap.get(`${currentUserId}::${id}`);

  // ===== Bento shape logic unchanged =====
  const weightedPool = useMemo(
    () => ["2x1", "2x1", "2x1", "1x1", "1x1", "1x2", "1x2"],
    []
  );

  const shapeById = useMemo(() => {
    const map = new Map();
    const hash = (id) => {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
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

  // ===== Notification bar state =====
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000); // auto dismiss after 3 sec
  };

  // ===== Voting Actions =====
  const handleUpvote = (id) => {
    const val = getVoteValue(id);

    if (val === 1) {
      // remove upvote
      updateCounts(id, -1, 0);
      setRelations((prev) =>
        prev.filter(
          (r) => !(r.userId === currentUserId && r.uploadId === id)
        )
      );
      return;
    }

    if (val === 0) {
      showNotice("You cannot upvote a picture you already downvoted.");
      return;
    }

    updateCounts(id, +1, 0);
    setRelations((prev) => [
      ...prev,
      { userId: currentUserId, uploadId: id, value: 1 },
    ]);
  };

  const handleDownvote = (id) => {
    const val = getVoteValue(id);

    if (val === 0) {
      // remove downvote
      updateCounts(id, 0, -1);
      setRelations((prev) =>
        prev.filter(
          (r) => !(r.userId === currentUserId && r.uploadId === id)
        )
      );
      return;
    }

    if (val === 1) {
      showNotice("You cannot downvote a picture you already upvoted.");
      return;
    }

    updateCounts(id, 0, +1);
    setRelations((prev) => [
      ...prev,
      { userId: currentUserId, uploadId: id, value: 0 },
    ]);
  };

  // ===== Image Popup =====
  const [popupId, setPopupId] = useState(null);

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

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!popupId) return;

    if (!reportReason) {
      showNotice("Please select a reason to report this photo.");
      return;
    }

    setReportedIds((prev) =>
      prev.includes(popupId) ? prev : [...prev, popupId]
    );
    setReportModalOpen(false);

    // In a real app, call your backend here with popupId, reportReason, reportDetails
    showNotice("Thanks for reporting. We'll review this photo shortly.");
  };

  // ===== Render =====
  return (
    <section className="mt-12 mb-20 px-4 md:px-8">
      <h2 className="text-center text-3xl font-bold text-emerald-900 mb-8">
        Customer Favourites
      </h2>

      <div className="bento-grid max-w-7xl mx-auto">
        {displayOrder.map((id) => {
          const it = itemById.get(id);
          const voteVal = getVoteValue(id);
          const shape = shapeById.get(id);

          return (
            <div
              key={id}
              className={`bento-item span-${shape} group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] duration-300`}
            >
              <img
                src={it.src}
                alt=""
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
      {popupId && (
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
              src={itemById.get(popupId)?.src}
              className="w-full max-h-[70vh] object-cover"
            />

            <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                {itemById.get(popupId)?.caption}
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
                    {itemById.get(popupId)?.upvoteCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <img
                      src={DownvoteIcon}
                      alt="Downvotes"
                      className="h-6 w-6 translate-y-[3px]"
                    />
                    {itemById.get(popupId)?.downvoteCount}
                  </span>
                </div>

                {/* Open report form popup */}
                <button
                  onClick={openReportModal}
                  className={`text-xs md:text-sm px-3 py-1 rounded-full border 
                    ${
                      reportedIds.includes(popupId)
                        ? "border-rose-300 bg-rose-50 text-rose-500 cursor-default"
                        : "border-rose-400 text-rose-600 hover:bg-rose-50"
                    }`}
                >
                  {reportedIds.includes(popupId)
                    ? "Reported"
                    : "Report photo"}
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
