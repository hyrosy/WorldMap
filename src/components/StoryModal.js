'use client';

import React from 'react';

const StoryModal = ({ videoUrl, onClose }) => {
  return (
    // Use Tailwind classes for the backdrop and modal container
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white text-4xl hover:opacity-80 transition-opacity"
        onClick={onClose}
      >
        &times;
      </button>
      <div
        className="relative w-full max-w-xl aspect-video p-4"
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking the video
      >
        <video
          className="w-full h-full rounded-lg"
          src={videoUrl}
          autoPlay
          controls
          muted
        />
      </div>
    </div>
  );
};

export default StoryModal;