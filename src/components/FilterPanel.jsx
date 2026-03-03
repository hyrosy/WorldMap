import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react-native';

// Custom Native Accordion Item
const AccordionItem = ({ mainCat, subCats, selectedSubs, onSubcategoryChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View className="mb-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <TouchableOpacity 
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row justify-between items-center p-4 active:bg-gray-800"
      >
        <Text className="text-white font-bold">{mainCat}</Text>
        {isOpen ? <ChevronDown size={20} color="#9ca3af" /> : <ChevronRight size={20} color="#9ca3af" />}
      </TouchableOpacity>
      
      {isOpen && (
        <View className="flex-row flex-wrap p-3 pt-0 gap-2 border-t border-gray-800 bg-gray-900/50">
          {subCats.map(subCat => {
            const isSelected = selectedSubs[mainCat]?.includes(subCat);
            return (
              <TouchableOpacity
                key={subCat}
                onPress={() => onSubcategoryChange(mainCat, subCat)}
                className={`px-4 py-2.5 rounded-lg border flex-grow active:scale-[0.98] ${
                    isSelected 
                        ? 'bg-cyan-500 border-cyan-400' 
                        : 'bg-gray-800 border-gray-700 active:bg-gray-700'
                }`}
              >
                <Text className={`text-center font-bold text-sm ${isSelected ? 'text-gray-900' : 'text-gray-300'}`}>
                  {subCat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const FilterPanel = ({ isOpen, onClose, filterData, onFilter, onReset, allPins, onSearchResultSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSubs, setSelectedSubs] = useState({});

  const handleSubcategoryChange = (mainCat, subCat) => {
    setSelectedSubs(prev => {
      const currentSubs = prev[mainCat] || [];
      if (currentSubs.includes(subCat)) {
        return { ...prev, [mainCat]: currentSubs.filter(s => s !== subCat) };
      } else {
        return { ...prev, [mainCat]: [...currentSubs, subCat] };
      }
    });
  };

  useEffect(() => {
    if (searchTerm.length > 1 && allPins) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const results = allPins.filter(pin => {
            // Using Supabase field 'name' or fallback to WP 'title.rendered' if mixed
            const pinTitle = pin.name || (pin.title && pin.title.rendered) || '';
            const titleMatch = pinTitle.toLowerCase().includes(lowerCaseSearchTerm);
            
            const pinDesc = pin.description || (pin.acf && pin.acf.description) || '';
            const contentMatch = pinDesc.toLowerCase().includes(lowerCaseSearchTerm);

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
    setSelectedSubs({});
    onReset(); 
  };

  const handleResultClick = (pin) => {
    onSearchResultSelect(pin);
    setSearchTerm('');
    setSearchResults([]);
    onClose();
  };

  return (
    <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
    >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            {/* Background Overlay */}
            <View className="flex-1 justify-end bg-black/70 flex-row">
                <TouchableOpacity className="flex-1" onPress={onClose} />
                
                {/* Slide-in Panel */}
                <SafeAreaView className="w-[85%] max-w-sm h-full bg-gray-900 shadow-2xl flex-col border-l border-gray-800 pt-10">
                    
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-5 bg-black border-b border-gray-800">
                        <Text className="text-xl font-bold text-white tracking-wide">Filter Experiences</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-800 rounded-full">
                            <X size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Main Scrollable Content */}
                    <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
                        
                        {/* Search Bar */}
                        <View className="relative mb-6 z-10">
                            <View className="flex-row items-center bg-gray-800 border border-gray-700 rounded-xl px-4 h-14">
                                <Search size={20} color="#9ca3af" className="mr-3" />
                                <TextInput
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                    placeholder="Search for a location..."
                                    placeholderTextColor="#6b7280"
                                    className="flex-1 text-white text-base"
                                />
                            </View>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <View className="absolute top-[60px] left-0 right-0 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl max-h-60 z-50">
                                    <ScrollView nestedScrollEnabled={true}>
                                        {searchResults.map(pin => {
                                            const pinTitle = pin.name || (pin.title && pin.title.rendered) || 'Unnamed Location';
                                            return (
                                                <TouchableOpacity
                                                    key={pin.id}
                                                    onPress={() => handleResultClick(pin)}
                                                    className="p-4 border-b border-gray-700 active:bg-gray-700"
                                                >
                                                    <Text className="text-white text-base font-medium">{pinTitle}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <Text className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Filter by Category</Text>
                        
                        {/* Categories Accordion */}
                        {filterData && Object.keys(filterData).length > 0 ? (
                            <View className="pb-6">
                                {Object.entries(filterData).map(([mainCat, subCats]) => (
                                    <AccordionItem 
                                        key={mainCat} 
                                        mainCat={mainCat} 
                                        subCats={subCats} 
                                        selectedSubs={selectedSubs}
                                        onSubcategoryChange={handleSubcategoryChange}
                                    />
                                ))}
                            </View>
                        ) : (
                            <Text className="text-gray-500 italic text-center py-6">Loading categories...</Text>
                        )}
                    </ScrollView>

                    {/* Footer Actions */}
                    <View className="p-5 bg-black border-t border-gray-800 flex-row gap-3 mt-auto pb-8">
                        <TouchableOpacity 
                            onPress={handleFullReset}
                            className="flex-1 bg-gray-800 border border-gray-700 h-14 rounded-xl items-center justify-center active:bg-gray-700"
                        >
                            <Text className="text-white font-bold text-base">Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={handleApplyFilter}
                            className="flex-[2] bg-cyan-600 active:bg-cyan-700 h-14 rounded-xl items-center justify-center shadow-lg"
                        >
                            <Text className="text-white font-bold text-base">Apply Filters</Text>
                        </TouchableOpacity>
                    </View>

                </SafeAreaView>
            </View>
        </KeyboardAvoidingView>
    </Modal>
  );
};

export default FilterPanel;