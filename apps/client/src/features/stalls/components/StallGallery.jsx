import React, { useMemo, useState, useEffect } from "react";

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

  const weightedPool = ["2x1","2x1","2x1","2x1","2x1","2x1","1x1","1x1","1x2","1x2"];
  const shapeById = useMemo(() => {
    const map = new Map();
    const hashToIndex = (id) => {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
      return h % weightedPool.length;
    };
    displayOrder.forEach((id) => map.set(id, weightedPool[hashToIndex(id)]));
    return map;
  }, [displayOrder]);

  const relationKeySet = useMemo(() => {
    const s = new Set();
    relations.forEach((r) => s.add(`${r.userId}::${r.uploadId}`));
    return s;
  }, [relations]);

  const hasVoted = (uploadId) => relationKeySet.has(`${currentUserId}::${uploadId}`);

  /////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////
  // ===== Actions (now separate, each gets the photo id) =====
  const handleUpvote = (uploadId) => {
    if (hasVoted(uploadId)) return; // already voted; ignore
    setRelations((prev) => [...prev, { userId: currentUserId, uploadId }]);
    setItems((prev) =>
      prev.map((it) =>
        it.id === uploadId ? { ...it, uploadCount: it.uploadCount + 1 } : it
      )
    );
  };

  const handleUnvote = (uploadId) => {
    if (!hasVoted(uploadId)) return; // not voted; ignore
    setRelations((prev) =>
      prev.filter((r) => !(r.userId === currentUserId && r.uploadId === uploadId))
    );
    setItems((prev) =>
      prev.map((it) =>
        it.id === uploadId ? { ...it, uploadCount: Math.max(it.uploadCount - 1, 0) } : it
      )
    );
  };



  // Popup state
  const [popupId, setPopupId] = useState(null);

  const handleOpenPopup = (uploadId) => {
    setPopupId(uploadId);
  };

  const handleClosePopup = () => setPopupId(null);

  // Close popup on ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setPopupId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ===== Render =====
  return (
    <section className="mt-12 mb-20 px-4 md:px-8">
      <h2 className="mb-8 text-3xl font-bold text-emerald-900 tracking-tight text-center">
        Community Favourites
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

              {/* Upvote / Unvote — separate handlers */}
              {voted ? (
                <button
                  type="button"
                  data-upload-id={id}
                  data-action="unvote"
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
                  data-action="upvote"
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

      {/* ===== Popup / Modal ===== */}
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

            <div className="p-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                ID: <span className="font-mono">{popupId}</span>
              </div>
              <div className="text-sm text-gray-800 font-medium">
                {itemById.get(popupId)?.uploadCount.toLocaleString()} uploads
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
