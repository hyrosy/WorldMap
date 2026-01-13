'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRouteBuilder } from '@/context/RouteBuilderContext';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, PlusCircle, ArrowLeft, Building, ChevronDown, Globe, MapPin, Star, Trash2, Edit } from 'lucide-react';
import clsx from 'clsx';
import { useCart } from "@/context/CartContext";

// --- SUB-COMPONENTS to keep the main component clean ---

const SearchResultItem = ({ pin, onSelect }) => (
    <button onClick={onSelect} className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-gray-800">
        <div className="relative w-12 h-12 flex-shrink-0">
            <Image src={pin.acf?.featured_image?.url || '/placeholder.png'} alt={pin.title.rendered} fill className="object-cover rounded-md" />
        </div>
        <div>
            <p className="font-semibold text-sm text-white">{pin.title.rendered}</p>
        </div>
    </button>
);

const QuestCard = ({ quest, onQuestSelect, exploredSteps }) => {
    const totalSteps = quest.acf.quest_steps?.length || 0;
    const completedSteps = Array.from(exploredSteps).filter(stepId =>
        quest.acf.quest_steps?.some(step => step.ID === stepId)
    ).length;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    return (
        <div key={quest.id} className="bg-white/10 p-4 rounded-lg cursor-pointer border border-gray-600 hover:bg-white/20 transition-colors" onClick={() => onQuestSelect(quest)}>
            <h3 className="font-semibold text-lg">{quest.title.rendered}</h3>
            <p className="text-sm text-gray-300 my-1">{quest.acf.quest_description}</p>
            <span className="text-xs font-bold text-cyan-400">{quest.acf.quest_duration}</span>
            {totalSteps > 0 && (
                <div className="mt-3">
                    <div className="flex justify-between items-center mb-1"><p className="text-xs font-semibold text-white">Progress</p><p className="text-xs font-bold text-cyan-400">{Math.round(progressPercentage)}%</p></div>
                    <div className="w-full bg-gray-700 rounded-full h-1"><div className="bg-cyan-400 h-1 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div></div>
                </div>
            )}
        </div>
    );
};

// Helper function from your original code
const fetchProductsByIds = async (productIds) => {
    if (!productIds || productIds.length === 0) return [];
    const idsString = productIds.join(',');
    const wooApiUrl = `https://data.hyrosy.com/wp-json/wc/v3/products?include=${idsString}`;
    const authString = btoa(`${process.env.NEXT_PUBLIC_DATA_WOOCOMMERCE_KEY}:${process.env.NEXT_PUBLIC_DATA_WOOCOMMERCE_SECRET}`);
    try {
        const response = await fetch(wooApiUrl, { headers: { 'Authorization': `Basic ${authString}` } });
        if (!response.ok) throw new Error('Products fetch failed');
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch products for full quest booking:", error);
        return [];
    }
};


// --- MAIN QUEST PANEL COMPONENT ---

const QuestPanel = ({ isOpen, onClose, activeQuest, quests, currentStepIndex, onStepSelect, onQuestSelect, exploredSteps, onToggleStepExplored, selectedCity, allPins, onViewExperience }) => {
    // --- STATE MANAGEMENT ---
    const [mainTab, setMainTab] = useState('quests'); // 'quests' or 'experiences'

    // State for "My Experiences"
    const { session } = useAuth();
    const { stops, addStop, removeStop, clearRoute } = useRouteBuilder();
    const [experiencesView, setExperiencesView] = useState('list');
    const [myRoutes, setMyRoutes] = useState([]);
    const [loadingRoutes, setLoadingRoutes] = useState(true);
    const [newRouteName, setNewRouteName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedExperience, setSelectedExperience] = useState(null);
    const [experienceStops, setExperienceStops] = useState({ status: 'idle', data: [] }); // To hold fetched stops
    const [isEditing, setIsEditing] = useState(false); // NEW: State for edit mode
    const [editedStops, setEditedStops] = useState([]); // NEW: State for managing stops during an edit


    // State for "Official Quests" (from your original component)
    const { addToCart } = useCart();
    const [isBookingQuest, setIsBookingQuest] = useState(false);
    const [stepsData, setStepsData] = useState({ status: 'idle', data: [] });
    const [questsActiveTab, setQuestsActiveTab] = useState('by_city');
    const [openAccordion, setOpenAccordion] = useState(null);
    

    // --- EFFECT HOOKS ---
    
    // Fetch user's custom routes
    useEffect(() => {
        const fetchMyRoutes = async () => {
            if (session?.user && mainTab === 'experiences') {
                setLoadingRoutes(true);
                const { data, error } = await supabase.from('routes').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
                if (error) console.error("Error fetching user routes:", error);
                else setMyRoutes(data);
                setLoadingRoutes(false);
            }
        };
        fetchMyRoutes();
    }, [isOpen, session, mainTab, experiencesView]); // Re-fetch when view changes back to list

    // Handle location search
    useEffect(() => {
        if (searchTerm.length > 2) {
            const lowercasedFilter = searchTerm.toLowerCase();
            const results = (allPins || []).filter(pin => {
                const titleMatch = pin.title.rendered.toLowerCase().includes(lowercasedFilter);
                const descriptionMatch = pin.acf?.description 
                    ? pin.acf.description.toLowerCase().includes(lowercasedFilter) 
                    : false;
                return titleMatch || descriptionMatch;
            });

            // ADD THIS SECOND CONSOLE LOG
            console.log("Search found these results:", results);

            setSearchResults(results.slice(0, 5));
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, allPins]);

    // --- NEW: Handle deleting an experience ---
    const handleDeleteExperience = async (routeId) => {
        // Ask for confirmation before deleting
        if (window.confirm("Are you sure you want to delete this experience? This cannot be undone.")) {
            
            const { error } = await supabase
                .from('routes')
                .delete()
                .eq('id', routeId);

            if (error) {
                toast.error("Error deleting experience.", { description: error.message });
            } else {
                toast.success("Experience deleted.");
                // Instantly remove the route from the UI
                setMyRoutes(prevRoutes => prevRoutes.filter(route => route.id !== routeId));
            }
        }
    };
    
    // Your original useEffect hooks for Official Quests
    useEffect(() => {
        if (selectedCity) {
            setOpenAccordion(selectedCity.name);
            setQuestsActiveTab('by_city');
        } else {
            setOpenAccordion(null);
        }
    }, [selectedCity]);
    
    useEffect(() => {
        if (!activeQuest) {
            setStepsData({ status: 'idle', data: [] });
            return;
        }
        const fetchQuestSteps = async () => {
            if (!activeQuest.acf.quest_steps || activeQuest.acf.quest_steps.length === 0) {
                setStepsData({ status: 'success', data: [] });
                return;
            }
            setStepsData({ status: 'loading', data: [] });
            const stepIds = activeQuest.acf.quest_steps.map(step => step.ID).join(',');
            const apiUrl = `https://data.hyrosy.com/wp-json/wp/v2/locations?acf_format=standard&include=${stepIds}&orderby=include`;
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('Failed to fetch quest steps');
                const steps = await response.json();
                const orderedSteps = activeQuest.acf.quest_steps.map(stepRef => 
                    steps.find(step => step.id === stepRef.ID)
                ).filter(Boolean);
                setStepsData({ status: 'success', data: orderedSteps });
            } catch (error) {
                console.error("Error fetching quest steps:", error);
                setStepsData({ status: 'error', data: [] });
            }
        };
        fetchQuestSteps();
    }, [activeQuest]);


    // --- HANDLER FUNCTIONS ---

    const handleSaveExperience = async () => {
        if (!newRouteName.trim() || stops.length === 0) {
            toast.error("Please add a name and at least one stop.");
            return;
        }
        setIsSaving(true);
        const stopIds = stops.map(stop => stop.id);
        const { error } = await supabase.from('routes').insert({ name: newRouteName, user_id: session.user.id, stops: stopIds });

        if (error) {
            toast.error("Could not save experience.");
        } else {
            toast.success(`"${newRouteName}" was saved!`);
            setNewRouteName('');
            clearRoute();
            setExperiencesView('list');
        }
        setIsSaving(false);
    };

    const handleBookFullQuest = async () => {
        if (!stepsData.data || stepsData.data.length === 0) return;
        setIsBookingQuest(true);
        const productIds = stepsData.data.map(step => step.acf.bookable_product_id).filter(Boolean);
        const productsToAdd = await fetchProductsByIds(productIds);
        if (productsToAdd.length > 0) {
            productsToAdd.forEach(product => {
                addToCart(product, { quantity: 1, date: new Date(), time: null });
            });
        }
        setIsBookingQuest(false);
        onClose();
    };

    const handleStepClick = (step, index) => { onStepSelect(step, index); };
    const handleBack = () => { onQuestSelect(null); };

    // --- RENDER LOGIC ---

    const questsByCity = (quests || []).reduce((acc, quest) => {
        if (quest.acf.quest_type === 'city' && quest.acf.quest_city) {
            const city = quest.acf.quest_city;
            if (!acc[city]) { acc[city] = []; }
            acc[city].push(quest);
        }
        return acc;
    }, {});
    const multiCityQuests = (quests || []).filter(q => q.acf.quest_type === 'multi_city');
    const premiumQuests = (quests || []).filter(q => q.acf.quest_type === 'premium');

    // --- NEW: Sync state when entering edit mode ---
    useEffect(() => {
        if (isEditing && selectedExperience) {
            setNewRouteName(selectedExperience.name);
            setEditedStops(experienceStops.data);
        }
    }, [isEditing, selectedExperience, experienceStops.data]);

    // --- NEW: Handler for saving updated experience ---
    const handleUpdateExperience = async () => {
        if (!newRouteName.trim() || editedStops.length === 0) {
            toast.error("An experience must have a name and at least one stop.");
            return;
        }
        setIsSaving(true);
        const updatedStopIds = editedStops.map(stop => stop.id);
        const { error } = await supabase
            .from('routes')
            .update({ name: newRouteName, stops: updatedStopIds })
            .eq('id', selectedExperience.id);

        if (error) {
            toast.error("Could not update experience.");
        } else {
            toast.success(`"${newRouteName}" was updated!`);
            // Refresh the main list of routes to reflect the change
            setMyRoutes(prev => prev.map(r => r.id === selectedExperience.id ? { ...r, name: newRouteName, stops: updatedStopIds } : r));
            setIsEditing(false); // Exit edit mode
        }
        setIsSaving(false);
    };









    const renderMyExperiences = () => {
    if (!session) {
        return <div className="p-6 text-center text-gray-400">Please sign in to create and view your experiences.</div>;
    }

    // --- NEW: RENDER THE DETAIL VIEW ---
    if (selectedExperience) {
        // --- NEW: EDIT MODE VIEW ---
            if (isEditing) {
                return (
                    <div className="p-4">
                        <Button variant="ghost" onClick={() => setIsEditing(false)} className="mb-4 text-white"><ArrowLeft className="w-4 h-4 mr-2" /> Cancel Edit</Button>
                        <h3 className="font-bold text-lg mb-4 text-white">Editing Experience</h3>
                        <div className="space-y-4">
                            <Input placeholder="Experience Name..." value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input placeholder="Search to add more stops..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white" />
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10 p-1">
                                        {searchResults.map(pin => <SearchResultItem key={pin.id} pin={pin} onSelect={() => { setEditedStops(prev => [...prev, pin]); setSearchTerm(''); }} />)}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-white">Stops ({editedStops.length})</h4>
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                    {editedStops.map(stop => (
                                        <div key={stop.id} className="flex items-center justify-between bg-gray-800 p-2 rounded-md">
                                            <p className="text-sm text-gray-300">{stop.title.rendered}</p>
                                            <button onClick={() => setEditedStops(prev => prev.filter(s => s.id !== stop.id))}><Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button onClick={handleUpdateExperience} disabled={isSaving} className="w-full bg-green-600 hover:bg-green-500">{isSaving ? "Saving Changes..." : "Save Changes"}</Button>
                        </div>
                    </div>
                );
            }
        // --- NORMAL DETAIL VIEW ---
        return (
                <div className="p-4">
                    <Button variant="ghost" onClick={() => setSelectedExperience(null)} className="mb-4 text-white"><ArrowLeft className="w-4 h-4 mr-2" /> Back to My Experiences</Button>
                    <h3 className="font-bold text-xl mb-4 text-white">{selectedExperience.name}</h3>
                    
                    <div className="space-y-3 mb-4">
                        <Button onClick={() => onViewExperience(selectedExperience)} className="w-full bg-blue-600 hover:bg-blue-500"><MapPin className="w-4 h-4 mr-2"/>View on Map</Button>
                        <div className="flex gap-3">
                            <Button variant="outline" className="w-full text-white" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-2"/>Edit</Button>
                            <Button variant="destructive" className="w-full" onClick={() => handleDeleteExperience(selectedExperience.id)}><Trash2 className="w-4 h-4 mr-2"/>Delete</Button>
                        </div>
                    </div>

                    <h4 className="font-semibold text-white mt-6 border-b border-gray-700 pb-2 mb-2">Stops</h4>
                    {experienceStops.status === 'loading' && <p className="text-gray-400">Loading stops...</p>}
                    {experienceStops.status === 'error' && <p className="text-red-400">Could not load stops.</p>}
                    {experienceStops.status === 'success' && (
                        <div className="flex flex-col gap-4">
                            {experienceStops.data.map((step, index) => (
                                <div key={step.id} className="relative p-4 border-l-4 border-gray-600 hover:bg-white/10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-gray-700 text-gray-200">{index + 1}</span>
                                        <h4 className="font-semibold text-md">{step.title.rendered}</h4>
                                    </div>
                                    <p className="text-sm text-gray-300 pl-11">{step.acf.quest_step_description}</p>
                                    {/* We can add the "Mark as Completed" toggle here later */}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
    
        if (experiencesView === 'create') {
            return (
                <div className="p-4">
                    <Button variant="ghost" onClick={() => setExperiencesView('list')} className="mb-4 text-white"><ArrowLeft className="w-4 h-4 mr-2" /> Back to My Experiences</Button>
                    <h3 className="font-bold text-lg mb-4 text-white">Create New Experience</h3>
                    <div className="space-y-4">
                        <Input placeholder="Experience Name..." value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Search locations to add..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white" />
                            {searchResults.length > 0 && (
                                <div className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10 p-1">
                                    {searchResults.map(pin => <SearchResultItem key={pin.id} pin={pin} onSelect={() => { addStop(pin); setSearchTerm(''); }} />)}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold text-white">Stops ({stops.length})</h4>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {stops.map(stop => (
                                    <div key={stop.id} className="flex items-center justify-between bg-gray-800 p-2 rounded-md">
                                        <p className="text-sm text-gray-300">{stop.title.rendered}</p>
                                        <button onClick={() => removeStop(stop.id)}><X className="w-4 h-4 text-gray-500 hover:text-white" /></button>
                                    </div>
                                ))}
                                {stops.length === 0 && <p className="text-sm text-gray-500">Add stops using the search bar above.</p>}
                            </div>
                        </div>
                        <Button onClick={handleSaveExperience} disabled={isSaving} className="w-full bg-green-600 hover:bg-green-500">{isSaving ? "Saving..." : "Save Experience"}</Button>
                    </div>
                </div>
            );
        }
        // --- LIST VIEW (Now Clickable) ---
        return (
            <div className="p-4">
                <Button onClick={() => setExperiencesView('create')} className="w-full mb-4 bg-green-600 hover:bg-green-500"><PlusCircle className="w-4 h-4 mr-2"/> Create New Experience</Button>
                {loadingRoutes ? <p className="text-gray-400">Loading your experiences...</p> : (
                    myRoutes.length > 0 ? (
                        myRoutes.map(route => (
                            <button 
                                key={route.id} 
                                onClick={() => setSelectedExperience(route)} 
                                className="w-full text-left p-3 mb-2 bg-gray-800 rounded-md hover:bg-gray-700"
                            >
                                <p className="font-semibold text-white">{route.name}</p>
                                <p className="text-xs text-gray-400">{route.stops.length} stops</p>
                            </button>
                        ))
                    ) : <p className="text-gray-400 text-center py-4">You haven&apos;t created any experiences yet.</p>
                )}
            </div>
        );
    };

    // --- NEW: Fetch full stop details for the selected experience ---
    useEffect(() => {
        if (!selectedExperience) {
            setExperienceStops({ status: 'idle', data: [] });
            return;
        }

        const fetchExperienceStops = async () => {
            setExperienceStops({ status: 'loading', data: [] });
            const stopIds = selectedExperience.stops.join(',');
            const apiUrl = `https://data.hyrosy.com/wp-json/wp/v2/locations?acf_format=standard&include=${stopIds}&orderby=include`;
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('Failed to fetch experience stops');
                const fullStopsData = await response.json();
                const orderedStops = selectedExperience.stops.map(stopId => 
                    fullStopsData.find(stop => stop.id === stopId)
                ).filter(Boolean);
                setExperienceStops({ status: 'success', data: orderedStops });
            } catch (error) {
                console.error("Error fetching experience stops:", error);
                setExperienceStops({ status: 'error', data: [] });
            }
        };

        fetchExperienceStops();
    }, [selectedExperience]);
    
    const panelClasses = clsx('fixed top-0 left-0 w-96 h-full bg-black/80 backdrop-blur-md text-white shadow-2xl z-[1001] flex flex-col transition-transform duration-500 ease-in-out', isOpen ? 'translate-x-0' : '-translate-x-full');

    return (
        <div className={panelClasses}>
            <div className="flex justify-between items-center p-4 bg-black/30 border-b border-gray-700">
                <h2 className="text-xl font-bold">{activeQuest ? activeQuest.title.rendered : 'Discover'}</h2>
                <button onClick={onClose} className="text-3xl">&times;</button>
            </div>

            <div className="flex border-b border-gray-700 flex-shrink-0">
                <button onClick={() => setMainTab('quests')} className={clsx("flex-1 p-3 text-sm font-semibold", mainTab === 'quests' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400')}>Official Quests</button>
                <button onClick={() => setMainTab('experiences')} className={clsx("flex-1 p-3 text-sm font-semibold", mainTab === 'experiences' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400')}>My Experiences</button>
            </div>

            <div className="flex-grow overflow-y-auto">
                {mainTab === 'quests' ? (
                    <div className="p-5">
                        {!activeQuest ? (
                            <div className="flex flex-col h-full">
                                <div className="flex border-b border-gray-700 flex-shrink-0 mb-4">
                                    <button onClick={() => setQuestsActiveTab('by_city')} className={clsx("flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2", questsActiveTab === 'by_city' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400')}><Building className="w-4 h-4"/> By City</button>
                                    <button onClick={() => setQuestsActiveTab('multi_city')} className={clsx("flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2", questsActiveTab === 'multi_city' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400')}><Globe className="w-4 h-4"/> Multi-City</button>
                                    <button onClick={() => setQuestsActiveTab('premium')} className={clsx("flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2", questsActiveTab === 'premium' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400')}><Star className="w-4 h-4"/> Premium</button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {questsActiveTab === 'by_city' && (
                                        <div className="space-y-2">
                                            {Object.entries(questsByCity).map(([city, cityQuests]) => (
                                                <div key={city}>
                                                    <button onClick={() => setOpenAccordion(openAccordion === city ? null : city)} className="w-full flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50">
                                                        <span className="font-semibold">{city}</span>
                                                        <ChevronDown className={clsx("w-5 h-5 transition-transform", openAccordion === city && "rotate-180")} />
                                                    </button>
                                                    {openAccordion === city && (
                                                        <div className="pl-2 pr-2 pt-2 space-y-2">
                                                            {cityQuests.map(quest => <QuestCard key={quest.id} quest={quest} onQuestSelect={onQuestSelect} exploredSteps={exploredSteps} />)}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {questsActiveTab === 'multi_city' && ( <div className="space-y-4">{multiCityQuests.map(quest => <QuestCard key={quest.id} quest={quest} onQuestSelect={onQuestSelect} exploredSteps={exploredSteps} />)}</div> )}
                                    {questsActiveTab === 'premium' && ( <div className="space-y-4">{premiumQuests.map(quest => <QuestCard key={quest.id} quest={quest} onQuestSelect={onQuestSelect} exploredSteps={exploredSteps} />)}</div> )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <button onClick={handleBack} className="mb-5 px-4 py-2 text-sm border border-gray-500 rounded-full hover:bg-gray-700 transition-colors">&larr; Back to Quests</button>
                                <div className="mb-5 p-4 bg-blue-900/50 rounded-lg border border-blue-700">
                                    <p className="text-sm text-blue-200 mb-3">Get the full experience. Book all steps of this quest in one go.</p>
                                    <button onClick={handleBookFullQuest} disabled={isBookingQuest} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center transition-colors">
                                        {isBookingQuest ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : "Book Entire Quest"}
                                    </button>
                                </div>
                                {stepsData.status === 'loading' && <p>Loading quest steps...</p>}
                                {stepsData.status === 'error' && <p>Could not load quest. Please try again.</p>}
                                {stepsData.status === 'success' && (
                                    <div className="flex flex-col gap-4">
                                        {stepsData.data.map((step, index) => {
                                            const isExplored = exploredSteps.has(step.id);
                                            return (
                                                <div key={step.id} className={clsx('relative p-4 cursor-pointer transition-all border-l-4', { 'bg-blue-500/20 border-blue-500': index === currentStepIndex, 'border-gray-600 hover:bg-white/10': index !== currentStepIndex })} onClick={() => handleStepClick(step, index)}>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-bold', { 'bg-blue-500 text-white': index === currentStepIndex, 'bg-gray-700 text-gray-200': index !== currentStepIndex })}>{index + 1}</span>
                                                        <h4 className="font-semibold text-md">{step.title.rendered}</h4>
                                                    </div>
                                                    <p className="text-sm text-gray-300 pl-11">{step.acf.quest_step_description}</p>
                                                    <div className="absolute top-4 right-4">
                                                        <button onClick={(e) => { e.stopPropagation(); onToggleStepExplored(step.id); }} className={clsx("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", isExplored ? "bg-green-600" : "bg-gray-600")} aria-pressed={isExplored} aria-label={isExplored ? "Mark as Unexplored" : "Mark as Explored"}>
                                                            <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", isExplored ? "translate-x-6" : "translate-x-1")} />
                                                        </button>
                                                    </div>
                                                    {step.acf.is_bookable_activity && ( <button className="mt-3 ml-11 px-3 py-2 text-xs bg-blue-600 rounded hover:bg-blue-500 transition-colors">{step.acf.bookable_cta_text}</button> )}
                                                    {step.acf.quest_tip && ( <p className="mt-3 ml-11 p-3 text-xs bg-yellow-500/10 border-l-4 border-yellow-400 rounded-r-md italic">💡 {step.acf.quest_tip}</p> )}
                                                </div>
                                            ); 
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    renderMyExperiences()
                )}
            </div>
        </div>
    );
};

export default QuestPanel;