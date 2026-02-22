import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { apiFetch } from '@/lib/api';

const CUISINES = [
  'North Indian',
  'South Indian',
  'Street Food',
  'Chinese',
  'Italian',
  'Mexican',
  'Japanese',
  'Pizza',
  'Burgers',
  'Biryani',
  'Mughlai',
  'Cafe',
  'Bakery',
  'Dessert',
  'Dhaba',
  'Desserts',
];

const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Non-Vegetarian',
  'Jain',
  'No Onion/Garlic',
];

const AMBIANCE = [
  'Casual',
  'Street',
  'Cozy',
  'Upscale',
  'Rooftop',
  'Lively',
  'Quiet',
  'Family-Friendly',
  'Romantic',
];

const SPICE_LEVELS = [
  { value: '1', label: 'Mild' },
  { value: '2', label: 'Slightly Spicy' },
  { value: '3', label: 'Medium' },
  { value: '4', label: 'Spicy' },
  { value: '5', label: 'Very Spicy' },
];

const PRICE_RANGES = [
  { value: 'budget', label: '₹ Budget' },
  { value: 'mid', label: '₹₹ Mid' },
  { value: 'upscale', label: '₹₹₹ Upscale' },
];

const MEAL_OCCASIONS = [
  { value: 'quick_lunch', label: 'Quick Lunch' },
  { value: 'date_night', label: 'Date Night' },
  { value: 'group_hangout', label: 'Group Hangout' },
  { value: 'family_meal', label: 'Family Meal' },
  { value: 'dinner', label: 'Dinner' },
];

function MultiSelectPills({ options, selected, onChange }) {
  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export default function PreferencesPage() {
  const { getToken } = useAuth();

  const [cuisines, setCuisines] = useState([]);
  const [spiceLevel, setSpiceLevel] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [ambiance, setAmbiance] = useState([]);
  const [mealOccasion, setMealOccasion] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(getToken, '/preferences');
      if (res.success && res.data) {
        const p = res.data;
        setCuisines(p.cuisines || []);
        setSpiceLevel(p.spiceLevel ? String(p.spiceLevel) : '');
        setPriceRange(p.priceRange || '');
        setDietaryRestrictions(p.dietRestrictions || []);
        setAmbiance(p.ambiance || []);
        setMealOccasion(p.mealOccasion || '');
      }
    } catch (error) {
      console.log('Failed top fetch preferences due to error', error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const markChanged = (setter) => (value) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!cuisines.length) {
      toast.error('Please select at least one cuisine');
      return;
    }
    if (!mealOccasion) {
      toast.error('Please select a meal occasion');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch(getToken, '/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuisines,
          spiceLevel: spiceLevel ? parseInt(spiceLevel) : 3,
          priceRange: priceRange || 'mid',
          ambiance,
          mealOccasion,
          dietRestrictions: dietaryRestrictions,
        }),
      });

      if (res.success) {
        setHasChanges(false);
        toast.success('Preferences saved successfully!');
      } else {
        toast.error(res.message || 'Failed to save preferences');
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toaster richColors />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Preferences
        </h1>
        <p className="text-gray-600">
          Set your dining preferences to get personalized recommendations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dining Preferences</CardTitle>
          <CardDescription>
            Customize your preferences to help us find the perfect places for
            you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Cuisines — multi */}
          <div className="space-y-3">
            <Label>Preferred Cuisines</Label>
            <MultiSelectPills
              options={CUISINES}
              selected={cuisines}
              onChange={markChanged(setCuisines)}
            />
          </div>

          {/* Dietary Restrictions — multi */}
          <div className="space-y-3">
            <Label>Dietary Restrictions</Label>
            <MultiSelectPills
              options={DIETARY_RESTRICTIONS}
              selected={dietaryRestrictions}
              onChange={markChanged(setDietaryRestrictions)}
            />
          </div>

          {/* Ambiance — multi */}
          <div className="space-y-3">
            <Label>Ambiance</Label>
            <MultiSelectPills
              options={AMBIANCE}
              selected={ambiance}
              onChange={markChanged(setAmbiance)}
            />
          </div>

          {/* Single selects row */}
          <div className="grid sm:grid-cols-3 gap-6">
            {/* Spice Level */}
            <div className="space-y-2">
              <Label>Spice Level</Label>
              <Select
                value={spiceLevel}
                onValueChange={markChanged(setSpiceLevel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select spice level" />
                </SelectTrigger>
                <SelectContent>
                  {SPICE_LEVELS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label>Price Range</Label>
              <Select
                value={priceRange}
                onValueChange={markChanged(setPriceRange)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select price range" />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_RANGES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Meal Occasion */}
            <div className="space-y-2">
              <Label>Meal Occasion</Label>
              <Select
                value={mealOccasion}
                onValueChange={markChanged(setMealOccasion)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_OCCASIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
