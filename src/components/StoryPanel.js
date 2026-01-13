// src/components/StoryPanel.js
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

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
                setStory(null); // Set to null on error
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
        // Loop up to a reasonable number, e.g., 5 pairs
        for (let i = 1; i <= 5; i++) {
            const image = story.acf[`image_${i}`];
            const description = story.acf[`description_${i}`];

            // If an image exists for this number, add the pair to our content array
            if (image) {
                content.push({ image, description });
            }
        }
        return content;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    if (!story) {
        return <div className="p-6 text-center text-gray-400">Could not load the story.</div>;
    }

    const storyContent = getStoryContent();

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            {story.acf.header && (
                 <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: story.acf.header }} />
            )}
            
            {/* Video */}
            {story.acf.video_url && (
                <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
                    <iframe 
                        src={story.acf.video_url.replace("watch?v=", "embed/")} // Convert YouTube URL to embeddable format
                        frameBorder="0" 
                        allow="autoplay; encrypted-media" 
                        allowFullScreen 
                        title="Embedded video"
                        className="w-full h-full"
                    ></iframe>
                </div>
            )}
            
            {/* Image & Description Pairs */}
            <div className="space-y-6">
                {storyContent.map((item, index) => (
                    <div key={index} className="space-y-3">
                        <div className="relative aspect-video w-full bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                             <Image 
                                src={item.image.url}
                                alt={item.image.alt || `Story image ${index + 1}`}
                                fill
                                className="object-cover"
                            />
                        </div>
                       {item.description && (
                            <div className="prose prose-invert max-w-none text-gray-300 text-sm" dangerouslySetInnerHTML={{ __html: item.description }} />
                       )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StoryPanel;