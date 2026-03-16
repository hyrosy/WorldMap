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
  useWindowDimensions,
} from "react-native";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import useComments from "@/hooks/useComments";
import { supabase } from "@/lib/supabaseClient"; // 🌟 IMPORT SUPABASE
import { toast } from "sonner";

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

import CommentForm from "./CommentForm";
import AddToExperiencePopover from "./AddToExperiencePopover";

const stripHtml = (html) => (html ? html.replace(/<[^>]*>?/gm, "").trim() : "");

// 🌟 RPG RARITY COLORS 🌟
const RARITY_COLORS = {
  common: {
    border: "border-gray-500",
    bg: "bg-gray-500/10",
    text: "text-gray-400",
  },
  rare: {
    border: "border-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
  },
  epic: {
    border: "border-purple-500",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
  },
  legendary: {
    border: "border-[#d3bc8e]",
    bg: "bg-[#d3bc8e]/10",
    text: "text-[#d3bc8e]",
  },
};

const Comment = ({ comment, session, onDelete, onVote, onRequestAuth }) => {
  const isOwner = session?.user?.id === comment.user_id;
  const { upvotes, downvotes, userVote } = comment;
  const hasUpvoted = userVote === true;
  const hasDownvoted = userVote === false;

  const handleVoteClick = (isUpvote) => {
    if (!session) return onRequestAuth();
    onVote(comment.id, isUpvote, userVote);
  };

  return (
    <View className="py-5 border-b border-[#3b3e52]">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="font-bold text-sm text-white">
          {comment.profiles?.username || "Traveler"}
        </Text>
      </View>

      {!!comment.image_urls && comment.image_urls.length > 0 ? (
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
      ) : null}

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
        {isOwner ? (
          <TouchableOpacity
            onPress={() => onDelete(comment.id)}
            className="p-2 -mr-2 active:scale-95"
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
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
  const isDesktop = Platform.OS === "web" && width >= 800;

  const { addToCart } = useCart();
  const [currentView, setCurrentView] = useState("details");
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 🌟 SUPABASE NATIVE STORE STATE 🌟
  const [pinItems, setPinItems] = useState({ status: "idle", data: [] });

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

  // 🌟 FETCH ITEMS FOR THIS SPECIFIC PIN 🌟
  useEffect(() => {
    if (isOpen && pin?.id) {
      setCurrentView("details");
      setSelectedProduct(null);
      setPinItems({ status: "loading", data: [] });
      setPopoverOpen(false);

      const fetchLocalItems = async () => {
        const { data, error } = await supabase
          .from("merchant_items")
          .select("*")
          .eq("pin_id", pin.id)
          .order("created_at", { ascending: false });

        if (error) {
          setPinItems({ status: "error", data: [] });
        } else {
          setPinItems({ status: "success", data: data || [] });
        }
      };

      fetchLocalItems();
    }
  }, [isOpen, pin]);

  if (!pin) return null;

  const galleryImages =
    pin.gallery && Array.isArray(pin.gallery) ? pin.gallery : [];
  const allImages = pin.image_url
    ? [pin.image_url, ...galleryImages]
    : galleryImages;

  const handlePurchase = (item) => {
    addToCart(item);
    toast.success(`${item.name} added to your backpack!`);
    setCurrentView("hub");
  };

  const renderContent = () => {
    // --- 🌟 NATIVE PRODUCT DETAIL VIEW 🌟 ---
    if (currentView === "product" && selectedProduct) {
      const rarityTheme =
        RARITY_COLORS[selectedProduct.rarity] || RARITY_COLORS.common;
      return (
        <ScrollView
          className="flex-1 bg-[#1c1d28]"
          showsVerticalScrollIndicator={false}
        >
          <View className="relative w-full h-64 bg-[#2e3142] border-b-2 border-[#3b3e52]">
            <Image
              source={{
                uri: selectedProduct.image_url || "https://placehold.co/400",
              }}
              className="w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-full border border-gray-600 backdrop-blur-md">
              <Text
                className={`${rarityTheme.text} font-black text-xs uppercase tracking-widest`}
              >
                {selectedProduct.rarity}
              </Text>
            </View>
          </View>
          <View className="p-6">
            <Text className="text-2xl font-black text-white mb-2">
              {selectedProduct.name}
            </Text>
            <Text className="text-gray-300 leading-6 mb-6">
              {selectedProduct.description}
            </Text>
            <View className="flex-row items-center justify-between bg-[#2e3142] p-4 rounded-xl border border-[#3b3e52] mb-6">
              <View>
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                  Price
                </Text>
                <Text className="text-[#d3bc8e] font-black text-xl">
                  {selectedProduct.price} {selectedProduct.currency}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                  Stock
                </Text>
                <Text className="text-white font-bold">
                  {selectedProduct.stock === -1
                    ? "Unlimited"
                    : selectedProduct.stock}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handlePurchase(selectedProduct)}
              className={`w-full py-4 rounded-xl flex-row justify-center items-center gap-2 ${rarityTheme.bg} border ${rarityTheme.border} active:scale-95`}
            >
              <ShoppingBag
                color={
                  selectedProduct.rarity === "legendary" ? "#d3bc8e" : "white"
                }
                size={20}
              />
              <Text
                className={`${
                  selectedProduct.rarity === "legendary"
                    ? "text-[#d3bc8e]"
                    : "text-white"
                } font-black text-lg uppercase tracking-wider`}
              >
                Acquire Item
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    // --- 🌟 NATIVE LOCAL STORE HUB 🌟 ---
    if (currentView === "hub") {
      return (
        <View className="flex-1 flex-col bg-[#1c1d28]">
          <View className="px-6 py-4 bg-[#2e3142] border-b border-[#3b3e52]">
            <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest text-center">
              Local Merchant Goods
            </Text>
          </View>
          <ScrollView
            className="flex-1 p-4"
            showsVerticalScrollIndicator={false}
          >
            {pinItems.status === "loading" ? (
              <ActivityIndicator
                color="#d3bc8e"
                size="large"
                style={{ marginTop: 40 }}
              />
            ) : null}
            {pinItems.status === "error" ? (
              <Text className="text-center text-red-400 mt-10 font-medium">
                Could not load location stock.
              </Text>
            ) : null}

            {pinItems.status === "success" && pinItems.data.length > 0 ? (
              pinItems.data.map((product) => {
                const rarityTheme =
                  RARITY_COLORS[product.rarity] || RARITY_COLORS.common;
                return (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => {
                      setSelectedProduct(product);
                      setCurrentView("product");
                    }}
                    className={`flex-row items-center gap-4 p-3 bg-[#2e3142] rounded-xl mb-4 border-2 ${rarityTheme.border} shadow-lg active:scale-95 transition-transform`}
                  >
                    <View className="relative w-20 h-20 flex-shrink-0 bg-[#1c1d28] rounded-lg overflow-hidden border border-[#3b3e52]">
                      <Image
                        source={{
                          uri: product.image_url || "https://placehold.co/100",
                        }}
                        className="w-full h-full opacity-90"
                        resizeMode="cover"
                      />
                    </View>
                    <View className="flex-1 pr-2">
                      <Text
                        className="font-bold text-base text-white mb-1"
                        numberOfLines={2}
                      >
                        {product.name}
                      </Text>
                      <Text className="text-[#d3bc8e] font-black text-sm">
                        {product.price} {product.currency}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : pinItems.status === "success" ? (
              <Text className="text-center text-gray-500 mt-10 italic">
                No items offered at this location.
              </Text>
            ) : null}
          </ScrollView>
        </View>
      );
    }

    // --- 🌟 MAIN PIN DETAILS VIEW 🌟 ---
    return (
      <ScrollView
        className="flex-1 bg-[#1c1d28]"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: isDesktop ? "row" : "column" }}>
          {/* LEFT / TOP COLUMN */}
          <View
            style={{
              width: isDesktop ? "50%" : "100%",
              borderRightWidth: isDesktop ? 1 : 0,
              borderColor: "#3b3e52",
            }}
          >
            {allImages.length > 0 ? (
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
                {allImages.length > 1 ? (
                  <View className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                    <Text className="text-white text-xs font-bold tracking-widest">
                      1 / {allImages.length}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View
              className={`px-6 ${isDesktop ? "mt-4" : "-mt-4 relative z-10"}`}
            >
              <View className="flex-row flex-wrap gap-2 mb-6">
                {!!pin.rating ? (
                  <View className="flex-row items-center bg-[#2e3142] border border-[#d3bc8e]/50 px-3 py-1.5 rounded-full shadow-sm">
                    <Star size={14} color="#d3bc8e" fill="#d3bc8e" />
                    <Text className="text-white text-xs font-bold ml-1">
                      {pin.rating}
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row items-center bg-[#2e3142] border border-[#3b3e52] px-3 py-1.5 rounded-full shadow-sm">
                  <MapPin size={14} color="#9ca3af" />
                  <Text className="text-gray-300 text-xs font-medium ml-1">
                    {pin.category || "Location"}
                  </Text>
                </View>
              </View>

              {!isDesktop && !!pin.description ? (
                <Text className="text-gray-300 text-base leading-7 mb-6 font-medium">
                  {stripHtml(pin.description)}
                </Text>
              ) : null}

              {!!pin.phone || !!pin.website || !!pin.opening_hours ? (
                <View className="bg-[#2e3142] rounded-2xl p-4 border border-[#3b3e52] mb-6 space-y-4 shadow-sm">
                  {!!pin.opening_hours ? (
                    <View className="flex-row items-center">
                      <Clock size={16} color="#d3bc8e" className="mr-3" />
                      <Text className="text-gray-300 text-sm flex-1">
                        {pin.opening_hours}
                      </Text>
                    </View>
                  ) : null}
                  {!!pin.phone ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${pin.phone}`)}
                      className="flex-row items-center active:opacity-70"
                    >
                      <Phone size={16} color="#d3bc8e" className="mr-3" />
                      <Text className="text-white font-bold text-sm">
                        {pin.phone}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {!!pin.website ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(pin.website)}
                      className="flex-row items-center active:opacity-70 mt-4"
                    >
                      <Globe size={16} color="#d3bc8e" className="mr-3" />
                      <Text className="text-cyan-400 font-bold text-sm">
                        Visit Website
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

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

                {/* 🌟 NATIVE STORE BUTTON (Only appears if Supabase found items!) 🌟 */}
                {pinItems.data.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setCurrentView("hub")}
                    className="w-full h-14 bg-[#e6ce9a] rounded-xl flex-row items-center justify-center shadow-[0_0_20px_rgba(230,206,154,0.3)] active:scale-95"
                  >
                    <ShoppingBag size={20} color="#1c1d28" className="mr-2" />
                    <Text className="text-[#1c1d28] font-black text-base uppercase tracking-wider">
                      Local Merchant
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {!!pin.story_id ? (
                  <TouchableOpacity
                    onPress={() => onReadStory(pin.story_id)}
                    className="w-full h-14 bg-blue-600 rounded-xl flex-row items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] active:bg-blue-700"
                  >
                    <BookOpen size={20} color="white" className="mr-2" />
                    <Text className="text-white font-bold text-base">
                      Read Lore
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {!!session ? (
                  <View className="mt-2">
                    <TouchableOpacity
                      onPress={() => setPopoverOpen(!popoverOpen)}
                      className="w-full h-14 bg-green-600/20 border border-green-500/50 rounded-xl flex-row items-center justify-center active:bg-green-600/30"
                    >
                      <PlusCircle size={20} color="#4ade80" className="mr-2" />
                      <Text className="text-green-400 font-bold text-base">
                        Add to Route
                      </Text>
                    </TouchableOpacity>
                    {popoverOpen ? (
                      <View className="mt-3 p-4 bg-[#2e3142] rounded-xl border border-[#3b3e52] shadow-xl">
                        <AddToExperiencePopover
                          pin={pin}
                          closePopover={() => setPopoverOpen(false)}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* RIGHT / BOTTOM COLUMN */}
          <View
            style={{ width: isDesktop ? "50%" : "100%" }}
            className={`px-6 ${isDesktop ? "py-6" : "mt-6"}`}
          >
            {isDesktop && !!pin.description ? (
              <View className="mb-8">
                <Text className="text-xl font-black text-white mb-3 tracking-wide">
                  About
                </Text>
                <Text className="text-gray-300 text-base leading-7 font-medium">
                  {stripHtml(pin.description)}
                </Text>
              </View>
            ) : null}

            <View>
              <Text className="text-xl font-black text-white mb-5 tracking-wide">
                Traveler Notes
              </Text>
              {!!session ? (
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
                  {hasMore ? (
                    <TouchableOpacity
                      onPress={fetchMoreComments}
                      className="w-full py-5 items-center active:opacity-70"
                    >
                      <Text className="text-[#d3bc8e] font-bold uppercase tracking-widest text-xs">
                        Load Older Notes
                      </Text>
                    </TouchableOpacity>
                  ) : null}
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
        <View
          className={`flex-1 bg-black/60 backdrop-blur-sm ${
            Platform.OS === "web"
              ? "items-center justify-center p-4"
              : "justify-end"
          }`}
        >
          <TouchableOpacity className="absolute inset-0" onPress={onClose} />
          <View
            className={`bg-[#1c1d28] flex-col overflow-hidden shadow-[0_-10px_50px_rgba(0,0,0,0.8)] ${
              isDesktop
                ? "w-[850px] max-h-[85vh] rounded-2xl border border-[#3b3e52]"
                : Platform.OS === "web"
                ? "w-[450px] max-h-[85vh] rounded-2xl border border-[#3b3e52]"
                : "h-[90%] w-full rounded-t-[40px] border-t-2 border-[#3b3e52]"
            }`}
          >
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
