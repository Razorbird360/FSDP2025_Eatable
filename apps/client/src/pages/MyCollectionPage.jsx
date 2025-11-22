import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import UpvoteIcon from '../features/stalls/assets/upvote.svg';
import DownvoteIcon from '../features/stalls/assets/downvote.svg';

const MyCollectionPage = () => {
    const [activeTab, setActiveTab] = useState('upvoted');
    const [voteFilter, setVoteFilter] = useState('upvote'); // 'upvote' or 'downvote'
    const [favourites, setFavourites] = useState([]);
    const [uploads, setUploads] = useState([]);
    const [reportedItems, setReportedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Auth state
    const [currentUserId, setCurrentUserId] = useState(null);

    // Voting state
    const [relations, setRelations] = useState([]);

    // Notification state
    const [notice, setNotice] = useState(null);

    // Popup state
    const [popupItem, setPopupItem] = useState(null);
    const [uploadPopupItem, setUploadPopupItem] = useState(null);

    // Report state
    const [reportedIds, setReportedIds] = useState([]);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');

    // Get current user
    useEffect(() => {
        async function loadUser() {
            const { data } = await supabase.auth.getSession();
            const userId = data?.session?.user?.id ?? null;
            setCurrentUserId(userId);
        }
        loadUser();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                if (activeTab === 'upvoted') {
                    const response = await api.get('/media/getVotes');
                    setFavourites(response.data.votes || []);
                } else if (activeTab === 'uploads') {
                    const response = await api.get('/media/my-uploads');
                    setUploads(response.data.uploads || []);
                } else if (activeTab === 'reported') {
                    const response = await api.get('/moderation/reports');
                    setReportedItems(response.data || []);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab]);

    // Fetch user's votes
    useEffect(() => {
        async function fetchVotes() {
            try {
                if (!currentUserId) {
                    setRelations([]);
                    return;
                }

                const res = await api.get(`/media/getVotes`);
                const data = res.data;

                const normalizedRelations =
                    (data.votes || []).map((v) => ({
                        userId: data.userId,
                        uploadId: v.uploadId,
                        value: v.vote === 1 ? 1 : 0,
                    })) ?? [];

                setRelations(normalizedRelations);
            } catch (err) {
                console.error(err);
            }
        }

        fetchVotes();
    }, [currentUserId]);

    // Fetch user's existing reports
    useEffect(() => {
        async function fetchReports() {
            try {
                if (!currentUserId) {
                    setReportedIds([]);
                    return;
                }

                const res = await api.get('/moderation/reports');
                const data = res.data || [];
                const ids = data.map((r) => r.uploadId);
                setReportedIds(ids);
            } catch (err) {
                console.error('Failed to fetch reports:', err.response || err);
            }
        }

        fetchReports();
    }, [currentUserId]);

    // Vote helpers
    const voteMap = React.useMemo(() => {
        const map = new Map();
        relations.forEach((r) => map.set(`${r.userId}::${r.uploadId}`, r.value));
        return map;
    }, [relations]);

    const getVoteValue = (id) =>
        currentUserId ? voteMap.get(`${currentUserId}::${id}`) : undefined;

    const showNotice = (msg) => {
        setNotice(msg);
        setTimeout(() => setNotice(null), 3000);
    };

    const updateCounts = (id, upDelta, downDelta) => {
        setFavourites((prev) =>
            prev.map((fav) =>
                fav.uploadId === id
                    ? {
                        ...fav,
                        upload: {
                            ...fav.upload,
                            upvoteCount: Math.max(0, (fav.upload.upvoteCount || 0) + upDelta),
                            downvoteCount: Math.max(0, (fav.upload.downvoteCount || 0) + downDelta),
                        },
                    }
                    : fav
            )
        );
    };

    const handleUpvote = async (id) => {
        if (!currentUserId) {
            showNotice('Please log in to vote on photos.');
            return;
        }

        const val = getVoteValue(id);

        if (val === 1) {
            try {
                const res = await api.delete(`/media/removeupvote/${id}`);
                if (res.status < 200 || res.status >= 300) {
                    throw new Error(`Server responded ${res.status}`);
                }

                updateCounts(id, -1, 0);
                setRelations((prev) =>
                    prev.filter(
                        (r) => !(r.userId === currentUserId && r.uploadId === id)
                    )
                );
            } catch (err) {
                console.error(err);
                showNotice('Failed to update upvote on server.');
            }
            return;
        }

        if (val === 0) {
            showNotice('You cannot upvote a picture you already downvoted.');
            return;
        }

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
            showNotice('Failed to update upvote on server.');
        }
    };

    const handleDownvote = async (id) => {
        if (!currentUserId) {
            showNotice('Please log in to vote on photos.');
            return;
        }

        const val = getVoteValue(id);

        if (val === 0) {
            try {
                const res = await api.delete(`/media/removedownvote/${id}`);
                if (res.status < 200 || res.status >= 300) {
                    throw new Error(`Server responded ${res.status}`);
                }

                updateCounts(id, 0, -1);
                setRelations((prev) =>
                    prev.filter(
                        (r) => !(r.userId === currentUserId && r.uploadId === id)
                    )
                );
            } catch (err) {
                console.error(err);
                showNotice('Failed to update downvote on server.');
            }
            return;
        }

        if (val === 1) {
            showNotice('You cannot downvote a picture you already upvoted.');
            return;
        }

        try {
            const res = await api.post(`/media/downvote/${id}`);
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
            showNotice('Failed to update downvote on server.');
        }
    };

    // Report Actions
    const openReportModal = () => {
        if (!popupItem) return;

        if (reportedIds.includes(popupItem.uploadId)) {
            showNotice("You've already reported this photo. Our team is reviewing it.");
            return;
        }

        setReportReason('');
        setReportDetails('');
        setReportModalOpen(true);
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        if (!popupItem) return;

        if (!reportReason) {
            showNotice('Please select a reason to report this photo.');
            return;
        }

        try {
            await api.post(`/moderation/report/${popupItem.uploadId}`, {
                reason: reportReason,
                details: reportDetails,
            });

            setReportedIds((prev) =>
                prev.includes(popupItem.uploadId) ? prev : [...prev, popupItem.uploadId]
            );
            setReportModalOpen(false);
            showNotice("Thanks for reporting. We'll review this photo shortly.");
        } catch (err) {
            console.error('Failed to submit report:', err.response || err);
            showNotice('Failed to submit report: ' + (err.response?.data?.error || err.message));
        }
    };

    // Delete upload action
    const handleDeleteUpload = async () => {
        if (!uploadPopupItem) return;

        if (!confirm('Are you sure you want to delete this upload? This action cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/media/${uploadPopupItem.id}`);
            setUploads((prev) => prev.filter((u) => u.id !== uploadPopupItem.id));
            setUploadPopupItem(null);
            showNotice('Upload deleted successfully.');
        } catch (err) {
            console.error('Failed to delete upload:', err.response || err);
            showNotice('Failed to delete upload: ' + (err.response?.data?.error || err.message));
        }
    };

    // Withdraw report action
    const handleWithdrawReport = async (reportId) => {
        if (!confirm('Are you sure you want to withdraw this report?')) {
            return;
        }

        try {
            await api.delete(`/moderation/report/${reportId}`);
            setReportedItems((prev) => prev.filter((r) => r.id !== reportId));
            setPopupItem(null);
            showNotice('Report withdrawn successfully.');
        } catch (err) {
            console.error('Failed to withdraw report:', err.response || err);
            showNotice('Failed to withdraw report: ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-[#1C201D]">My Collection</h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 md:mb-8 border-b border-[#E7EEE7] overflow-x-auto">
                <button
                    onClick={() => setActiveTab('upvoted')}
                    className={`pb-3 px-2 md:px-4 text-xs md:text-base font-semibold transition-all relative whitespace-nowrap ${activeTab === 'upvoted'
                        ? 'text-[#21421B]'
                        : 'text-[#4A554B] hover:text-[#1C201D]'
                        }`}
                >
                    My Votes
                    {activeTab === 'upvoted' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#21421B] rounded-t-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('uploads')}
                    className={`pb-3 px-2 md:px-4 text-xs md:text-base font-semibold transition-all relative whitespace-nowrap ${activeTab === 'uploads'
                        ? 'text-[#21421B]'
                        : 'text-[#4A554B] hover:text-[#1C201D]'
                        }`}
                >
                    My Uploads
                    {activeTab === 'uploads' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#21421B] rounded-t-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('reported')}
                    className={`pb-3 px-2 md:px-4 text-xs md:text-base font-semibold transition-all relative whitespace-nowrap ${activeTab === 'reported'
                        ? 'text-[#21421B]'
                        : 'text-[#4A554B] hover:text-[#1C201D]'
                        }`}
                >
                    Reported
                    {activeTab === 'reported' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#21421B] rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Vote Filter Toggle (only show in upvoted tab) */}
            {activeTab === 'upvoted' && (
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setVoteFilter('upvote')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${voteFilter === 'upvote'
                            ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <img src={UpvoteIcon} alt="Upvotes" className="h-4 w-4" />
                            Upvoted
                        </span>
                    </button>
                    <button
                        onClick={() => setVoteFilter('downvote')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${voteFilter === 'downvote'
                            ? 'bg-rose-100 text-rose-800 border-2 border-rose-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <img src={DownvoteIcon} alt="Downvotes" className="h-4 w-4" />
                            Downvoted
                        </span>
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="min-h-[300px]">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21421B]"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500">{error}</div>
                ) : activeTab === 'upvoted' ? (
                    favourites.filter(vote => vote.vote === (voteFilter === 'upvote' ? 1 : -1)).length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 md:gap-6">
                            {favourites.filter(vote => vote.vote === (voteFilter === 'upvote' ? 1 : -1)).map((vote) => {
                                const voteVal = getVoteValue(vote.uploadId);
                                return (
                                    <div
                                        key={vote.uploadId}
                                        className="group relative bg-white rounded-2xl border border-[#E7EEE7] overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
                                        onClick={() => setPopupItem(vote)}
                                    >
                                        <div className="aspect-square bg-gray-100 relative">
                                            <img
                                                src={vote.upload.imageUrl}
                                                alt={vote.upload.caption || 'Food image'}
                                                className="w-full h-full object-cover group-hover:scale-110 duration-500"
                                            />

                                            {/* Vote count pill */}
                                            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-white opacity-0 group-hover:opacity-100 duration-200 text-sm flex items-center gap-4">
                                                <span className="flex items-center gap-1">
                                                    <img src={UpvoteIcon} alt="Upvotes" className="h-6 w-6 invert" />
                                                    {vote.upload.upvoteCount || 0}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <img
                                                        src={DownvoteIcon}
                                                        alt="Downvotes"
                                                        className="h-6 w-6 invert translate-y-[3px]"
                                                    />
                                                    {vote.upload.downvoteCount || 0}
                                                </span>
                                            </div>

                                            {/* Upvote button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpvote(vote.uploadId);
                                                }}
                                                className={`absolute bottom-3 left-3
                                                    flex items-center gap-2 px-2 py-1
                                                    rounded-full text-white text-sm
                                                    backdrop-blur border border-white/10 shadow
                                                    transition-all duration-200 overflow-hidden
                                                    w-[34px] hover:w-[110px]
                                                    ${voteVal === 1
                                                        ? 'bg-emerald-700/70'
                                                        : 'bg-black/50 hover:bg-black/70'
                                                    }
                                                    ${voteVal === 1
                                                        ? 'opacity-100'
                                                        : 'opacity-0 group-hover:opacity-100'
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

                                            {/* Downvote button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownvote(vote.uploadId);
                                                }}
                                                className={`absolute bottom-3 right-3
                                                    flex items-center gap-2 px-2 py-1
                                                    rounded-full text-white text-sm
                                                    backdrop-blur border border-white/10 shadow
                                                    transition-all duration-200 overflow-hidden
                                                    w-[34px] hover:w-[120px]
                                                    ${voteVal === 0
                                                        ? 'bg-rose-700/70'
                                                        : 'bg-black/50 hover:bg-black/70'
                                                    }
                                                    ${voteVal === 0
                                                        ? 'opacity-100'
                                                        : 'opacity-0 group-hover:opacity-100'
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
                                        <div className="p-4">
                                            <h3 className="font-semibold text-[#1C201D] mb-1 truncate">
                                                {vote.upload.menuItem.name}
                                            </h3>
                                            <p className="text-sm text-[#4A554B] truncate">
                                                {vote.upload.menuItem.stall.name}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 bg-[#F8FDF3] rounded-2xl border border-dashed border-[#E7EEE7]">
                            <div className="w-16 h-16 bg-[#EFF8EE] rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-[#21421B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C201D] mb-2">
                                {voteFilter === 'upvote' ? 'No upvoted dishes yet' : 'No downvoted dishes yet'}
                            </h3>
                            <p className="text-[#4A554B]">
                                {voteFilter === 'upvote' ? 'Dishes you upvote will appear here' : 'Dishes you downvote will appear here'}
                            </p>
                        </div>
                    )
                ) : activeTab === 'uploads' ? (
                    uploads.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 md:gap-6">
                            {uploads.map((upload) => (
                                <div
                                    key={upload.id}
                                    className="bg-white rounded-2xl border border-[#E7EEE7] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => setUploadPopupItem(upload)}
                                >
                                    <div className="aspect-square bg-gray-100 relative">
                                        <img
                                            src={upload.imageUrl}
                                            alt={upload.caption || 'Food image'}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-[#1C201D] mb-1 truncate">
                                            {upload.menuItem.name}
                                        </h3>
                                        <p className="text-sm text-[#4A554B] mb-2 truncate">
                                            {upload.menuItem.stall.name}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-[#4A554B]">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                                </svg>
                                                {upload._count?.votes || 0}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${upload.validationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                                upload.validationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {upload.validationStatus.charAt(0).toUpperCase() + upload.validationStatus.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 bg-[#F8FDF3] rounded-2xl border border-dashed border-[#E7EEE7]">
                            <div className="w-16 h-16 bg-[#EFF8EE] rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-[#21421B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C201D] mb-2">No uploads yet</h3>
                            <p className="text-[#4A554B]">Your uploaded photos will appear here</p>
                        </div>
                    )
                ) : (
                    reportedItems.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 md:gap-6">
                            {reportedItems.map((report) => (
                                <div
                                    key={report.id}
                                    className="bg-white rounded-2xl border border-[#E7EEE7] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => setPopupItem({ upload: report.upload, uploadId: report.uploadId, id: report.id })} // Pass report id for withdrawal
                                >
                                    <div className="aspect-square bg-gray-100 relative">
                                        <img
                                            src={report.upload.imageUrl}
                                            alt={report.upload.caption || 'Food image'}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-3 right-3 bg-rose-500 text-white px-2 py-1 rounded-md text-xs font-medium">
                                            Reported
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-[#1C201D] mb-1 truncate">
                                            {report.upload.menuItem.name}
                                        </h3>
                                        <p className="text-sm text-[#4A554B] mb-2 truncate">
                                            {report.upload.menuItem.stall.name}
                                        </p>
                                        <div className="flex flex-col gap-1 text-xs text-[#4A554B]">
                                            <span className="font-medium text-rose-600">
                                                Reason: {report.reason}
                                            </span>
                                            <span className="text-gray-500">
                                                Status: {report.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 bg-[#F8FDF3] rounded-2xl border border-dashed border-[#E7EEE7]">
                            <div className="w-16 h-16 bg-[#EFF8EE] rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-[#21421B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C201D] mb-2">No reported items</h3>
                            <p className="text-[#4A554B]">Items you report will appear here</p>
                        </div>
                    )
                )}
            </div>

            {/* Popup Modal */}
            {popupItem && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setPopupItem(null)}
                >
                    <div
                        className="relative bg-white rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20"
                            onClick={() => setPopupItem(null)}
                        >
                            ✕
                        </button>

                        <img
                            src={popupItem.upload.imageUrl}
                            alt={popupItem.upload.caption || 'Food image'}
                            className="w-full max-h-[70vh] object-cover"
                        />

                        <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                                    {popupItem.upload.caption || popupItem.upload.menuItem.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Uploaded by <span className="font-medium">{popupItem.upload.user?.displayName || 'Anonymous foodie'}</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-start md:flex-row md:items-center md:gap-6 gap-1">
                                <div className="font-medium text-gray-700 flex items-center gap-10">
                                    <span className="flex items-center gap-1">
                                        <img
                                            src={UpvoteIcon}
                                            alt="Upvotes"
                                            className="h-6 w-6"
                                        />
                                        {popupItem.upload.upvoteCount || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <img
                                            src={DownvoteIcon}
                                            alt="Downvotes"
                                            className="h-6 w-6 translate-y-[3px]"
                                        />
                                        {popupItem.upload.downvoteCount || 0}
                                    </span>
                                </div>

                                {/* Report button */}
                                {activeTab === 'reported' ? (
                                    <button
                                        onClick={() => handleWithdrawReport(popupItem.id)}
                                        className="text-[11px] md:text-xs mx-5 px-2.5 py-1 rounded-full border whitespace-nowrap border-gray-400 text-gray-600 hover:bg-gray-100"
                                    >
                                        Withdraw Report
                                    </button>
                                ) : (
                                    <button
                                        onClick={openReportModal}
                                        className={`text-[11px] md:text-xs mx-5 px-2.5 py-1 rounded-full border whitespace-nowrap
                                        ${reportedIds.includes(popupItem.uploadId)
                                                ? 'border-rose-300 bg-rose-50 text-rose-500 cursor-default'
                                                : 'border-rose-400 text-rose-600 hover:bg-rose-50'
                                            }`}
                                    >
                                        {reportedIds.includes(popupItem.uploadId) ? '✓ Reported' : '⚑ Report Post'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {reportModalOpen && popupItem && (
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
                                    placeholder="Tell us what's wrong with this photo..."
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

            {/* Upload Popup Modal */}
            {uploadPopupItem && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setUploadPopupItem(null)}
                >
                    <div
                        className="relative bg-white rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20"
                            onClick={() => setUploadPopupItem(null)}
                        >
                            ✕
                        </button>

                        <img
                            src={uploadPopupItem.imageUrl}
                            alt={uploadPopupItem.caption || 'Food image'}
                            className="w-full max-h-[70vh] object-cover"
                        />

                        <div className="p-4 flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                                    {uploadPopupItem.caption || uploadPopupItem.menuItem.name}
                                </div>
                                <p className="text-sm text-gray-600">
                                    {uploadPopupItem.menuItem.stall.name}
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-10 font-medium text-gray-700">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                        </svg>
                                        {uploadPopupItem._count?.votes || 0} votes
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${uploadPopupItem.validationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                        uploadPopupItem.validationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {uploadPopupItem.validationStatus.charAt(0).toUpperCase() + uploadPopupItem.validationStatus.slice(1)}
                                    </span>
                                </div>

                                <button
                                    onClick={handleDeleteUpload}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                                >
                                    Delete Upload
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Bar */}
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
        </div>
    );
};

export default MyCollectionPage;
