'use client';

import React from 'react';
import clsx from 'clsx';
import { Globe, X } from 'lucide-react';

const QuickLocator = ({ cities, onCitySelect, onResetView, isOpen, onClose }) => {

  const panelClasses = clsx(
    "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md rounded-lg shadow-2xl z-50 w-full max-w-xs border border-gray-700 text-white transition-all duration-300 ease-in-out",
    isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
  );

  return (
    <div className={panelClasses}>
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-white">Quick Locator</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
        </button>
      </div>
      <ul className="p-2">
        {/* Special Button for Reset View */}
        <li className="mb-1">
          <button
            onClick={onResetView}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-semibold text-cyan-400 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            View All Morocco
          </button>
        </li>
        {/* Map over the cities */}
        {Object.entries(cities).map(([key, city]) => (
          <li key={key}>
            <button
              onClick={() => onCitySelect(key)}
              className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              {city.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QuickLocator;