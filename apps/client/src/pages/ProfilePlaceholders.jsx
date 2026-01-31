import { useState } from 'react';
import { useAgentChat } from '../features/agent/components/AgentChatContext';
import {
  Award,
  Bell,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Gift,
  Globe,
  HelpCircle,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  MessageSquareMore,
  Moon,
  Trash2,
} from 'lucide-react';

// ==========================================================================
// TODO: REMOVE MOCK DATA - Remove mockVouchers array after backend integration
// ==========================================================================
const mockVouchers = [
    {
        id: 1,
        code: 'WELCOME10',
        discount: '10%',
        description: 'Welcome discount on your first order',
        minSpend: 15,
        expiryDate: '2026-02-28',
        type: 'percentage',
        gradient: 'from-emerald-500 to-teal-600',
    },
    {
        id: 2,
        code: 'HAWKER5',
        discount: '$5',
        description: 'Off any hawker centre order',
        minSpend: 20,
        expiryDate: '2026-01-31',
        type: 'fixed',
        gradient: 'from-amber-500 to-orange-600',
    },
    {
        id: 3,
        code: 'FREESHIP',
        discount: 'Free',
        description: 'Free delivery on orders above $25',
        minSpend: 25,
        expiryDate: '2026-03-15',
        type: 'delivery',
        gradient: 'from-violet-500 to-purple-600',
    },
];

export const VouchersPage = () => {
    const [copiedId, setCopiedId] = useState(null);

    const copyCode = (id, code) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const isExpiringSoon = (dateStr) => {
        const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
        return days <= 7 && days > 0;
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl font-bold text-gray-900">My Vouchers</h1>
                {/* TODO: REMOVE - Replace mockVouchers.length with actual voucher count */}
                <span className="text-sm text-gray-500">{mockVouchers.length} available</span>
            </div>

            {/* TODO: REMOVE - Replace mockVouchers with actual vouchers data */}
            {mockVouchers.length > 0 ? (
                <div className="space-y-4">
                    {mockVouchers.map((voucher) => (
                        <div
                            key={voucher.id}
                            className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                        >
                            {/* Stacked layout for thin mobile */}
                            <div className="flex flex-col">
                                {/* Discount Badge - horizontal bar on top */}
                                <div className={`bg-gradient-to-r ${voucher.gradient} text-white p-4 flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                        <Gift className="w-6 h-6 opacity-80" />
                                        <div>
                                            <div className="text-2xl font-bold">{voucher.discount}</div>
                                            <div className="text-xs opacity-90">{voucher.type === 'percentage' ? 'OFF' : voucher.type === 'delivery' ? 'DELIVERY' : 'OFF'}</div>
                                        </div>
                                    </div>
                                    {/* Copy Code Button */}
                                    <button
                                        onClick={() => copyCode(voucher.id, voucher.code)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${copiedId === voucher.id
                                            ? 'bg-white/30 text-white'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                            }`}
                                    >
                                        {copiedId === voucher.id ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                {voucher.code}
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Voucher Details */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 text-base mb-1">{voucher.description}</h3>
                                    <p className="text-sm text-gray-500 mb-3">Min. spend ${voucher.minSpend}</p>

                                    <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full ${isExpiringSoon(voucher.expiryDate)
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        <Clock className="w-3.5 h-3.5" />
                                        Expires {formatDate(voucher.expiryDate)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 bg-[#F8FDF3] rounded-2xl border border-dashed border-[#E7EEE7]">
                    <div className="w-16 h-16 bg-[#EFF8EE] rounded-full flex items-center justify-center mb-4">
                        <Gift className="w-8 h-8 text-[#21421B]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1C201D] mb-2">No vouchers yet</h3>
                    <p className="text-[#4A554B] text-center px-4">Complete orders to earn vouchers and discounts!</p>
                </div>
            )}
        </div>
    );
};

// ==========================================================================
// TODO: REMOVE MOCK DATA - Remove mockAchievements array after backend integration
// ==========================================================================
const mockAchievements = [
    {
        id: 1,
        name: 'First Bite',
        description: 'Complete your first order',
        icon: '🍜',
        unlocked: true,
        unlockedDate: '2025-12-15',
        progress: 100,
    },
    {
        id: 2,
        name: 'Hawker Explorer',
        description: 'Visit 5 different hawker centres',
        icon: '🗺️',
        unlocked: true,
        unlockedDate: '2025-12-20',
        progress: 100,
    },
    {
        id: 3,
        name: 'Photo Foodie',
        description: 'Upload 10 food photos',
        icon: '📸',
        unlocked: false,
        progress: 60,
        current: 6,
        target: 10,
    },
    {
        id: 4,
        name: 'Community Star',
        description: 'Get 50 upvotes on your photos',
        icon: '⭐',
        unlocked: false,
        progress: 24,
        current: 12,
        target: 50,
    },
    {
        id: 5,
        name: 'Cuisine Master',
        description: 'Try dishes from 8 different cuisines',
        icon: '👨‍🍳',
        unlocked: false,
        progress: 37.5,
        current: 3,
        target: 8,
    },
    {
        id: 6,
        name: 'Loyal Customer',
        description: 'Complete 25 orders',
        icon: '💎',
        unlocked: false,
        progress: 16,
        current: 4,
        target: 25,
    },
];

export const AchievementsPage = () => {
    // TODO: REMOVE - Replace with actual achievements from API
    const unlockedCount = mockAchievements.filter(a => a.unlocked).length;

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl font-bold text-gray-900">Achievements</h1>
                <div className="flex items-center gap-2 text-sm">
                    <Award className="w-5 h-5 text-amber-500" />
                    {/* TODO: REMOVE - Replace mockAchievements.length with actual count */}
                    <span className="text-gray-600">{unlockedCount}/{mockAchievements.length}</span>
                </div>
            </div>

            {/* TODO: REMOVE - Progress Overview is placeholder, connect to real user level */}
            {/* Progress Overview */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 mb-5 border border-amber-100">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg flex-shrink-0">
                        🏆
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base">Foodie Level 2</h3>
                        <p className="text-sm text-gray-600">Keep exploring to unlock more!</p>
                    </div>
                </div>
            </div>

            {/* Achievements List - Single column for thin mobile screens */}
            {/* TODO: REMOVE - Replace mockAchievements with actual achievements data */}
            <div className="space-y-3">
                {mockAchievements.map((achievement) => (
                    <div
                        key={achievement.id}
                        className={`relative rounded-2xl border p-4 transition-all ${achievement.unlocked
                            ? 'bg-white border-amber-200 shadow-sm'
                            : 'bg-gray-50 border-gray-100'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            {/* Badge */}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${achievement.unlocked
                                ? 'bg-gradient-to-br from-amber-100 to-orange-100'
                                : 'bg-gray-100 grayscale opacity-50'
                                }`}>
                                {achievement.icon}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className={`font-semibold text-base mb-0.5 ${achievement.unlocked ? 'text-gray-900' : 'text-gray-500'
                                            }`}>
                                            {achievement.name}
                                        </h3>
                                        <p className={`text-sm ${achievement.unlocked ? 'text-gray-600' : 'text-gray-400'
                                            }`}>
                                            {achievement.description}
                                        </p>
                                    </div>

                                    {/* Unlocked badge */}
                                    {achievement.unlocked && (
                                        <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>

                                {!achievement.unlocked && (
                                    <div className="mt-3 space-y-1.5">
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>{achievement.current}/{achievement.target}</span>
                                            <span>{Math.round(achievement.progress)}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#21421B] to-[#3a6b35] rounded-full transition-all"
                                                style={{ width: `${achievement.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SettingToggle = ({ enabled, onChange }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-[#21421B]' : 'bg-gray-200'
            }`}
    >
        <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
        />
    </button>
);

const SettingItem = ({ icon: Icon, label, description, children }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-[#F8FDF3] rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#21421B]" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{label}</h3>
                {description && <p className="text-xs sm:text-sm text-gray-500 truncate">{description}</p>}
            </div>
        </div>
        <div className="flex-shrink-0 flex items-center">
            {children}
        </div>
    </div>
);

export const SettingsPage = () => {
    const [notifications, setNotifications] = useState(true);
    const [orderUpdates, setOrderUpdates] = useState(true);
    const [promotions, setPromotions] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [erasingHistory, setErasingHistory] = useState(false);
    const {
        isEnabled: aiAssistantEnabled,
        setEnabled: setAiAssistantEnabled,
        clearHistory: clearAgentHistory,
    } = useAgentChat();

    const handleEraseChatHistory = () => {
        if (erasingHistory) return;
        setErasingHistory(true);
        clearAgentHistory();
        // Simulate erasing - just show spinner for 2 seconds
        setTimeout(() => {
            setErasingHistory(false);
        }, 2000);
    };

    return (
        <div className="space-y-4">
            {/* Notifications */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm overflow-hidden">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Notifications</h2>

                <SettingItem icon={Bell} label="Push Notifications" description="Receive alerts on your device">
                    <SettingToggle enabled={notifications} onChange={setNotifications} />
                </SettingItem>

                <SettingItem icon={Mail} label="Order Updates" description="Get notified about order status">
                    <SettingToggle enabled={orderUpdates} onChange={setOrderUpdates} />
                </SettingItem>

                <SettingItem icon={Gift} label="Promotions & Deals" description="Exclusive offers and discounts">
                    <SettingToggle enabled={promotions} onChange={setPromotions} />
                </SettingItem>
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm overflow-hidden">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Preferences</h2>

                <SettingItem icon={MessageSquareMore} label="AI Assistant" description="Show At-Table chat helper">
                    <SettingToggle enabled={aiAssistantEnabled} onChange={setAiAssistantEnabled} />
                </SettingItem>

                <SettingItem icon={Moon} label="Dark Mode" description="Switch to dark theme">
                    <SettingToggle enabled={darkMode} onChange={setDarkMode} />
                </SettingItem>

                <SettingItem icon={Globe} label="Language" description="English">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </SettingItem>
            </div>

            {/* Security */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm overflow-hidden">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Security</h2>

                <SettingItem icon={Lock} label="Change Password" description="Update your password">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </SettingItem>

                <SettingItem icon={Trash2} label="Erase Chat History" description="Clear all AI assistant conversations">
                    <button
                        onClick={handleEraseChatHistory}
                        disabled={erasingHistory}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                        {erasingHistory ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'Erase'
                        )}
                    </button>
                </SettingItem>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border border-red-100 p-4 md:p-6 shadow-sm">
                <h2 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h2>
                <button className="w-full py-3.5 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors text-base">
                    Delete Account
                </button>
            </div>
        </div>
    );
};

export const BusinessPage = () => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm">
        <div className="text-center">
            {/* Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-[#E7F3E6] to-[#D4EAD2] rounded-3xl flex items-center justify-center mx-auto mb-5">
                <Briefcase className="w-10 h-10 text-[#21421B]" />
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">Partner With Us</h1>
            <p className="text-gray-600 mb-6 text-base">
                Are you a hawker stall owner? Join Eatable to reach more customers and grow your business.
            </p>

            {/* Benefits */}
            <div className="space-y-3 text-left mb-6">
                {[
                    'Reach thousands of hungry customers',
                    'Easy-to-use stall management dashboard',
                    'Real-time order notifications',
                    'Boost visibility with photo uploads',
                ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 bg-[#F8FDF3] rounded-xl">
                        <div className="w-7 h-7 bg-[#21421B] rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-base text-gray-700">{benefit}</span>
                    </div>
                ))}
            </div>

            <button className="w-full py-3.5 bg-[#21421B] text-white font-medium rounded-xl hover:bg-[#1a3515] transition-colors text-base">
                Apply to Be a Partner
            </button>
        </div>
    </div>
);

// ==========================================================================
// TODO: REMOVE MOCK DATA - Remove faqItems array after backend integration
// ==========================================================================
const faqItems = [
    { q: 'How do I track my order?', a: 'Go to Orders to see real-time status updates.' },
    { q: 'How do I apply a voucher?', a: 'Copy the voucher code and paste it at checkout.' },
    { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 5 minutes of placing.' },
    { q: 'How do I earn achievements?', a: 'Complete orders and upload photos to unlock badges.' },
];

export const HelpPage = () => {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="space-y-4">
            {/* Contact Options */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Us</h2>

                {/* Stacked buttons for thin mobile */}
                <div className="space-y-3">
                    <button className="w-full flex items-center gap-4 p-4 bg-[#F8FDF3] rounded-xl hover:bg-[#E7F3E6] transition-colors">
                        <div className="w-12 h-12 bg-[#E7F3E6] rounded-xl flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-[#21421B]" />
                        </div>
                        <div className="text-left">
                            <span className="text-base font-medium text-gray-900 block">Live Chat</span>
                            <span className="text-sm text-gray-500">Get help instantly</span>
                        </div>
                    </button>
                    <button className="w-full flex items-center gap-4 p-4 bg-[#F8FDF3] rounded-xl hover:bg-[#E7F3E6] transition-colors">
                        <div className="w-12 h-12 bg-[#E7F3E6] rounded-xl flex items-center justify-center">
                            <Mail className="w-6 h-6 text-[#21421B]" />
                        </div>
                        <div className="text-left">
                            <span className="text-base font-medium text-gray-900 block">Email Support</span>
                            <span className="text-sm text-gray-500">We reply within 24 hours</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* FAQ */}
            {/* TODO: REMOVE - Replace faqItems with actual FAQ data from backend */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>

                <div className="space-y-2">
                    {faqItems.map((item, i) => (
                        <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                            >
                                <span className="font-medium text-base text-gray-900 pr-3">{item.q}</span>
                                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-90' : ''}`} />
                            </button>
                            {openFaq === i && (
                                <div className="px-4 pb-4 text-base text-gray-600">
                                    {item.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Help Center Link */}
            <div className="bg-gradient-to-r from-[#21421B] to-[#3a6b35] rounded-xl p-5 md:p-6 text-white text-center">
                <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-80" />
                <h3 className="font-semibold text-lg mb-2">Need more help?</h3>
                <p className="text-sm opacity-80 mb-4">Visit our full help center for guides and tutorials.</p>
                <button className="w-full py-3 bg-white text-[#21421B] font-medium rounded-xl hover:bg-gray-100 transition-colors text-base">
                    Visit Help Center
                </button>
            </div>
        </div>
    );
};
