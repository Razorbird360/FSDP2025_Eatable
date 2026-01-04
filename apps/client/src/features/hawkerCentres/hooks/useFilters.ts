import { useState } from 'react';

export type PriceRange = 'All' | 'Under $5' | '$5 - $10' | '$10 - $15' | 'Above $15';

export const useFilters = () => {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['All']);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<PriceRange[]>(['All']);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [prepTime, setPrepTime] = useState([0]);

  const cuisines = ['All', 'Chinese', 'Malay', 'Indian', 'Western', 'Japanese', 'Vegetarian'];
  const priceRanges = ['All', 'Under $5', '$5 - $10', '$10 - $15', 'Above $15'] as const;
  const dietary = ['Halal', 'Vegetarian', 'Vegan', 'Gluten-Free', 'No Pork'];

  const sortByOriginalOrder = <T extends string>(items: T[], originalArray: T[]): T[] => {
    return [...items].sort((a, b) => {
      const indexA = originalArray.indexOf(a);
      const indexB = originalArray.indexOf(b);
      return indexA - indexB;
    });
  };

  const toggleSelection = <T extends string>(
    item: T,
    selected: T[],
    setSelected: (items: T[]) => void,
    hasAll: boolean = true,
    originalArray?: T[]
  ) => {
    if (item === 'All') {
      setSelected(['All' as T]);
    } else {
      const newSelection = selected.includes(item)
        ? selected.filter((i) => i !== item)
        : [...selected.filter((i) => i !== 'All'), item];

      const finalSelection = newSelection.length === 0 && hasAll
        ? (['All' as T])
        : newSelection;

      // Sort by original array order if provided
      if (originalArray && finalSelection[0] !== 'All') {
        const sortedSelection = sortByOriginalOrder(finalSelection, originalArray);
        setSelected(sortedSelection);
      } else {
        setSelected(finalSelection);
      }
    }
  };

  const clearAllFilters = () => {
    setSelectedCuisines(['All']);
    setSelectedPriceRanges(['All']);
    setSelectedDietary([]);
    setPrepTime([0]);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (!selectedCuisines.includes('All') || selectedCuisines.length > 1) {
      count += selectedCuisines.filter(c => c !== 'All').length;
    }
    if (!selectedPriceRanges.includes('All') || selectedPriceRanges.length > 1) {
      count += selectedPriceRanges.filter(p => p !== 'All').length;
    }
    count += selectedDietary.length;
    if (prepTime[0] > 0 && prepTime[0] < 20) count += 1;
    return count;
  };

  return {
    cuisines,
    priceRanges,
    dietary,
    selectedCuisines,
    setSelectedCuisines,
    selectedPriceRanges,
    setSelectedPriceRanges,
    selectedDietary,
    setSelectedDietary,
    prepTime,
    setPrepTime,
    toggleSelection,
    clearAllFilters,
    getActiveFilterCount,
  };
};
