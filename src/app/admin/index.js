import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  MessageSquare,
  MapPin,
  ArrowLeft,
  Trash2,
  Edit,
  Route,
  Plus,
  X,
  Check,
  Search,
  DownloadCloud,
  CheckSquare,
  Square,
  Star,
  Image as ImageIcon,
  RefreshCw // 🌟 NEW ICON FOR SYNC
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";

const AVAILABLE_CITIES = ["Marrakech", "Casablanca", "Rabat", "Tangier", "Agadir", "Fes", "Chefchaouen"];
const CATEGORIES = ["Activities", "Experiences", "Restaurants", "Food & Cooking", "Monuments", "Books & Guides", "Shops", "Fashion & Accessories", "Home Decor", "Hotels", "Home & Lifestyle", "Transport", "Health", "Nature", "Services", "Nightlife", "Wellness"];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("pins");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [pinSearchTerm, setPinSearchTerm] = useState("");
  const [pinCityFilter, setPinCityFilter] = useState("All");
  const [pinCategoryFilter, setPinCategoryFilter] = useState("All");

  // Edit State
  const [editingPin, setEditingPin] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "", category: "Experiences", description: "", 
    image_gallery: [], 
    address: "", phone: "", website: "", opening_hours: "",
    bookable_product_id: "", story_id: "", city: "Marrakech", google_place_id: ""
  });
  const [newImageUrl, setNewImageUrl] = useState(""); 
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncingId, setIsSyncingId] = useState(null); // 🌟 Syncing State

  // Quests
  const [isCreatingQuest, setIsCreatingQuest] = useState(false);
  const [allLocations, setAllLocations] = useState([]);
  const [questPinSearch, setQuestPinSearch] = useState("");
  const [newQuestData, setNewQuestData] = useState({ title: "", description: "", questType: "in_city", cities: ["Marrakech"], isPro: false, selectedPins: [] });

  // Import Tool State
  const [googleApiKey, setGoogleApiKey] = useState(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "");
  const [importCity, setImportCity] = useState("Marrakech");
  const [importQuery, setImportQuery] = useState(""); 
  const [importCategory, setImportCategory] = useState("Restaurants");
  const [importedPlaces, setImportedPlaces] = useState([]);
  const [selectedImportIds, setSelectedImportIds] = useState(new Set());
  const [isFetchingGoogle, setIsFetchingGoogle] = useState(false);
  const [isSavingImports, setIsSavingImports] = useState(false);

  useEffect(() => {
    setEditingPin(null);
    setIsCreatingQuest(false);
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === "comments") {
      const { data: commentsData } = await supabase.from("comments").select("*, locations(name)").order("created_at", { ascending: false });
      setData(commentsData || []);
    } else if (activeTab === "pins") {
      const { data: pinsData } = await supabase.from("locations").select("*").order("created_at", { ascending: false });
      setData(pinsData || []);
    } else if (activeTab === "quests") {
      const { data: questsData } = await supabase.from("quests").select("*").order("city", { ascending: true });
      setData(questsData || []);
      const { data: locs } = await supabase.from("locations").select("*").order("name");
      setAllLocations(locs || []);
    } else {
      setData([]);
    }
    setLoading(false);
  };

  const deleteRecord = async (table, id) => {
    if (window.confirm(`Are you sure you want to delete this record?`)) {
      await supabase.from(table).delete().eq("id", id);
      fetchData();
    }
  };

  const handleEditClick = (pin) => {
    setEditingPin(pin.id);
    let gallery = pin.image_gallery || [];
    if (gallery.length === 0 && pin.image_url) gallery = [pin.image_url];

    setEditFormData({
      name: pin.name || "", category: pin.category || "Experiences", description: pin.description || "",
      image_gallery: gallery, address: pin.address || "", phone: pin.phone || "",
      website: pin.website || "", opening_hours: pin.opening_hours || "",
      bookable_product_id: pin.bookable_product_id || "", story_id: pin.story_id || "", city: pin.city || "Marrakech",
      google_place_id: pin.google_place_id || ""
    });
  };

  const handleAddImageToGallery = () => {
    if (!newImageUrl.trim()) return;
    setEditFormData(prev => ({ ...prev, image_gallery: [...prev.image_gallery, newImageUrl.trim()] }));
    setNewImageUrl("");
  };

  const handleRemoveImageFromGallery = (indexToRemove) => {
    setEditFormData(prev => ({ ...prev, image_gallery: prev.image_gallery.filter((_, idx) => idx !== indexToRemove) }));
  };

  const savePinUpdate = async () => {
    setIsUpdating(true);
    const fallbackImageUrl = editFormData.image_gallery.length > 0 ? editFormData.image_gallery[0] : "";
    const { error } = await supabase.from("locations").update({ ...editFormData, image_url: fallbackImageUrl }).eq("id", editingPin);
    setIsUpdating(false);
    if (error) alert("Error updating pin: " + error.message);
    else { setEditingPin(null); fetchData(); }
  };

  // --- 🌟 INDIVIDUAL PIN SYNC LOGIC 🌟 ---
  const handleSyncPin = async (pin) => {
    if (!googleApiKey.trim()) return alert("API key needed for Sync.");
    setIsSyncingId(pin.id);

    try {
      const url = `https://places.googleapis.com/v1/places/${pin.google_place_id}`;
      const res = await fetch(url, {
        headers: {
          "X-Goog-Api-Key": googleApiKey,
          // Requesting only fields we want to update!
          "X-Goog-FieldMask": "regularOpeningHours,internationalPhoneNumber,websiteUri,rating,photos"
        }
      });
      const place = await res.json();
      if (place.error) throw new Error(place.error.message);

      const updates = {};
      if (place.internationalPhoneNumber) updates.phone = place.internationalPhoneNumber;
      if (place.websiteUri) updates.website = place.websiteUri;
      if (place.regularOpeningHours?.weekdayDescriptions) updates.opening_hours = place.regularOpeningHours.weekdayDescriptions.join(" | ");
      if (place.rating) updates.rating = place.rating;

      // Carefully merge new photos without duplicating or deleting custom uploads!
      if (place.photos && place.photos.length > 0) {
        const maxPhotos = Math.min(place.photos.length, 5);
        const fetchedPhotos = [];
        for (let i = 0; i < maxPhotos; i++) {
          fetchedPhotos.push(`https://places.googleapis.com/v1/${place.photos[i].name}/media?maxHeightPx=800&maxWidthPx=800&key=${googleApiKey}`);
        }
        const currentGallery = pin.image_gallery || [];
        // Set automatically removes duplicates
        const mergedGallery = [...new Set([...currentGallery, ...fetchedPhotos])]; 
        updates.image_gallery = mergedGallery;
        
        if (!pin.image_url && mergedGallery.length > 0) {
          updates.image_url = mergedGallery[0];
        }
      }

      const { error } = await supabase.from("locations").update(updates).eq("id", pin.id);
      if (error) throw error;
      
      alert("Pin synced successfully!");
      fetchData(); // Refresh to show new data
    } catch (e) {
      alert("Sync failed: " + e.message);
    }
    setIsSyncingId(null);
  };

  // --- GOOGLE PLACES BULK IMPORTER ---
  const handleFetchGoogle = async () => {
    if (!googleApiKey.trim()) return alert("Please enter a valid Google Maps API Key.");
    if (!importQuery.trim()) return alert("Please type what you want to search for (e.g. 'Pharmacies').");
    
    setIsFetchingGoogle(true);
    setImportedPlaces([]);
    setSelectedImportIds(new Set());

    try {
      const textQuery = `${importQuery} in ${importCity}, Morocco`;
      const url = "https://places.googleapis.com/v1/places:searchText";

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleApiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.regularOpeningHours,places.internationalPhoneNumber,places.websiteUri,places.rating,places.photos",
        },
        body: JSON.stringify({ textQuery, maxResultCount: 20 }), 
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      const places = (json.places || []).map((place) => {
        const gallery = [];
        if (place.photos && place.photos.length > 0) {
          const maxPhotos = Math.min(place.photos.length, 5);
          for(let i=0; i < maxPhotos; i++){
            gallery.push(`https://places.googleapis.com/v1/${place.photos[i].name}/media?maxHeightPx=800&maxWidthPx=800&key=${googleApiKey}`);
          }
        }

        return {
          _tempId: place.id,
          google_place_id: place.id, // 🌟 Save the Google ID!
          name: place.displayName?.text || "Unknown Place",
          lat: place.location?.latitude,
          lng: place.location?.longitude,
          category: importCategory,
          city: importCity,
          address: place.formattedAddress || "",
          phone: place.internationalPhoneNumber || "",
          website: place.websiteUri || "",
          opening_hours: place.regularOpeningHours?.weekdayDescriptions?.join(" | ") || "",
          rating: place.rating || null,
          image_url: gallery.length > 0 ? gallery[0] : "",
          image_gallery: gallery
        };
      }).filter((p) => p.lat && p.lng);

      setImportedPlaces(places);
      setSelectedImportIds(new Set(places.map((p) => p._tempId)));
    } catch (e) {
      alert("Error fetching data from Google: " + e.message);
    }
    setIsFetchingGoogle(false);
  };

  const handleSelectAll = () => {
    if (selectedImportIds.size === importedPlaces.length) setSelectedImportIds(new Set());
    else setSelectedImportIds(new Set(importedPlaces.map((p) => p._tempId)));
  };

  const toggleImportSelection = (id) => {
    setSelectedImportIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSaveImports = async () => {
    if (selectedImportIds.size === 0) return alert("Select at least one location.");
    setIsSavingImports(true);
    const payload = importedPlaces.filter((p) => selectedImportIds.has(p._tempId)).map(({ _tempId, ...rest }) => rest);
    const { error } = await supabase.from("locations").insert(payload);
    setIsSavingImports(false);

    if (error) alert("Error saving to database: " + error.message);
    else {
      alert(`Successfully added ${payload.length} Premium Locations!`);
      setImportedPlaces([]);
      setSelectedImportIds(new Set());
      if (activeTab === "pins") fetchData();
    }
  };

  // (Quest functions remain exactly the same)
  const toggleCity = (city) => { setNewQuestData((prev) => { if (prev.questType === "in_city") return { ...prev, cities: [city] }; const exists = prev.cities.includes(city); return exists ? { ...prev, cities: prev.cities.filter((c) => c !== city) } : { ...prev, cities: [...prev.cities, city] }; }); };
  const togglePinForQuest = (pin) => { setNewQuestData((prev) => { const exists = prev.selectedPins.some((p) => p.id === pin.id); if (exists) return { ...prev, selectedPins: prev.selectedPins.filter((p) => p.id !== pin.id) }; return { ...prev, selectedPins: [...prev.selectedPins, pin] }; }); };
  const handleSaveNewQuest = async () => {
    if (!newQuestData.title || newQuestData.selectedPins.length === 0 || newQuestData.cities.length === 0) return alert("Missing info!");
    setIsUpdating(true);
    const { data: insertedQuest, error: questError } = await supabase.from("quests").insert([{ title: newQuestData.title, description: newQuestData.description, city: newQuestData.cities.join(", "), quest_type: newQuestData.questType, is_pro: newQuestData.isPro }]).select().single();
    if (questError) { setIsUpdating(false); return alert("Error: " + questError.message); }
    const stepsToInsert = newQuestData.selectedPins.map((pin, index) => ({ quest_id: insertedQuest.id, location_id: pin.id, step_order: index + 1 }));
    const { error: stepsError } = await supabase.from("quest_steps").insert(stepsToInsert);
    setIsUpdating(false);
    if (stepsError) alert("Error linking pins: " + stepsError.message);
    else { setIsCreatingQuest(false); setNewQuestData({ title: "", description: "", questType: "in_city", cities: ["Marrakech"], isPro: false, selectedPins: [] }); fetchData(); }
  };

  const renderContent = () => {
    if (loading) return <ActivityIndicator size="large" color="#22d3ee" className="mt-10" />;

    // 🌟 DATA IMPORTER TAB 🌟
    if (activeTab === "import") {
      return (
        <View>
          <Text className="text-2xl font-black text-white mb-2">Google Places Importer</Text>
          <Text className="text-gray-400 mb-6">Type ANY query to pull exact locations directly from Google.</Text>

          <View className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-8">
            <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Google Maps API Key</Text>
            <TextInput className="w-full bg-gray-900 text-white p-4 rounded-xl border border-gray-700 focus:border-cyan-500 mb-6" placeholder="AIzaSyB..." placeholderTextColor="#6b7280" value={googleApiKey} onChangeText={setGoogleApiKey} />

            <View className="flex-row gap-4 mb-4">
              <View className="flex-1">
                <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Target City</Text>
                <select className="w-full bg-gray-900 text-white p-4 rounded-xl border border-gray-700 outline-none appearance-none" value={importCity} onChange={(e) => setImportCity(e.target.value)}>
                  {AVAILABLE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </View>
              <View className="flex-[2]">
                <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Custom Search Query</Text>
                <TextInput className="w-full bg-gray-900 text-white p-4 rounded-xl border border-gray-700 focus:border-cyan-500 h-14" placeholder="e.g. 'Pharmacies', 'Vegan Cafes', 'Clubs'" placeholderTextColor="#6b7280" value={importQuery} onChangeText={setImportQuery} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Assign Category</Text>
                <select className="w-full bg-gray-900 text-white p-4 rounded-xl border border-gray-700 outline-none appearance-none" value={importCategory} onChange={(e) => setImportCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </View>
            </View>

            <TouchableOpacity onPress={handleFetchGoogle} disabled={isFetchingGoogle} className="w-full bg-blue-600 flex-row items-center justify-center p-4 rounded-xl active:bg-blue-700 shadow-lg">
              {isFetchingGoogle ? <ActivityIndicator color="white" /> : <><Search size={20} color="white" /><Text className="text-white font-bold text-lg ml-2">Search Google Maps</Text></>}
            </TouchableOpacity>
          </View>

          {importedPlaces.length > 0 && (
            <View className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-white">Select Locations ({selectedImportIds.size})</Text>
                <TouchableOpacity onPress={handleSelectAll} className="bg-gray-700 px-3 py-1.5 rounded-lg active:bg-gray-600">
                  <Text className="text-white text-xs font-bold uppercase">{selectedImportIds.size === importedPlaces.length ? "Unselect All" : "Select All"}</Text>
                </TouchableOpacity>
              </View>
              <View className="max-h-96 overflow-hidden mb-6 rounded-xl border border-gray-700">
                <ScrollView className="bg-gray-900" nestedScrollEnabled>
                  {importedPlaces.map((place) => {
                    const isSelected = selectedImportIds.has(place._tempId);
                    return (
                      <TouchableOpacity key={place._tempId} onPress={() => toggleImportSelection(place._tempId)} className={`p-4 border-b border-gray-800 flex-row items-center transition-colors ${isSelected ? "bg-cyan-900/20" : ""}`}>
                        <View className="mr-4">{isSelected ? <CheckSquare size={24} color="#22d3ee" /> : <Square size={24} color="#6b7280" />}</View>
                        {place.image_url ? (
                          <Image source={{ uri: place.image_url }} className="w-12 h-12 rounded-lg bg-gray-800 mr-4" />
                        ) : <View className="w-12 h-12 rounded-lg bg-gray-800 mr-4 items-center justify-center"><MapPin color="#6b7280" /></View>}
                        <View className="flex-1">
                          <View className="flex-row justify-between items-center">
                            <Text className={`font-bold ${isSelected ? "text-white" : "text-gray-400"}`}>{place.name}</Text>
                            {place.rating && <View className="flex-row items-center"><Star size={12} color="#fbbf24" fill="#fbbf24" /><Text className="text-amber-400 text-xs font-bold ml-1">{place.rating}</Text></View>}
                          </View>
                          <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>{place.address}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <TouchableOpacity onPress={handleSaveImports} disabled={isSavingImports} className="w-full bg-cyan-500 flex-row items-center justify-center p-4 rounded-xl active:bg-cyan-600 shadow-lg">
                {isSavingImports ? <ActivityIndicator color="black" /> : <><DownloadCloud size={20} color="black" /><Text className="text-black font-black text-lg ml-2">Push {selectedImportIds.size} Selected to DB</Text></>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    // 🌟 PINS TAB (WITH IMAGE GALLERY UI AND SYNC BUTTON) 🌟
    if (activeTab === "pins") {
      if (editingPin) {
        return (
          <View className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <Text className="text-2xl font-black text-white mb-6">Edit Pin Details</Text>
            
            <View className="mb-6 bg-gray-900 p-4 rounded-xl border border-gray-700">
              <Text className="text-gray-400 text-xs font-bold uppercase mb-4 flex-row items-center"><ImageIcon size={14} color="#9ca3af" className="mr-1" /> Image Gallery ({editFormData.image_gallery.length})</Text>
              {editFormData.image_gallery.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-3 pb-2">
                    {editFormData.image_gallery.map((imgUrl, idx) => (
                      <View key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-700">
                        <Image source={{ uri: imgUrl }} className="w-full h-full object-cover" />
                        <TouchableOpacity onPress={() => handleRemoveImageFromGallery(idx)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1"><X size={12} color="white" /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
              <View className="flex-row items-center gap-2">
                <TextInput className="flex-1 bg-gray-800 text-white p-3 rounded-lg border border-gray-700 focus:border-cyan-500 text-sm" placeholder="Paste image link here..." placeholderTextColor="#6b7280" value={newImageUrl} onChangeText={setNewImageUrl} />
                <TouchableOpacity onPress={handleAddImageToGallery} className="bg-cyan-500 px-4 py-3 rounded-lg active:bg-cyan-600"><Text className="text-black font-bold">Add</Text></TouchableOpacity>
              </View>
            </View>

            <View className="flex-row space-x-4 mb-4">
              <View className="flex-1"><Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Name</Text><TextInput className="bg-gray-900 text-white p-4 rounded-xl border border-gray-700" value={editFormData.name} onChangeText={(t) => setEditFormData({ ...editFormData, name: t })} /></View>
              <View className="flex-1"><Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">City</Text><select className="w-full bg-gray-900 text-white p-4 rounded-xl border border-gray-700 outline-none appearance-none" value={editFormData.city} onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}>{AVAILABLE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></View>
              <View className="flex-1"><Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Category</Text><select className="w-full bg-gray-900 text-white p-4 rounded-xl border border-gray-700 outline-none appearance-none" value={editFormData.category} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></View>
            </View>
            <View className="flex-row space-x-4 mb-4">
              <View className="flex-1"><Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Phone</Text><TextInput className="bg-gray-900 text-white p-4 rounded-xl border border-gray-700" placeholder="+212..." placeholderTextColor="#4b5563" value={editFormData.phone} onChangeText={(t) => setEditFormData({ ...editFormData, phone: t })} /></View>
              <View className="flex-1"><Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Website</Text><TextInput className="bg-gray-900 text-white p-4 rounded-xl border border-gray-700" placeholder="https://..." placeholderTextColor="#4b5563" value={editFormData.website} onChangeText={(t) => setEditFormData({ ...editFormData, website: t })} /></View>
              <View className="flex-1"><Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Hours</Text><TextInput className="bg-gray-900 text-white p-4 rounded-xl border border-gray-700" placeholder="09:00 - 18:00" placeholderTextColor="#4b5563" value={editFormData.opening_hours} onChangeText={(t) => setEditFormData({ ...editFormData, opening_hours: t })} /></View>
            </View>
            <View className="mb-4"><Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Physical Address</Text><TextInput className="bg-gray-900 text-white p-4 rounded-xl border border-gray-700" value={editFormData.address} onChangeText={(t) => setEditFormData({ ...editFormData, address: t })} /></View>
            <View className="flex-row space-x-4 mb-4">
              <View className="flex-1"><Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Bookable Product ID</Text><TextInput className="bg-gray-900 text-white p-4 rounded-xl border border-gray-700" placeholder="e.g. 1042" placeholderTextColor="#4b5563" value={editFormData.bookable_product_id} onChangeText={(t) => setEditFormData({ ...editFormData, bookable_product_id: t })} /></View>
              <View className="flex-1"><Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Story ID</Text><TextInput className="bg-gray-900 text-white p-4 rounded-xl border border-gray-700" placeholder="e.g. 50" placeholderTextColor="#4b5563" value={editFormData.story_id} onChangeText={(t) => setEditFormData({ ...editFormData, story_id: t })} /></View>
            </View>
            <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Description</Text>
            <TextInput className="bg-gray-900 text-white p-4 rounded-xl mb-8 border border-gray-700" value={editFormData.description} onChangeText={(t) => setEditFormData({ ...editFormData, description: t })} multiline style={{ minHeight: 100 }} />

            <View className="flex-row gap-4">
              <TouchableOpacity className="flex-1 bg-gray-700 p-4 rounded-xl items-center border border-gray-600" onPress={() => setEditingPin(null)}><Text className="text-white font-bold text-lg">Cancel</Text></TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-cyan-500 p-4 rounded-xl items-center flex-row justify-center active:bg-cyan-600" onPress={savePinUpdate} disabled={isUpdating}>{isUpdating ? <ActivityIndicator color="black" /> : <Text className="text-black font-bold text-lg">Save Changes</Text>}</TouchableOpacity>
            </View>
          </View>
        );
      }

      const filteredPins = data.filter((pin) => {
        const matchesSearch = pin.name?.toLowerCase().includes(pinSearchTerm.toLowerCase());
        const matchesCity = pinCityFilter === "All" || pin.city === pinCityFilter;
        const matchesCat = pinCategoryFilter === "All" || pin.category === pinCategoryFilter;
        return matchesSearch && matchesCity && matchesCat;
      });

      return (
        <View>
          <View className="flex-row items-center gap-4 mb-6">
            <View className="flex-1 flex-row items-center bg-gray-800 border border-gray-700 rounded-xl px-4 h-14"><Search size={20} color="#9ca3af" /><TextInput placeholder="Search all pins..." placeholderTextColor="#6b7280" value={pinSearchTerm} onChangeText={setPinSearchTerm} className="flex-1 text-white ml-3" /></View>
            <select className="bg-gray-800 text-white h-14 px-4 rounded-xl border border-gray-700 outline-none appearance-none font-bold" value={pinCityFilter} onChange={(e) => setPinCityFilter(e.target.value)}><option value="All">All Cities</option>{AVAILABLE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <select className="bg-gray-800 text-white h-14 px-4 rounded-xl border border-gray-700 outline-none appearance-none font-bold" value={pinCategoryFilter} onChange={(e) => setPinCategoryFilter(e.target.value)}><option value="All">All Categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </View>
          <Text className="text-gray-400 mb-4 font-bold uppercase tracking-wider text-xs">Showing {filteredPins.length} Locations</Text>
          {filteredPins.length === 0 ? <Text className="text-gray-500 italic mt-5">No records found.</Text> : filteredPins.map((pin) => (
            <View key={pin.id} className="bg-gray-800 p-5 rounded-xl mb-4 border border-gray-700 flex-row justify-between items-center shadow-sm">
              <View className="flex-1 pr-4 flex-row items-center">
                {pin.image_url ? <Image source={{ uri: pin.image_url }} className="w-12 h-12 rounded-lg bg-gray-900 mr-4" /> : <View className="w-12 h-12 rounded-lg bg-gray-900 mr-4 items-center justify-center"><MapPin color="#4b5563" size={16} /></View>}
                <View>
                  <Text className="text-white font-bold text-lg mb-0.5">{pin.name}</Text>
                  <Text className="text-cyan-400 text-sm font-medium mb-0.5">{pin.category} • {pin.city}</Text>
                  <Text className="text-gray-500 text-xs">{pin.address || `${pin.lat?.toFixed(5)}, ${pin.lng?.toFixed(5)}`}</Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                {/* 🌟 NEW SYNC BUTTON FOR GOOGLE PINS 🌟 */}
                {pin.google_place_id && (
                  <TouchableOpacity onPress={() => handleSyncPin(pin)} disabled={isSyncingId === pin.id} className="p-3 bg-green-900/20 rounded-lg border border-green-900/50" title="Sync with Google">
                    {isSyncingId === pin.id ? <ActivityIndicator size="small" color="#22c55e" /> : <RefreshCw size={20} color="#22c55e" />}
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleEditClick(pin)} className="p-3 bg-blue-900/20 rounded-lg border border-blue-900/50"><Edit size={20} color="#3b82f6" /></TouchableOpacity>
                <TouchableOpacity onPress={() => deleteRecord("locations", pin.id)} className="p-3 bg-red-900/20 rounded-lg border border-red-900/50"><Trash2 size={20} color="#ef4444" /></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (activeTab === "quests") {
      if (isCreatingQuest) {
        return (
          <View className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <Text className="text-2xl font-black text-white mb-6">Build New Quest</Text>
            <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Quest Title</Text>
            <TextInput className="bg-gray-900 text-white p-4 rounded-xl mb-6 border border-gray-700 focus:border-cyan-500" placeholder="e.g. Hidden Gems" placeholderTextColor="#6b7280" value={newQuestData.title} onChangeText={(text) => setNewQuestData({ ...newQuestData, title: text })} />
            <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Scope</Text>
            <View className="flex-row gap-4 mb-6">
              <TouchableOpacity onPress={() => setNewQuestData({ ...newQuestData, questType: "in_city", cities: [AVAILABLE_CITIES[0]] })} className={`flex-1 p-3 rounded-xl border ${newQuestData.questType === "in_city" ? "bg-cyan-900/40 border-cyan-500" : "bg-gray-900 border-gray-700"}`}><Text className={`text-center font-bold ${newQuestData.questType === "in_city" ? "text-cyan-400" : "text-gray-400"}`}>In-City</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setNewQuestData({ ...newQuestData, questType: "multi_city" })} className={`flex-1 p-3 rounded-xl border ${newQuestData.questType === "multi_city" ? "bg-purple-900/40 border-purple-500" : "bg-gray-900 border-gray-700"}`}><Text className={`text-center font-bold ${newQuestData.questType === "multi_city" ? "text-purple-400" : "text-gray-400"}`}>Multi-City</Text></TouchableOpacity>
            </View>
            <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Select City / Cities</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6"><View className="flex-row pb-2">{AVAILABLE_CITIES.map((c) => { const isSelected = newQuestData.cities.includes(c); return (<TouchableOpacity key={c} onPress={() => toggleCity(c)} className={`px-4 py-2 mr-2 rounded-full border ${isSelected ? "bg-cyan-500 border-cyan-400" : "bg-gray-900 border-gray-700"}`}><Text className={`font-bold ${isSelected ? "text-black" : "text-gray-400"}`}>{c}</Text></TouchableOpacity>); })}</View></ScrollView>
            <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Description</Text>
            <TextInput className="bg-gray-900 text-white p-4 rounded-xl mb-6 border border-gray-700 focus:border-cyan-500" placeholder="What makes this route special?" placeholderTextColor="#6b7280" value={newQuestData.description} onChangeText={(text) => setNewQuestData({ ...newQuestData, description: text })} multiline style={{ minHeight: 80 }} />
            <TouchableOpacity onPress={() => setNewQuestData({ ...newQuestData, isPro: !newQuestData.isPro })} className="flex-row items-center mb-8 bg-gray-900 p-4 rounded-xl border border-gray-700 active:bg-gray-800">
              <View className={`w-6 h-6 rounded border items-center justify-center mr-3 ${newQuestData.isPro ? "bg-amber-500 border-amber-400" : "bg-gray-800 border-gray-600"}`}>{newQuestData.isPro && <Check size={16} color="black" />}</View>
              <View><Text className="text-white font-bold text-base">Make this a Pro Quest 🏆</Text><Text className="text-gray-400 text-xs mt-1">Users must unlock to access.</Text></View>
            </TouchableOpacity>

            <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Route Steps ({newQuestData.selectedPins.length})</Text>
            <View className="flex-row items-center bg-gray-900 border border-gray-700 rounded-xl px-4 h-14 mb-2"><Search size={20} color="#9ca3af" /><TextInput placeholder="Search locations to add..." placeholderTextColor="#6b7280" value={questPinSearch} onChangeText={setQuestPinSearch} className="flex-1 text-white ml-3" /></View>
            {questPinSearch.length > 0 && (
              <View className="bg-gray-900 border border-gray-700 rounded-xl max-h-48 overflow-hidden mb-4 shadow-2xl relative z-50">
                <ScrollView nestedScrollEnabled>{allLocations.filter((p) => p.name.toLowerCase().includes(questPinSearch.toLowerCase())).map((pin) => (<TouchableOpacity key={pin.id} onPress={() => { togglePinForQuest(pin); setQuestPinSearch(""); }} className="p-4 border-b border-gray-800 hover:bg-gray-800 flex-row justify-between items-center"><View><Text className="text-white font-bold">{pin.name}</Text><Text className="text-gray-500 text-xs">{pin.city}</Text></View><Plus size={20} color="#22d3ee" /></TouchableOpacity>))}</ScrollView>
              </View>
            )}
            <View className="space-y-2 mb-8">
              {newQuestData.selectedPins.map((pin, index) => (
                <View key={pin.id} className="flex-row items-center justify-between bg-gray-900 p-4 rounded-xl border border-gray-700 shadow-sm"><View className="flex-row items-center"><View className="w-8 h-8 bg-cyan-500 rounded-full items-center justify-center mr-3"><Text className="text-black text-xs font-black">{index + 1}</Text></View><Text className="text-white font-bold">{pin.name}</Text></View><TouchableOpacity onPress={() => togglePinForQuest(pin)} className="p-2 bg-gray-800 rounded-lg border border-gray-700"><X size={16} color="#ef4444" /></TouchableOpacity></View>
              ))}
            </View>
            <View className="flex-row gap-4">
              <TouchableOpacity className="flex-1 bg-gray-700 p-4 rounded-xl items-center border border-gray-600" onPress={() => setIsCreatingQuest(false)}><Text className="text-white font-bold text-lg">Cancel</Text></TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-cyan-500 p-4 rounded-xl items-center flex-row justify-center" onPress={handleSaveNewQuest} disabled={isUpdating}>{isUpdating ? <ActivityIndicator color="black" /> : <Text className="text-black font-bold text-lg">Publish Quest</Text>}</TouchableOpacity>
            </View>
          </View>
        );
      }

      const groupedQuests = data.reduce((acc, quest) => {
        const cityKey = quest.quest_type === "multi_city" ? "Multi-City" : quest.city || "Unknown";
        if (!acc[cityKey]) acc[cityKey] = [];
        acc[cityKey].push(quest);
        return acc;
      }, {});

      return (
        <View>
          <TouchableOpacity onPress={() => setIsCreatingQuest(true)} className="bg-cyan-500 flex-row items-center justify-center p-4 rounded-xl mb-8 active:bg-cyan-600 shadow-lg"><Plus size={20} color="black" /><Text className="text-black font-black text-lg ml-2">Create New Quest</Text></TouchableOpacity>
          {Object.keys(groupedQuests).map((city) => (
            <View key={city} className="mb-8">
              <View className="flex-row items-center mb-4"><Text className="text-2xl font-black text-white">{city}</Text><View className="bg-gray-800 px-3 py-1 rounded-full ml-3 border border-gray-700"><Text className="text-gray-400 text-xs font-bold">{groupedQuests[city].length} Quests</Text></View></View>
              {groupedQuests[city].map((quest) => (
                <View key={quest.id} className="bg-gray-800 p-5 rounded-xl mb-3 border border-gray-700 flex-row justify-between items-center">
                  <View className="flex-1 pr-4">
                    <View className="flex-row items-center mb-2"><Text className="text-white font-bold text-lg mr-3">{quest.title}</Text>{quest.quest_type === "multi_city" && (<View className="bg-purple-900/40 px-2 py-1 rounded border border-purple-500/50 mr-2"><Text className="text-purple-400 text-[10px] font-bold uppercase">Multi-City</Text></View>)}{quest.is_pro && (<View className="bg-amber-900/40 px-2 py-1 rounded border border-amber-500/50"><Text className="text-amber-400 text-[10px] font-bold uppercase">Pro</Text></View>)}</View>
                    <Text className="text-gray-400 text-sm" numberOfLines={2}>{quest.description || "No description provided."}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteRecord("quests", quest.id)} className="p-3 bg-red-900/20 rounded-lg border border-red-900/50"><Trash2 size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    if (activeTab === "comments") {
      if (data.length === 0) return <Text className="text-gray-500 italic mt-5">No records found.</Text>;
      return data.map((comment) => (
        <View key={comment.id} className="bg-gray-800 p-5 rounded-xl mb-4 border border-gray-700 flex-row justify-between items-center shadow-sm">
          <View className="flex-1 pr-4"><Text className="text-gray-400 text-xs mb-1 font-bold tracking-wider uppercase">📍 On: {comment.locations?.name || "Unknown Pin"}</Text><Text className="text-white font-medium text-base mb-2">"{comment.content || comment.text}"</Text></View>
          <TouchableOpacity onPress={() => deleteRecord("comments", comment.id)} className="p-3 bg-red-900/20 rounded-lg border border-red-900/50"><Trash2 size={20} color="#ef4444" /></TouchableOpacity>
        </View>
      ));
    }

    return <Text className="text-gray-500 italic">Coming soon...</Text>;
  };

  return (
    <View className="flex-1 flex-row bg-black">
      <View className="w-64 bg-gray-900 border-r border-gray-800 p-5 pt-12 flex-shrink-0">
        <View className="flex-row items-center mb-10">
          <ShieldCheck size={32} color="#22d3ee" />
          <Text className="text-2xl font-black text-white ml-3 tracking-tight">Admin</Text>
        </View>
        <View className="space-y-4 flex-1">
          <TouchableOpacity onPress={() => setActiveTab("pins")} className={`flex-row items-center p-4 rounded-xl ${activeTab === "pins" ? "bg-cyan-500/20 border border-cyan-500/50" : "bg-transparent"}`}>
            <MapPin size={20} color={activeTab === "pins" ? "#22d3ee" : "#9ca3af"} />
            <Text className={`ml-3 font-bold ${activeTab === "pins" ? "text-cyan-400" : "text-gray-400"}`}>Map Pins</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("import")} className={`flex-row items-center p-4 rounded-xl ${activeTab === "import" ? "bg-blue-500/20 border border-blue-500/50" : "bg-transparent"}`}>
            <DownloadCloud size={20} color={activeTab === "import" ? "#3b82f6" : "#9ca3af"} />
            <Text className={`ml-3 font-bold ${activeTab === "import" ? "text-blue-400" : "text-gray-400"}`}>Import Data</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("quests")} className={`flex-row items-center p-4 rounded-xl ${activeTab === "quests" ? "bg-cyan-500/20 border border-cyan-500/50" : "bg-transparent"}`}>
            <Route size={20} color={activeTab === "quests" ? "#22d3ee" : "#9ca3af"} />
            <Text className={`ml-3 font-bold ${activeTab === "quests" ? "text-cyan-400" : "text-gray-400"}`}>Quests</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("comments")} className={`flex-row items-center p-4 rounded-xl ${activeTab === "comments" ? "bg-cyan-500/20 border border-cyan-500/50" : "bg-transparent"}`}>
            <MessageSquare size={20} color={activeTab === "comments" ? "#22d3ee" : "#9ca3af"} />
            <Text className={`ml-3 font-bold ${activeTab === "comments" ? "text-cyan-400" : "text-gray-400"}`}>Comments</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.replace("/")} className="flex-row items-center p-4 bg-gray-800 rounded-xl mt-auto border border-gray-700">
          <ArrowLeft size={20} color="white" />
          <Text className="ml-3 font-bold text-white">Exit to Map</Text>
        </TouchableOpacity>
      </View>
      <ScrollView className="flex-1 p-10 bg-black">
        <Text className="text-3xl font-black text-white mb-8 capitalize">{activeTab === "import" ? "Data Import Tool" : `${activeTab} Management`}</Text>
        <View className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl min-h-[500px]">
          {renderContent()}
        </View>
      </ScrollView>
    </View>
  );
}