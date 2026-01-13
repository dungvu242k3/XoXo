import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, X, Clock, Filter } from 'lucide-react';

// Enum cho các bộ lọc nhanh
export type QuickFilterType = 
  | 'all'
  | 'today' 
  | 'yesterday' 
  | 'this_week' 
  | 'last_week' 
  | 'this_month' 
  | 'last_month' 
  | 'this_quarter'
  | 'this_year';

export interface DateRange {
  tuNgay: Date | null;
  denNgay: Date | null;
}

export interface FilterState {
  locNhanh: QuickFilterType;
  thoiGian: DateRange;
}

interface TableFilterProps {
  onFilterChange: (filter: FilterState) => void;
  className?: string;
}

const QUICK_FILTER_OPTIONS: { value: QuickFilterType; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: 'this_week', label: 'Tuần này' },
  { value: 'last_week', label: 'Tuần trước' },
  { value: 'this_month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'this_quarter', label: 'Quý này' },
  { value: 'this_year', label: 'Năm nay' },
];

// Hàm tính toán khoảng thời gian từ bộ lọc nhanh
export const getDateRangeFromQuickFilter = (filter: QuickFilterType): DateRange => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  switch (filter) {
    case 'today':
      return { tuNgay: today, denNgay: endOfDay };
    
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const endYesterday = new Date(yesterday);
      endYesterday.setHours(23, 59, 59, 999);
      return { tuNgay: yesterday, denNgay: endYesterday };
    }
    
    case 'this_week': {
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      return { tuNgay: startOfWeek, denNgay: endOfDay };
    }
    
    case 'last_week': {
      const startOfLastWeek = new Date(today);
      const day = startOfLastWeek.getDay();
      const diff = startOfLastWeek.getDate() - day + (day === 0 ? -6 : 1) - 7;
      startOfLastWeek.setDate(diff);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      return { tuNgay: startOfLastWeek, denNgay: endOfLastWeek };
    }
    
    case 'this_month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { tuNgay: startOfMonth, denNgay: endOfDay };
    }
    
    case 'last_month': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      endOfLastMonth.setHours(23, 59, 59, 999);
      return { tuNgay: startOfLastMonth, denNgay: endOfLastMonth };
    }
    
    case 'this_quarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
      return { tuNgay: startOfQuarter, denNgay: endOfDay };
    }
    
    case 'this_year': {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return { tuNgay: startOfYear, denNgay: endOfDay };
    }
    
    default:
      return { tuNgay: null, denNgay: null };
  }
};

// Format date for input
const formatDateForInput = (date: Date | null): string => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

// Parse date from input
const parseDateFromInput = (value: string): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

export const TableFilter: React.FC<TableFilterProps> = ({ onFilterChange, className = '' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<QuickFilterType>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ tuNgay: null, denNgay: null });
  const [tempDateRange, setTempDateRange] = useState<DateRange>({ tuNgay: null, denNgay: null });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Trigger filter change
  const triggerFilterChange = (quickFilter: QuickFilterType, dateRange: DateRange) => {
    onFilterChange({
      locNhanh: quickFilter,
      thoiGian: quickFilter === 'all' ? dateRange : getDateRangeFromQuickFilter(quickFilter)
    });
  };

  // Handle quick filter selection
  const handleQuickFilterSelect = (filter: QuickFilterType) => {
    setSelectedQuickFilter(filter);
    setIsDropdownOpen(false);
    
    if (filter !== 'all') {
      setCustomDateRange({ tuNgay: null, denNgay: null });
    }
    
    triggerFilterChange(filter, customDateRange);
  };

  // Handle date range apply
  const handleApplyDateRange = () => {
    setCustomDateRange(tempDateRange);
    setSelectedQuickFilter('all');
    setIsDatePickerOpen(false);
    triggerFilterChange('all', tempDateRange);
  };

  // Handle clear date range
  const handleClearDateRange = () => {
    setTempDateRange({ tuNgay: null, denNgay: null });
    setCustomDateRange({ tuNgay: null, denNgay: null });
    setIsDatePickerOpen(false);
    triggerFilterChange(selectedQuickFilter, { tuNgay: null, denNgay: null });
  };

  // Get display label
  const getFilterDisplayLabel = (): string => {
    if (customDateRange.tuNgay || customDateRange.denNgay) {
      const from = customDateRange.tuNgay ? customDateRange.tuNgay.toLocaleDateString('vi-VN') : '...';
      const to = customDateRange.denNgay ? customDateRange.denNgay.toLocaleDateString('vi-VN') : '...';
      return `${from} - ${to}`;
    }
    return QUICK_FILTER_OPTIONS.find(o => o.value === selectedQuickFilter)?.label || 'Tất cả';
  };

  const hasActiveFilter = selectedQuickFilter !== 'all' || customDateRange.tuNgay || customDateRange.denNgay;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Lọc nhanh Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
            hasActiveFilter 
              ? 'bg-gold-600/20 border-gold-600/50 text-gold-400' 
              : 'bg-neutral-800 border-neutral-700 text-slate-300 hover:bg-neutral-700'
          }`}
        >
          <Clock size={16} />
          <span className="text-sm font-medium">{getFilterDisplayLabel()}</span>
          <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl shadow-black/30 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              <div className="text-xs text-slate-500 uppercase font-semibold px-3 py-2">Lọc nhanh</div>
              {QUICK_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleQuickFilterSelect(option.value)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    selectedQuickFilter === option.value && !customDateRange.tuNgay
                      ? 'bg-gold-600/20 text-gold-400'
                      : 'text-slate-300 hover:bg-neutral-800'
                  }`}
                >
                  <span>{option.label}</span>
                  {selectedQuickFilter === option.value && !customDateRange.tuNgay && (
                    <Check size={16} className="text-gold-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bộ lọc thời gian tùy chỉnh */}
      <div className="relative" ref={datePickerRef}>
        <button
          onClick={() => {
            setTempDateRange(customDateRange);
            setIsDatePickerOpen(!isDatePickerOpen);
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
            customDateRange.tuNgay || customDateRange.denNgay
              ? 'bg-gold-600/20 border-gold-600/50 text-gold-400'
              : 'bg-neutral-800 border-neutral-700 text-slate-300 hover:bg-neutral-700'
          }`}
        >
          <Calendar size={16} />
          <span className="text-sm font-medium">Chọn ngày</span>
        </button>

        {/* Date Picker Dropdown */}
        {isDatePickerOpen && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl shadow-black/30 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4">
              <div className="text-sm text-slate-400 font-semibold mb-4 flex items-center gap-2">
                <Calendar size={16} />
                Thời gian tùy chỉnh
              </div>
              
              <div className="space-y-4">
                {/* Từ ngày */}
                <div>
                  <label className="flex items-center gap-2 text-xs text-slate-500 uppercase font-semibold mb-2">
                    <input
                      type="checkbox"
                      checked={!!tempDateRange.tuNgay}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          setTempDateRange({ ...tempDateRange, tuNgay: null });
                        } else {
                          setTempDateRange({ ...tempDateRange, tuNgay: new Date() });
                        }
                      }}
                      className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-gold-500 focus:ring-gold-500 focus:ring-offset-neutral-900"
                    />
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(tempDateRange.tuNgay)}
                    onChange={(e) => setTempDateRange({ ...tempDateRange, tuNgay: parseDateFromInput(e.target.value) })}
                    disabled={!tempDateRange.tuNgay}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 text-sm focus:ring-1 focus:ring-gold-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Đến ngày */}
                <div>
                  <label className="flex items-center gap-2 text-xs text-slate-500 uppercase font-semibold mb-2">
                    <input
                      type="checkbox"
                      checked={!!tempDateRange.denNgay}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          setTempDateRange({ ...tempDateRange, denNgay: null });
                        } else {
                          setTempDateRange({ ...tempDateRange, denNgay: new Date() });
                        }
                      }}
                      className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-gold-500 focus:ring-gold-500 focus:ring-offset-neutral-900"
                    />
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(tempDateRange.denNgay)}
                    onChange={(e) => setTempDateRange({ ...tempDateRange, denNgay: parseDateFromInput(e.target.value) })}
                    disabled={!tempDateRange.denNgay}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 text-sm focus:ring-1 focus:ring-gold-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-800">
                <button
                  onClick={handleClearDateRange}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 border border-neutral-700 text-slate-400 rounded-lg hover:bg-neutral-700 hover:text-slate-200 transition-colors text-sm"
                >
                  <X size={14} />
                  Xóa lọc
                </button>
                <button
                  onClick={handleApplyDateRange}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gold-600 text-black font-medium rounded-lg hover:bg-gold-500 transition-colors text-sm"
                >
                  <Check size={14} />
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clear all filters button */}
      {hasActiveFilter && (
        <button
          onClick={() => {
            setSelectedQuickFilter('all');
            setCustomDateRange({ tuNgay: null, denNgay: null });
            triggerFilterChange('all', { tuNgay: null, denNgay: null });
          }}
          className="flex items-center gap-1 px-2 py-2 text-slate-500 hover:text-red-400 transition-colors"
          title="Xóa bộ lọc"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

// Helper function để lọc data theo ngày
export const filterByDateRange = <T extends Record<string, any>>(
  data: T[],
  filter: FilterState,
  dateField: keyof T
): T[] => {
  const { locNhanh, thoiGian } = filter;
  
  // Nếu là "all" và không có custom date range
  if (locNhanh === 'all' && !thoiGian.tuNgay && !thoiGian.denNgay) {
    return data;
  }

  const dateRange = locNhanh !== 'all' ? getDateRangeFromQuickFilter(locNhanh) : thoiGian;

  return data.filter(item => {
    const itemDateValue = item[dateField] as unknown;
    if (!itemDateValue) return true;

    // Parse date from various formats
    let itemDate: Date;
    if (typeof itemDateValue === 'string') {
      // Handle DD/MM/YYYY format
      if (itemDateValue.includes('/')) {
        const [day, month, year] = itemDateValue.split('/');
        itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        itemDate = new Date(itemDateValue);
      }
    } else if (itemDateValue instanceof Date) {
      itemDate = itemDateValue;
    } else if (typeof itemDateValue === 'number') {
      itemDate = new Date(itemDateValue);
    } else {
      return true;
    }

    if (isNaN(itemDate.getTime())) return true;

    const { tuNgay, denNgay } = dateRange;
    
    if (tuNgay && itemDate < tuNgay) return false;
    if (denNgay && itemDate > denNgay) return false;
    
    return true;
  });
};

export default TableFilter;
