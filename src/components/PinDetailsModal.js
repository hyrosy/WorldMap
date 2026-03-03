import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useCart } from "@/context/CartContext";
import { useAuth } from '@/context/AuthContext';
import useComments from '@/hooks/useComments';
import { encode as base64Encode } from 'base-64'; // <-- FIXED: Universal Base64 Encoder

// Native Icons
import { ArrowLeft, X, ShoppingBag, BookOpen, MapPin, ThumbsUp, ThumbsDown, Trash2, PlusCircle } from 'lucide-react-native';

// Sub-components
import ProductDetail from './ProductDetail';
import CommentForm from './CommentForm';
import AddToExperiencePopover from './AddToExperiencePopover';

// --- HELPER TO STRIP HTML TAGS FOR NATIVE TEXT ---
const stripHtml = (html) => html ? html.replace(/<[^>]*>?/gm, '').trim() : '';

// --- SUB-COMPONENT FOR A SINGLE COMMENT ---
const Comment = ({ comment, session, onDelete, onVote }) => {
    const isOwner = session?.user?.id === comment.user_id;
    const { upvotes, downvotes, userVote } = comment;    
    const hasUpvoted = userVote === true;
    const hasDownvoted = userVote === false;

    return (
        <View className="py-5 border-b border-gray-800">
            <Text className="font-bold text-sm text-white mb-2">{comment.profiles?.username || 'Anonymous'}</Text>
            
            {comment.image_urls && comment.image_urls.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 w-full">
                    {comment.image_urls.map((url, index) => (
                        <Image 
                            key={index} 
                            source={{ uri: url }} 
                            className="w-64 h-48 rounded-xl mr-3 bg-gray-800 border border-gray-700" 
                            resizeMode="cover" 
                        />
                    ))}
                </ScrollView>
            )}

            <Text className="text-gray-300 text-sm mb-4 leading-5">{comment.content}</Text>

            {/* --- ACTION ROW --- */}
            <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-5">
                    <TouchableOpacity 
                        onPress={() => session && onVote(comment.id, true, userVote)}
                        disabled={!session}
                        className="flex-row items-center gap-1.5 active:opacity-70"
                    >
                        <ThumbsUp size={16} color={hasUpvoted ? "#4ade80" : "#9ca3af"} />
                        <Text className={hasUpvoted ? "text-green-400 text-xs font-bold" : "text-gray-400 text-xs font-bold"}>{upvotes}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => session && onVote(comment.id, false, userVote)}
                        disabled={!session}
                        className="flex-row items-center gap-1.5 active:opacity-70"
                    >
                        <ThumbsDown size={16} color={hasDownvoted ? "#f87171" : "#9ca3af"} />
                        <Text className={hasDownvoted ? "text-red-400 text-xs font-bold" : "text-gray-400 text-xs font-bold"}>{downvotes}</Text>
                    </TouchableOpacity>
                </View>

                {isOwner && (
                    <TouchableOpacity onPress={() => onDelete(comment.id)} className="p-2 -mr-2 active:opacity-70">
                        <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// --- API ENDPOINTS ---
const BOOKINGS_API_URL = 'https://data.hyrosy.com';
const PRODUCTS_API_URL = 'https://www.hyrosy.com';

const fetchProductsFromSource = async (baseUrl, key, secret, { productId, categoryId }) => {
    let url = '';
    if (productId) url = `${baseUrl}/wp-json/wc/v3/products/${productId}`;
    else if (categoryId) url = `${baseUrl}/wp-json/wc/v3/products?category=${categoryId}`;
    else return []; 

    // FIXED: Using our universal base64 encoder
    const authString = base64Encode(`${key}:${secret}`);
    const response = await fetch(url, { headers: { 'Authorization': `Basic ${authString}` } });
    
    if (!response.ok) throw new Error(`Failed to fetch from ${baseUrl}. Status: ${response.status}`);
    
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
};

// --- MAIN MODAL COMPONENT ---
export default function PinDetailsModal({ pin, isOpen, onClose, onReadStory, onGetDirections }) {
    const { addToCart } = useCart();
    
    const [currentView, setCurrentView] = useState('details'); 
    const [activeTab, setActiveTab] = useState('bookings');   
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [bookings, setBookings] = useState({ status: 'idle', data: [] });
    const [physicalProducts, setPhysicalProducts] = useState({ status: 'idle', data: [] });

    const { session } = useAuth();
    const { comments, loadingInitial, hasMore, fetchMoreComments, postComment, deleteComment, handleVote } = useComments(pin?.id);
    const [popoverOpen, setPopoverOpen] = useState(false); 

    const handlePostComment = async (content, imageUrls) => {
        if (!session?.user) return;
        await postComment({ 
            content: content, 
            userId: session.user.id, 
            locationId: pin.id,
            imageUrls: imageUrls 
        });
    };

    const hasBookings = !!(pin?.bookable_product_id || pin?.bookable_category_id);
    const hasProducts = !!(pin?.connector_id || pin?.category_connector_id);
    const hasStory = !!pin?.story_id;

    useEffect(() => {
        if (isOpen) {
            setCurrentView('details');
            setSelectedProduct(null);
            setBookings({ status: 'idle', data: [] });
            setPhysicalProducts({ status: 'idle', data: [] });
            setPopoverOpen(false);

            if (hasBookings) setActiveTab('bookings');
            else if (hasProducts) setActiveTab('products');
        }
    }, [isOpen, pin, hasBookings, hasProducts]);
    
    useEffect(() => {
        if (currentView !== 'hub' || !pin) return;

        const fetchAllData = async () => {
            if (hasBookings && bookings.status === 'idle') {
                setBookings({ status: 'loading', data: [] });
                try {
                    const bookingData = await fetchProductsFromSource(
                        BOOKINGS_API_URL,
                        process.env.EXPO_PUBLIC_DATA_WOOCOMMERCE_KEY || process.env.NEXT_PUBLIC_DATA_WOOCOMMERCE_KEY,
                        process.env.EXPO_PUBLIC_DATA_WOOCOMMERCE_SECRET || process.env.NEXT_PUBLIC_DATA_WOOCOMMERCE_SECRET,
                        { productId: pin.bookable_product_id, categoryId: pin.bookable_category_id }
                    );
                    setBookings({ status: 'success', data: bookingData });
                } catch (error) {
                    setBookings({ status: 'error', data: [] });
                }
            }

            if (hasProducts && physicalProducts.status === 'idle') {
                setPhysicalProducts({ status: 'loading', data: [] });
                try {
                    const productData = await fetchProductsFromSource(
                        PRODUCTS_API_URL,
                        process.env.EXPO_PUBLIC_WOOCOMMERCE_KEY || process.env.NEXT_PUBLIC_WOOCOMMERCE_KEY,
                        process.env.EXPO_PUBLIC_WOOCOMMERCE_SECRET || process.env.NEXT_PUBLIC_WOOCOMMERCE_SECRET,
                        { productId: pin.connector_id, categoryId: pin.category_connector_id }
                    );
                    setPhysicalProducts({ status: 'success', data: productData });
                } catch (error) {
                    setPhysicalProducts({ status: 'error', data: [] });
                }
            }
        };
        fetchAllData();
    }, [currentView, pin, hasBookings, hasProducts, bookings.status, physicalProducts.status]);

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setCurrentView('product');
    };

    if (!pin) return null;
    
    const listToDisplay = activeTab === 'bookings' ? bookings : physicalProducts;
    const pinImageUrl = pin.image_url;

    const renderContent = () => {
        
        // --- WINDOW 3: PRODUCT DETAIL VIEW ---
        if (currentView === 'product' && selectedProduct) {
            return (
                <ProductDetail 
                    product={selectedProduct}
                    onAddToCart={addToCart}
                    onBack={() => setCurrentView('hub')}
                />
            );
        }

        // --- WINDOW 2: HUB VIEW WITH TABS ---
        if (currentView === 'hub') {
            return (
                <View className="flex-1 flex-col">
                    {hasBookings && hasProducts && (
                        <View className="flex-row border-b border-gray-800 bg-gray-900">
                            <TouchableOpacity onPress={() => setActiveTab('bookings')} className={`flex-1 p-4 flex-row items-center justify-center gap-2 ${activeTab === 'bookings' ? 'border-b-2 border-cyan-400' : ''}`}>
                                <BookOpen size={16} color={activeTab === 'bookings' ? '#22d3ee' : '#9ca3af'} />
                                <Text className={activeTab === 'bookings' ? 'text-cyan-400 font-bold' : 'text-gray-400 font-bold'}>Book Experience</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setActiveTab('products')} className={`flex-1 p-4 flex-row items-center justify-center gap-2 ${activeTab === 'products' ? 'border-b-2 border-cyan-400' : ''}`}>
                                <ShoppingBag size={16} color={activeTab === 'products' ? '#22d3ee' : '#9ca3af'} />
                                <Text className={activeTab === 'products' ? 'text-cyan-400 font-bold' : 'text-gray-400 font-bold'}>Shop Products</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                        {listToDisplay.status === 'loading' && <ActivityIndicator color="#22d3ee" size="large" style={{ marginTop: 40 }}/>}
                        {listToDisplay.status === 'error' && <Text className="text-center text-red-400 mt-10 font-medium">Could not load items. Please try again later.</Text>}
                        
                        {listToDisplay.status === 'success' && listToDisplay.data.length > 0 ? (
                            listToDisplay.data.map(product => (
                                <TouchableOpacity key={product.id} onPress={() => handleSelectProduct(product)} className="flex-row items-center gap-4 p-3 bg-gray-800/80 rounded-xl mb-3 border border-gray-700 active:bg-gray-700 transition-colors">
                                    <View className="relative w-20 h-20 flex-shrink-0 bg-gray-900 rounded-lg overflow-hidden border border-gray-600">
                                        <Image source={{ uri: product.images?.[0]?.src || 'https://placehold.co/100' }} className="w-full h-full" resizeMode="cover"/>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-bold text-base text-white mb-1" numberOfLines={2}>{product.name}</Text>
                                        <Text className="text-cyan-400 font-black text-sm">{stripHtml(product.price_html)}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : listToDisplay.status === 'success' && <Text className="text-center text-gray-500 mt-10 italic">No items found.</Text>}
                    </ScrollView>
                </View>
            );
        }

        // --- WINDOW 1: INITIAL DETAILS VIEW ---
        return (
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {pinImageUrl && (
                    <View className="w-full h-64 relative mb-5 bg-gray-800 border-b border-gray-800">
                        <Image source={{ uri: pinImageUrl }} className="w-full h-full" resizeMode="cover" />
                        <View className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-gray-900 to-transparent" />
                    </View>
                )}
                
                <View className="px-5">
                    {pin.description && (
                        <Text className="text-gray-300 text-base leading-6 mb-6">
                            {stripHtml(pin.description)}
                        </Text>
                    )}

                    {/* Action Buttons Hub */}
                    {(hasBookings || hasProducts || hasStory) && (
                        <View className="mt-2 pt-6 border-t border-gray-800 space-y-3 gap-3"> 
                            <TouchableOpacity onPress={() => onGetDirections(pin)} className="w-full h-14 bg-blue-600 rounded-xl flex-row items-center justify-center shadow-lg active:bg-blue-700">
                                <MapPin size={20} color="white" className="mr-2"/>
                                <Text className="text-white font-bold text-base">Get Directions</Text>
                            </TouchableOpacity>            
                            
                            <TouchableOpacity onPress={() => setCurrentView('hub')} className="w-full h-14 bg-[#d3bc8e] rounded-xl flex-row items-center justify-center shadow-lg active:bg-[#c2a977]">
                                <ShoppingBag size={20} color="black" className="mr-2"/>
                                <Text className="text-black font-bold text-base">View Offers & Bookings</Text>
                            </TouchableOpacity>

                            {hasStory && (
                                <TouchableOpacity onPress={() => onReadStory(pin.story_id)} className="w-full h-14 border border-[#d3bc8e] bg-[#d3bc8e]/10 rounded-xl flex-row items-center justify-center active:bg-[#d3bc8e]/20">
                                    <BookOpen size={20} color="#d3bc8e" className="mr-2"/>
                                    <Text className="text-[#d3bc8e] font-bold text-base">Read Story</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Add to Experience Inline Popover */}
                    {session && (
                        <View className="mt-4">
                            <TouchableOpacity onPress={() => setPopoverOpen(!popoverOpen)} className="w-full h-14 bg-green-600 rounded-xl flex-row items-center justify-center shadow-lg active:bg-green-700">
                                <PlusCircle size={20} color="white" className="mr-2"/>
                                <Text className="text-white font-bold text-base">Add to Experience</Text>
                            </TouchableOpacity>
                            {popoverOpen && (
                                <View className="mt-3 p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-xl">
                                    <AddToExperiencePopover pin={pin} closePopover={() => setPopoverOpen(false)} />
                                </View>
                            )}
                        </View>
                    )}

                    {/* COMMENTS SECTION */}
                    <View className="mt-8 pt-6 border-t border-gray-800">
                        <Text className="text-xl font-bold text-white mb-5 tracking-wide">Community Tips</Text>
                        
                        {session ? (
                            <CommentForm locationId={pin.id} onCommentPosted={handlePostComment} />
                        ) : (
                            <View className="items-center justify-center py-6 bg-gray-800/50 rounded-xl mb-4 border border-gray-700">
                                <Text className="font-bold text-gray-400">Sign in to leave a tip for others!</Text>
                            </View>
                        )}
                        
                        {loadingInitial ? (
                            <ActivityIndicator color="#22d3ee" size="large" className="mt-6" />
                        ) : (
                            <View className="mt-2">
                                {comments.length > 0 ? (
                                    comments.map(comment => 
                                        <Comment key={comment.id} comment={comment} session={session} onDelete={deleteComment} onVote={handleVote} />
                                    )
                                ) : (
                                    <Text className="py-8 text-gray-500 text-center italic">No tips yet. Be the first to share!</Text>
                                )}
                                {hasMore && (
                                    <TouchableOpacity onPress={fetchMoreComments} className="w-full py-5 items-center active:opacity-70">
                                        <Text className="text-cyan-400 font-bold">Load More Tips</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        );
    };

    const handleBack = () => {
        if (currentView === 'product') setCurrentView('hub');
        else setCurrentView('details');
    }

    return (
        <Modal visible={isOpen} animationType="slide" transparent={true} onRequestClose={onClose}>
            {/* FIXED: Added KeyboardAvoidingView so the keyboard doesn't hide the Comment input! */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <View className="flex-1 justify-end bg-black/80">
                    <TouchableOpacity className="flex-1" onPress={onClose} />
                    
                    <View className="h-[90%] bg-gray-900 rounded-t-3xl border-t border-gray-700 w-full flex-col overflow-hidden shadow-2xl">
                        
                        {/* Header Area */}
                        <View className="p-5 border-b border-gray-800 flex-row justify-between items-center bg-black z-10">
                            {currentView !== 'details' ? (
                                <TouchableOpacity onPress={handleBack} className="flex-row items-center p-2 -ml-2 active:opacity-70">
                                    <ArrowLeft size={24} color="#d1d5db" />
                                </TouchableOpacity>
                            ) : <View style={{ width: 40 }} />} 
                            
                            <Text className="text-xl font-bold text-white flex-1 text-center" numberOfLines={1}>
                                {currentView === 'product' && selectedProduct ? selectedProduct.name : pin.name}
                            </Text>
                            
                            <TouchableOpacity onPress={onClose} className="p-2 -mr-2 bg-gray-800 rounded-full active:bg-gray-700">
                                <X size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                        
                        <View className="flex-1 bg-gray-900">
                            {renderContent()}
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}