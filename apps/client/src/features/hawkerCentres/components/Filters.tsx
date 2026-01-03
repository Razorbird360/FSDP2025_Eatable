import { Button } from '@chakra-ui/react';
import { Slider } from '@chakra-ui/react';
import { useFilters } from '../hooks/useFilters';

type FiltersProps = {
  filters?: ReturnType<typeof useFilters>;
};

const Filters = ({ filters }: FiltersProps) => {
  const fallbackFilters = useFilters();
  const {
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
  } = filters ?? fallbackFilters;
  const prepTimeLabel =
    prepTime[0] === 0 ? 'None' : prepTime[0] >= 20 ? '20+ min' : `${prepTime[0]} min`;

  return (
    <div className="bg-white rounded-lg p-4 shadow-lg font-sans border border-black border-opacity-20">
      {/* Filters Title */}
      <h2 className="text-base font-bold text-brand mb-6">Filters</h2>

      {/* Cuisine Section */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-700 mb-3">Cuisine</h3>
        <div className="flex flex-wrap gap-1.5">
          {cuisines.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => toggleSelection(cuisine, selectedCuisines, setSelectedCuisines, true, cuisines)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                selectedCuisines.includes(cuisine)
                  ? 'bg-brand text-white font-bold border-2 border-brand'
                  : 'bg-transparent text-gray-700 border border-brand hover:bg-brand hover:bg-opacity-5'
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Section */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-700 mb-3">Price range</h3>
        <div className="flex flex-wrap gap-1.5">
          {priceRanges.map((range) => (
            <button
              key={range}
              onClick={() => toggleSelection(range, selectedPriceRanges, setSelectedPriceRanges, true, priceRanges)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                selectedPriceRanges.includes(range)
                  ? 'bg-brand text-white font-bold border-2 border-brand'
                  : 'bg-transparent text-gray-700 border border-brand hover:bg-brand hover:bg-opacity-5'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary Section */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-700 mb-3">Dietary</h3>
        <div className="flex flex-wrap gap-1.5">
          {dietary.map((option) => (
            <button
              key={option}
              onClick={() => toggleSelection(option, selectedDietary, setSelectedDietary, false, dietary)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                selectedDietary.includes(option)
                  ? 'bg-brand text-white font-bold border-2 border-brand'
                  : 'bg-transparent text-gray-700 border border-brand hover:bg-brand hover:bg-opacity-5'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Max Prep Time Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-brand">Max prep time</h3>
          <span className="text-xs text-gray-700">{prepTimeLabel}</span>
        </div>
        <Slider.Root
          defaultValue={[0]}
          min={0}
          max={20}
          step={2}
          value={prepTime}
          onValueChange={(details) => setPrepTime(details.value)}
          colorPalette="green"
        >
          <Slider.Control>
            <Slider.Track bg="gray.200">
              <Slider.Range bg="#21421B" />
            </Slider.Track>
            <Slider.Thumb index={0} bg="white" borderColor="#21421B" borderWidth="2px" />
          </Slider.Control>
        </Slider.Root>
      </div>

      {/* Clear All Filters Button */}
      <Button
        onClick={clearAllFilters}
        variant="outline"
        width="full"
        borderColor="gray.400"
        borderWidth="2px"
        borderRadius="xl"
        color="gray.700"
        fontWeight="bold"
        fontSize="sm"
        padding="2"
        _hover={{ bg: '#21421B', color: 'white', borderColor: '#21421B' }}
      >
        Clear all filters
      </Button>
    </div>
  );
};

export default Filters;
