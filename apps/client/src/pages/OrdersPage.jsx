import { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatPrice, formatDateTime } from '../utils/helpers';
import OrderDetailsModal from '../features/orders/components/OrderDetailsModal';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.get('/orders/my');
                console.log('Fetched orders:', response.data);
                setOrders(response.data.orders);
            } catch (err) {
                console.error('Failed to fetch orders:', err);
                setError('Failed to load your orders. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-8 min-h-[400px] flex items-center justify-center shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21421B]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-8 min-h-[400px] flex items-center justify-center shadow-sm">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-8 shadow-sm">
                <h1 className="text-xl font-bold mb-6 text-gray-900">
                    My Orders
                </h1>

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                        <p className="text-sm text-gray-500 text-center">Your order history will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                                onClick={() => setSelectedOrder(order)}
                            >
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        {order.stall?.image_url ? (
                                            <img
                                                src={order.stall.image_url}
                                                alt={order.stall.name}
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                <span className="text-xl">🏪</span>
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{order.stall?.name || 'Unknown Stall'}</h3>
                                            <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                        </span>
                                        <span className="font-bold text-gray-900">{formatPrice(order.totalCents)}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {order.orderItems?.map((item) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <div className="flex gap-2">
                                                <span className="font-medium text-gray-900">{item.quantity}x</span>
                                                <span className="text-gray-600">{item.menuItem?.name}</span>
                                            </div>
                                            <span className="text-gray-600">{formatPrice(item.unitCents)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                                    <button
                                        className="text-sm font-semibold text-[#1B3C18] hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedOrder(order);
                                        }}
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
        </>
    );
};

export default OrdersPage;
