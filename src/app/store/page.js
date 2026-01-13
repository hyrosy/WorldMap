'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
import CategorySidebar from '@/components/CategorySidebar';
import { Search } from 'lucide-react';

export default function StorePage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const consumerKey = 'ck_6083a60490a09aa1bcfe51c7c726b6688aa7ae31';
            const consumerSecret = 'cs_32aa0ca86999411c24a3aeb4b11c2cb0ce9f186b';
            const authString = btoa(`${consumerKey}:${consumerSecret}`);
            const headers = { 'Authorization': `Basic ${authString}` };

            try {
                const [productsRes, categoriesRes] = await Promise.all([
                    fetch('https://data.hyrosy.com/wp-json/wc/v3/products', { headers }),
                    fetch('https://data.hyrosy.com/wp-json/wc/v3/products/categories', { headers })
                ]);

                if (!productsRes.ok || !categoriesRes.ok) {
                    throw new Error('Failed to fetch data');
                }

                const productsData = await productsRes.json();
                const categoriesData = await categoriesRes.json();

                setProducts(productsData);
                const validCategories = Array.isArray(categoriesData) ? categoriesData : [];
                setCategories(categoriesData.filter(cat => cat.slug !== 'uncategorized'));
            } catch (error) {
                console.error("Failed to fetch store data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredProducts = selectedCategory
        ? products.filter(p => p.categories.some(c => c.id === selectedCategory))
        : products;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-lg bg-black text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                Loading Store...
            </div>
        );
    }

    return (
        <div className="bg-black text-white min-h-screen">
            {/* Page Header */}
            <header className="py-10 px-8 border-b border-gray-700">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold">Store</h1>
                    <p className="text-gray-400 mt-1">Browse all available experiences</p>
                </div>
            </header>

            <main className="flex flex-col md:flex-row max-w-7xl mx-auto p-4 sm:p-8 gap-8">
                {/* Sidebar */}
                <aside className="w-full md:w-1/4 lg:w-1/5">
                    <CategorySidebar
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                    />
                </aside>

                {/* Product Grid */}
                <div className="flex-1">
                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProducts.map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 flex flex-col items-center justify-center bg-gray-900/50 border border-gray-700 rounded-lg">
                            <Search className="w-12 h-12 text-gray-500 mb-4" />
                            <h2 className="text-2xl font-semibold text-white">No Products Found</h2>
                            <p className="text-gray-400 mt-2">Try selecting a different category or view all experiences.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}