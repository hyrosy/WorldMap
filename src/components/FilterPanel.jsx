'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import clsx from 'clsx';
import { Input } from "@/components/ui/input";
import { Search, X } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FilterPanel = ({ isOpen, onClose, filterData, onFilter, onReset, allPins, onSearchResultSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSubs, setSelectedSubs] = useState({});

  // FIX #1: Called the state setter 'setSelectedSubs' instead of the state variable 'selectedSubs'.
  const handleSubcategoryChange = (mainCat, subCat) => {
    setSelectedSubs(prev => {
      const currentSubs = prev[mainCat] || [];
      if (currentSubs.includes(subCat)) {
        // Remove the subcategory if it's already selected
        return { ...prev, [mainCat]: currentSubs.filter(s => s !== subCat) };
      } else {
        // Add the subcategory if it's not selected
        return { ...prev, [mainCat]: [...currentSubs, subCat] };
      }
    });
  };

  // Handle search input changes
  useEffect(() => {
    if (searchTerm.length > 1) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const results = allPins.filter(pin => {
            const titleMatch = pin.title.rendered.toLowerCase().includes(lowerCaseSearchTerm);
            const contentMatch = (pin.acf?.description || '')
                .toLowerCase()
                .includes(lowerCaseSearchTerm);

            return titleMatch || contentMatch;
        });
        setSearchResults(results);
    } else {
        setSearchResults([]);
    }
}, [searchTerm, allPins]);

  const handleApplyFilter = () => {
    onFilter(selectedSubs);
    onClose();
  };

  const handleFullReset = () => {
    setSelectedSubs({}); // Reset the selections
    onReset(); // Call the parent's reset function
  };

  const handleResultClick = (pin) => {
    onSearchResultSelect(pin);
    setSearchTerm('');
    setSearchResults([]);
    onClose();
  };

  const panelClasses = clsx(
    'fixed top-0 left-0 w-96 h-full bg-black/80 backdrop-blur-md text-white shadow-2xl z-[1001] flex flex-col transition-transform duration-500 ease-in-out',
    isOpen ? 'translate-x-0' : '-translate-x-full'
  );

  return (
    <div className={panelClasses}>

      {/* Panel Header */}
      <div className="flex justify-between items-center p-4 bg-black/30 border-b border-gray-700">
        <h2 className="text-xl font-bold">Filter Experiences</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
            <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search for a location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 bg-gray-800 border-gray-700 rounded-lg focus:ring-cyan-400"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg z-10 max-h-60 overflow-y-auto">
              {searchResults.map(pin => (
                <div
                  key={pin.id}
                  onClick={() => handleResultClick(pin)}
                  className="p-3 hover:bg-gray-700 cursor-pointer text-sm"
                >
                  {pin.title.rendered}
                </div>
              ))}
            </div>
          )}
        </div>

        <h3 className="text-md font-semibold mb-2 text-gray-300">Filter by Category</h3>
        
        {/* FIX #2: Added a check to make sure filterData exists before trying to map over it. */}
        {Object.keys(filterData).length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {Object.entries(filterData).map(([mainCat, subCats]) => (
              <AccordionItem key={mainCat} value={mainCat}>
                <AccordionTrigger className="text-white hover:no-underline">{mainCat}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 p-2">
                    {subCats.map(subCat => (
                      <button
                        key={subCat}
                        onClick={() => handleSubcategoryChange(mainCat, subCat)}
                        className={`p-2 text-sm rounded-md transition-colors ${selectedSubs[mainCat]?.includes(subCat) ? 'bg-cyan-500 text-black' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        {subCat}
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">Loading categories...</p>
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-4 border-t border-gray-700 bg-black/30 flex gap-4">
        {/* FIX #3: Corrected onClick to call the right function name: handleFullReset */}
        <Button variant="outline" onClick={handleFullReset} className="w-1/3 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">Reset</Button>
        {/* FIX #4: Corrected onClick to call the right function name: handleApplyFilter */}
        <Button onClick={handleApplyFilter} className="w-2/3 bg-cyan-600 hover:bg-cyan-500 text-white">Apply Filters</Button>
      </div>
    </div>
  );
};

export default FilterPanel;