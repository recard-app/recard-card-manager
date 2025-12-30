import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import type { RotatingScheduleEntry, SchedulePeriodType } from '@/types';
import { SCHEDULE_PERIOD_TYPES, SCHEDULE_PERIOD_DISPLAY_NAMES } from '@/types';
import { CATEGORIES, SUBCATEGORIES } from '@/constants/form-options';
import './ScheduleEntryModal.scss';

interface ScheduleEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: RotatingScheduleEntry | null;
  onSave: (entry: Omit<RotatingScheduleEntry, 'id'> | RotatingScheduleEntry) => Promise<void>;
}

// Helper to calculate date range from period type
function calculateDateRange(periodType: SchedulePeriodType, periodValue: number | undefined, year: number): { startDate: string; endDate: string } {
  if (periodType === SCHEDULE_PERIOD_TYPES.QUARTER && periodValue) {
    const quarterStarts = [
      { month: 0, day: 1 },   // Q1: Jan 1
      { month: 3, day: 1 },   // Q2: Apr 1
      { month: 6, day: 1 },   // Q3: Jul 1
      { month: 9, day: 1 },   // Q4: Oct 1
    ];
    const quarterEnds = [
      { month: 2, day: 31 },  // Q1: Mar 31
      { month: 5, day: 30 },  // Q2: Jun 30
      { month: 8, day: 30 },  // Q3: Sep 30
      { month: 11, day: 31 }, // Q4: Dec 31
    ];
    const start = new Date(year, quarterStarts[periodValue - 1].month, quarterStarts[periodValue - 1].day);
    const end = new Date(year, quarterEnds[periodValue - 1].month, quarterEnds[periodValue - 1].day);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }

  if (periodType === SCHEDULE_PERIOD_TYPES.MONTH && periodValue) {
    const start = new Date(year, periodValue - 1, 1);
    const end = new Date(year, periodValue, 0); // Last day of month
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }

  if (periodType === SCHEDULE_PERIOD_TYPES.HALF_YEAR && periodValue) {
    const start = new Date(year, periodValue === 1 ? 0 : 6, 1);
    const end = new Date(year, periodValue === 1 ? 5 : 11, periodValue === 1 ? 30 : 31);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }

  if (periodType === SCHEDULE_PERIOD_TYPES.YEAR) {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  }

  // Custom - return empty, user must provide dates
  return { startDate: '', endDate: '' };
}

const PERIOD_TYPE_OPTIONS = Object.values(SCHEDULE_PERIOD_TYPES).map(type => ({
  value: type,
  label: SCHEDULE_PERIOD_DISPLAY_NAMES[type]
}));

const QUARTER_OPTIONS = [
  { value: '1', label: 'Q1 (Jan - Mar)' },
  { value: '2', label: 'Q2 (Apr - Jun)' },
  { value: '3', label: 'Q3 (Jul - Sep)' },
  { value: '4', label: 'Q4 (Oct - Dec)' },
];

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const HALF_YEAR_OPTIONS = [
  { value: '1', label: 'H1 (Jan - Jun)' },
  { value: '2', label: 'H2 (Jul - Dec)' },
];

export function ScheduleEntryModal({ open, onOpenChange, entry, onSave }: ScheduleEntryModalProps) {
  const isEdit = !!entry;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    periodType: SCHEDULE_PERIOD_TYPES.QUARTER as SchedulePeriodType,
    periodValue: '',
    year: currentYear.toString(),
    category: '',
    subCategory: '',
    title: '',
    startDate: '',
    endDate: '',
    isCustomDateRange: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Year options (current year + 2 years forward, 1 year back)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
      years.push({ value: y.toString(), label: y.toString() });
    }
    return years;
  }, [currentYear]);

  // Initialize form data when component mounts
  useEffect(() => {
    if (entry) {
      setFormData({
        periodType: entry.periodType,
        periodValue: entry.periodValue?.toString() || '',
        year: entry.year.toString(),
        category: entry.category,
        subCategory: entry.subCategory,
        title: entry.title || '',
        startDate: entry.startDate,
        endDate: entry.endDate,
        isCustomDateRange: entry.isCustomDateRange,
      });
    } else {
      setFormData({
        periodType: SCHEDULE_PERIOD_TYPES.QUARTER,
        periodValue: '',
        year: currentYear.toString(),
        category: '',
        subCategory: '',
        title: '',
        startDate: '',
        endDate: '',
        isCustomDateRange: false,
      });
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-calculate dates when period changes (except for custom)
  useEffect(() => {
    if (formData.periodType !== SCHEDULE_PERIOD_TYPES.CUSTOM && !formData.isCustomDateRange) {
      const periodValue = formData.periodValue ? parseInt(formData.periodValue, 10) : undefined;
      const year = parseInt(formData.year, 10);

      if (formData.periodType === SCHEDULE_PERIOD_TYPES.YEAR || periodValue) {
        const { startDate, endDate } = calculateDateRange(formData.periodType, periodValue, year);
        setFormData(prev => ({ ...prev, startDate, endDate }));
      }
    }
  }, [formData.periodType, formData.periodValue, formData.year, formData.isCustomDateRange]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.periodType !== SCHEDULE_PERIOD_TYPES.YEAR && formData.periodType !== SCHEDULE_PERIOD_TYPES.CUSTOM && !formData.periodValue) {
      newErrors.periodValue = 'Period value is required';
    }

    if (formData.periodType === SCHEDULE_PERIOD_TYPES.CUSTOM || formData.isCustomDateRange) {
      if (!formData.startDate) {
        newErrors.startDate = 'Start date is required';
      }
      if (!formData.endDate) {
        newErrors.endDate = 'End date is required';
      }
      if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.warning('Please fix the errors before saving');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const entryData: Omit<RotatingScheduleEntry, 'id'> = {
        periodType: formData.periodType,
        periodValue: formData.periodValue ? parseInt(formData.periodValue, 10) : undefined,
        year: parseInt(formData.year, 10),
        category: formData.category.trim(),
        subCategory: formData.subCategory.trim(),
        title: formData.title.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        isCustomDateRange: formData.periodType === SCHEDULE_PERIOD_TYPES.CUSTOM || formData.isCustomDateRange,
      };

      if (isEdit && entry) {
        await onSave({ ...entryData, id: entry.id });
      } else {
        await onSave(entryData);
      }

      toast.success(isEdit ? 'Schedule entry updated' : 'Schedule entry added');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving schedule entry:', err);
      toast.error('Failed to save schedule entry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'schedule-entry-modal-form';

  // Get period value options based on period type
  const periodValueOptions = useMemo(() => {
    switch (formData.periodType) {
      case SCHEDULE_PERIOD_TYPES.QUARTER:
        return QUARTER_OPTIONS;
      case SCHEDULE_PERIOD_TYPES.MONTH:
        return MONTH_OPTIONS;
      case SCHEDULE_PERIOD_TYPES.HALF_YEAR:
        return HALF_YEAR_OPTIONS;
      default:
        return [];
    }
  }, [formData.periodType]);

  const showPeriodValue = formData.periodType !== SCHEDULE_PERIOD_TYPES.YEAR && formData.periodType !== SCHEDULE_PERIOD_TYPES.CUSTOM;
  const showCustomDates = formData.periodType === SCHEDULE_PERIOD_TYPES.CUSTOM || formData.isCustomDateRange;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Schedule Entry' : 'Add Schedule Entry'}
      description="Configure a rotating category period"
    >
      <form id={formId} onSubmit={handleSubmit} className="schedule-entry-modal-form">
        <div className="period-selection-row">
          <Select
            label="Period Type"
            required
            value={formData.periodType}
            onChange={(value) => setFormData({ ...formData, periodType: value as SchedulePeriodType, periodValue: '' })}
            options={PERIOD_TYPE_OPTIONS}
          />

          <Select
            label="Year"
            required
            value={formData.year}
            onChange={(value) => setFormData({ ...formData, year: value })}
            options={yearOptions}
          />
        </div>

        {showPeriodValue && (
          <Select
            label={formData.periodType === SCHEDULE_PERIOD_TYPES.QUARTER ? 'Quarter' :
                   formData.periodType === SCHEDULE_PERIOD_TYPES.MONTH ? 'Month' : 'Half'}
            required
            value={formData.periodValue}
            onChange={(value) => setFormData({ ...formData, periodValue: value })}
            options={periodValueOptions}
            error={errors.periodValue}
          />
        )}

        {formData.periodType !== SCHEDULE_PERIOD_TYPES.CUSTOM && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={formData.isCustomDateRange}
              onChange={(e) => setFormData({ ...formData, isCustomDateRange: e.target.checked })}
            />
            <span>Use custom date range</span>
          </label>
        )}

        {showCustomDates && (
          <div className="date-range-row">
            <DatePicker
              label="Start Date"
              required
              value={formData.startDate}
              onChange={(value) => setFormData({ ...formData, startDate: value })}
              error={errors.startDate}
            />
            <DatePicker
              label="End Date"
              required
              value={formData.endDate}
              onChange={(value) => setFormData({ ...formData, endDate: value })}
              error={errors.endDate}
            />
          </div>
        )}

        {!showCustomDates && formData.startDate && formData.endDate && (
          <div className="calculated-dates">
            Period: {formData.startDate} to {formData.endDate}
          </div>
        )}

        <div className="divider" />

        <Select
          label="Category"
          required
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value, subCategory: '' })}
          error={errors.category}
          options={Object.keys(CATEGORIES).map(cat => ({ value: cat, label: cat }))}
        />

        {formData.category && SUBCATEGORIES[formData.category]?.length > 0 && (
          <Select
            label="Sub Category"
            value={formData.subCategory}
            onChange={(value) => setFormData({ ...formData, subCategory: value })}
            options={SUBCATEGORIES[formData.category].map(sub => ({ value: sub, label: sub }))}
            clearable
          />
        )}

        <FormField
          label="Title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Amazon.com purchases, Dining & Restaurants"
          error={errors.title}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Entry' : 'Add Entry'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
