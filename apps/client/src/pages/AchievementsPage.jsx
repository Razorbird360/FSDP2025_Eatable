import { useEffect, useState } from 'react';
import { Award, Camera, Check, Star, ThumbsUp } from 'lucide-react';
import api from '@lib/api';

const getActionText = (type) => {
  if (type === 'vote') return 'Votes';
  if (type === 'upload') return 'Uploads';
  return 'Actions';
};

const getAchievementIcon = (type) => {
  if (type === 'vote') return ThumbsUp;
  if (type === 'upload') return Camera;
  return Star;
};

const getProgressPercent = (achievement) => {
  if (Number.isFinite(achievement?.percentage)) {
    return Math.max(0, Math.min(100, achievement.percentage));
  }

  const current = Number(achievement?.current ?? 0);
  const target = Number(achievement?.target ?? 0);
  if (!target) return 0;
  return Math.max(0, Math.min(100, (current / target) * 100));
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    let ignore = false;

    async function loadAchievements() {
      setLoading(true);
      try {
        const res = await api.get('/achievements/status');
        if (!ignore) {
          setAchievements(res.data?.achievements || []);
        }
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAchievements();
    return () => {
      ignore = true;
    };
  }, []);

  const unlockedCount = achievements.filter((achievement) => achievement.completed).length;
  const totalCount = achievements.length;
  const summaryPercent = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const completedAchievements = achievements
    .filter((achievement) => achievement.completed)
    .sort((a, b) => {
      const typeCompare = (a.type || '').localeCompare(b.type || '');
      if (typeCompare !== 0) return typeCompare;
      return (a.target ?? 0) - (b.target ?? 0);
    });

  const availableAchievements = (() => {
    const byType = new Map();
    achievements.forEach((achievement) => {
      const key = achievement.type || 'other';
      if (!byType.has(key)) {
        byType.set(key, []);
      }
      byType.get(key).push(achievement);
    });

    const nextByType = [];
    byType.forEach((list) => {
      const sorted = list.slice().sort((a, b) => (a.target ?? 0) - (b.target ?? 0));
      const next = sorted.find((achievement) => !achievement.completed);
      if (next) nextByType.push(next);
    });

    return nextByType.sort((a, b) => {
      const typeCompare = (a.type || '').localeCompare(b.type || '');
      if (typeCompare !== 0) return typeCompare;
      return (a.target ?? 0) - (b.target ?? 0);
    });
  })();

  const activeList = activeTab === 'available' ? availableAchievements : completedAchievements;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm">
        <div className="text-gray-500">Loading achievements...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Achievements</h1>
        <div className="flex items-center gap-2 text-sm">
          <Award className="w-5 h-5 text-amber-500" />
          <span className="text-gray-600">
            {unlockedCount}/{totalCount}
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 mb-5 border border-amber-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base">Achievement progress</h3>
            <p className="text-sm text-gray-600">
              {totalCount > 0
                ? `${summaryPercent}% unlocked - ${unlockedCount} of ${totalCount} earned`
                : 'Start earning achievements by completing orders.'}
            </p>
          </div>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 bg-[#F8FDF3] rounded-2xl border border-dashed border-[#E7EEE7]">
          <div className="w-16 h-16 bg-[#EFF8EE] rounded-full flex items-center justify-center mb-4">
            <Award className="w-8 h-8 text-[#21421B]" />
          </div>
          <h3 className="text-lg font-semibold text-[#1C201D] mb-2">No achievements yet</h3>
          <p className="text-[#4A554B] text-center px-4">
            Upload photos and collect votes to unlock your first badge.
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-start mb-5">
            <div className="relative inline-flex items-center rounded-full bg-gray-100 p-1">
              <span
                className={`absolute top-1 left-1 h-8 w-[120px] rounded-full bg-white shadow-sm transition-transform duration-300 ${activeTab === 'completed' ? 'translate-x-[120px]' : 'translate-x-0'
                  }`}
              />
              <button
                type="button"
                className={`relative z-10 h-8 w-[120px] rounded-full text-sm font-semibold transition-colors ${activeTab === 'available' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                onClick={() => setActiveTab('available')}
                aria-pressed={activeTab === 'available'}
              >
                Available
              </button>
              <button
                type="button"
                className={`relative z-10 h-8 w-[120px] rounded-full text-sm font-semibold transition-colors ${activeTab === 'completed' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                onClick={() => setActiveTab('completed')}
                aria-pressed={activeTab === 'completed'}
              >
                Completed
              </button>
            </div>
          </div>

          {activeList.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-10">
              {activeTab === 'available'
                ? 'No available achievements right now.'
                : 'No completed achievements yet. Keep going!'}
            </div>
          ) : (
            <div className="space-y-3">
              {activeList.map((achievement) => {
                const isUnlocked = Boolean(achievement.completed);
                const Icon = getAchievementIcon(achievement.type);
                const progressPercent = getProgressPercent(achievement);
                const current = Number(achievement.current ?? 0);
                const target = Number(achievement.target ?? 0);
                const description =
                  achievement.description ||
                  `${getActionText(achievement.type)} - ${achievement.isOneTime ? 'One-time' : 'Monthly'
                  } challenge`;

                return (
                  <div
                    key={achievement.id}
                    className={`relative rounded-2xl border p-4 transition-all ${isUnlocked ? 'bg-white border-amber-200 shadow-sm' : 'bg-gray-50 border-gray-100'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${isUnlocked
                            ? 'bg-gradient-to-br from-amber-100 to-orange-100'
                            : 'bg-gray-100 grayscale opacity-50'
                          }`}
                      >
                        <Icon className="w-7 h-7 text-[#21421B]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3
                              className={`font-semibold text-base mb-0.5 ${isUnlocked ? 'text-gray-900' : 'text-gray-500'
                                }`}
                            >
                              {achievement.name}
                            </h3>
                            <p className={`text-sm ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                              {description}
                            </p>
                          </div>

                          {isUnlocked && (
                            <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>

                        {!isUnlocked && (
                          <div className="mt-3 space-y-1.5">
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>
                                {current}/{target}
                              </span>
                              <span>{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#21421B] to-[#3a6b35] rounded-full transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {isUnlocked && achievement.reward && (
                          <span className="mt-3 inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                            Reward unlocked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
