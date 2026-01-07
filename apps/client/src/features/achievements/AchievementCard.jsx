import React from 'react';

export default function AchievementCard({ closestAchievement }) {
    if (!closestAchievement) return null;

    const { name, type, target, current, progress, percentage, completed, remaining } = closestAchievement;

    const getIcon = () => {
        if (type === 'vote') return 'V';
        if (type === 'upload') return 'U';
        return '*';
    };
    const getActionText = () => {
        if (type === 'vote') return 'votes';
        if (type === 'upload') return 'uploads';
        return 'actions';
    };

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{getIcon()}</span>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{name}</h3>
                        <p className="text-sm text-gray-500">Monthly Challenge</p>
                    </div>
                </div>
                {completed ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        Complete!
                    </span>
                ) : (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                        In Progress
                    </span>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">{getActionText()} this month</span>
                    <span className="font-bold text-gray-900">{current} / {target}</span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${completed ? 'bg-green-500' : 'bg-gradient-to-r from-[#1B3C18] to-[#2d5c28]'
                            }`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>

                <p className="text-xs text-gray-500">
                    {completed
                        ? `Amazing! You've completed this achievement!`
                        : `${remaining} more ${getActionText()} to unlock this achievement!`}
                </p>
            </div>
        </div>
    );
}
