import { useMemo, useState, useEffect } from "react";

export default function d() {
  // ===== Simulate logged-in user =====
  const currentUserId = "u1";

  // ===== Base content =====
  // Converted voteScore → upvoteCount & downvoteCount
const baseItems = [
  { 
    id: "a1",
    src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200",
    upvoteCount: 124,
    downvoteCount: 12,
    caption: "Signature Chicken Rice",
    verified: true
  },
  { 
    id: "a2",
    src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200",
    upvoteCount: 312,
    downvoteCount: 20,
    caption: "Thai Basil Pork with Rice",
    verified: false
  },
  { 
    id: "a3",
    src: "https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=1200",
    upvoteCount: 87,
    downvoteCount: 5,
    caption: "Healthy Grain Bowl",
    verified: true
  },
  { 
    id: "a4",
    src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200",
    upvoteCount: 205,
    downvoteCount: 14,
    caption: "Crispy Fried Chicken",
    verified: false
  },
  { 
    id: "a5",
    src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200",
    upvoteCount: 56,
    downvoteCount: 3,
    caption: "Claypot Chicken Rice",
    verified: true
  },
  { 
    id: "a6",
    src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200",
    upvoteCount: 98,
    downvoteCount: 4,
    caption: "Honey Soy Wings",
    verified: false
  },
  { 
    id: "a7",
    src: "https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=1200",
    upvoteCount: 177,
    downvoteCount: 9,
    caption: "Vegetarian Bento Box",
    verified: true
  },
  { 
    id: "a8",
    src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200",
    upvoteCount: 63,
    downvoteCount: 6,
    caption: "Garlic Butter Fish",
    verified: false
  },
  { 
    id: "a9",
    src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200",
    upvoteCount: 220,
    downvoteCount: 11,
    caption: "Golden Chicken Cutlet",
    verified: true
  },
  { 
    id: "a10",
    src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200",
    upvoteCount: 44,
    downvoteCount: 7,
    caption: "Cheesy Omelette Rice",
    verified: false
  },
  { 
    id: "a11",
    src: "https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=1200",
    upvoteCount: 91,
    downvoteCount: 10,
    caption: "Stir Fry Vegetables",
    verified: false
  },
  { 
    id: "a12",
    src: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=1200",
    upvoteCount: 131,
    downvoteCount: 15,
    caption: "Teriyaki Chicken Bowl",
    verified: true
  }
];

  // ===== Relations now use value: 1 (upvote) or 0 (downvote) =====
  const initialRelations = [
    { userId: "u1", uploadId: "a2", value: 1 },
    { userId: "u1", uploadId: "a9", value: 1 },
    { userId: "u1", uploadId: "a4", value: 0 },
  ];

  const [items, setItems] = useState(baseItems);
  const [relations, setRelations] = useState(initialRelations);

  // ===== Frozen display order: SORT BY UPVOTES ONLY =====
  const [displayOrder] = useState(() =>
    [...baseItems]
      .sort((a, b) => b.upvoteCount - a.upvoteCount)
      .map((it) => it.id)
  );

  // ===== Lookup maps =====
  const itemById = useMemo(() => {
    const m = new Map();
    items.forEach(it => m.set(it.id, it));
    return m;
  }, [items]);

  const voteMap = useMemo(() => {
    const map = new Map();
    relations.forEach(r => map.set(`${r.userId}::${r.uploadId}`, r.value));
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
    displayOrder.forEach(id => map.set(id, weightedPool[hash(id)]));
    return map;
  }, [displayOrder, weightedPool]);

  // ===== Update vote counters =====
  const updateCounts = (id, upDelta, downDelta) => {
    setItems(prev =>
      prev.map(it =>
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

  
  // ===== Voting Actions =====

    const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000); // auto dismiss after 3 sec
  };
  const handleUpvote = (id) => {
    const val = getVoteValue(id);

    if (val === 1) {
      // remove upvote
      updateCounts(id, -1, 0);
      setRelations(prev => prev.filter(r => !(r.userId === currentUserId && r.uploadId === id)));
      return;
    }

    if (val === 0) {
      showNotice("You cannot upvote a picture you already downvoted.");
      return;
    }

    updateCounts(id, +1, 0);
    setRelations(prev => [...prev, { userId: currentUserId, uploadId: id, value: 1 }]);
  };

  const handleDownvote = (id) => {
    const val = getVoteValue(id);

    if (val === 0) {
      // remove downvote
      updateCounts(id, 0, -1);
      setRelations(prev => prev.filter(r => !(r.userId === currentUserId && r.uploadId === id)));
      return;
    }

    if (val === 1) {
      showNotice("You cannot downvote a picture you already upvoted.");
      return;
    }

    updateCounts(id, 0, +1);
    setRelations(prev => [...prev, { userId: currentUserId, uploadId: id, value: 0 }]);
  };


  // ===== Image Popup =====
  const [popupId, setPopupId] = useState(null);

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

              {it.verified && (
                <div className="absolute top-3 right-3 bg-white/80 backdrop-blur px-2 py-1 rounded-full text-blue-600 text-xs font-bold shadow">
                  ✔ Verified
                </div>
              )}

              {/* Upvote/Downvote count pill */}
              <div className="absolute top-3 left-3 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-white opacity-0 group-hover:opacity-100 duration-200 text-sm">
                👍 {it.upvoteCount}  👎 {it.downvoteCount}
              </div>

              {/* Upvote (icon → expand on hover) */}
              <button
                onClick={(e) => { e.stopPropagation(); handleUpvote(id); }}
                disabled={voteVal === 0}
                className={`absolute bottom-3 left-3
                  flex items-center gap-2 px-2 py-1
                  rounded-full text-white text-sm
                  backdrop-blur border border-white/10 shadow
                  transition-all duration-200 overflow-hidden
                  w-[34px] hover:w-[110px]
                  ${voteVal === 1 ? "bg-emerald-700/70" : "bg-black/50 hover:bg-black/70"}
                  ${voteVal === 1 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                  disabled:opacity-40`}
              >
                <span>👍</span>
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Upvote
                </span>
              </button>

              {/* Downvote (icon → expand on hover) */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDownvote(id); }}
                disabled={voteVal === 1}
                className={`absolute bottom-3 right-3
                  flex items-center gap-2 px-2 py-1
                  rounded-full text-white text-sm
                  backdrop-blur border border-white/10 shadow
                  transition-all duration-200 overflow-hidden
                  w-[34px] hover:w-[120px]
                  ${voteVal === 0 ? "bg-rose-700/70" : "bg-black/50 hover:bg-black/70"}
                  ${voteVal === 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                  disabled:opacity-40`}
              >
                <span>👎</span>
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Downvote
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ===== POPUP ===== */}
      {popupId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPopupId(null)}>
          <div className="relative bg-white rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
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

            <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              {itemById.get(popupId)?.caption}

              {itemById.get(popupId)?.verified && (
                <span className="text-blue-500 text-xl">✔</span>
              )}
            </div>

              <div className="font-medium text-gray-700">
                👍 {itemById.get(popupId)?.upvoteCount}  👎 {itemById.get(popupId)?.downvoteCount}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
