import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import StoryPanel from './StoryPanel'; // Assuming you will/have converted this to Native too!
import { X, ArrowLeft } from 'lucide-react-native';

// Helper to strip HTML from WordPress excerpts
const stripHtml = (html) => html ? html.replace(/<[^>]*>?/gm, '').trim() : '';

const StoryArchivePanel = ({ isOpen, onClose, initialStoryId }) => {
    const [stories, setStories] = useState([]);
    const [selectedStoryId, setSelectedStoryId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isListFetched, setIsListFetched] = useState(false);

    useEffect(() => {
        if (isOpen && !isListFetched) {
            const fetchStories = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch('https://data.hyrosy.com/wp-json/wp/v2/story?_embed');
                    if (!response.ok) {
                        throw new Error('Failed to fetch stories');
                    }
                    const data = await response.json();
                    setStories(data);
                    setIsListFetched(true);
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchStories();
        }
    }, [isOpen, isListFetched]);

    // Check if the panel should open directly to a story
    useEffect(() => {
        if (isOpen && initialStoryId) {
            setSelectedStoryId(initialStoryId);
        }
    }, [isOpen, initialStoryId]);

    // When the panel is closed, reset the view to the list
    useEffect(() => {
        if (!isOpen) {
            setSelectedStoryId(null);
        }
    }, [isOpen]);

    const handleSelectStory = (storyId) => {
        setSelectedStoryId(storyId);
    };

    const handleBackToList = () => {
        setSelectedStoryId(null);
    };

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            {/* Background Overlay */}
            <View className="flex-1 justify-end bg-black/70 flex-row">
                
                {/* Clickable transparent area to close */}
                <TouchableOpacity className="flex-1" onPress={onClose} />

                {/* Slide-in Panel */}
                <SafeAreaView className="w-[85%] max-w-sm h-full bg-gray-900 shadow-2xl flex-col border-l border-gray-800 pt-10">
                    
                    {/* Panel Header */}
                    <View className="flex-row justify-between items-center p-5 bg-black border-b border-gray-800">
                        {selectedStoryId ? (
                            <TouchableOpacity 
                                onPress={handleBackToList} 
                                className="flex-row items-center active:opacity-70"
                            >
                                <ArrowLeft size={20} color="#d1d5db" className="mr-2" />
                                <Text className="text-gray-300 font-bold text-base">Back to Stories</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text className="text-xl font-bold text-white tracking-wide">Story Archive</Text>
                        )}
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-800 rounded-full active:bg-gray-700">
                            <X size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Panel Content */}
                    <View className="flex-1">
                        {selectedStoryId ? (
                            // Show selected story immediately
                            <StoryPanel storyId={selectedStoryId} />
                        ) : isLoading ? (
                            // Show loader
                            <View className="flex-1 items-center justify-center">
                                <ActivityIndicator size="large" color="#22d3ee" />
                            </View>
                        ) : (
                            // Show the list of stories
                            <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
                                {stories.length > 0 ? stories.map(story => {
                                    const imageUrl = story._embedded?.['wp:featuredmedia']?.[0]?.source_url;
                                    
                                    return (
                                        <TouchableOpacity 
                                            key={story.id} 
                                            onPress={() => handleSelectStory(story.id)} 
                                            className="flex-row items-center gap-4 p-3 mb-2 rounded-xl bg-gray-800/50 border border-gray-800 active:bg-gray-800 transition-colors"
                                        >
                                            <View className="relative w-24 h-20 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
                                                {imageUrl ? (
                                                    <Image 
                                                        source={{ uri: imageUrl }} 
                                                        className="w-full h-full" 
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View className="w-full h-full items-center justify-center bg-gray-800">
                                                        <Text className="text-gray-500 text-xs">No Image</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-bold text-white text-base mb-1" numberOfLines={2}>
                                                    {story.title.rendered}
                                                </Text>
                                                {story.excerpt?.rendered && (
                                                    // numberOfLines automatically truncates with '...' natively!
                                                    <Text className="text-xs text-gray-400 leading-tight" numberOfLines={2}>
                                                        {stripHtml(story.excerpt.rendered)}
                                                    </Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }) : (
                                    <Text className="text-center text-gray-500 mt-8 italic">No stories found.</Text>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

export default StoryArchivePanel;