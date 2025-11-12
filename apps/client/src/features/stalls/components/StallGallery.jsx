import  { useMemo, useState, useEffect } from "react";

const WEIGHTED_POOL = ["2x1","2x1","2x1","2x1","2x1","2x1","1x1","1x1","1x2","1x2"];

export default function CustomBentoGrid() {
  // ===== Simulate logged-in user =====
  const currentUserId = "u1";

  // ===== Base content (uploads) =====
  const baseItems = [
    { id: "a1",  src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200", uploadCount: 124 },
    { id: "a2",  src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 312 },
    { id: "a3",  src: "https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=1200", uploadCount: 87  },
    { id: "a4",  src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 205 },
    { id: "a5",  src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200", uploadCount: 56  },
    { id: "a6",  src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 98  },
    { id: "a7",  src: "https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=1200", uploadCount: 177 },
    { id: "a8",  src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 63  },
    { id: "a9",  src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200", uploadCount: 220 },
    { id: "a10", src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 44  },
    { id: "a11", src: "https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=1200", uploadCount: 91  },
    { id: "a12", src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 131 },
    { id: "a13", src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200", uploadCount: 124 },
    { id: "a14", src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 312 },
    { id: "a15", src: "https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=1200", uploadCount: 87  },
    { id: "a16", src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 205 },
    { id: "a17", src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200", uploadCount: 56  },
    { id: "a18", src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 98  },
    { id: "a19", src: "https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=1200", uploadCount: 177 },
    { id: "a20", src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 63  },
    { id: "a21", src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200", uploadCount: 220 },
    { id: "a22", src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 44  },
    { id: "a23", src: "https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=1200", uploadCount: 91  },
    { id: "a24", src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200", uploadCount: 131 },
  ];

  // ===== Relation rows (userId, uploadId) =====
  const upvoteRelation = [
    { userId: "u1", uploadId: "a2" },
    { userId: "u1", uploadId: "a4" },
    { userId: "u1", uploadId: "a9" },
    { userId: "u2", uploadId: "a1" },
    { userId: "u2", uploadId: "a7" },
    { userId: "u3", uploadId: "a2" },
    { userId: "u3", uploadId: "a3" },
    { userId: "u3", uploadId: "a12" },
  ];

  // ===== Helper: add relation counts initially =====
  const addRelationCounts = (items, relations) => {
    const countByUpload = new Map(items.map((it) => [it.id, 0]));
    for (const r of relations) {
      if (countByUpload.has(r.uploadId)) {
        countByUpload.set(r.uploadId, countByUpload.get(r.uploadId) + 1);
      }
    }
    return items.map((it) => ({
      ...it,
      uploadCount: it.uploadCount + (countByUpload.get(it.id) || 0),
    }));
  };

  // ===== State =====
  const initialWithRelations = addRelationCounts(baseItems, upvoteRelation);
  const [items, setItems] = useState(initialWithRelations);
  const [relations, setRelations] = useState(upvoteRelation);

  // Frozen display order (computed once)
  const [displayOrder] = useState(() =>
    [...initialWithRelations].sort((a, b) => b.uploadCount - a.uploadCount).map((it) => it.id)
  );

  // ===== Lookups =====
  const itemById = useMemo(() => {
    const m = new Map();
    items.forEach((it) => m.set(it.id, it));
    return m;
  }, [items]);

  const shapeById = useMemo(() => {
    const map = new Map();
    const hashToIndex = (id) => {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
      return h % weightedPool.length;
    };
    displayOrder.forEach((id) => map.set(id, weightedPool[hashToIndex(id)]));
    return map;
  }, [displayOrder, weightedPool]);

  const relationKeySet = useMemo(() => {
    const s = new Set();
    relations.forEach((r) => s.add(`${r.userId}::${r.uploadId}`));
    return s;
  }, [relations]);

  const hasVoted = (uploadId) => relationKeySet.has(`${currentUserId}::${uploadId}`);

  // ===== Upvote / Unvote actions =====
  const handleUpvote = (uploadId) => {
    if (hasVoted(uploadId)) return;
    setRelations((prev) => [...prev, { userId: currentUserId, uploadId }]);
    setItems((prev) =>
      prev.map((it) =>
        it.id === uploadId ? { ...it, uploadCount: it.uploadCount + 1 } : it
      )
    );
  };

  const handleUnvote = (uploadId) => {
    if (!hasVoted(uploadId)) return;
    setRelations((prev) =>
      prev.filter((r) => !(r.userId === currentUserId && r.uploadId === uploadId))
    );
    setItems((prev) =>
      prev.map((it) =>
        it.id === uploadId ? { ...it, uploadCount: Math.max(it.uploadCount - 1, 0) } : it
      )
    );
  };

  // ===== Image Popup =====
  const [popupId, setPopupId] = useState(null);
  const handleOpenPopup = (uploadId) => setPopupId(uploadId);
  const handleClosePopup = () => setPopupId(null);

  // ===== Report Modal state =====
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDraft, setReportDraft] = useState({
    uploadId: null,
    reason: "",
    details: "",
    contact: "",
  });
  const [submittingReport, setSubmittingReport] = useState(false);

  // Open the report form for a given upload
  const handleOpenReport = (uploadId) => {
    // optional: close the image popup behind for clarity
    setPopupId(null);
    setReportDraft({ uploadId, reason: "", details: "", contact: "" });
    setReportOpen(true);
  };

  const handleCloseReport = () => {
    setReportOpen(false);
    setReportDraft({ uploadId: null, reason: "", details: "", contact: "" });
    setSubmittingReport(false);
  };

  // Submit handler — replace with API call later
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportDraft.uploadId || !reportDraft.reason || reportDraft.details.trim().length < 10) {
      // basic validation
      return;
    }
    try {
      setSubmittingReport(true);

      // 🔧 Replace this with your API call to save a ContentReport
      // e.g., await fetch('/api/reports', { method:'POST', body: JSON.stringify(reportDraft) })
      console.log("Submitting report:", {
        userId: currentUserId,
        ...reportDraft,
        createdAt: new Date().toISOString(),
      });

      // UX: pretend success
      handleCloseReport();
      // optional toast
      alert("Thanks! Your report has been submitted.");
    } catch (err) {
      console.error(err);
      alert("Something went wrong submitting the report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Close popup on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPopupId(null);
        setReportOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ===== Render =====
  return (
    <section className="mt-12 mb-20 px-4 md:px-8">
      <h2 className="mb-8 text-3xl font-bold text-emerald-900 tracking-tight text-center">
        Customer Favourites
      </h2>

      <div className="bento-grid max-w-7xl mx-auto">
        {displayOrder.map((id) => {
          const it = itemById.get(id);
          if (!it) return null;

          const shape = shapeById.get(id);
          const voted = hasVoted(id);

          return (
            <div
              key={id}
              data-upload-id={id}
              className={`bento-item span-${shape} group relative overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
              role="group"
              aria-label={`Image with ${it.uploadCount} uploads`}
            >
              <img
                src={it.src}
                alt="Community favourite"
                data-upload-id={id}
                onClick={() => handleOpenPopup(id)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                draggable={false}
              />

              {/* Gradient overlay */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                data-upload-id={id}
                onClick={() => handleOpenPopup(id)}
                role="button"
                tabIndex={0}
                aria-label="Open photo"
              />

              {/* Upload count pill */}
              <div
                data-upload-id={id}
                className={[
                  "absolute left-3 top-3 z-10",
                  "px-3 py-1 rounded-full text-white text-sm font-semibold",
                  "backdrop-blur-md bg-black/50 border border-white/10 shadow",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                ].join(" ")}
              >
                {it.uploadCount.toLocaleString()} uploads
              </div>

              {/* Upvote / Unvote */}
              {voted ? (
                <button
                  type="button"
                  data-upload-id={id}
                  onClick={(e) => { e.stopPropagation(); handleUnvote(id); }}
                  className={[
                    "absolute left-3 bottom-3 z-10",
                    "px-3 py-1 rounded-full text-white text-sm font-semibold",
                    "backdrop-blur-md border border-white/10 shadow",
                    "bg-emerald-700/70",
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-white/60"
                  ].join(" ")}
                  title="Remove your upvote"
                >
                  💚 Unvote
                </button>
              ) : (
                <button
                  type="button"
                  data-upload-id={id}
                  onClick={(e) => { e.stopPropagation(); handleUpvote(id); }}
                  className={[
                    "absolute left-3 bottom-3 z-10",
                    "px-3 py-1 rounded-full text-white text-sm font-semibold",
                    "backdrop-blur-md border border-white/10 shadow",
                    "bg-black/50 hover:bg-black/70",
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-white/60"
                  ].join(" ")}
                  title="Upvote"
                >
                  👍 Upvote
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== Image Popup / Modal ===== */}
      {popupId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={handleClosePopup}
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClosePopup}
              className="absolute right-3 top-3 h-8 w-8 rounded-full bg-black/10 hover:bg-black/20 text-black"
              aria-label="Close"
            >
              ✕
            </button>

            <img
              src={itemById.get(popupId)?.src}
              alt="Selected"
              className="w-full object-cover max-h-[70vh]"
            />

            <div className="p-4 flex items-center justify-between gap-2">
              <div className="text-sm text-gray-600">
                ID: <span className="font-mono">{popupId}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-800 font-medium">
                  {itemById.get(popupId)?.uploadCount.toLocaleString()} uploads
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenReport(popupId)}
                  className="px-3 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition"
                  title="Report this photo"
                >
                  🚩 Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Report Form Modal ===== */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={handleCloseReport}
        >
          <form
            onSubmit={handleSubmitReport}
            className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold">Report Photo</h3>
              <button
                type="button"
                onClick={handleCloseReport}
                className="h-8 w-8 rounded-full bg-black/10 hover:bg-black/20"
                aria-label="Close report form"
              >
                ✕
              </button>
            </div>

            <div className="px-4 py-4 space-y-4">
              <div className="text-sm text-gray-600">
                Reporting upload ID: <span className="font-mono">{reportDraft.uploadId}</span>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-800">Reason</span>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  required
                  value={reportDraft.reason}
                  onChange={(e) => setReportDraft((d) => ({ ...d, reason: e.target.value }))}
                >
                  <option value="" disabled>Select a reason…</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="spam">Spam / advertisement</option>
                  <option value="wrong-item">Wrong stall/dish</option>
                  <option value="copyright">Copyright / ownership</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-800">Details</span>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2 min-h-[120px]"
                  placeholder="Describe the issue (at least 10 characters)…"
                  required
                  value={reportDraft.details}
                  onChange={(e) => setReportDraft((d) => ({ ...d, details: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-800">Contact (optional)</span>
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="your@email.com"
                  value={reportDraft.contact}
                  onChange={(e) => setReportDraft((d) => ({ ...d, contact: e.target.value }))}
                />
              </label>
            </div>

            <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseReport}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submittingReport ||
                  !reportDraft.reason ||
                  (reportDraft.details?.trim().length ?? 0) < 10
                }
                className={[
                  "px-4 py-2 rounded-lg text-white",
                  submittingReport ? "bg-gray-400" : "bg-rose-600 hover:bg-rose-700",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                ].join(" ")}
              >
                {submittingReport ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
