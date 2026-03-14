import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  useWindowDimensions, // 🌟 ADDED FOR RESPONSIVE TWO-COLUMN LAYOUT
} from "react-native";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import useComments from "@/hooks/useComments";
import { encode as base64Encode } from "base-64";

// 🌟 NATIVE ICONS 🌟
import {
  ArrowLeft,
  X,
  ShoppingBag,
  BookOpen,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  PlusCircle,
  Phone,
  Globe,
  Clock,
  Star,
  Lock,
} from "lucide-react-native";

// Sub-components
import ProductDetail from "./ProductDetail";
import CommentForm from "./CommentForm";
import AddToExperiencePopover from "./AddToExperiencePopover";

const stripHtml = (html) => (html ? html.replace(/<[^>]*>?/gm, "").trim() : "");

// --- SUB-COMPONENT FOR A SINGLE COMMENT (TRAVELER NOTE) ---
const Comment = ({ comment, session, onDelete, onVote, onRequestAuth }) => {
  const isOwner = session?.user?.id === comment.user_id;
  const { upvotes, downvotes, userVote } = comment;
  const hasUpvoted = userVote === true;
  const hasDownvoted = userVote === false;

  const handleVoteClick = (isUpvote) => {
    if (!session) {
      onRequestAuth();
      return;
    }
    onVote(comment.id, isUpvote, userVote);
  };

  return (
    <View className="py-5 border-b border-[#3b3e52]">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="font-bold text-sm text-white">
          {comment.profiles?.username || "Traveler"}
        </Text>
      </View>

      {comment.image_urls && comment.image_urls.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3 w-full"
        >
          {comment.image_urls.map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              className="w-64 h-48 rounded-xl mr-3 bg-[#2e3142] border border-[#3b3e52]"
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      <Text className="text-gray-300 text-sm mb-4 leading-5">
        {comment.content}
      </Text>

      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center gap-5">
          <TouchableOpacity
            onPress={() => handleVoteClick(true)}
            className="flex-row items-center gap-1.5 active:scale-95"
          >
            <ThumbsUp size={16} color={hasUpvoted ? "#d3bc8e" : "#6b7280"} />
            <Text
              className={
                hasUpvoted
                  ? "text-[#d3bc8e] text-xs font-bold"
                  : "text-gray-500 text-xs font-bold"
              }
            >
              {upvotes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleVoteClick(false)}
            className="flex-row items-center gap-1.5 active:scale-95"
          >
            <ThumbsDown
              size={16}
              color={hasDownvoted ? "#ef4444" : "#6b7280"}
            />
            <Text
              className={
                hasDownvoted
                  ? "text-red-400 text-xs font-bold"
                  : "text-gray-500 text-xs font-bold"
              }
            >
              {downvotes}
            </Text>
          </TouchableOpacity>
        </View>

        {isOwner && (
          <TouchableOpacity
            onPress={() => onDelete(comment.id)}
            className="p-2 -mr-2 active:scale-95"
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const BOOKINGS_API_URL = "https://data.hyrosy.com";
const PRODUCTS_API_URL = "https://www.hyrosy.com";

const fetchProductsFromSource = async (
  baseUrl,
  key,
  secret,
  { productId, categoryId }
) => {
  let url = "";
  if (productId) url = `${baseUrl}/wp-json/wc/v3/products/${productId}`;
  else if (categoryId)
    url = `${baseUrl}/wp-json/wc/v3/products?category=${categoryId}`;
  else return [];

  const authString = base64Encode(`${key}:${secret}`);
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${authString}` },
  });
  if (!response.ok)
    throw new Error(
      `Failed to fetch from ${baseUrl}. Status: ${response.status}`
    );
  const data = await response.json();
  return Array.isArray(data) ? data : [data];
};

export default function PinDetailsModal({
  pin,
  isOpen,
  onClose,
  onReadStory,
  onGetDirections,
  onRequestAuth,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 800; // 🌟 RESPONSIVE BREAKPOINT

  const { addToCart } = useCart();
  const [currentView, setCurrentView] = useState("details");
  const [activeTab, setActiveTab] = useState("bookings");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [bookings, setBookings] = useState({ status: "idle", data: [] });
  const [physicalProducts, setPhysicalProducts] = useState({
    status: "idle",
    data: [],
  });

  const { session } = useAuth();
  const {
    comments,
    loadingInitial,
    hasMore,
    fetchMoreComments,
    postComment,
    deleteComment,
    handleVote,
  } = useComments(pin?.id);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handlePostComment = async (content, imageUrls) => {
    if (!session?.user) return;
    await postComment({
      content: content,
      userId: session.user.id,
      locationId: pin.id,
      imageUrls: imageUrls,
    });
  };

  const hasBookings = !!(pin?.bookable_product_id || pin?.bookable_category_id);
  const hasProducts = !!(pin?.connector_id || pin?.category_connector_id);
  const hasStory = !!pin?.story_id;

  useEffect(() => {
    if (isOpen) {
      setCurrentView("details");
      setSelectedProduct(null);
      setBookings({ status: "idle", data: [] });
      setPhysicalProducts({ status: "idle", data: [] });
      setPopoverOpen(false);

      if (hasBookings) setActiveTab("bookings");
      else if (hasProducts) setActiveTab("products");
    }
  }, [isOpen, pin, hasBookings, hasProducts]);

  useEffect(() => {
    if (currentView !== "hub" || !pin) return;

    const fetchAllData = async () => {
      if (hasBookings && bookings.status === "idle") {
        setBookings({ status: "loading", data: [] });
        try {
          const bookingData = await fetchProductsFromSource(
            BOOKINGS_API_URL,
            process.env.EXPO_PUBLIC_DATA_WOOCOMMERCE_KEY ||
              process.env.NEXT_PUBLIC_DATA_WOOCOMMERCE_KEY,
            process.env.EXPO_PUBLIC_DATA_WOOCOMMERCE_SECRET ||
              process.env.NEXT_PUBLIC_DATA_WOOCOMMERCE_SECRET,
            {
              productId: pin.bookable_product_id,
              categoryId: pin.bookable_category_id,
            }
          );
          setBookings({ status: "success", data: bookingData });
        } catch (error) {
          setBookings({ status: "error", data: [] });
        }
      }

      if (hasProducts && physicalProducts.status === "idle") {
        setPhysicalProducts({ status: "loading", data: [] });
        try {
          const productData = await fetchProductsFromSource(
            PRODUCTS_API_URL,
            process.env.EXPO_PUBLIC_WOOCOMMERCE_KEY ||
              process.env.NEXT_PUBLIC_WOOCOMMERCE_KEY,
            process.env.EXPO_PUBLIC_WOOCOMMERCE_SECRET ||
              process.env.NEXT_PUBLIC_WOOCOMMERCE_SECRET,
            {
              productId: pin.connector_id,
              categoryId: pin.category_connector_id,
            }
          );
          setPhysicalProducts({ status: "success", data: productData });
        } catch (error) {
          setPhysicalProducts({ status: "error", data: [] });
        }
      }
    };
    fetchAllData();
  }, [
    currentView,
    pin,
    hasBookings,
    hasProducts,
    bookings.status,
    physicalProducts.status,
  ]);

  if (!pin) return null;

  const listToDisplay = activeTab === "bookings" ? bookings : physicalProducts;

  const galleryImages =
    pin.gallery && Array.isArray(pin.gallery) ? pin.gallery : [];
  const allImages = pin.image_url
    ? [pin.image_url, ...galleryImages]
    : galleryImages;

  const renderContent = () => {
    // --- WINDOW 3: PRODUCT DETAIL ---
    if (currentView === "product" && selectedProduct) {
      return (
        <ProductDetail
          product={selectedProduct}
          onAddToCart={addToCart}
          onBack={() => setCurrentView("hub")}
        />
      );
    }

    // --- WINDOW 2: STORE/BOOKING HUB ---
    if (currentView === "hub") {
      return (
        <View className="flex-1 flex-col bg-[#1c1d28]">
          {hasBookings && hasProducts && (
            <View className="flex-row border-b border-[#3b3e52] bg-[#2e3142]">
              <TouchableOpacity
                onPress={() => setActiveTab("bookings")}
                className={`flex-1 p-4 flex-row items-center justify-center gap-2 ${
                  activeTab === "bookings" ? "border-b-2 border-[#d3bc8e]" : ""
                }`}
              >
                <BookOpen
                  size={16}
                  color={activeTab === "bookings" ? "#d3bc8e" : "#9ca3af"}
                />
                <Text
                  className={
                    activeTab === "bookings"
                      ? "text-[#d3bc8e] font-bold"
                      : "text-gray-400 font-bold"
                  }
                >
                  Book Experience
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("products")}
                className={`flex-1 p-4 flex-row items-center justify-center gap-2 ${
                  activeTab === "products" ? "border-b-2 border-[#d3bc8e]" : ""
                }`}
              >
                <ShoppingBag
                  size={16}
                  color={activeTab === "products" ? "#d3bc8e" : "#9ca3af"}
                />
                <Text
                  className={
                    activeTab === "products"
                      ? "text-[#d3bc8e] font-bold"
                      : "text-gray-400 font-bold"
                  }
                >
                  Shop Products
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView
            className="flex-1 p-4"
            showsVerticalScrollIndicator={false}
          >
            {listToDisplay.status === "loading" && (
              <ActivityIndicator
                color="#d3bc8e"
                size="large"
                style={{ marginTop: 40 }}
              />
            )}
            {listToDisplay.status === "error" && (
              <Text className="text-center text-red-400 mt-10 font-medium">
                Could not load items from the Guild.
              </Text>
            )}

            {listToDisplay.status === "success" && listToDisplay.data.length > 0
              ? listToDisplay.data.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => {
                      setSelectedProduct(product);
                      setCurrentView("product");
                    }}
                    className="flex-row items-center gap-4 p-3 bg-[#2e3142] rounded-xl mb-3 border border-[#3b3e52] active:scale-95 transition-transform"
                  >
                    <View className="relative w-20 h-20 flex-shrink-0 bg-[#1c1d28] rounded-lg overflow-hidden border border-[#3b3e52]">
                      <Image
                        source={{
                          uri:
                            product.images?.[0]?.src ||
                            "https://placehold.co/100",
                        }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="font-bold text-base text-white mb-1"
                        numberOfLines={2}
                      >
                        {product.name}
                      </Text>
                      <Text className="text-[#d3bc8e] font-black text-sm">
                        {stripHtml(product.price_html)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              : listToDisplay.status === "success" && (
                  <Text className="text-center text-gray-500 mt-10 italic">
                    No items found.
                  </Text>
                )}
          </ScrollView>
        </View>
      );
    }

    // --- WINDOW 1: MAIN PIN DETAILS (Two-Column Responsive) ---
    return (
      <ScrollView
        className="flex-1 bg-[#1c1d28]"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: isDesktop ? "row" : "column" }}>
          {/* =================== LEFT COLUMN / TOP =================== */}
          <View
            style={{
              width: isDesktop ? "50%" : "100%",
              borderRightWidth: isDesktop ? 1 : 0,
              borderColor: "#3b3e52",
            }}
          >
            {/* GALLERY HEADER */}
            {allImages.length > 0 && (
              <View
                className={`w-full ${
                  isDesktop ? "h-64" : "h-72"
                } bg-[#1c1d28] relative`}
              >
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  className="w-full h-full"
                >
                  {allImages.map((img, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: img }}
                      style={{ width: isDesktop ? 425 : 400, height: "100%" }}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                <View className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#1c1d28] to-transparent pointer-events-none" />
                {allImages.length > 1 && (
                  <View className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                    <Text className="text-white text-xs font-bold tracking-widest">
                      1 / {allImages.length}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View
              className={`px-6 ${isDesktop ? "mt-4" : "-mt-4 relative z-10"}`}
            >
              {/* Location Info Hub */}
              <View className="flex-row flex-wrap gap-2 mb-6">
                {pin.rating && (
                  <View className="flex-row items-center bg-[#2e3142] border border-[#d3bc8e]/50 px-3 py-1.5 rounded-full shadow-sm">
                    <Star size={14} color="#d3bc8e" fill="#d3bc8e" />
                    <Text className="text-white text-xs font-bold ml-1">
                      {pin.rating}
                    </Text>
                  </View>
                )}
                <View className="flex-row items-center bg-[#2e3142] border border-[#3b3e52] px-3 py-1.5 rounded-full shadow-sm">
                  <MapPin size={14} color="#9ca3af" />
                  <Text className="text-gray-300 text-xs font-medium ml-1">
                    {pin.category || "Location"}
                  </Text>
                </View>
              </View>

              {/* Mobile Only Description (Shows here on phones, moves to right col on Desktop) */}
              {!isDesktop && pin.description && (
                <Text className="text-gray-300 text-base leading-7 mb-6 font-medium">
                  {stripHtml(pin.description)}
                </Text>
              )}

              {/* DIRECTORY INFO */}
              {(pin.phone || pin.website || pin.opening_hours) && (
                <View className="bg-[#2e3142] rounded-2xl p-4 border border-[#3b3e52] mb-6 space-y-4 shadow-sm">
                  {pin.opening_hours && (
                    <View className="flex-row items-center">
                      <Clock size={16} color="#d3bc8e" className="mr-3" />
                      <Text className="text-gray-300 text-sm flex-1">
                        {pin.opening_hours}
                      </Text>
                    </View>
                  )}
                  {pin.phone && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${pin.phone}`)}
                      className="flex-row items-center active:opacity-70"
                    >
                      <Phone size={16} color="#d3bc8e" className="mr-3" />
                      <Text className="text-white font-bold text-sm">
                        {pin.phone}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {pin.website && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(pin.website)}
                      className="flex-row items-center active:opacity-70 mt-4"
                    >
                      <Globe size={16} color="#d3bc8e" className="mr-3" />
                      <Text className="text-cyan-400 font-bold text-sm">
                        Visit Website
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* PRIMARY ACTION BUTTONS */}
              {(hasBookings || hasProducts || hasStory || session) && (
                <View
                  className={`pt-2 pb-6 border-[#3b3e52] space-y-3 ${
                    !isDesktop ? "border-b" : ""
                  }`}
                >
                  <TouchableOpacity
                    onPress={() => onGetDirections(pin)}
                    className="w-full h-14 bg-[#2e3142] border border-[#3b3e52] rounded-xl flex-row items-center justify-center shadow-lg active:bg-[#3b3e52]"
                  >
                    <MapPin size={20} color="#4ade80" className="mr-2" />
                    <Text className="text-white font-bold text-base">
                      Draw Route
                    </Text>
                  </TouchableOpacity>

                  {(hasBookings || hasProducts) && (
                    <TouchableOpacity
                      onPress={() => setCurrentView("hub")}
                      className="w-full h-14 bg-[#e6ce9a] rounded-xl flex-row items-center justify-center shadow-[0_0_20px_rgba(230,206,154,0.3)] active:scale-95"
                    >
                      <ShoppingBag size={20} color="#1c1d28" className="mr-2" />
                      <Text className="text-[#1c1d28] font-black text-base uppercase tracking-wider">
                        Guild Merchant
                      </Text>
                    </TouchableOpacity>
                  )}

                  {hasStory && (
                    <TouchableOpacity
                      onPress={() => onReadStory(pin.story_id)}
                      className="w-full h-14 bg-blue-600 rounded-xl flex-row items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] active:bg-blue-700"
                    >
                      <BookOpen size={20} color="white" className="mr-2" />
                      <Text className="text-white font-bold text-base">
                        Read Lore
                      </Text>
                    </TouchableOpacity>
                  )}

                  {session && (
                    <View className="mt-2">
                      <TouchableOpacity
                        onPress={() => setPopoverOpen(!popoverOpen)}
                        className="w-full h-14 bg-green-600/20 border border-green-500/50 rounded-xl flex-row items-center justify-center active:bg-green-600/30"
                      >
                        <PlusCircle
                          size={20}
                          color="#4ade80"
                          className="mr-2"
                        />
                        <Text className="text-green-400 font-bold text-base">
                          Add to Route
                        </Text>
                      </TouchableOpacity>
                      {popoverOpen && (
                        <View className="mt-3 p-4 bg-[#2e3142] rounded-xl border border-[#3b3e52] shadow-xl">
                          <AddToExperiencePopover
                            pin={pin}
                            closePopover={() => setPopoverOpen(false)}
                          />
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* =================== RIGHT COLUMN / BOTTOM =================== */}
          <View
            style={{ width: isDesktop ? "50%" : "100%" }}
            className={`px-6 ${isDesktop ? "py-6" : "mt-6"}`}
          >
            {/* Desktop Only Description */}
            {isDesktop && pin.description && (
              <View className="mb-8">
                <Text className="text-xl font-black text-white mb-3 tracking-wide">
                  About
                </Text>
                <Text className="text-gray-300 text-base leading-7 font-medium">
                  {stripHtml(pin.description)}
                </Text>
              </View>
            )}

            {/* TRAVELER NOTES (COMMENTS) */}
            <View>
              <Text className="text-xl font-black text-white mb-5 tracking-wide">
                Traveler Notes
              </Text>

              {session ? (
                <CommentForm
                  locationId={pin.id}
                  onCommentPosted={handlePostComment}
                />
              ) : (
                <TouchableOpacity
                  onPress={onRequestAuth}
                  className="items-center justify-center py-8 bg-[#2e3142] rounded-2xl mb-4 border border-[#3b3e52] active:bg-[#3b3e52]"
                >
                  <Lock size={24} color="#9ca3af" className="mb-3" />
                  <Text className="font-bold text-white mb-1">
                    Guild Access Required
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    Sign in to leave a note or rate this location.
                  </Text>
                </TouchableOpacity>
              )}

              {loadingInitial ? (
                <ActivityIndicator
                  color="#d3bc8e"
                  size="large"
                  className="mt-6"
                />
              ) : (
                <View className="mt-2">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <Comment
                        key={comment.id}
                        comment={comment}
                        session={session}
                        onDelete={deleteComment}
                        onVote={handleVote}
                        onRequestAuth={onRequestAuth}
                      />
                    ))
                  ) : (
                    <Text className="py-8 text-gray-500 text-center italic font-medium">
                      No notes left by travelers yet. Be the first to chart this
                      location!
                    </Text>
                  )}
                  {hasMore && (
                    <TouchableOpacity
                      onPress={fetchMoreComments}
                      className="w-full py-5 items-center active:opacity-70"
                    >
                      <Text className="text-[#d3bc8e] font-bold uppercase tracking-widest text-xs">
                        Load Older Notes
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const handleBack = () => {
    if (currentView === "product") setCurrentView("hub");
    else setCurrentView("details");
  };

  return (
    <Modal
      visible={isOpen}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* 🌟 DYNAMIC WRAPPER: Centered on Web, Bottom on Mobile 🌟 */}
        <View
          className={`flex-1 bg-black/60 backdrop-blur-sm ${
            Platform.OS === "web"
              ? "items-center justify-center p-4"
              : "justify-end"
          }`}
        >
          <TouchableOpacity className="absolute inset-0" onPress={onClose} />

          {/* The Genshin-style Window */}
          <View
            className={`bg-[#1c1d28] flex-col overflow-hidden shadow-[0_-10px_50px_rgba(0,0,0,0.8)] ${
              isDesktop
                ? "w-[850px] max-h-[85vh] rounded-2xl border border-[#3b3e52]"
                : Platform.OS === "web"
                ? "w-[450px] max-h-[85vh] rounded-2xl border border-[#3b3e52]"
                : "h-[90%] w-full rounded-t-[40px] border-t-2 border-[#3b3e52]"
            }`}
          >
            {/* Header Bar */}
            <View className="px-6 py-5 border-b border-[#3b3e52] flex-row justify-between items-center bg-[#2e3142] z-10">
              {currentView !== "details" ? (
                <TouchableOpacity
                  onPress={handleBack}
                  className="flex-row items-center p-2 -ml-2 active:scale-95"
                >
                  <ArrowLeft size={20} color="#d3bc8e" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 36 }} />
              )}

              <Text
                className="text-xl font-black text-white flex-1 text-center tracking-tight"
                numberOfLines={1}
              >
                {currentView === "product" && selectedProduct
                  ? selectedProduct.name
                  : pin.name}
              </Text>

              <TouchableOpacity
                onPress={onClose}
                className="p-2 -mr-2 bg-[#1c1d28] rounded-full border border-[#3b3e52] active:scale-95"
              >
                <X size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View className="flex-1 bg-[#1c1d28]">{renderContent()}</View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
