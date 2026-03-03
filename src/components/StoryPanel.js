import React, { useState, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

// Helper to strip HTML from WordPress text
const stripHtml = (html) => html ? html.replace(/<[^>]*>?/gm, '').trim() : '';

const StoryPanel = ({ storyId }) => {
    const [story, setStory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!storyId) return;

        const fetchStory = async () => {
            setIsLoading(true);
            try {
                // We only need the title and acf fields from the API response
                const response = await fetch(`https://data.hyrosy.com/wp-json/wp/v2/story/${storyId}?_fields=title,acf`);
                if (!response.ok) {
                    throw new Error('Story not found');
                }
                const data = await response.json();
                setStory(data);
            } catch (error) {
                console.error("Failed to fetch story:", error);
                setStory(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStory();
    }, [storyId]);

    // Helper function to create an array of image-description pairs
    const getStoryContent = () => {
        if (!story || !story.acf) return [];
        
        const content = [];
        for (let i = 1; i <= 5; i++) {
            const image = story.acf[`image_${i}`];
            const description = story.acf[`description_${i}`];

            if (image) {
                content.push({ image, description });
            }
        }
        return content;
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center p-10">
                <ActivityIndicator size="large" color="#22d3ee" />
            </View>
        );
    }

    if (!story) {
        return (
            <View className="p-6 items-center">
                <Text className="text-gray-400 text-base">Could not load the story.</Text>
            </View>
        );
    }

    const storyContent = getStoryContent();
    const videoUrl = story.acf.video_url ? story.acf.video_url.replace("watch?v=", "embed/") : null;

    return (
        <ScrollView className="p-4 flex-1" showsVerticalScrollIndicator={false}>
            <View className="space-y-6 pb-10">
                
                {/* Header */}
                {story.acf.header && (
                    <Text className="text-gray-300 text-base leading-6">
                        {stripHtml(story.acf.header)}
                    </Text>
                )}
                
                {/* Video */}
                {videoUrl && (
                    <View className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-gray-800">
                        {Platform.OS === 'web' ? (
                            <iframe 
                                src={videoUrl} 
                                frameBorder="0" 
                                allow="autoplay; encrypted-media" 
                                allowFullScreen 
                                title="Embedded video"
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <WebView 
                                source={{ uri: videoUrl }}
                                style={{ flex: 1 }}
                                allowsFullscreenVideo
                            />
                        )}
                    </View>
                )}
                
                {/* Image & Description Pairs */}
                <View className="space-y-8">
                    {storyContent.map((item, index) => (
                        <View key={index} className="space-y-3">
                            <View className="w-full aspect-video bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-md">
                                <Image 
                                    source={{ uri: item.image.url }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            </View>
                            
                            {item.description && (
                                <Text className="text-gray-300 text-sm leading-6">
                                    {stripHtml(item.description)}
                                </Text>
                            )}
                        </View>
                    ))}
                </View>

            </View>
        </ScrollView>
    );
};

export default StoryPanel;