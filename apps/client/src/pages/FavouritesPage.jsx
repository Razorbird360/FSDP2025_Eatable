import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@lib/api';
import UpvoteIcon from '../features/stalls/assets/upvote.svg';
import DownvoteIcon from '../features/stalls/assets/downvote.svg';

const fallbackStallImg =
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop';
const fallbackUploadImg =
    'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop';

const formatCount = (value) => (Number.isFinite(value) ? value : 0);

const StallCard = ({ like }) => {
    const stall = like?.stall;
    if (!stall) return null;

    const details = [stall.cuisineType, stall.location].filter(Boolean).join(' - ');

    return (
        <Link
            to={`/stalls/${stall.id}`}
            className="bg-white rounded-2xl border border-[#E7EEE7] overflow-hidden hover:shadow-xl transition-all duration-300"
        >
            <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                <img
                    src={stall.image_url || fallbackStallImg}
                    alt={stall.name}
                    className="h-full w-full object-cover"
                />
            </div>
            <div className="p-4">
                <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
                    {stall.name}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                    {details || 'Stall details unavailable'}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{formatCount(stall.menuItemCount)} items</span>
                    <span>{formatCount(stall.likeCount)} likes</span>
                </div>
            </div>
        </Link>
    );
};

const VoteCard = ({ vote, type }) => {
    const upload = vote?.upload;
    const menuItem = upload?.menuItem;
    const stall = menuItem?.stall;

    return (
        <Link
            to={stall?.id ? `/stalls/${stall.id}` : '/stalls'}
            className="bg-white rounded-2xl border border-[#E7EEE7] overflow-hidden hover:shadow-xl transition-all duration-300"
        >
            <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                <img
                    src={upload?.imageUrl || fallbackUploadImg}
                    alt={menuItem?.name || 'Menu item'}
                    className="h-full w-full object-cover"
                />
            </div>
            <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
                        {menuItem?.name || 'Menu item'}
                    </h3>
                    <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${type === 'upvote'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                            }`}
                    >
                        {type === 'upvote' ? 'Upvoted' : 'Downvoted'}
                    </span>
                </div>
                <p className="text-xs text-gray-500">
                    {stall?.name || 'Unknown stall'}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <img src={UpvoteIcon} alt="Upvotes" className="h-4 w-4" />
                        {formatCount(upload?.upvoteCount)}
                    </span>
                    <span className="flex items-center gap-1">
                        <img src={DownvoteIcon} alt="Downvotes" className="h-4 w-4" />
                        {formatCount(upload?.downvoteCount)}
                    </span>
                </div>
            </div>
        </Link>
    );
};

const FavouritesPage = () => {
    const [tab, setTab] = useState('stalls');
    const [votes, setVotes] = useState([]);
    const [stallLikes, setStallLikes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [votesRes, likesRes] = await Promise.allSettled([
                    api.get('/media/getVotes'),
                    api.get('/stalls/likes'),
                ]);

                if (ignore) return;

                if (votesRes.status === 'fulfilled') {
                    setVotes(votesRes.value?.data?.votes || []);
                } else {
                    setVotes([]);
                }

                if (likesRes.status === 'fulfilled') {
                    setStallLikes(likesRes.value?.data?.likes || []);
                } else {
                    setStallLikes([]);
                }

                if (votesRes.status === 'rejected' && likesRes.status === 'rejected') {
                    setError('Failed to load favourites.');
                }
            } catch (err) {
                if (!ignore) {
                    setError('Failed to load favourites.');
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => {
            ignore = true;
        };
    }, []);

    const upvotes = useMemo(
        () => votes.filter((vote) => vote?.vote === 1),
        [votes]
    );
    const downvotes = useMemo(
        () => votes.filter((vote) => vote?.vote === -1),
        [votes]
    );

    const TabButton = ({ value, children }) => {
        const active = tab === value;
        return (
            <button
                onClick={() => setTab(value)}
                className={`px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all border whitespace-nowrap
          ${active
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-600'
                        : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
                    }`}
            >
                {children}
            </button>
        );
    };

    const EmptyState = ({ message }) => (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
            {message}
        </div>
    );

    const renderContent = () => {
        if (tab === 'stalls') {
            if (stallLikes.length === 0) {
                return <EmptyState message="No liked stalls yet." />;
            }
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {stallLikes.map((like) => (
                        <StallCard key={like.stall?.id || like.likedAt} like={like} />
                    ))}
                </div>
            );
        }

        const list = tab === 'upvotes' ? upvotes : downvotes;
        if (list.length === 0) {
            return (
                <EmptyState
                    message={`No ${tab === 'upvotes' ? 'upvoted' : 'downvoted'} uploads yet.`}
                />
            );
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {list.map((vote) => (
                    <VoteCard
                        key={`${vote?.uploadId || vote?.upload?.id}-${tab}`}
                        vote={vote}
                        type={tab === 'upvotes' ? 'upvote' : 'downvote'}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm">
                <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Favourites</h2>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar md:overflow-visible">
                        <TabButton value="stalls">Stalls</TabButton>
                        <TabButton value="upvotes">
                            <span className="flex items-center gap-2">
                                <img src={UpvoteIcon} alt="Upvotes" className="h-4 w-4" />
                                Upvotes
                            </span>
                        </TabButton>
                        <TabButton value="downvotes">
                            <span className="flex items-center gap-2">
                                <img src={DownvoteIcon} alt="Downvotes" className="h-4 w-4" />
                                Downvotes
                            </span>
                        </TabButton>
                    </div>
                </div>

                <div className="min-h-[360px]">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21421B]" />
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                            {error}
                        </div>
                    ) : (
                        renderContent()
                    )}
                </div>
            </div>
        </div>
    );
};

export default FavouritesPage;
