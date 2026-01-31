import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import Chart from 'react-apexcharts';
import { ChevronDown, ChevronUp, ChevronsUpDown, LayoutDashboard, MoreVertical, Pencil, Plus, Salad, Sun, X } from 'lucide-react';
import api from '../../../lib/api';
import { formatDate, formatTimeAgo } from '../../../utils/helpers';
import { toaster } from '../../../components/ui/toaster';
import '../styles/hawkerDashboard.css';

const CHART_COLORS = ['#A855F7', '#5EBECC', '#EC4899', '#F59E0B', '#6366F1', '#94A3B8'];

const MAX_DISH_ITEMS = 10;
const SG_TIMEZONE = 'Asia/Singapore';

const CATEGORY_OPTIONS = [
  'Set Meal',
  'Main',
  'Drink',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
];

interface DishData {
  name: string;
  count: number;
}

interface WeekData {
  weekStart: string;
  count: number;
}

interface DayData {
  date: string;
  count: number;
}

interface DeltaData {
  orders?: number;
  photos?: number;
  upvotes?: number;
}

interface TotalsData {
  orders?: number;
  photos?: number;
  upvotes?: number;
  delta?: DeltaData;
}

interface DashboardSummary {
  ordersByDish?: DishData[];
  ordersByWeek?: WeekData[];
  ordersByDay?: DayData[];
  totals?: TotalsData;
  totalOrdersByDish?: number;
  period?: {
    from: string;
    to: string;
    timePeriod: string;
  };
  granularity?: 'day' | 'week';
}

interface UserData {
  displayName?: string;
}

interface OrderActivityData {
  summary: string;
  orderCode?: string;
}

interface UpvoteActivityData {
  menuItem: string;
}

interface PhotoUploadActivityData {
  menuItem: string;
  imageUrl?: string;
}

interface ActivityItem {
  type: 'order' | 'upvote' | 'photo_upload';
  user: UserData;
  createdAt: string;
  data: OrderActivityData | UpvoteActivityData | PhotoUploadActivityData;
}

interface MenuItemData {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  category: string | null;
  prepTimeMins: number | null;
  imageUrl: string | null;
}

type SortField = 'name' | 'price' | 'category' | 'prepTime';
type SortDir = 'none' | 'asc' | 'desc';
type SortConfig = Record<SortField, SortDir>;

const SORT_FIELDS_PRIORITY: SortField[] = ['name', 'price', 'category', 'prepTime'];

const getDefaultSortConfig = (): SortConfig => ({
  name: 'none',
  price: 'none',
  category: 'none',
  prepTime: 'none',
});

const sortDishes = (dishes: MenuItemData[], config: SortConfig): MenuItemData[] => {
  const activeFields = SORT_FIELDS_PRIORITY.filter((f) => config[f] !== 'none');
  if (activeFields.length === 0) return dishes;

  return [...dishes].sort((a, b) => {
    for (const field of activeFields) {
      const dir = config[field];
      let cmp = 0;

      switch (field) {
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'price':
          cmp = a.priceCents - b.priceCents;
          break;
        case 'category':
          cmp = (a.category || '').localeCompare(b.category || '');
          break;
        case 'prepTime':
          cmp = (a.prepTimeMins ?? 0) - (b.prepTimeMins ?? 0);
          break;
      }

      if (cmp !== 0) {
        return dir === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  });
};

interface ProcessedDishData {
  items: DishData[];
  total: number;
}

const processOrdersByDish = (ordersByDish?: DishData[]): ProcessedDishData => {
  if (!ordersByDish || ordersByDish.length === 0) return { items: [], total: 0 };
  
  const sorted = [...ordersByDish].sort((a, b) => b.count - a.count);
  
  if (sorted.length <= MAX_DISH_ITEMS) {
    return { items: sorted, total: sorted.reduce((sum, d) => sum + d.count, 0) };
  }
  
  return {
    items: sorted.slice(0, MAX_DISH_ITEMS),
    total: sorted.reduce((sum, d) => sum + d.count, 0),
  };
};

const parseSgDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, -8));
};

const formatSgDateKey = (date: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: SG_TIMEZONE }).format(date);

const addDays = (dateString: string, days: number): string => {
  const base = parseSgDate(dateString);
  base.setUTCDate(base.getUTCDate() + days);
  return formatSgDateKey(base);
};

const formatWeekLabelShort = (weekStart: string): string => {
  const start = parseSgDate(weekStart);
  const end = parseSgDate(addDays(weekStart, 6));
  const startDay = start.toLocaleDateString('en-SG', { day: 'numeric', timeZone: SG_TIMEZONE });
  const endDay = end.toLocaleDateString('en-SG', { day: 'numeric', timeZone: SG_TIMEZONE });
  const startMonth = start.toLocaleDateString('en-SG', { month: 'short', timeZone: SG_TIMEZONE });
  const endMonth = end.toLocaleDateString('en-SG', { month: 'short', timeZone: SG_TIMEZONE });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
};

const formatDayLabelShort = (dateString: string): string => {
  const date = parseSgDate(dateString);
  const day = date.toLocaleDateString('en-SG', { weekday: 'short', timeZone: SG_TIMEZONE });
  const dayNum = date.toLocaleDateString('en-SG', { day: 'numeric', timeZone: SG_TIMEZONE });
  return `${day} ${dayNum}`;
};

const getActivityText = (item: ActivityItem): ReactNode => {
  switch (item.type) {
    case 'order':
      return (item.data as OrderActivityData).summary;
    case 'upvote':
      return (
        <>
          Upvoted your stall!{' '}
          <span className="text-white">&quot;{(item.data as UpvoteActivityData).menuItem}&quot;</span>
        </>
      );
    case 'photo_upload':
      return (
        <>
          Uploaded a new photo for <span className="text-[#A8E6A3]">{(item.data as PhotoUploadActivityData).menuItem}</span>.
        </>
      );
    default:
      return '';
  }
};

interface StatsCardProps {
  title: string;
  value: number;
  delta?: number;
  timePeriod?: 'yesterday' | 'lastWeek' | 'lastMonth' | 'threeMonths';
}

const StatsCard = ({ title, value, delta, timePeriod = 'lastMonth' }: StatsCardProps) => {
  const deltaValue = delta !== undefined && delta !== null ? Math.abs(delta) : 0;
  const isPositive = delta !== undefined && delta > 0;
  const isNeutral = delta === 0 || delta === undefined || delta === null;

  const getComparisonText = () => {
    switch (timePeriod) {
      case 'yesterday':
        return 'from previous day';
      case 'lastWeek':
        return 'from previous week';
      case 'threeMonths':
        return 'from previous 3 months';
      case 'lastMonth':
      default:
        return 'from last month';
    }
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-4 md:p-5 shadow-sm h-fit">
      <p className="text-sm md:text-sm text-gray-500 mb-1 md:mb-2">{title}</p>
      <p className="text-3xl md:text-4xl font-bold text-[#21421B] mb-2 md:mb-3">{value}</p>
      <div className="flex items-center gap-1.5 text-sm md:text-sm text-gray-500">
        <span className="font-semibold text-gray-700">{deltaValue}</span>
        <ChevronUp
          className={`w-3.5 h-3.5 ${isPositive ? 'text-[#1C7C3A]' : isNeutral ? 'text-gray-400' : 'text-[#B42318] rotate-180'}`}
        />
        <span className="hidden sm:inline">{isPositive ? 'Increased' : isNeutral ? 'No change' : 'Decreased'} {getComparisonText()}</span>
        <span className="sm:hidden">{isPositive ? 'Increased' : isNeutral ? 'No change' : 'Decreased'}</span>
      </div>
    </div>
  );
};

interface ActivityItemProps {
  item: ActivityItem;
}

const ActivityItemComponent = ({ item }: ActivityItemProps) => {
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
        {item.type === 'order' && (item.data as OrderActivityData).orderCode && (
          <span className="inline-block mt-2 px-2.5 py-1 bg-[#3D5C38] rounded text-xs text-[#A8E6A3] font-mono">
            #{(item.data as OrderActivityData).orderCode}
          </span>
        )}
        {item.type === 'photo_upload' && (item.data as PhotoUploadActivityData).imageUrl && (
          <img
            src={(item.data as PhotoUploadActivityData).imageUrl}
            alt={(item.data as PhotoUploadActivityData).menuItem}
            className="mt-3 w-full max-w-[200px] h-28 object-cover rounded-xl"
          />
        )}
      </div>
    </div>
  );
};

interface SliderPosition {
  left: number;
  width: number;
}

interface EditDishFormState {
  name: string;
  description: string;
  price: string;
  prepTime: string;
  category: string;
  imageUrl: string;
  imagePreview: string;
  imageFile: File | null;
}

const emptyEditForm: EditDishFormState = {
  name: '',
  description: '',
  price: '',
  prepTime: '',
  category: '',
  imageUrl: '',
  imagePreview: '',
  imageFile: null,
};

const HawkerDashboardPage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [dishes, setDishes] = useState<MenuItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'dish' | 'day'>('dish');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dishes'>('dashboard');
  const [dayChartMode, setDayChartMode] = useState<'week' | 'day'>('week');
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState<SliderPosition>({ left: 0, width: 0 });
  const [sortConfig, setSortConfig] = useState<SortConfig>(getDefaultSortConfig);
  const [isSliderReady, setIsSliderReady] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingDish, setEditingDish] = useState<MenuItemData | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditDishFormState>(emptyEditForm);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'yesterday' | 'lastWeek' | 'lastMonth' | 'threeMonths'>('lastMonth');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dashboardBtnRef = useRef<HTMLButtonElement>(null);
  const dishesBtnRef = useRef<HTMLButtonElement>(null);
  const menuContainerMobileRef = useRef<HTMLDivElement | null>(null);
  const menuContainerDesktopRef = useRef<HTMLDivElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const editImageObjectUrlRef = useRef<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<EditDishFormState>(emptyEditForm);
  const [isSavingAdd, setIsSavingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isEditCategoryDropdownOpen, setIsEditCategoryDropdownOpen] = useState(false);

  const addFileInputRef = useRef<HTMLInputElement | null>(null);
  const addImageObjectUrlRef = useRef<string | null>(null);

  // Update slider position when active tab changes or container resizes
  useEffect(() => {
    const updateSliderPosition = () => {
      const activeBtn = activeTab === 'dashboard' ? dashboardBtnRef.current : dishesBtnRef.current;
      const container = containerRef.current;
      
      if (activeBtn && container) {
        const containerRect = container.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        
        // Only update if we have actual dimensions
        if (btnRect.width > 0) {
          setSliderPosition({
            left: btnRect.left - containerRect.left,
            width: btnRect.width,
          });
          setIsSliderReady(true);
        }
      }
    };
    
    // Initial calculation with multiple retries to handle font loading and layout
    updateSliderPosition();
    
    // Retry after a short delay in case fonts or layout aren't ready
    const retryTimeouts = [50, 100, 200].map(delay => 
      setTimeout(updateSliderPosition, delay)
    );
    
    // Use ResizeObserver to catch layout changes
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateSliderPosition();
      });
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateSliderPosition);
    
    return () => {
      retryTimeouts.forEach(clearTimeout);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateSliderPosition);
    };
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashRes, activityRes, dishesRes] = await Promise.all([
          api.get('/hawker/dashboard', { params: { timePeriod: selectedPeriod } }),
          api.get('/hawker/dashboard/activity', { params: { limit: 10 } }),
          api.get('/hawker/dashboard/dishes'),
        ]);
        setSummary(dashRes.data);
        setActivity(activityRes.data.items || []);
        setDishes(dishesRes.data || []);
      } catch (err) {
        console.error('[HawkerDashboard] Failed to load data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedPeriod]);

  useEffect(() => {
    if (!openMenuId) {
      menuContainerMobileRef.current = null;
      menuContainerDesktopRef.current = null;
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideMobile =
        menuContainerMobileRef.current?.contains(target) ?? false;
      const insideDesktop =
        menuContainerDesktopRef.current?.contains(target) ?? false;
      if (!insideMobile && !insideDesktop) {
        setOpenMenuId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  useEffect(() => {
    return () => {
      if (editImageObjectUrlRef.current) {
        URL.revokeObjectURL(editImageObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (addImageObjectUrlRef.current) {
        URL.revokeObjectURL(addImageObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isDropdownOpen && !target.closest('.time-period-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isCategoryDropdownOpen && !target.closest('.category-dropdown')) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCategoryDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isEditCategoryDropdownOpen && !target.closest('.edit-category-dropdown')) {
        setIsEditCategoryDropdownOpen(false);
      }
    };

    if (isEditCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isEditCategoryDropdownOpen]);

  const openEditModal = (dish: MenuItemData) => {
    setEditingDish(dish);
    setEditError(null);
    setEditForm({
      name: dish.name || '',
      description: dish.description || '',
      category: dish.category || '',
      price: typeof dish.priceCents === 'number' ? (dish.priceCents / 100).toFixed(2) : '',
      prepTime: typeof dish.prepTimeMins === 'number' ? String(dish.prepTimeMins) : '',
      imageUrl: dish.imageUrl || '',
      imagePreview: dish.imageUrl || '',
      imageFile: null,
    });
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditingDish(null);
    setEditForm(emptyEditForm);
    setEditError(null);
    if (editImageObjectUrlRef.current) {
      URL.revokeObjectURL(editImageObjectUrlRef.current);
      editImageObjectUrlRef.current = null;
    }
  };

  const openAddModal = () => {
    setAddError(null);
    setAddForm(emptyEditForm);
    setIsAddOpen(true);
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
    setAddForm(emptyEditForm);
    setAddError(null);

    if (addImageObjectUrlRef.current) {
      URL.revokeObjectURL(addImageObjectUrlRef.current);
      addImageObjectUrlRef.current = null;
    }

    if (addFileInputRef.current) {
      addFileInputRef.current.value = '';
    }
  };

  const handleEditImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (editImageObjectUrlRef.current) {
      URL.revokeObjectURL(editImageObjectUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    editImageObjectUrlRef.current = previewUrl;

    setEditForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: previewUrl,
    }));
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingDish) {
      return;
    }

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditError('Dish name is required.');
      return;
    }

    const priceValue = Number(editForm.price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setEditError('Price must be a non-negative number.');
      return;
    }

    let prepValue: number | null = null;
    if (editForm.prepTime.trim() !== '') {
      const parsedPrep = Number(editForm.prepTime);
      if (!Number.isFinite(parsedPrep) || parsedPrep < 0) {
        setEditError('Preparation time must be a non-negative number.');
        return;
      }
      prepValue = Math.round(parsedPrep);
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      let updatedImageUrl = editForm.imageUrl;

      if (editForm.imageFile) {
        const formData = new FormData();
        formData.append('image', editForm.imageFile);
        formData.append('menuItemId', editingDish.id);
        formData.append('aspectRatio', 'square');
        formData.append('setAsMenuItemImage', 'true');

        const uploadRes = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 35000,
        });

        updatedImageUrl =
          uploadRes.data?.menuItemImageUrl ||
          uploadRes.data?.upload?.imageUrl ||
          updatedImageUrl;
      }

      const payload = {
        name: trimmedName,
        description: editForm.description.trim() || null,
        category: editForm.category?.trim() || null,
        priceCents: Math.round(priceValue * 100),
        prepTimeMins: prepValue,
        imageUrl: updatedImageUrl || null,
      };

      const updateRes = await api.patch(
        `/hawker/dashboard/dishes/${editingDish.id}`,
        payload
      );

      const updatedDish = updateRes.data;

      setDishes((prev) =>
        prev.map((dish) =>
          dish.id === updatedDish.id
            ? {
                ...dish,
                ...updatedDish,
                description: updatedDish.description ?? null,
                imageUrl: updatedDish.imageUrl ?? updatedImageUrl ?? dish.imageUrl,
              }
            : dish
        )
      );

      closeEditModal();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to update dish. Please try again.';
      setEditError(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (addImageObjectUrlRef.current) {
      URL.revokeObjectURL(addImageObjectUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    addImageObjectUrlRef.current = previewUrl;

    setAddForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: previewUrl,
    }));
  };

  const handleAddDishSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAddError(null);

    // Validate dish name
    const trimmedName = addForm.name.trim();
    if (!trimmedName) {
      setAddError('Dish name is required.');
      return;
    }

    // Validate price
    const priceValue = Number(addForm.price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setAddError('Price must be a non-negative number.');
      return;
    }

    // Validate prep time (optional)
    let prepValue: number | null = null;
    if (addForm.prepTime.trim() !== '') {
      const parsedPrep = Number(addForm.prepTime);
      if (!Number.isFinite(parsedPrep) || parsedPrep < 0) {
        setAddError('Preparation time must be a non-negative number.');
        return;
      }
      prepValue = Math.round(parsedPrep);
    }

    // Validate image is selected
    if (!addForm.imageFile) {
      setAddError('Please upload an image for the dish.');
      return;
    }

    setIsSavingAdd(true);

    try {
      // Step 1: Create the dish without image first
      const createPayload = {
        name: trimmedName,
        description: addForm.description.trim() || null,
        priceCents: Math.round(priceValue * 100),
        prepTimeMins: prepValue,
        category: addForm.category?.trim() || null,
        imageUrl: null,
      };

      const createRes = await api.post('/hawker/dashboard/dishes', createPayload);
      const newDishId = createRes.data.id;

      // Step 2: Upload image and associate with new dish
      const formData = new FormData();
      formData.append('image', addForm.imageFile);
      formData.append('menuItemId', newDishId);
      formData.append('aspectRatio', 'square');
      formData.append('setAsMenuItemImage', 'true');

      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 35000,
      });

      // Success
      toaster.create({
        title: 'Dish added',
        description: `${trimmedName} has been added to your menu.`,
        type: 'success',
        duration: 3000,
      });
      closeAddModal();

      // Refresh dish list
      const dishesRes = await api.get('/hawker/dashboard/dishes');
      setDishes(dishesRes.data || []);
    } catch (err: any) {
      console.error('[handleAddDishSubmit]', err);
      const message =
        err?.response?.data?.error ||
        'Failed to add dish. Please try again.';
      setAddError(message);
    } finally {
      setIsSavingAdd(false);
    }
  };

  const handleRemoveDish = async (dish: MenuItemData) => {
    if (isActionLoading) {
      return;
    }

    const confirmed = window.confirm(`Remove "${dish.name}" from your menu? You can add it back later.`);
    if (!confirmed) {
      return;
    }

    setIsActionLoading(true);

    try {
      await api.patch(`/hawker/dashboard/dishes/${dish.id}/remove`);
      setDishes((prev) => prev.filter((item) => item.id !== dish.id));
      toaster.create({
        title: 'Dish removed',
        description: `${dish.name} was removed from your menu.`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to remove dish. Please try again.';
      toaster.create({
        title: 'Remove failed',
        description: message,
        type: 'error',
        duration: 4000,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteDish = async (dish: MenuItemData) => {
    if (isActionLoading) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${dish.name}" permanently? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setIsActionLoading(true);

    try {
      await api.delete(`/hawker/dashboard/dishes/${dish.id}`);
      setDishes((prev) => prev.filter((item) => item.id !== dish.id));
      toaster.create({
        title: 'Dish deleted',
        description: `${dish.name} was permanently deleted.`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to delete dish. Please try again.';
      toaster.create({
        title: 'Delete failed',
        description: message,
        type: 'error',
        duration: 4000,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

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

  const { items: dishChartData, total: dishChartTotal } = processOrdersByDish(
    summary?.ordersByDish
  );
  const dishLegendDensity = dishChartData.length;
  const dishLegendClass =
    dishLegendDensity >= 9
      ? 'gap-2 text-sm leading-tight'
      : dishLegendDensity >= 7
        ? 'gap-3 text-base'
        : 'gap-5 text-lg';
  const dishDotClass =
    dishLegendDensity >= 9
      ? 'w-3.5 h-3.5'
      : dishLegendDensity >= 7
        ? 'w-4 h-4'
        : 'w-5 h-5';
  const dishLegendContainerClass =
    dishLegendDensity >= 9 ? 'max-h-[260px] overflow-y-auto pr-2' : '';

  const weeklyData = summary?.ordersByWeek || [];
  const dailyData = summary?.ordersByDay || [];
  const isDayView = chartView === 'day';
  const granularity = summary?.granularity || 'week';
  const isWeeklyView = isDayView && dayChartMode === 'week';
  const isDailyView = isDayView && dayChartMode === 'day';

  // For day-level granularity, show daily data directly
  const displayData = granularity === 'day' ? dailyData : (isWeeklyView ? weeklyData : dailyData);
  const weekLabels = weeklyData.map((week) => formatWeekLabelShort(week.weekStart));
  const weekCounts = weeklyData.map((week) => week.count);
  const dayLabels = dailyData.map((day) => formatDayLabelShort(day.date));
  const dayCounts = dailyData.map((day) => day.count);

  const dayCountsByDate = new Map(
    dailyData.map((item) => [item.date, item.count])
  );

  const weekDayLabels: string[] = [];
  const weekDayCounts: number[] = [];

  if (selectedWeekStart) {
    for (let i = 0; i < 7; i += 1) {
      const dateKey = addDays(selectedWeekStart, i);
      weekDayLabels.push(formatDayLabelShort(dateKey));
      weekDayCounts.push(dayCountsByDate.get(dateKey) ?? 0);
    }
  }

  const dayCategories = granularity === 'day' ? dayLabels : (isWeeklyView ? weekLabels : weekDayLabels);
  const daySeriesData = granularity === 'day' ? dayCounts : (isWeeklyView ? weekCounts : weekDayCounts);
  const dayChartTotal = daySeriesData.reduce((sum, value) => sum + value, 0);
  const dayEmptyMessage = granularity === 'day'
    ? 'No orders in this period'
    : isWeeklyView
    ? 'No orders in the last 4 weeks'
    : 'No orders in this week';
  const dishEmptyMessage = 'No orders by dish yet';
  const selectedWeekEnd = selectedWeekStart ? addDays(selectedWeekStart, 6) : null;
  const dayTitle = granularity === 'day'
    ? selectedPeriod === 'yesterday'
      ? 'Total Orders Yesterday'
      : 'Total Orders This Week'
    : isWeeklyView
    ? 'Total Orders by Week'
    : `Orders for ${formatDate(selectedWeekStart!, SG_TIMEZONE)} - ${formatDate(
        selectedWeekEnd!,
        SG_TIMEZONE
      )}`;

  const dishChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: dishChartData.map(d => d.name),
    colors: CHART_COLORS.slice(0, dishChartData.length),
    legend: { show: false },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(0)}%`,
      style: { fontSize: '12px', fontWeight: 600, colors: ['#fff'] },
      dropShadow: { enabled: false },
    },
    stroke: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
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
              formatter: () =>
                (summary?.totalOrdersByDish ?? dishChartTotal).toString(),
            },
          },
        },
      },
    },
    tooltip: { enabled: true },
  };

  const dishChartSeries = dishChartData.map(d => d.count);
  const dayChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      fontFamily: 'inherit',
      toolbar: { show: false },
      events: granularity === 'week' && isWeeklyView
        ? {
            dataPointSelection: (_: unknown, __: unknown, config: { dataPointIndex: number }) => {
              const week = weeklyData[config.dataPointIndex];
              if (week?.weekStart) {
                setSelectedWeekStart(week.weekStart);
                setDayChartMode('day');
              }
            },
          }
        : {},
    },
    colors: ['#21421B'],
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: isWeeklyView ? '50%' : '40%',
        distributed: false,
      },
    },
    xaxis: {
      categories: dayCategories,
      labels: {
        rotate: -45,
        rotateAlways: typeof window !== 'undefined' && window.innerWidth < 640,
        style: { fontSize: '11px', fontWeight: 500 },
        hideOverlappingLabels: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '12px' },
        formatter: (val: number) => (val % 1 === 0 ? val.toString() : ''),
      },
      min: 0,
      forceNiceScale: true,
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} order${value !== 1 ? 's' : ''}`,
      },
    },
  };

  const dayChartSeries = [
    {
      name: 'Orders',
      data: daySeriesData,
    },
  ];

  return (
    <section className="px-4 md:px-[4vw] pt-10 pb-4 md:py-6 w-full min-h-[calc(100vh-64px)] bg-[#fbf7f0] overflow-y-auto">
      {/* Header - stacks on mobile */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-[#1C201D] mb-1">
            {activeTab === 'dashboard' ? 'Dashboard' : 'Dishes'}
          </h1>
          <p className="text-sm md:text-base text-gray-500">
            {activeTab === 'dashboard' ? "Track your stall's performance" : 'View and manage your menu items'}
          </p>
        </div>
        
        {/* Controls row - on mobile, center the toggle */}
        <div className="flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4">
          {activeTab === 'dashboard' ? (
            <div className="relative time-period-dropdown">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span className="hidden md:inline">
                  {selectedPeriod === 'yesterday' && 'Yesterday'}
                  {selectedPeriod === 'lastWeek' && 'Last week'}
                  {selectedPeriod === 'lastMonth' && 'Last month'}
                  {selectedPeriod === 'threeMonths' && '3 months'}
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  {[
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'lastWeek', label: 'Last week' },
                    { value: 'lastMonth', label: 'Last month' },
                    { value: 'threeMonths', label: '3 months' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedPeriod(option.value as typeof selectedPeriod);
                        setIsDropdownOpen(false);
                        setDayChartMode('week');
                        setSelectedWeekStart(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        selectedPeriod === option.value ? 'text-[#21421B] font-semibold' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAddModal}
              className="hidden md:flex items-center gap-2 bg-[#21421B] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a3415] transition-colors animate-[fadeSlideRight_0.3s_ease-out]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dish</span>
            </button>
          )}
          
          {/* Tab Toggle - full width on mobile */}
          <div ref={containerRef} className="relative flex w-full md:w-auto md:inline-flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm gap-1">
            {/* Sliding background */}
            <div 
              className={`absolute top-1 bottom-1 bg-[#21421B] rounded-lg ${isSliderReady ? 'transition-all duration-300 ease-in-out' : ''}`}
              style={{
                left: sliderPosition.left,
                width: sliderPosition.width,
                opacity: isSliderReady ? 1 : 0,
              }}
            />
            
            {/* Dashboard Tab */}
            <button
              ref={dashboardBtnRef}
              onClick={() => setActiveTab('dashboard')}
              className="relative z-10 flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-base md:text-sm font-medium"
            >
              <LayoutDashboard
                className={`w-5 h-5 md:w-4 md:h-4 transition-all duration-300 ease-out ${activeTab === 'dashboard' && isSliderReady ? 'text-white scale-110 rotate-3' : 'text-gray-500 scale-100 rotate-0'}`}
              />
              <span className={`transition-colors duration-300 ${activeTab === 'dashboard' && isSliderReady ? 'text-white' : 'text-gray-500'}`}>
                Dashboard
              </span>
            </button>
            
            {/* Dishes Tab */}
            <button
              ref={dishesBtnRef}
              onClick={() => setActiveTab('dishes')}
              className="relative z-10 flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-base md:text-sm font-medium"
            >
              <Salad
                className={`w-5 h-5 md:w-4 md:h-4 transition-all duration-300 ease-out ${activeTab === 'dishes' && isSliderReady ? 'text-white scale-110 -rotate-6' : 'text-gray-500 scale-100 rotate-0'}`}
              />
              <span className={`transition-colors duration-300 ${activeTab === 'dishes' && isSliderReady ? 'text-white' : 'text-gray-500'}`}>
                Dishes
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Column - Stats + Chart OR Dishes Table */}
        <div className="flex-1 flex flex-col gap-6 md:gap-4">
          {activeTab === 'dashboard' ? (
            <>
              {/* Stats Cards - stacked on mobile, 3 on tablet+ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 animate-[slideInFromLeft_0.3s_ease-out]">
                <StatsCard
                  title="Total Orders"
                  value={summary?.totals?.orders ?? 0}
                  delta={summary?.totals?.delta?.orders}
                  timePeriod={selectedPeriod}
                />
                <StatsCard
                  title="Total Photos Uploaded"
                  value={summary?.totals?.photos ?? 0}
                  delta={summary?.totals?.delta?.photos}
                  timePeriod={selectedPeriod}
                />
                <StatsCard
                  title="Total Community Upvotes"
                  value={summary?.totals?.upvotes ?? 0}
                  delta={summary?.totals?.delta?.upvotes}
                  timePeriod={selectedPeriod}
                />
              </div>

              {/* Chart Section */}
              <div className={`flex-1 bg-white rounded-xl md:rounded-2xl border border-gray-100 p-5 md:p-6 shadow-sm animate-[slideInFromLeft_0.3s_ease-out] ${chartView === 'day' ? 'pb-2 md:pb-6' : ''}`}>
                <div className="flex items-center justify-between gap-3 mb-4 md:mb-6">
                  {/* Dish Icon - Left side on mobile, beside Day icon on desktop */}
                  <div className="flex items-center md:gap-2 min-w-[40px]">
                    <button
                      onClick={() => {
                        setChartView('dish');
                        setDayChartMode('week');
                        setSelectedWeekStart(null);
                      }}
                      className="p-1 transition-opacity hover:opacity-70"
                    >
                      <Salad
                        aria-label="By Dish"
                        className={`w-6 h-6 transition-all duration-300 ease-out ${chartView === 'dish' ? 'text-[#21421B] scale-110 -rotate-12' : 'text-gray-400 scale-100 rotate-0'}`}
                      />
                    </button>
                    <button
                      onClick={() => {
                        setChartView('day');
                        setDayChartMode('week');
                        setSelectedWeekStart(null);
                      }}
                      className="hidden md:block p-1 transition-opacity hover:opacity-70"
                    >
                      <Sun
                        aria-label="By Day"
                        className={`w-6 h-6 transition-all duration-300 ease-out ${chartView === 'day' ? 'text-[#21421B] scale-110 rotate-45' : 'text-gray-400 scale-100 rotate-0'}`}
                      />
                    </button>
                  </div>
                  
                  {/* Centered Title - larger on mobile, handles wrapping */}
                  <div className="flex-1 text-center">
                    <h2 className="text-lg md:text-xl font-bold text-[#1C201D] leading-tight">
                      {chartView === 'dish' ? 'Total Orders by Dish' : dayTitle}
                    </h2>
                  </div>

                  {/* Right side - Day icon on mobile, plus All weeks button if applicable */}
                  <div className="flex items-center gap-1 md:gap-2 min-w-[40px] justify-end">
                    <button
                      onClick={() => {
                        setChartView('day');
                        setDayChartMode('week');
                        setSelectedWeekStart(null);
                      }}
                      className="md:hidden p-1 transition-opacity hover:opacity-70"
                    >
                      <Sun
                        aria-label="By Day"
                        className={`w-6 h-6 transition-all duration-300 ease-out ${chartView === 'day' ? 'text-[#21421B] scale-110 rotate-45' : 'text-gray-400 scale-100 rotate-0'}`}
                      />
                    </button>
                    {granularity === 'week' && isDailyView ? (
                      <button
                        className="hidden md:flex items-center gap-1.5 text-sm text-[#21421B] hover:text-[#1a3415] font-medium transition-colors"
                        onClick={() => {
                          setDayChartMode('week');
                          setSelectedWeekStart(null);
                        }}
                        type="button"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Weekly View
                      </button>
                    ) : (
                      <div className="hidden md:block w-24" />
                    )}
                  </div>
                </div>

                {chartView === 'dish' && dishChartTotal === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    {dishEmptyMessage}
                  </div>
                ) : chartView === 'dish' ? (
                  <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-16 lg:gap-28 py-6 md:py-0">
                    {/* Chart */}
                    <div className="flex-shrink-0 w-[260px] md:w-[280px] lg:w-[300px]">
                      <Chart
                        options={dishChartOptions}
                        series={dishChartSeries}
                        type="donut"
                        height={typeof window !== 'undefined' && window.innerWidth < 768 ? 260 : 300}
                      />
                    </div>
                    {/* Legend */}
                    <div className={`flex flex-col ${dishLegendClass} ${dishLegendContainerClass}`}>
                      {dishChartData.map((dish, index) => (
                        <div key={dish.name} className={`flex items-center ${dishLegendClass}`}>
                          <span
                            className={`${dishDotClass} rounded-full flex-shrink-0`}
                            style={{ backgroundColor: CHART_COLORS[index] }}
                          />
                          <span className="min-w-0 truncate text-gray-800 font-medium text-sm md:text-base">
                            {dish.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : dayChartTotal === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    {dayEmptyMessage}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="mb-[-10px] md:mb-0">
                      <Chart
                        key={isWeeklyView ? 'weekly' : selectedWeekStart}
                        options={dayChartOptions}
                        series={dayChartSeries}
                        type="bar"
                        height={typeof window !== 'undefined' && window.innerWidth < 768 ? 220 : 280}
                      />
                    </div>
                    {isDailyView && (
                      <button
                        onClick={() => {
                          setDayChartMode('week');
                          setSelectedWeekStart(null);
                        }}
                        className="md:hidden mt-[-8px] mb-2 flex items-center justify-center gap-2 py-3.5 w-full bg-[#F5F7F4] rounded-xl text-[#21421B] font-bold text-sm transition-all active:scale-[0.98] active:bg-gray-200"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back to Weekly View
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Dishes Tab Content */
            <>
              <div className="flex-1 bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-[slideInFromRight_0.3s_ease-out]">

                {/* Table Header */}
                <div className="hidden md:grid grid-cols-[2fr_0.8fr_1.2fr_1fr_40px] gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  {(['name', 'price', 'category', 'prepTime'] as const).map((field) => {
                    const labels: Record<SortField, string> = {
                      name: 'Dish Name',
                      price: 'Price',
                      category: 'Category',
                      prepTime: 'Prep Time (min)',
                    };
                    const dir = sortConfig[field];
                    const handleClick = () => {
                      setSortConfig((prev) => ({
                        ...prev,
                        [field]: prev[field] === 'none' ? 'desc' : prev[field] === 'desc' ? 'asc' : 'none',
                      }));
                    };
                    return (
                      <button
                        key={field}
                        onClick={handleClick}
                        className={`flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 ${field === 'prepTime' || field === 'category' ? 'justify-center' : ''}`}
                      >
                        {labels[field]}
                        {dir === 'none' && <ChevronsUpDown className="w-4 h-4 text-gray-400" />}
                        {dir === 'desc' && <ChevronDown className="w-4 h-4" />}
                        {dir === 'asc' && <ChevronUp className="w-4 h-4" />}
                      </button>
                    );
                  })}
                  <div />
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-100">
                  {dishes.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-400">
                      No dishes found. Add your first dish to get started.
                    </div>
                  ) : (
                    sortDishes(dishes, sortConfig).map((dish) => (
                      <div
                        key={dish.id}
                        className="grid grid-cols-1 md:grid-cols-[2fr_0.8fr_1.2fr_1fr_40px] gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-gray-50/50 transition-colors"
                      >
                        {/* Mobile: Image centered with text beside it */}
                        <div className="flex items-center gap-4 md:gap-3">
                          <div className="w-16 h-16 md:w-16 md:h-16 rounded-xl md:rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {dish.imageUrl ? (
                              <img
                                src={dish.imageUrl}
                                alt={dish.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Salad className="w-7 h-7 md:w-6 md:h-6 text-gray-300" />
                              </div>
                            )}
                          </div>
                          {/* Mobile: Name and details stacked beside image */}
                          <div className="flex flex-1 items-start justify-between gap-3 md:hidden">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 text-base">{dish.name}</span>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                                <span>${(dish.priceCents / 100).toFixed(2)}</span>
                                <span>•</span>
                                <span>{dish.category || 'Uncategorized'}</span>
                                <span>•</span>
                                <span>{dish.prepTimeMins ?? '-'} min</span>
                              </div>
                            </div>
                            <div
                              className="relative"
                              ref={openMenuId === dish.id ? menuContainerMobileRef : null}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuId((prev) => (prev === dish.id ? null : dish.id))
                                }
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                aria-haspopup="menu"
                                aria-expanded={openMenuId === dish.id}
                              >
                                <MoreVertical className="w-5 h-5 text-gray-400" />
                              </button>

                              {openMenuId === dish.id && (
                                <div
                                  role="menu"
                                  className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-gray-100 bg-white shadow-lg"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      openEditModal(dish);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl"
                                  >
                                    Edit dish
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleRemoveDish(dish);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                    disabled={isActionLoading}
                                  >
                                    Remove dish
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleDeleteDish(dish);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-xl disabled:opacity-60"
                                    disabled={isActionLoading}
                                  >
                                    Delete dish
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Desktop: Just name */}
                          <span className="hidden md:inline font-medium text-gray-900 text-base">{dish.name}</span>
                        </div>

                        {/* Desktop columns */}
                        <div className="hidden md:flex items-center text-sm text-gray-700">
                          ${(dish.priceCents / 100).toFixed(2)}
                        </div>
                        <div className="hidden md:flex items-center justify-center text-sm text-gray-700">
                          {dish.category || 'Uncategorized'}
                        </div>
                        <div className="hidden md:flex items-center justify-center text-sm text-gray-700">
                          {dish.prepTimeMins ?? '-'}
                        </div>

                        {/* Actions */}
                        <div className="hidden md:flex items-center justify-center">
                          <div
                            className="relative"
                            ref={openMenuId === dish.id ? menuContainerDesktopRef : null}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === dish.id ? null : dish.id))
                              }
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              aria-haspopup="menu"
                              aria-expanded={openMenuId === dish.id}
                            >
                              <MoreVertical className="w-5 h-5 text-gray-400" />
                            </button>

                            {openMenuId === dish.id && (
                              <div
                                role="menu"
                                className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-gray-100 bg-white shadow-lg"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    openEditModal(dish);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl"
                                >
                                  Edit dish
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleRemoveDish(dish);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                  disabled={isActionLoading}
                                >
                                  Remove dish
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDeleteDish(dish);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-xl disabled:opacity-60"
                                  disabled={isActionLoading}
                                >
                                  Delete dish
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Mobile Add Dish Button - Outside white box */}
              <button
                onClick={openAddModal}
                className="md:hidden w-full flex items-center justify-center gap-2 bg-[#21421B] text-white px-4 py-3.5 rounded-xl text-sm font-medium mt-3 animate-[fadeSlideRight_0.3s_ease-out]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Dish</span>
              </button>
            </>
          )}
        </div>

        {/* Right Column - Activity Panel */}
        <div className="lg:w-96 bg-gradient-to-b from-[#344E2E] to-[#263D22] rounded-2xl p-5 text-white">
          <h2 className="text-lg font-semibold mb-5">Latest Activity</h2>
          {activity.length === 0 ? (
            <p className="text-white/50 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {activity.slice(0, 10).map((item, index) => (
                <ActivityItemComponent key={`${item.type}-${index}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between px-6 pt-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit {editingDish?.name || 'Dish'}
              </h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Close edit dish modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="px-6 pb-6 pt-4">
              <div className="mb-5">
                <label className="text-sm font-semibold text-gray-700">Dish photo</label>
                <div className="mt-2 relative">
                  <div className="h-56 w-full overflow-hidden rounded-2xl bg-gray-100 flex items-center justify-center">
                    {editForm.imagePreview ? (
                      <img
                        src={editForm.imagePreview}
                        alt={editForm.name || 'Dish photo'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Salad className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="absolute right-3 top-3 h-9 w-9 rounded-full bg-white shadow-md flex items-center justify-center"
                    aria-label="Change dish photo"
                  >
                    <Pencil className="w-4 h-4 text-gray-600" />
                  </button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditImageChange}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-700">Dish name</label>
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#21421B]/40"
                  placeholder="Dish name"
                />
              </div>

              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-700">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#21421B]/40"
                  rows={3}
                  placeholder="Add a short description"
                />
              </div>

              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-700">Category</label>
                <div className="relative edit-category-dropdown mt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditCategoryDropdownOpen(!isEditCategoryDropdownOpen)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21421B]/40 bg-white text-left flex items-center justify-between text-sm"
                  >
                    <span className={editForm.category ? 'text-gray-900' : 'text-gray-400'}>
                      {editForm.category || 'Select a category'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isEditCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isEditCategoryDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 py-1 max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm((prev) => ({ ...prev, category: '' }));
                          setIsEditCategoryDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-400"
                      >
                        Select a category
                      </button>
                      {CATEGORY_OPTIONS.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setEditForm((prev) => ({ ...prev, category }));
                            setIsEditCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            editForm.category === category ? 'text-[#21421B] font-semibold bg-gray-50' : 'text-gray-700'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, price: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#21421B]/40"
                    placeholder="$"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Preparation Time (min)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.prepTime}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, prepTime: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#21421B]/40"
                    placeholder="0"
                  />
                </div>
              </div>

              {editError && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
                  {editError}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-60"
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#21421B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1B3616] disabled:opacity-70"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Dish Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-[scaleIn_0.2s_ease-out]">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-[#1C201D]">Add New Dish</h2>
              <button
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSavingAdd}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddDishSubmit} className="p-6 space-y-4">
              {/* Error Message */}
              {addError && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
                  {addError}
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dish Image <span className="text-red-500">*</span>
                </label>
                <input
                  ref={addFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAddImageChange}
                  className="hidden"
                  disabled={isSavingAdd}
                />
                <button
                  type="button"
                  onClick={() => addFileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-[#21421B] transition-colors disabled:opacity-50"
                  disabled={isSavingAdd}
                >
                  {addForm.imagePreview ? (
                    <img
                      src={addForm.imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Plus className="w-8 h-8" />
                      <span className="text-sm">Click to upload image</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Dish Name */}
              <div>
                <label htmlFor="add-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Dish Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="add-name"
                  name="name"
                  type="text"
                  value={addForm.name}
                  onChange={handleAddFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B]"
                  placeholder="e.g., Chicken Rice"
                  disabled={isSavingAdd}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="add-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="add-description"
                  name="description"
                  value={addForm.description}
                  onChange={handleAddFormChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B] resize-none"
                  placeholder="Describe your dish..."
                  disabled={isSavingAdd}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="relative category-dropdown">
                  <button
                    type="button"
                    onClick={() => !isSavingAdd && setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B] bg-white text-left flex items-center justify-between disabled:opacity-50"
                    disabled={isSavingAdd}
                  >
                    <span className={addForm.category ? 'text-gray-900' : 'text-gray-400'}>
                      {addForm.category || 'Select a category'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isCategoryDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setAddForm((prev) => ({ ...prev, category: '' }));
                          setIsCategoryDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-400"
                      >
                        Select a category
                      </button>
                      {CATEGORY_OPTIONS.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setAddForm((prev) => ({ ...prev, category }));
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            addForm.category === category ? 'text-[#21421B] font-semibold bg-gray-50' : 'text-gray-700'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Price */}
              <div>
                <label htmlFor="add-price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price (SGD) <span className="text-red-500">*</span>
                </label>
                <input
                  id="add-price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={addForm.price}
                  onChange={handleAddFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B]"
                  placeholder="0.00"
                  disabled={isSavingAdd}
                  required
                />
              </div>

              {/* Prep Time */}
              <div>
                <label htmlFor="add-prepTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Preparation Time (minutes)
                </label>
                <input
                  id="add-prepTime"
                  name="prepTime"
                  type="number"
                  min="0"
                  value={addForm.prepTime}
                  onChange={handleAddFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B]"
                  placeholder="e.g., 15"
                  disabled={isSavingAdd}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={isSavingAdd}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#21421B] text-white rounded-lg hover:bg-[#1a3415] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSavingAdd}
                >
                  {isSavingAdd ? 'Adding...' : 'Add Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default HawkerDashboardPage;
