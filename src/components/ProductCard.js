'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const ProductCard = ({ product }) => {
  const imageUrl = product.images && product.images.length > 0 ? product.images[0].src : '/placeholder.png';

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="h-full flex flex-col overflow-hidden rounded-lg bg-gray-900/50 border border-gray-700 transition-all duration-300 hover:border-gray-500 hover:shadow-2xl hover:-translate-y-1">
        
        {/* Image Container */}
        <div className="relative w-full aspect-square overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        
        {/* Text Content */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold leading-snug text-white flex-grow">{product.name}</h3>
          <p className="mt-2 text-xl font-bold text-cyan-400">${product.price}</p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;