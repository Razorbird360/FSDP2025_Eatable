import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';

const MyCollectionPage = () => {
    const [activeTab, setActiveTab] = useState('upvoted');
    const [favourites, setFavourites] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                if (activeTab === 'upvoted') {
                    const response = await api.get('/media/getVotes');
                    setFavourites(response.data.votes || []);
                } else {
                    const response = await api.get('/orders/my');
                    setOrders(response.data.orders || []);
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-SG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-[#1C201D]">My Collection</h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-[#E7EEE7]">
                <button
                    onClick={() => setActiveTab('upvoted')}
                    className={`pb-3 px-4 text-base font-semibold transition-all relative ${activeTab === 'upvoted'
                        ? 'text-[#21421B]'
                        : 'text-[#4A554B] hover:text-[#1C201D]'
                        }`}
                >
                    Upvoted Dishes
                    {activeTab === 'upvoted' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#21421B] rounded-t-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('orders')}
                    className={`pb-3 px-4 text-base font-semibold transition-all relative ${activeTab === 'orders'
                        ? 'text-[#21421B]'
                        : 'text-[#4A554B] hover:text-[#1C201D]'
                        }`}
                >
                    My Orders
                    {activeTab === 'orders' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#21421B] rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[300px]">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21421B]"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500">{error}</div>
                ) : activeTab === 'upvoted' ? (
                    favourites.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {favourites.map((vote) => (
                                <div key={vote.uploadId} className="bg-white rounded-2xl border border-[#E7EEE7] overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="aspect-square bg-gray-100 relative">
                                        <img
                                            src={vote.upload.imageUrl}
                                            alt={vote.upload.caption || 'Food image'}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-[#1C201D] mb-1 truncate">
                                            {vote.upload.menuItem.name}
                                        </h3>
                                        <p className="text-sm text-[#4A554B] mb-2 truncate">
                                            {vote.upload.menuItem.stall.name}
                                        </p>
                                        {vote.upload.caption && (
                                            <p className="text-sm text-[#4A554B] line-clamp-2">
                                                "{vote.upload.caption}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 bg-[#F8FDF3] rounded-2xl border border-dashed border-[#E7EEE7]">
                            <div className="w-16 h-16 bg-[#EFF8EE] rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-[#21421B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C201D] mb-2">No upvoted dishes yet</h3>
                            <p className="text-[#4A554B]">Dishes you upvote will appear here</p>
                        </div>
                    )
                ) : (
                    orders.length > 0 ? (
                        <div className="space-y-4">
                            {orders.map((order) => (
                                <div key={order.id} className="bg-white rounded-2xl border border-[#E7EEE7] p-6 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                                {order.stall.image_url ? (
                                                    <img
                                                        src={order.stall.image_url}
                                                        alt={order.stall.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center bg-[#E7EEE7] text-[#4A554B]">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-[#1C201D] text-lg">{order.stall.name}</h3>
                                                <p className="text-sm text-[#4A554B]">{formatDate(order.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 ${order.status === 'completed' ? 'bg-[#E7EEE7] text-[#21421B]' :
                                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                            </span>
                                            <p className="font-bold text-[#1C201D]">${(order.totalCents / 100).toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-[#E7EEE7] pt-4">
                                        <ul className="space-y-2">
                                            {order.orderItems.map((item) => (
                                                <li key={item.id} className="flex justify-between text-sm">
                                                    <span className="text-[#4A554B]">
                                                        {item.quantity}x {item.menuItem.name}
                                                    </span>
                                                    <span className="text-[#1C201D]">
                                                        ${(item.unitCents * item.quantity / 100).toFixed(2)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 bg-[#F8FDF3] rounded-2xl border border-dashed border-[#E7EEE7]">
                            <div className="w-16 h-16 bg-[#EFF8EE] rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-[#21421B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C201D] mb-2">No past orders found</h3>
                            <p className="text-[#4A554B]">Your order history will appear here</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default MyCollectionPage;
