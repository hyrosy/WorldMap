// src/components/StoryArchivePanel.js
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import StoryPanel from './StoryPanel';
import { X, ArrowLeft } from 'lucide-react';

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
                    // Use _embed to get details like the featured image
                    const response = await fetch('https://data.hyrosy.com/wp-json/wp/v2/story?_embed');
                    if (!response.ok) {
                        throw new Error('Failed to fetch stories');
                    }
                    const data = await response.json();
                    setStories(data);
                    setIsListFetched(true); // Mark list as fetched
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchStories();
        }
    }, [isOpen, isListFetched]);

    // This effect checks if the panel should open directly to a story
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
        <div className={`fixed top-0 right-0 h-full bg-gray-900 text-white w-full max-w-sm z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Panel Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                {selectedStoryId ? (
                    <button onClick={handleBackToList} className="text-gray-300 hover:text-white transition-colors flex items-center text-sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Stories
                    </button>
                ) : (
                    <h2 className="text-lg font-semibold">Story Archive</h2>
                )}
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            {/* Panel Content */}
            <div className="overflow-y-auto h-[calc(100%-60px)]">
                {selectedStoryId ? (
                    // If a story is selected, show it immediately
                    <StoryPanel storyId={selectedStoryId} />
                ) : isLoading ? (
                    // Show loader only for the list view
                    <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div></div>
                ) : (
                    // Otherwise, show the list of stories
                    <div className="p-4 space-y-4">
                        {stories.length > 0 ? stories.map(story => (
                            <div key={story.id} onClick={() => handleSelectStory(story.id)} className="flex items-center gap-4 p-2 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                                <div className="relative w-24 h-16 bg-gray-700 rounded-md overflow-hidden flex-shrink-0">
                                    {story._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
                                        <Image src={story._embedded['wp:featuredmedia'][0].source_url} alt={story.title.rendered} fill className="object-cover"/>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{story.title.rendered}</h3>
                                    {story.excerpt?.rendered && (
                                         <div className="text-sm text-gray-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: story.excerpt.rendered }}/>
                                    )}
                                </div>
                            </div>
                        )) : (
                             <p className="text-center text-gray-400 mt-8">No stories found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryArchivePanel;