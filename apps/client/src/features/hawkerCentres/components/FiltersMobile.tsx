import { useState } from 'react';
import { Button, Drawer, Accordion, Slider, CloseButton, Portal } from '@chakra-ui/react';
import { ChevronsDown } from 'lucide-react';
import { useFilters } from '../hooks/useFilters';

type FiltersMobileProps = {
  filters?: ReturnType<typeof useFilters>;
};

const FiltersMobile = ({ filters }: FiltersMobileProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
    getActiveFilterCount,
  } = filters ?? fallbackFilters;
  const prepTimeLabel =
    prepTime[0] === 0 ? 'None' : prepTime[0] >= 20 ? '20+ min' : `${prepTime[0]} min`;

  const activeCount = getActiveFilterCount();

  const handleApply = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed left-4 right-4 z-40 bg-brand text-white py-4 px-6 rounded-xl font-bold text-base shadow-lg flex items-center justify-between font-sans transition-all duration-300 ${
          isOpen ? '-bottom-20 opacity-0' : 'bottom-4 opacity-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <ChevronsDown className="w-5 h-5 rotate-180 text-white" aria-hidden="true" />
          <span>Filters</span>
        </div>
        {activeCount > 0 && (
          <span className="bg-white text-brand rounded-full px-3 py-1 text-sm font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {/* Drawer Panel */}
      <Drawer.Root
        open={isOpen}
        onOpenChange={(e) => setIsOpen(e.open)}
        placement="bottom"
        size="full"
      >
        <Portal>
          <Drawer.Backdrop className="backdrop-blur-sm transition-opacity duration-700" />
          <Drawer.Positioner className="transition-all duration-700">
            <Drawer.Content
              className="font-sans transition-transform duration-700 ease-in-out"
              roundedTop="2xl"
              style={{ opacity: 1 }}
            >
              {/* Header */}
              <Drawer.Header className="flex justify-between items-start border-b pb-4 pt-6">
                <Drawer.Title className="text-3xl font-bold text-brand leading-none">Filters</Drawer.Title>
                <Drawer.CloseTrigger asChild>
                  <CloseButton size="lg" className="leading-none mt-1" />
                </Drawer.CloseTrigger>
              </Drawer.Header>

              {/* Body */}
              <Drawer.Body className="overflow-y-auto">
                <Accordion.Root collapsible className="w-full">
                  {/* Cuisine Accordion */}
                  <Accordion.Item value="cuisine" className="border-b">
                    <Accordion.ItemTrigger className="w-full py-5 flex justify-between items-center text-left">
                      <span className="text-lg font-semibold text-gray-900">Cuisine</span>
                      <div className="flex items-center gap-2">
                        {selectedCuisines.length > 0 && !selectedCuisines.includes('All') && (
                          <span className="text-base text-brand font-bold break-words max-w-[140px] text-right leading-none">
                            {selectedCuisines.join(', ')}
                          </span>
                        )}
                        <Accordion.ItemIndicator className="text-gray-600 text-2xl flex-shrink-0 leading-none">›</Accordion.ItemIndicator>
                      </div>
                    </Accordion.ItemTrigger>
                  <Accordion.ItemContent className="pb-4">
                    <div className="flex flex-wrap gap-2">
                      {cuisines.map((cuisine) => (
                        <button
                          key={cuisine}
                          onClick={() => toggleSelection(cuisine, selectedCuisines, setSelectedCuisines, true, cuisines)}
                          className={`px-5 py-2.5 rounded-full text-base transition-colors ${
                            selectedCuisines.includes(cuisine)
                              ? 'bg-brand text-white font-bold border-2 border-brand'
                              : 'bg-transparent text-gray-700 border border-brand'
                          }`}
                        >
                          {cuisine}
                        </button>
                      ))}
                    </div>
                  </Accordion.ItemContent>
                </Accordion.Item>

                  {/* Price Range Accordion */}
                  <Accordion.Item value="price" className="border-b">
                    <Accordion.ItemTrigger className="w-full py-5 flex justify-between items-center text-left">
                      <span className="text-lg font-semibold text-gray-900">Price range</span>
                      <div className="flex items-center gap-2">
                        {selectedPriceRanges.length > 0 && !selectedPriceRanges.includes('All') && (
                          <span className="text-base text-brand font-bold break-words max-w-[140px] text-right leading-none">
                            {selectedPriceRanges.join(', ')}
                          </span>
                        )}
                        <Accordion.ItemIndicator className="text-gray-600 text-2xl flex-shrink-0 leading-none">›</Accordion.ItemIndicator>
                      </div>
                    </Accordion.ItemTrigger>
                  <Accordion.ItemContent className="pb-4">
                    <div className="flex flex-wrap gap-2">
                      {priceRanges.map((range) => (
                        <button
                          key={range}
                          onClick={() => toggleSelection(range, selectedPriceRanges, setSelectedPriceRanges, true, priceRanges)}
                          className={`px-5 py-2.5 rounded-full text-base transition-colors ${
                            selectedPriceRanges.includes(range)
                              ? 'bg-brand text-white font-bold border-2 border-brand'
                              : 'bg-transparent text-gray-700 border border-brand'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </Accordion.ItemContent>
                </Accordion.Item>

                  {/* Dietary Accordion */}
                  <Accordion.Item value="dietary" className="border-b">
                    <Accordion.ItemTrigger className="w-full py-5 flex justify-between items-center text-left">
                      <span className="text-lg font-semibold text-gray-900">Dietary</span>
                      <div className="flex items-center gap-2">
                        {selectedDietary.length > 0 && (
                          <span className="text-base text-brand font-bold break-words max-w-[140px] text-right leading-none">
                            {selectedDietary.join(', ')}
                          </span>
                        )}
                        <Accordion.ItemIndicator className="text-gray-600 text-2xl flex-shrink-0 leading-none">›</Accordion.ItemIndicator>
                      </div>
                    </Accordion.ItemTrigger>
                  <Accordion.ItemContent className="pb-4">
                    <div className="flex flex-wrap gap-2">
                      {dietary.map((option) => (
                        <button
                          key={option}
                          onClick={() => toggleSelection(option, selectedDietary, setSelectedDietary, false, dietary)}
                          className={`px-5 py-2.5 rounded-full text-base transition-colors ${
                            selectedDietary.includes(option)
                              ? 'bg-brand text-white font-bold border-2 border-brand'
                              : 'bg-transparent text-gray-700 border border-brand'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </Accordion.ItemContent>
                </Accordion.Item>
              </Accordion.Root>

                {/* Max Prep Time */}
                <div className="py-6 border-b">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-brand">Max prep time</span>
                    <span className="text-lg font-bold text-brand">{prepTimeLabel}</span>
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
                    <Slider.Thumb
                      index={0}
                      bg="white"
                      borderColor="#21421B"
                      borderWidth="2px"
                      boxSize={6}
                    />
                  </Slider.Control>
                </Slider.Root>
              </div>
              </Drawer.Body>

              {/* Footer */}
              <Drawer.Footer className="flex gap-3 border-t pt-4 sticky bottom-0 bg-white">
              <Button
                onClick={clearAllFilters}
                variant="outline"
                flex="1"
                borderColor="#21421B"
                borderWidth="2px"
                color="#21421B"
                fontWeight="bold"
                fontSize="base"
                padding="6"
                borderRadius="2xl"
                _hover={{ bg: 'gray.50' }}
              >
                Clear all
              </Button>
              <Button
                onClick={handleApply}
                flex="1"
                bg="#21421B"
                color="white"
                fontWeight="bold"
                fontSize="base"
                padding="6"
                borderRadius="2xl"
                borderColor="#21421B"
                borderWidth="2px"
                _hover={{ bg: '#2d5a24' }}
              >
                Apply {activeCount > 0 && `(${activeCount})`}
              </Button>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </>
  );
};

export default FiltersMobile;
