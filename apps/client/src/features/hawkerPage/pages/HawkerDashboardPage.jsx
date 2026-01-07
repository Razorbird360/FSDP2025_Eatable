import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import api from '../../../lib/api';
import { formatTimeAgo } from '../../../utils/helpers';

// Icons from assets
import tileLightIcon from '../../../assets/icons/tile-light.svg';
import dishLightIcon from '../../../assets/icons/dish-light.svg';
import dishDarkIcon from '../../../assets/icons/dish-dark.svg';
import dayLightIcon from '../../../assets/icons/day-light.svg';
import dayDarkIcon from '../../../assets/icons/day-dark.svg';
import scrollUpArrowIcon from '../../../assets/icons/scroll-up arrow.svg';

const CHART_COLORS = ['#A855F7', '#5EBECC', '#EC4899', '#F59E0B', '#6366F1', '#94A3B8'];

const MAX_CHART_ITEMS = 5;

const processOrdersByDish = (ordersByDish) => {
  if (!ordersByDish || ordersByDish.length === 0) return { items: [], total: 0 };
  
  const sorted = [...ordersByDish].sort((a, b) => b.count - a.count);
  
  if (sorted.length <= MAX_CHART_ITEMS) {
    return { items: sorted, total: sorted.reduce((sum, d) => sum + d.count, 0) };
  }
  
  const top = sorted.slice(0, MAX_CHART_ITEMS);
  const others = sorted.slice(MAX_CHART_ITEMS);
  const otherCount = others.reduce((sum, d) => sum + d.count, 0);
  
  return {
    items: [...top, { name: 'Other', count: otherCount }],
    total: sorted.reduce((sum, d) => sum + d.count, 0),
  };
};

const getActivityText = (item) => {
  switch (item.type) {
    case 'order':
      return item.data.summary;
    case 'upvote':
      return (
        <>
          Upvoted your stall! "<span className="text-white">{item.data.menuItem}</span>"
        </>
      );
    case 'photo_upload':
      return (
        <>
          Uploaded a new photo for <span className="text-[#A8E6A3]">{item.data.menuItem}</span>.
        </>
      );
    default:
      return '';
  }
};

const StatsCard = ({ title, value, delta }) => {
  const deltaValue = delta !== undefined && delta !== null ? Math.abs(delta) : 0;
  const isPositive = delta > 0;
  const isNeutral = delta === 0 || delta === undefined || delta === null;
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm h-fit">
      <p className="text-sm text-gray-500 mb-2">{title}</p>
      <p className="text-4xl font-bold text-[#21421B] mb-3">{value}</p>
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <span className="font-semibold text-gray-700">{deltaValue}</span>
        <img 
          src={scrollUpArrowIcon} 
          alt="" 
          className={`w-3.5 h-3.5 ${isPositive ? '' : isNeutral ? 'opacity-40' : 'rotate-180'}`}
          style={isPositive ? { filter: 'invert(23%) sepia(90%) saturate(400%) hue-rotate(70deg)' } : isNeutral ? {} : { filter: 'invert(30%) sepia(90%) saturate(2000%) hue-rotate(340deg)' }}
        />
        <span>{isPositive ? 'Increased' : isNeutral ? 'No change' : 'Decreased'} from last month</span>
      </div>
    </div>
  );
};

const ActivityItem = ({ item }) => {
  const initial = item.user.displayName?.charAt(0).toUpperCase() || 'R';
  const text = getActivityText(item);
  
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A6B42] flex items-center justify-center text-white text-sm font-semibold">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-semibold text-white text-sm">
            {item.user.displayName || 'Customer'}
          </span>
          <span className="text-xs text-white/50 whitespace-nowrap">
            {formatTimeAgo(item.createdAt)}
          </span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          {text}
        </p>
        {item.type === 'order' && item.data.orderCode && (
          <span className="inline-block mt-2 px-2.5 py-1 bg-[#3D5C38] rounded text-xs text-[#A8E6A3] font-mono">
            #{item.data.orderCode}
          </span>
        )}
        {item.type === 'photo_upload' && item.data.imageUrl && (
          <img
            src={item.data.imageUrl}
            alt={item.data.menuItem}
            className="mt-3 w-full max-w-[200px] h-28 object-cover rounded-xl"
          />
        )}
      </div>
    </div>
  );
};

const HawkerDashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartView, setChartView] = useState('dish'); // 'dish' or 'day'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'dishes'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, activityRes] = await Promise.all([
          api.get('/hawker/dashboard'),
          api.get('/hawker/dashboard/activity', { params: { limit: 10 } }),
        ]);
        setSummary(dashRes.data);
        setActivity(activityRes.data.items || []);
      } catch (err) {
        console.error('[HawkerDashboard] Failed to load data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#21421B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  const { items: chartData, total: chartTotal } = processOrdersByDish(summary?.ordersByDish);
  
  const chartOptions = {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: chartData.map(d => d.name),
    colors: CHART_COLORS.slice(0, chartData.length),
    legend: { show: false },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val.toFixed(0)}%`,
      style: { fontSize: '12px', fontWeight: 600, colors: ['#fff'] },
      dropShadow: { enabled: false },
    },
    stroke: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { show: false },
            value: { show: false },
            total: {
              show: true,
              showAlways: true,
              label: '',
              fontSize: '48px',
              fontWeight: 700,
              color: '#21421B',
              formatter: () => chartTotal.toString(),
            },
          },
        },
      },
    },
    tooltip: { enabled: true },
  };

  const chartSeries = chartData.map(d => d.count);

  return (
    <section className="px-[4vw] py-6 w-full h-[calc(100vh-64px)] flex flex-col bg-[#F5F7F4]">
      {/* Header with toggle on the right */}
      <div className="flex items-end justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-4xl font-bold text-[#1C201D] mb-1">Dashboard</h1>
          <p className="text-gray-500">Track your stall's performance and manage your dishes</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span>Last month</span>
          </div>
          
          {/* Tab Toggle */}
          <div className="relative inline-flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
            {/* Sliding background */}
            <div 
              className={`absolute top-1 bottom-1 bg-[#21421B] rounded-lg transition-all duration-300 ease-in-out`}
              style={{
                width: 'calc(50% - 4px)',
                left: activeTab === 'dashboard' ? '4px' : 'calc(50% + 0px)'
              }}
            />
            
            {/* Dashboard Tab */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className="relative z-10 flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-300 min-w-[120px]"
            >
              <img 
                src={tileLightIcon}
                alt="" 
                className={`w-4 h-4 transition-all duration-300 ${activeTab === 'dashboard' ? 'brightness-0 invert' : ''}`}
              />
              <span className={activeTab === 'dashboard' ? 'text-white' : 'text-gray-500'}>
                Dashboard
              </span>
            </button>
            
            {/* Dishes Tab */}
            <button
              onClick={() => setActiveTab('dishes')}
              className="relative z-10 flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-300 min-w-[120px]"
            >
              <img 
                src={dishLightIcon}
                alt="" 
                className={`w-4 h-4 transition-all duration-300 ${activeTab === 'dishes' ? 'brightness-0 invert' : ''}`}
              />
              <span className={activeTab === 'dishes' ? 'text-white' : 'text-gray-500'}>
                Dishes
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Flex layout that fills remaining space */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left Column - Stats + Chart */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              title="Total Orders"
              value={summary?.totals?.orders ?? 0}
              delta={summary?.totals?.delta?.orders}
            />
            <StatsCard
              title="Total Photos Uploaded"
              value={summary?.totals?.photos ?? 0}
              delta={summary?.totals?.delta?.photos}
            />
            <StatsCard
              title="Total Community Upvotes"
              value={summary?.totals?.upvotes ?? 0}
              delta={summary?.totals?.delta?.upvotes}
            />
          </div>

          {/* Donut Chart Section */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="relative flex items-center mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChartView('dish')}
                  className="p-1 transition-opacity hover:opacity-70"
                >
                  <img 
                    src={chartView === 'dish' ? dishDarkIcon : dishLightIcon} 
                    alt="By Dish" 
                    className="w-6 h-6" 
                  />
                </button>
                <button
                  onClick={() => setChartView('day')}
                  className="p-1 transition-opacity hover:opacity-70"
                >
                  <img 
                    src={chartView === 'day' ? dayDarkIcon : dayLightIcon} 
                    alt="By Day" 
                    className="w-6 h-6" 
                  />
                </button>
              </div>
              <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-[#1C201D]">
                Total Orders by {chartView === 'dish' ? 'Dish' : 'Day'}
              </h2>
            </div>

            {chartTotal === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No orders by dish yet
              </div>
            ) : (
              <div className="flex items-center justify-center gap-28">
                {/* Chart on left */}
                <div className="flex-shrink-0" style={{ width: '300px' }}>
                  <Chart
                    options={chartOptions}
                    series={chartSeries}
                    type="donut"
                    height={300}
                  />
                </div>
                {/* Legend on right */}
                <div className="flex flex-col gap-5">
                  {chartData.map((dish, index) => (
                    <div key={dish.name} className="flex items-center gap-4">
                      <span
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index] }}
                      />
                      <span className="text-lg text-gray-800 font-medium">{dish.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Activity Panel */}
        <div className="lg:w-96 bg-gradient-to-b from-[#344E2E] to-[#263D22] rounded-2xl p-5 text-white">
          <h2 className="text-lg font-semibold mb-5">Latest Activity</h2>
          {activity.length === 0 ? (
            <p className="text-white/50 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
              {activity.slice(0, 10).map((item, index) => (
                <ActivityItem key={`${item.type}-${index}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HawkerDashboardPage;
