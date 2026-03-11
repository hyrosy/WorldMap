import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  MapPin,
} from "lucide-react-native";

// --- HOYOVERSE THEME CATEGORY ICONS ---
// We bring this here so the filter panel can render the exact map pins
const categoryIconMap = {
  Activities: "adventure1.png",
  Experiences: "adventure.png",
  Restaurants: "food.png",
  "Food & Cooking": "cooking-class.png",
  Monuments: "monuments.png",
  "Books & Guides": "tales.png",
  Shops: "shopping.png",
  "Fashion & Accessories": "shopping.png",
  "Home Decor": "pottery-class.png",
  Hotels: "building.png",
  "Home & Lifestyle": "artisan-class.png",
  Transport: "quad-bike.png",
  Health: "a-craftsman.png",
  Nature: "camel-ride.png",
  Services: "workshops.png",
  Nightlife: "food.png",
  Wellness: "a-craftsman.png",
};

// Custom Genshin-Style Accordion Item
const AccordionItem = ({
  mainCat,
  subCats,
  selectedSubs,
  onSubcategoryChange,
}) => {
  // Default to open for a better user experience (like the game)
  const [isOpen, setIsOpen] = useState(true);

  return (
    <View className="mb-4 bg-[#2e3142] border border-[#3b3e52] rounded-2xl overflow-hidden shadow-sm">
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row justify-between items-center p-4 active:bg-[#3b3e52] transition-colors"
      >
        <Text className="text-white font-black tracking-wide">{mainCat}</Text>
        {isOpen ? (
          <ChevronDown size={20} color="#d3bc8e" />
        ) : (
          <ChevronRight size={20} color="#6b7280" />
        )}
      </TouchableOpacity>

      {isOpen && (
        <View className="flex-row flex-wrap p-3 pt-0 gap-2 border-t border-[#3b3e52] bg-[#1c1d28]/50 mt-1">
          {subCats.map((subCat) => {
            const isSelected = selectedSubs[mainCat]?.includes(subCat);
            const iconFileName = categoryIconMap[subCat] || "placeholder.png";

            return (
              <TouchableOpacity
                key={subCat}
                onPress={() => onSubcategoryChange(mainCat, subCat)}
                className={`w-[31%] aspect-square rounded-xl border flex-col items-center justify-center p-2 active:scale-95 transition-all ${
                  isSelected
                    ? "bg-[#d3bc8e]/10 border-[#d3bc8e] shadow-[0_0_15px_rgba(211,188,142,0.15)]"
                    : "bg-[#1c1d28] border-[#3b3e52] hover:border-[#6b7280]"
                }`}
              >
                <Image
                  source={{ uri: `/pin-icons/${iconFileName}` }}
                  className={`w-8 h-8 mb-2 ${
                    isSelected ? "opacity-100" : "opacity-60"
                  }`}
                  resizeMode="contain"
                />
                <Text
                  className={`text-center font-bold text-[10px] leading-tight ${
                    isSelected ? "text-[#d3bc8e]" : "text-gray-400"
                  }`}
                  numberOfLines={2}
                >
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

const FilterPanel = ({
  isOpen,
  onClose,
  filterData,
  onFilter,
  onReset,
  allPins,
  onSearchResultSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSubs, setSelectedSubs] = useState({});

  const handleSubcategoryChange = (mainCat, subCat) => {
    setSelectedSubs((prev) => {
      const currentSubs = prev[mainCat] || [];
      if (currentSubs.includes(subCat)) {
        return { ...prev, [mainCat]: currentSubs.filter((s) => s !== subCat) };
      } else {
        return { ...prev, [mainCat]: [...currentSubs, subCat] };
      }
    });
  };

  useEffect(() => {
    if (searchTerm.length > 1 && allPins) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const results = allPins.filter((pin) => {
        const pinTitle = pin.name || (pin.title && pin.title.rendered) || "";
        const titleMatch = pinTitle.toLowerCase().includes(lowerCaseSearchTerm);

        const pinDesc =
          pin.description || (pin.acf && pin.acf.description) || "";
        const contentMatch = pinDesc
          .toLowerCase()
          .includes(lowerCaseSearchTerm);

        return titleMatch || contentMatch;
      });
      setSearchResults(results.slice(0, 6)); // Limit results for cleaner UI
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
    setSearchTerm("");
    setSearchResults([]);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Background Overlay */}
        <View className="flex-1 justify-end bg-black/60 backdrop-blur-sm flex-row">
          <TouchableOpacity className="flex-1" onPress={onClose} />

          {/* Slide-in Panel */}
          <SafeAreaView className="w-[85%] max-w-sm h-full bg-[#1c1d28] shadow-2xl flex-col border-l border-[#3b3e52]">
            {/* Header */}
            <View className="flex-row justify-between items-center p-6 bg-[#1c1d28] border-b border-[#3b3e52]">
              <Text className="text-2xl font-black text-white tracking-tight">
                Markers
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 bg-[#2e3142] rounded-full border border-[#3b3e52] hover:bg-[#3b3e52]"
              >
                <X size={20} color="#d3bc8e" />
              </TouchableOpacity>
            </View>

            {/* Main Scrollable Content */}
            <ScrollView
              className="flex-1 px-5 pt-5 bg-[#1c1d28]"
              showsVerticalScrollIndicator={false}
            >
              {/* Search Bar */}
              <View className="relative mb-6 z-10">
                <View className="flex-row items-center bg-[#2e3142] border border-[#3b3e52] rounded-xl px-4 h-14 focus-within:border-[#d3bc8e] transition-colors shadow-sm">
                  <Search size={20} color="#d3bc8e" className="mr-3" />
                  <TextInput
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Search specific place..."
                    placeholderTextColor="#6b7280"
                    className="flex-1 text-white text-base font-medium"
                  />
                </View>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <View className="absolute top-[60px] left-0 right-0 bg-[#2e3142] border border-[#3b3e52] rounded-xl overflow-hidden shadow-2xl z-50">
                    <ScrollView
                      nestedScrollEnabled={true}
                      style={{ maxHeight: 240 }}
                    >
                      {searchResults.map((pin) => {
                        const pinTitle =
                          pin.name ||
                          (pin.title && pin.title.rendered) ||
                          "Unnamed Location";
                        return (
                          <TouchableOpacity
                            key={pin.id}
                            onPress={() => handleResultClick(pin)}
                            className="p-4 border-b border-[#3b3e52] flex-row items-center hover:bg-[#3b3e52] active:bg-[#3b3e52] transition-colors"
                          >
                            <View className="bg-[#1c1d28] border border-[#d3bc8e]/50 p-2 rounded-full mr-3">
                              <MapPin size={16} color="#d3bc8e" />
                            </View>
                            <View>
                              <Text className="text-white text-sm font-bold">
                                {pinTitle}
                              </Text>
                              {/* FIXED THE TAG HERE */}
                              <Text className="text-[#d3bc8e] text-[10px] font-bold uppercase tracking-wider mt-0.5">
                                {pin.category}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              <Text className="text-xs font-black text-[#d3bc8e] mb-3 uppercase tracking-widest pl-1 border-b border-[#3b3e52] pb-2">
                Filter by Category
              </Text>

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
                <Text className="text-gray-500 italic text-center py-6">
                  Loading categories...
                </Text>
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View className="p-5 bg-[#1c1d28] border-t border-[#3b3e52] flex-row gap-3 mt-auto pb-8">
              <TouchableOpacity
                onPress={handleFullReset}
                className="flex-1 bg-[#2e3142] border border-[#3b3e52] h-14 rounded-xl items-center justify-center active:bg-[#3b3e52] transition-colors"
              >
                <Text className="text-[#d3bc8e] font-bold text-base tracking-wide">
                  Clear
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApplyFilter}
                className="flex-[2] bg-[#e6ce9a] active:bg-[#d3bc8e] h-14 rounded-xl items-center justify-center shadow-[0_0_15px_rgba(230,206,154,0.3)] transition-all"
              >
                <Text className="text-[#1c1d28] font-black text-base tracking-wide">
                  Apply Filters
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default FilterPanel;
