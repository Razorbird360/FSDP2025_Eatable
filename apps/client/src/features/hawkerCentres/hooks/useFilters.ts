import { useState } from 'react';

export const useFilters = () => {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['All']);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>(['All']);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [prepTime, setPrepTime] = useState([30]);

  const cuisines = ['All', 'Chinese', 'Malay', 'Indian', 'Western', 'Japanese', 'Vegetarian'];
  const priceRanges = ['All', 'Under $5', '$5 - $10', '$10 - $15', 'Above $15'];
  const dietary = ['Halal', 'Vegetarian', 'Vegan', 'Gluten-Free', 'No Pork'];

  const sortByOriginalOrder = (items: string[], originalArray: string[]): string[] => {
    return [...items].sort((a, b) => {
      const indexA = originalArray.indexOf(a);
      const indexB = originalArray.indexOf(b);
      return indexA - indexB;
    });
  };

  const toggleSelection = (
    item: string,
    selected: string[],
    setSelected: (items: string[]) => void,
    hasAll: boolean = true,
    originalArray?: string[]
  ) => {
    if (item === 'All') {
      setSelected(['All']);
    } else {
      const newSelection = selected.includes(item)
        ? selected.filter((i) => i !== item)
        : [...selected.filter((i) => i !== 'All'), item];

      const finalSelection = newSelection.length === 0 && hasAll ? ['All'] : newSelection;

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
    setPrepTime([30]);
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
    if (prepTime[0] !== 30) count += 1;
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
