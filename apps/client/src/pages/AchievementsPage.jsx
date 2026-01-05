import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AchievementsPage() {
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);

    async function getToken() {
        const session = await supabase.auth.getSession();
        return session.data.session?.access_token;
    }

    async function loadAchievements() {
        setLoading(true);
        try {
            const token = await getToken();
            const res = await fetch('http://localhost:3000/api/achievements/status', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                console.log('ACHIEVEMENTS DATA:', data);
                setAchievements(data.achievements || []);
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAchievements();
    }, []);

    const getActionText = (type) => {
        if (type === 'vote') return 'Votes';
        if (type === 'upload') return 'Uploads';
        return 'Actions';
    };

    // Filter achievements to show progressive unlocking
    const getVisibleAchievements = () => {
        // Group achievements by type
        const voteAchievements = achievements.filter(a => a.type === 'vote').sort((a, b) => a.target - b.target);
        const uploadAchievements = achievements.filter(a => a.type === 'upload').sort((a, b) => a.target - b.target);

        const visible = [];

        // For vote achievements, show only up to the next incomplete one
        for (let i = 0; i < voteAchievements.length; i++) {
            visible.push(voteAchievements[i]);
            if (!voteAchievements[i].completed) {
                break; // Stop after first incomplete
            }
        }

        // For upload achievements, show only up to the next incomplete one
        for (let i = 0; i < uploadAchievements.length; i++) {
            visible.push(uploadAchievements[i]);
            if (!uploadAchievements[i].completed) {
                break; // Stop after first incomplete
            }
        }

        return visible;
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="text-gray-500">Loading achievements...</div>
            </div>
        );
    }

    const visibleAchievements = getVisibleAchievements();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Achievements</h2>
                <p className="text-gray-600">Track your monthly progress and unlock rewards</p>
            </div>

            {/* White Card Container with 2x2 Grid */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleAchievements.map((achievement) => (
                        <div
                            key={achievement.id}
                            className="bg-gray-50 rounded-lg p-6 border border-gray-100"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{achievement.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {getActionText(achievement.type)} • Monthly Challenge
                                    </p>
                                </div>
                                {achievement.completed ? (
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                        Complete
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                        In Progress
                                    </span>
                                )}
                            </div>

                            {/* Progress */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Progress</span>
                                    <span className="font-bold text-gray-900">
                                        {achievement.current} / {achievement.target}
                                    </span>
                                </div>

                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${achievement.completed
                                            ? 'bg-green-500'
                                            : 'bg-[#1B3C18]'
                                            }`}
                                        style={{ width: `${achievement.percentage}%` }}
                                    ></div>
                                </div>

                                <p className="text-xs text-gray-500">
                                    {achievement.completed
                                        ? 'Completed! Great work this month.'
                                        : `${achievement.remaining} more ${getActionText(achievement.type).toLowerCase()} needed`}
                                </p>

                                {achievement.reward && achievement.completed && (
                                    <div className="pt-2 border-t border-gray-200">
                                        <span className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded font-medium inline-flex items-center gap-1">
                                            <span>🎁</span> Reward Unlocked
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
