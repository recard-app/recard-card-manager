import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import type { CardMultiplier, MultiplierType, RotatingScheduleEntry, AllowedCategoryEntry, SchedulePeriodType } from '@/types';
import { ComponentService } from '@/services/component.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo, MULTIPLIER_TYPES, SCHEDULE_PERIOD_TYPES } from '@/types';
import { getCurrentDate } from '@/utils/date-utils';
import { CATEGORIES, SUBCATEGORIES } from '@/constants/form-options';
import { FileJson, Info, Plus, Trash2, Calendar, ListChecks } from 'lucide-react';
import './MultiplierModal.scss';
import { MultiplierFormSchema, zodErrorsToFieldMap } from '@/validation/schemas';
import { JsonImportModal } from '@/components/Modals/JsonImportModal';

const MULTIPLIER_TYPE_OPTIONS = [
  { value: MULTIPLIER_TYPES.STANDARD, label: 'Standard', description: 'Fixed category multiplier' },
  { value: MULTIPLIER_TYPES.ROTATING, label: 'Rotating', description: 'Category changes periodically (e.g., quarterly)' },
  { value: MULTIPLIER_TYPES.SELECTABLE, label: 'Selectable', description: 'User chooses from allowed categories' },
];

interface MultiplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceCardId: string;
  multiplier?: CardMultiplier | null;
  onSuccess: () => void;
  initialJson?: Record<string, unknown>;
}

// Helper to generate display name from category/subcategory
function generateDisplayName(category: string, subCategory: string): string {
  if (subCategory) {
    return subCategory
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to calculate date range from period type
function calculateDateRange(periodType: string, periodValue: number | undefined, year: number): { startDate: string; endDate: string } {
  if (periodType === SCHEDULE_PERIOD_TYPES.QUARTER && periodValue) {
    const quarterStarts = [
      { month: 0, day: 1 },
      { month: 3, day: 1 },
      { month: 6, day: 1 },
      { month: 9, day: 1 },
    ];
    const quarterEnds = [
      { month: 2, day: 31 },
      { month: 5, day: 30 },
      { month: 8, day: 30 },
      { month: 11, day: 31 },
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
    const end = new Date(year, periodValue, 0);
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

  return { startDate: '', endDate: '' };
}

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

// Temp ID generator for new items
let tempIdCounter = 0;
const generateTempId = () => `temp-${++tempIdCounter}`;

export function MultiplierModal({ open, onOpenChange, referenceCardId, multiplier, onSuccess, initialJson }: MultiplierModalProps) {
  const isEdit = !!multiplier;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    Name: '',
    Category: '',
    SubCategory: '',
    Description: '',
    Multiplier: '',
    Requirements: '',
    Details: '',
    EffectiveFrom: '',
    EffectiveTo: '',
    multiplierType: MULTIPLIER_TYPES.STANDARD as MultiplierType,
  });

  // Schedule entries for rotating multipliers
  const [scheduleEntries, setScheduleEntries] = useState<(RotatingScheduleEntry & { isNew?: boolean })[]>([]);
  const [deletedScheduleIds, setDeletedScheduleIds] = useState<string[]>([]);

  // Allowed categories for selectable multipliers
  const [allowedCategories, setAllowedCategories] = useState<(AllowedCategoryEntry & { isNew?: boolean })[]>([]);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);

  // Inline add forms
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  // New schedule entry form
  const [newSchedule, setNewSchedule] = useState<{
    periodType: SchedulePeriodType;
    periodValue: string;
    year: string;
    category: string;
    subCategory: string;
    title: string;
  }>({
    periodType: SCHEDULE_PERIOD_TYPES.QUARTER,
    periodValue: '',
    year: currentYear.toString(),
    category: '',
    subCategory: '',
    title: '',
  });

  // New category form
  const [newCategory, setNewCategory] = useState({
    category: '',
    subCategory: '',
    displayName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [jsonImportModalOpen, setJsonImportModalOpen] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Year filter for rotating schedule
  const [scheduleYearFilter, setScheduleYearFilter] = useState<number | 'all'>('all');

  // Track if we're processing initialJson to prevent the type-change effect from clearing categories
  // Using a ref so it's immediately available (state updates are batched)
  const isProcessingInitialJsonRef = useRef(false);

  const sanitizeNumericInput = (value: string): string => {
    return value.replace(/[^0-9.-]/g, '');
  };

  // Compute available years from schedule data
  const availableYears = useMemo(() => {
    if (!scheduleEntries || scheduleEntries.length === 0) return [];
    // Get unique years from schedule entries, sorted descending (most recent first)
    const years = [...new Set(scheduleEntries.map(entry => entry.year))].sort((a, b) => b - a);
    return years;
  }, [scheduleEntries]);

  // Filter and sort schedule entries
  const filteredAndSortedScheduleEntries = useMemo(() => {
    if (!scheduleEntries || scheduleEntries.length === 0) return [];

    // Filter by year (unless 'all' is selected)
    let filtered = scheduleEntries;
    if (scheduleYearFilter !== 'all') {
      filtered = scheduleEntries.filter(entry => entry.year === scheduleYearFilter);
    }

    // Sort by startDate ascending (chronological order)
    return [...filtered].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [scheduleEntries, scheduleYearFilter]);

  // Load existing schedule/categories when editing
  useEffect(() => {
    if (isEdit && multiplier && open) {
      loadExistingData();
    }
  }, [isEdit, multiplier?.id, open]);

  const loadExistingData = async () => {
    if (!multiplier) return;

    setLoadingExisting(true);
    try {
      if (multiplier.multiplierType === MULTIPLIER_TYPES.ROTATING) {
        const schedule = await ComponentService.getRotatingSchedule(multiplier.id);
        setScheduleEntries(schedule);
      } else if (multiplier.multiplierType === MULTIPLIER_TYPES.SELECTABLE) {
        const categories = await ComponentService.getAllowedCategories(multiplier.id);
        setAllowedCategories(categories);
      }
    } catch (err) {
      console.error('Failed to load existing data:', err);
    } finally {
      setLoadingExisting(false);
    }
  };

  // Set default year filter when schedule entries load
  useEffect(() => {
    if (availableYears.length > 0 && scheduleYearFilter === 'all') {
      const thisYear = new Date().getFullYear();

      // Check if current year has data
      if (availableYears.includes(thisYear)) {
        setScheduleYearFilter(thisYear);
      } else {
        // Find nearest year with data
        const nearestYear = availableYears.reduce((nearest, year) => {
          return Math.abs(year - thisYear) < Math.abs(nearest - thisYear) ? year : nearest;
        });
        setScheduleYearFilter(nearestYear);
      }
    }
  }, [availableYears]);

  // Reset year filter when multiplier changes
  useEffect(() => {
    setScheduleYearFilter('all');
  }, [multiplier?.id]);

  // Initialize form data
  useEffect(() => {
    if (multiplier) {
      setFormData({
        Name: multiplier.Name,
        Category: multiplier.Category,
        SubCategory: multiplier.SubCategory,
        Description: multiplier.Description,
        Multiplier: multiplier.Multiplier?.toString() || '',
        Requirements: multiplier.Requirements,
        Details: multiplier.Details || '',
        EffectiveFrom: multiplier.EffectiveFrom,
        EffectiveTo: denormalizeEffectiveTo(multiplier.EffectiveTo),
        multiplierType: multiplier.multiplierType || MULTIPLIER_TYPES.STANDARD,
      });
    } else {
      setFormData({
        Name: '',
        Category: '',
        SubCategory: '',
        Description: '',
        Multiplier: '',
        Requirements: '',
        Details: '',
        EffectiveFrom: getCurrentDate(),
        EffectiveTo: '',
        multiplierType: MULTIPLIER_TYPES.STANDARD,
      });
      setScheduleEntries([]);
      setAllowedCategories([]);
      setDeletedScheduleIds([]);
      setDeletedCategoryIds([]);
    }
    setErrors({});
    setShowAddSchedule(false);
    setShowAddCategory(false);
  }, [multiplier, open]);

  useEffect(() => {
    if (initialJson && open && !multiplier) {
      // Set ref flag to prevent the type-change effect from clearing categories
      isProcessingInitialJsonRef.current = true;
      handleJsonImport(initialJson);
    }
  }, [open, initialJson]);

  // Clear schedule/categories when type changes
  // Skip during initialJson processing to prevent clearing imported data
  useEffect(() => {
    // Check ref and reset it - ref is used so the value is immediately available
    if (isProcessingInitialJsonRef.current) {
      isProcessingInitialJsonRef.current = false;
      return;
    }

    if (!isEdit) {
      if (formData.multiplierType !== MULTIPLIER_TYPES.ROTATING) {
        setScheduleEntries([]);
        setShowAddSchedule(false);
      }
      if (formData.multiplierType !== MULTIPLIER_TYPES.SELECTABLE) {
        setAllowedCategories([]);
        setShowAddCategory(false);
      }
    }
  }, [formData.multiplierType, isEdit]);

  const validate = (): boolean => {
    const parsed = MultiplierFormSchema.safeParse({
      Name: formData.Name,
      Category: formData.Category,
      SubCategory: formData.SubCategory,
      Description: formData.Description,
      Multiplier: formData.Multiplier,
      Requirements: formData.Requirements,
      Details: formData.Details,
      EffectiveFrom: formData.EffectiveFrom,
      EffectiveTo: formData.EffectiveTo,
      multiplierType: formData.multiplierType,
    });
    if (!parsed.success) {
      const fieldLabels: Record<string, string> = {
        Name: 'Name',
        Category: 'Category',
        Description: 'Description',
        Multiplier: 'Multiplier',
        EffectiveFrom: 'Effective From',
      };
      const fieldErrors = zodErrorsToFieldMap(parsed.error);
      setErrors(fieldErrors);
      const missing = Object.keys(fieldErrors).map(k => fieldLabels[k] || k).join(', ');
      if (missing) toast.warning(`Missing required fields: ${missing}`);
      return false;
    }

    // Additional validation: Category required for standard type
    if (formData.multiplierType === MULTIPLIER_TYPES.STANDARD && !formData.Category.trim()) {
      setErrors({ Category: 'Category is required for standard multipliers' });
      toast.warning('Category is required for standard multipliers');
      return false;
    }

    // Validation for selectable: must have at least one allowed category
    if (formData.multiplierType === MULTIPLIER_TYPES.SELECTABLE && allowedCategories.length === 0) {
      toast.warning('Selectable multipliers must have at least one allowed category');
      return false;
    }

    setErrors({});
    return true;
  };

  const handleJsonImport = (fields: Record<string, unknown>) => {
    const updates: Partial<typeof formData> = {};

    if ('Name' in fields && typeof fields.Name === 'string') {
      updates.Name = fields.Name;
    }

    // Handle multiplierType
    if ('multiplierType' in fields && typeof fields.multiplierType === 'string') {
      if (['standard', 'rotating', 'selectable'].includes(fields.multiplierType)) {
        updates.multiplierType = fields.multiplierType as MultiplierType;
      }
    }

    let effectiveCategory = formData.Category;
    if ('Category' in fields && typeof fields.Category === 'string') {
      if (Object.keys(CATEGORIES).includes(fields.Category)) {
        updates.Category = fields.Category;
        effectiveCategory = fields.Category;
        updates.SubCategory = '';
      }
    }

    if ('SubCategory' in fields && typeof fields.SubCategory === 'string') {
      const validSubcategories = SUBCATEGORIES[effectiveCategory] || [];
      if (validSubcategories.includes(fields.SubCategory)) {
        updates.SubCategory = fields.SubCategory;
      }
    }

    if ('Description' in fields && typeof fields.Description === 'string') {
      updates.Description = fields.Description;
    }
    if ('Multiplier' in fields && typeof fields.Multiplier === 'number') {
      updates.Multiplier = String(fields.Multiplier);
    }
    if ('Requirements' in fields && typeof fields.Requirements === 'string') {
      updates.Requirements = fields.Requirements;
    }
    if ('Details' in fields && typeof fields.Details === 'string') {
      updates.Details = fields.Details;
    }

    setFormData(prev => ({ ...prev, ...updates }));

    // Handle allowedCategories for selectable type
    if ('allowedCategories' in fields && Array.isArray(fields.allowedCategories)) {
      const importedCategories: (AllowedCategoryEntry & { isNew: boolean })[] = [];

      for (const cat of fields.allowedCategories) {
        if (typeof cat === 'object' && cat !== null) {
          const catObj = cat as Record<string, unknown>;
          const category = typeof catObj.category === 'string' ? catObj.category : '';
          const subCategory = typeof catObj.subCategory === 'string' ? catObj.subCategory : '';
          const displayName = typeof catObj.displayName === 'string'
            ? catObj.displayName
            : generateDisplayName(category, subCategory);

          // Validate category exists
          if (category && Object.keys(CATEGORIES).includes(category)) {
            // Check for duplicates
            const isDuplicate = importedCategories.some(
              c => c.category === category && c.subCategory === subCategory
            );
            if (!isDuplicate) {
              importedCategories.push({
                id: generateTempId(),
                category,
                subCategory,
                displayName,
                isNew: true,
              });
            }
          }
        }
      }

      if (importedCategories.length > 0) {
        setAllowedCategories(prev => [...prev, ...importedCategories]);
        toast.success(`Imported ${importedCategories.length} allowed categories`);
      }
    }

    // Handle scheduleEntries for rotating type
    if ('scheduleEntries' in fields && Array.isArray(fields.scheduleEntries)) {
      const importedEntries: (RotatingScheduleEntry & { isNew: boolean })[] = [];

      for (const entry of fields.scheduleEntries) {
        if (typeof entry === 'object' && entry !== null) {
          const entryObj = entry as Record<string, unknown>;
          const category = typeof entryObj.category === 'string' ? entryObj.category : '';
          const subCategory = typeof entryObj.subCategory === 'string' ? entryObj.subCategory : '';
          const periodType = typeof entryObj.periodType === 'string' ? entryObj.periodType : 'quarter';
          const periodValue = typeof entryObj.periodValue === 'number' ? entryObj.periodValue : undefined;
          const year = typeof entryObj.year === 'number' ? entryObj.year : currentYear;
          const title = typeof entryObj.title === 'string' ? entryObj.title : '';

          // Validate required fields
          if (category && title.trim() && Object.keys(CATEGORIES).includes(category)) {
            // Calculate date range
            const { startDate, endDate } = calculateDateRange(periodType, periodValue, year);

            if (startDate && endDate) {
              importedEntries.push({
                id: generateTempId(),
                category,
                subCategory,
                periodType: periodType as SchedulePeriodType,
                periodValue,
                year,
                title: title.trim(),
                startDate,
                endDate,
                isCustomDateRange: false,
                isNew: true,
              });
            }
          }
        }
      }

      if (importedEntries.length > 0) {
        setScheduleEntries(prev => [...prev, ...importedEntries]);
        toast.success(`Imported ${importedEntries.length} schedule entries`);
      }
    }
  };

  // Add schedule entry
  const handleAddSchedule = () => {
    if (!newSchedule.category) {
      toast.warning('Please select a category');
      return;
    }

    const periodValue = newSchedule.periodValue ? parseInt(newSchedule.periodValue, 10) : undefined;
    const year = parseInt(newSchedule.year, 10);
    const { startDate, endDate } = calculateDateRange(newSchedule.periodType, periodValue, year);

    if (!startDate || !endDate) {
      toast.warning('Could not calculate date range');
      return;
    }

    // Title is required for schedule entries
    if (!newSchedule.title.trim()) {
      toast.warning('Please enter a title for this schedule entry');
      return;
    }

    const entry: RotatingScheduleEntry & { isNew: boolean } = {
      id: generateTempId(),
      periodType: newSchedule.periodType as any,
      periodValue,
      year,
      category: newSchedule.category,
      subCategory: newSchedule.subCategory,
      title: newSchedule.title.trim(),
      startDate,
      endDate,
      isCustomDateRange: false,
      isNew: true,
    };

    setScheduleEntries(prev => [...prev, entry]);
    setNewSchedule({
      periodType: SCHEDULE_PERIOD_TYPES.QUARTER,
      periodValue: '',
      year: currentYear.toString(),
      category: '',
      subCategory: '',
      title: '',
    });
    setShowAddSchedule(false);
    toast.success('Schedule entry added');
  };

  // Remove schedule entry
  const handleRemoveSchedule = (id: string) => {
    const entry = scheduleEntries.find(e => e.id === id);
    if (entry && !entry.isNew) {
      setDeletedScheduleIds(prev => [...prev, id]);
    }
    setScheduleEntries(prev => prev.filter(e => e.id !== id));
  };

  // Add allowed category
  const handleAddCategory = () => {
    if (!newCategory.category) {
      toast.warning('Please select a category');
      return;
    }

    // Check for duplicates
    const isDuplicate = allowedCategories.some(
      cat => cat.category === newCategory.category && cat.subCategory === newCategory.subCategory
    );
    if (isDuplicate) {
      toast.warning('This category combination already exists');
      return;
    }

    const displayName = newCategory.displayName.trim() || generateDisplayName(newCategory.category, newCategory.subCategory);

    const entry: AllowedCategoryEntry & { isNew: boolean } = {
      id: generateTempId(),
      category: newCategory.category,
      subCategory: newCategory.subCategory,
      displayName,
      isNew: true,
    };

    setAllowedCategories(prev => [...prev, entry]);
    setNewCategory({ category: '', subCategory: '', displayName: '' });
    setShowAddCategory(false);
    toast.success('Category added');
  };

  // Remove allowed category
  const handleRemoveCategory = (id: string) => {
    const entry = allowedCategories.find(e => e.id === id);
    if (entry && !entry.isNew) {
      setDeletedCategoryIds(prev => [...prev, id]);
    }
    setAllowedCategories(prev => prev.filter(e => e.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const baseMultiplierData: Omit<CardMultiplier, 'id' | 'LastUpdated' | 'ReferenceCardId'> = {
        Name: formData.Name.trim(),
        Category: formData.Category.trim(),
        SubCategory: formData.SubCategory.trim(),
        Description: formData.Description.trim(),
        Multiplier: parseFloat(formData.Multiplier),
        Requirements: formData.Requirements.trim(),
        Details: formData.Details.trim() || undefined,
        EffectiveFrom: formData.EffectiveFrom,
        EffectiveTo: normalizeEffectiveTo(formData.EffectiveTo),
        multiplierType: formData.multiplierType,
      };

      let multiplierId: string;

      if (isEdit && multiplier) {
        await ComponentService.updateMultiplier(multiplier.id, baseMultiplierData);
        multiplierId = multiplier.id;
      } else {
        const created = await ComponentService.createMultiplier({
          ReferenceCardId: referenceCardId,
          ...baseMultiplierData,
        });
        multiplierId = created.id;
      }

      // Save schedule entries for rotating type
      if (formData.multiplierType === MULTIPLIER_TYPES.ROTATING) {
        // Delete removed entries
        for (const id of deletedScheduleIds) {
          await ComponentService.deleteRotatingScheduleEntry(multiplierId, id);
        }
        // Create new entries
        for (const entry of scheduleEntries) {
          if (entry.isNew) {
            const { id, isNew, ...entryData } = entry;
            await ComponentService.createRotatingScheduleEntry(multiplierId, entryData);
          }
        }
      }

      // Save allowed categories for selectable type
      if (formData.multiplierType === MULTIPLIER_TYPES.SELECTABLE) {
        // Delete removed categories
        for (const id of deletedCategoryIds) {
          await ComponentService.deleteAllowedCategory(multiplierId, id);
        }
        // Create new categories
        for (const cat of allowedCategories) {
          if (cat.isNew) {
            const { id, isNew, ...catData } = cat;
            await ComponentService.createAllowedCategory(multiplierId, catData);
          }
        }
      }

      onSuccess();
      toast.success(isEdit ? 'Multiplier updated' : 'Multiplier created');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving multiplier:', err);
      toast.error('Failed to save multiplier: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'multiplier-modal-form';

  const getPeriodValueOptions = () => {
    if (newSchedule.periodType === SCHEDULE_PERIOD_TYPES.QUARTER) return QUARTER_OPTIONS;
    if (newSchedule.periodType === SCHEDULE_PERIOD_TYPES.MONTH) return MONTH_OPTIONS;
    if (newSchedule.periodType === SCHEDULE_PERIOD_TYPES.HALF_YEAR) {
      return [
        { value: '1', label: 'H1 (Jan - Jun)' },
        { value: '2', label: 'H2 (Jul - Dec)' },
      ];
    }
    return [];
  };

  const showPeriodValue = newSchedule.periodType !== SCHEDULE_PERIOD_TYPES.YEAR && newSchedule.periodType !== SCHEDULE_PERIOD_TYPES.CUSTOM;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Multiplier' : 'Add New Multiplier'}
      description={isEdit ? 'Update multiplier details' : 'Create a new multiplier for this card version'}
    >
      <form id={formId} onSubmit={handleSubmit} className="multiplier-modal-form">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setJsonImportModalOpen(true)}
          style={{ alignSelf: 'flex-start', marginBottom: '0.5rem' }}
        >
          <FileJson size={16} />
          Import from JSON
        </Button>

        {/* Multiplier Type Selector */}
        <div className="multiplier-type-section">
          <label className="section-label">Multiplier Type</label>
          <div className="type-options">
            {MULTIPLIER_TYPE_OPTIONS.map((option) => (
              <label key={option.value} className={`type-option ${formData.multiplierType === option.value ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="multiplierType"
                  value={option.value}
                  checked={formData.multiplierType === option.value}
                  onChange={(e) => setFormData({ ...formData, multiplierType: e.target.value as MultiplierType })}
                />
                <div className="type-content">
                  <span className="type-label">{option.label}</span>
                  <span className="type-description">{option.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <FormField
          label="Name"
          required
          value={formData.Name}
          onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
          error={errors.Name}
          placeholder="e.g., 3x on Dining"
        />

        {/* Category selection - only for standard type */}
        {formData.multiplierType === MULTIPLIER_TYPES.STANDARD && (
          <>
            <Select
              label="Category"
              required
              value={formData.Category}
              onChange={(value) => setFormData({ ...formData, Category: value, SubCategory: '' })}
              error={errors.Category}
              options={Object.keys(CATEGORIES).map(cat => ({ value: cat, label: cat }))}
            />

            {formData.Category && SUBCATEGORIES[formData.Category]?.length > 0 && (
              <Select
                label="Sub Category"
                value={formData.SubCategory}
                onChange={(value) => setFormData({ ...formData, SubCategory: value })}
                options={SUBCATEGORIES[formData.Category].map(sub => ({ value: sub, label: sub }))}
                clearable
              />
            )}
          </>
        )}

        {/* Rotating Schedule Section */}
        {formData.multiplierType === MULTIPLIER_TYPES.ROTATING && (
          <div className="rotating-schedule-section">
            <div className="section-header">
              <Calendar size={16} />
              <span>Rotating Schedule</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddSchedule(!showAddSchedule)}
              >
                <Plus size={14} />
                Add Period
              </Button>
            </div>

            {loadingExisting && <div className="loading-text">Loading schedule...</div>}

            {/* Year Filter */}
            {availableYears.length > 0 && (
              <div className="year-filter-row" style={{ marginBottom: '12px', maxWidth: '150px' }}>
                <Select
                  label="Filter by Year"
                  value={scheduleYearFilter === 'all' ? 'all' : String(scheduleYearFilter)}
                  onChange={(value) => setScheduleYearFilter(value === 'all' ? 'all' : Number(value))}
                  options={[
                    { value: 'all', label: 'All Years' },
                    ...availableYears.map(year => ({ value: String(year), label: String(year) }))
                  ]}
                />
              </div>
            )}

            {showAddSchedule && (
              <div className="add-entry-form">
                <div className="form-row">
                  <Select
                    label="Period Type"
                    value={newSchedule.periodType}
                    onChange={(value) => setNewSchedule({ ...newSchedule, periodType: value as SchedulePeriodType, periodValue: '' })}
                    options={[
                      { value: SCHEDULE_PERIOD_TYPES.QUARTER, label: 'Quarter' },
                      { value: SCHEDULE_PERIOD_TYPES.MONTH, label: 'Month' },
                      { value: SCHEDULE_PERIOD_TYPES.HALF_YEAR, label: 'Half Year' },
                      { value: SCHEDULE_PERIOD_TYPES.YEAR, label: 'Full Year' },
                    ]}
                  />
                  <Select
                    label="Year"
                    value={newSchedule.year}
                    onChange={(value) => setNewSchedule({ ...newSchedule, year: value })}
                    options={[
                      { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() },
                      { value: currentYear.toString(), label: currentYear.toString() },
                      { value: (currentYear + 1).toString(), label: (currentYear + 1).toString() },
                      { value: (currentYear + 2).toString(), label: (currentYear + 2).toString() },
                    ]}
                  />
                </div>
                {showPeriodValue && (
                  <Select
                    label={newSchedule.periodType === SCHEDULE_PERIOD_TYPES.QUARTER ? 'Quarter' : newSchedule.periodType === SCHEDULE_PERIOD_TYPES.MONTH ? 'Month' : 'Half'}
                    value={newSchedule.periodValue}
                    onChange={(value) => setNewSchedule({ ...newSchedule, periodValue: value })}
                    options={getPeriodValueOptions()}
                  />
                )}
                <Select
                  label="Category"
                  required
                  value={newSchedule.category}
                  onChange={(value) => setNewSchedule({ ...newSchedule, category: value, subCategory: '' })}
                  options={Object.keys(CATEGORIES).map(cat => ({ value: cat, label: cat }))}
                />
                {newSchedule.category && SUBCATEGORIES[newSchedule.category]?.length > 0 && (
                  <Select
                    label="Sub Category"
                    value={newSchedule.subCategory}
                    onChange={(value) => setNewSchedule({ ...newSchedule, subCategory: value })}
                    options={SUBCATEGORIES[newSchedule.category].map(sub => ({ value: sub, label: sub }))}
                    clearable
                  />
                )}
                <FormField
                  label="Title"
                  required
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  placeholder="e.g., Amazon.com purchases, Dining & Restaurants"
                />
                <div className="form-actions">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddSchedule(false)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={handleAddSchedule}>
                    Add Entry
                  </Button>
                </div>
              </div>
            )}

            {filteredAndSortedScheduleEntries.length > 0 ? (
              <div className="entries-list">
                {filteredAndSortedScheduleEntries.map((entry) => (
                  <div key={entry.id} className="entry-item">
                    <div className="entry-info">
                      <span className="entry-period">
                        {entry.periodType === 'quarter' && `Q${entry.periodValue}`}
                        {entry.periodType === 'month' && MONTH_OPTIONS[((entry.periodValue || 1) - 1)]?.label}
                        {entry.periodType === 'half_year' && `H${entry.periodValue}`}
                        {entry.periodType === 'year' && 'Full Year'}
                        {' '}{entry.year}
                      </span>
                      <span className="entry-title">{entry.title}</span>
                      <span className="entry-category">{entry.category}{entry.subCategory && ` > ${entry.subCategory}`}</span>
                      <span className="entry-dates">{entry.startDate} to {entry.endDate}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSchedule(entry.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              !showAddSchedule && !loadingExisting && (
                <div className="empty-entries">
                  {scheduleEntries.length > 0 && scheduleYearFilter !== 'all'
                    ? `No entries for ${scheduleYearFilter}. Select a different year or add a new period.`
                    : 'No schedule entries yet. Add periods to define when each category applies.'}
                </div>
              )
            )}
          </div>
        )}

        {/* Selectable Categories Section */}
        {formData.multiplierType === MULTIPLIER_TYPES.SELECTABLE && (
          <div className="selectable-categories-section">
            <div className="section-header">
              <ListChecks size={16} />
              <span>Allowed Categories</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddCategory(!showAddCategory)}
              >
                <Plus size={14} />
                Add Category
              </Button>
            </div>

            {loadingExisting && <div className="loading-text">Loading categories...</div>}

            {showAddCategory && (
              <div className="add-entry-form">
                <Select
                  label="Category"
                  required
                  value={newCategory.category}
                  onChange={(value) => {
                    const displayName = generateDisplayName(value, '');
                    setNewCategory({ ...newCategory, category: value, subCategory: '', displayName });
                  }}
                  options={Object.keys(CATEGORIES).map(cat => ({ value: cat, label: cat }))}
                />
                {newCategory.category && SUBCATEGORIES[newCategory.category]?.length > 0 && (
                  <Select
                    label="Sub Category (optional)"
                    value={newCategory.subCategory}
                    onChange={(value) => {
                      const displayName = generateDisplayName(newCategory.category, value);
                      setNewCategory({ ...newCategory, subCategory: value, displayName });
                    }}
                    options={SUBCATEGORIES[newCategory.category].map(sub => ({ value: sub, label: sub }))}
                    clearable
                  />
                )}
                <FormField
                  label="Display Name"
                  value={newCategory.displayName}
                  onChange={(e) => setNewCategory({ ...newCategory, displayName: e.target.value })}
                  placeholder="e.g., Gas Stations"
                  helperText="User-friendly name shown in dropdown"
                />
                <div className="form-actions">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCategory(false)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={handleAddCategory}>
                    Add Category
                  </Button>
                </div>
              </div>
            )}

            {allowedCategories.length > 0 ? (
              <div className="entries-list">
                {allowedCategories.map((cat) => (
                  <div key={cat.id} className="entry-item">
                    <div className="entry-info">
                      <span className="entry-display-name">{cat.displayName}</span>
                      <span className="entry-category">{cat.category}{cat.subCategory && ` > ${cat.subCategory}`}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCategory(cat.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              !showAddCategory && !loadingExisting && (
                <div className="empty-entries">No categories yet. Add options that users can choose from.</div>
              )
            )}

            {allowedCategories.length > 0 && (
              <div className="info-note">
                <Info size={14} />
                <span>The first category will be the default selection for new users.</span>
              </div>
            )}
          </div>
        )}

        <div className="textarea-wrapper">
          <label className="textarea-label">Description</label>
          <textarea
            required
            className={`textarea ${errors.Description ? 'textarea--error' : ''}`}
            value={formData.Description}
            onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
            placeholder="Describe when this multiplier applies..."
            rows={3}
          />
          {errors.Description && <span className="textarea-error">{errors.Description}</span>}
        </div>

        <FormField
          label="Multiplier (x)"
          required
          type="text"
          value={formData.Multiplier}
          onChange={(e) => setFormData({ ...formData, Multiplier: sanitizeNumericInput(e.target.value) })}
          error={errors.Multiplier}
          placeholder="e.g., 3"
          helperText="Enter the numeric value only (no 'x')."
        />

        <FormField
          label="Requirements"
          value={formData.Requirements}
          onChange={(e) => setFormData({ ...formData, Requirements: e.target.value })}
          placeholder="Any requirements or conditions"
        />

        <FormField
          label="Details (optional)"
          value={formData.Details}
          onChange={(e) => setFormData({ ...formData, Details: e.target.value })}
          placeholder="Additional details"
        />

        <DatePicker
          label="Effective From"
          required
          value={formData.EffectiveFrom}
          onChange={(value) => setFormData({ ...formData, EffectiveFrom: value })}
          error={errors.EffectiveFrom}
        />

        <DatePicker
          label="Effective To (optional)"
          value={formData.EffectiveTo}
          onChange={(value) => setFormData({ ...formData, EffectiveTo: value })}
          placeholder="Leave empty for ongoing"
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting || loadingExisting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting || loadingExisting}>
            {submitting ? 'Saving...' : loadingExisting ? 'Loading...' : isEdit ? 'Update Multiplier' : 'Create Multiplier'}
          </Button>
        </DialogFooter>
      </form>

      <JsonImportModal
        open={jsonImportModalOpen}
        onOpenChange={setJsonImportModalOpen}
        type="multiplier"
        onImport={handleJsonImport}
      />
    </Dialog>
  );
}
