'use client';

import clsx from 'clsx';
import { Tag } from 'lucide-react';

const CategorySidebar = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 h-full">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Tag className="w-5 h-5 mr-2 text-cyan-400" />
        Categories
      </h2>
      <div className="space-y-1">
        <button
          onClick={() => onSelectCategory(null)}
          className={clsx(
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
            !selectedCategory ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-white/10 hover:text-white'
          )}
        >
          All Experiences
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={clsx(
              'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
              selectedCategory === category.id ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-white/10 hover:text-white'
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategorySidebar;