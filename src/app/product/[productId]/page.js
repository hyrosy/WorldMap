'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { ArrowLeft, ShoppingCart, CheckCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ProductPage() {
    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdded, setIsAdded] = useState(false);
    const { productId } = useParams();

    useEffect(() => {
        if (!productId) return;

        const fetchProduct = async () => {
            setIsLoading(true);
            const consumerKey = 'ck_6083a60490a09aa1bcfe51c7c726b6688aa7ae31';
            const consumerSecret = 'cs_32aa0ca86999411c24a3aeb4b11c2cb0ce9f186b';
            const authString = btoa(`${consumerKey}:${consumerSecret}`);
            const headers = { 'Authorization': `Basic ${authString}` };

            try {
                const response = await fetch(`https://data.hyrosy.com/wp-json/wc/v3/products/${productId}`, { headers });
                if (!response.ok) throw new Error('Failed to fetch product');
                const data = await response.json();
                setProduct(data);
            } catch (error) {
                console.error("Failed to fetch product:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProduct();
    }, [productId]);
    
    const handleAddToCartClick = () => {
        if (!product) return;
        addToCart(product);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000); // Reset button state after 2 seconds
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-lg bg-black text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                Loading Experience...
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-lg bg-black text-white">
                <h2 className="text-2xl font-semibold">Product Not Found</h2>
                <Link href="/store" className="mt-4 text-blue-400 hover:underline">
                    Return to Store
                </Link>
            </div>
        );
    }

    const imageUrl = product.images?.[0]?.src || '/placeholder.png';

    return (
        <div className="bg-black text-white min-h-screen">
            <main className="p-4 sm:p-8 max-w-6xl mx-auto">
                {/* Back to Store Link */}
                <div className="mb-8">
                    <Link href="/store" className="inline-flex items-center text-gray-300 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Store
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    {/* Image Column */}
                    <div className="w-full aspect-square relative overflow-hidden rounded-lg border border-gray-700">
                        <Image
                            src={imageUrl}
                            alt={product.name || 'Product Image'}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                    </div>

                    {/* Details Column */}
                    <div className="flex flex-col py-4">
                        <h1 className="text-3xl sm:text-4xl font-bold mb-4">{product.name}</h1>
                        
                        <div
                            className="prose prose-invert max-w-none text-gray-300 mb-8"
                            dangerouslySetInnerHTML={{ __html: product.description }}
                        />

                        <div className="mt-auto flex flex-col sm:flex-row sm:items-center gap-6">
                           <p className="text-4xl font-bold text-cyan-400">${product.price}</p>
                           <Button 
                                size="lg" 
                                className={cn(
                                    "w-full sm:w-auto h-14 text-lg font-bold transition-colors duration-300",
                                    isAdded 
                                    ? "bg-green-600 hover:bg-green-700" 
                                    : "bg-blue-600 hover:bg-blue-500"
                                )}
                                onClick={handleAddToCartClick}
                                disabled={isAdded}
                            >
                                {isAdded ? (
                                    <CheckCircle className="h-6 w-6 mr-2" />
                                ) : (
                                    <ShoppingCart className="h-6 w-6 mr-2" />
                                )}
                                {isAdded ? 'Added to Itinerary!' : 'Add to Itinerary'}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}