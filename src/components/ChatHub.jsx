import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image as RNImage,
} from "react-native";
import {
  X,
  Send,
  Paperclip,
  MapPin,
  Image as ImageIcon,
  Mic,
  Phone,
  Video,
  Square,
  Play,
  ArrowLeft,
  MessageCircle,
  Users,
  Globe,
  PhoneCall,
  PhoneOff,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function ChatHub({
  isOpen,
  onClose,
  userLocation,
  mapRef,
  currentWorld,
}) {
  const { session } = useAuth();

  // NAVIGATION & CHAT STATES
  const [activeView, setActiveView] = useState("inbox"); // 'inbox' | 'chat'
  const [activeChat, setActiveChat] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [inputText, setInputText] = useState("");
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 🌟 REAL DATA STATES 🌟
  const [realDMs, setRealDMs] = useState([]);
  const [isLoadingDMs, setIsLoadingDMs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // VOICE NOTE STATES
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const scrollViewRef = useRef();
  const fileInputRef = useRef(null);

  // WEBRTC CALL STATES
  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState("Video");
  const [incomingCallData, setIncomingCallData] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const signalingChannelRef = useRef(null);

  // 🌟 1. FETCH REAL PROFILES FOR INBOX 🌟
  useEffect(() => {
    if (!session?.user || !isOpen) return;

    const fetchConversations = async () => {
      setIsLoadingDMs(true);

      // Fetch all users except the current logged-in user
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .neq("id", session.user.id);

      if (!error && users) {
        const formattedDMs = users.map((user) => ({
          id: user.id,
          name: user.username || "Traveler",
          avatar:
            user.avatar_url ||
            `https://placehold.co/100/1c1d28/d3bc8e?text=${
              user.username ? user.username[0].toUpperCase() : "?"
            }`,
          lastMessage: "Tap to view messages...",
        }));
        setRealDMs(formattedDMs);
      }
      setIsLoadingDMs(false);
    };

    fetchConversations();
  }, [session, isOpen]);

  // 🌟 2. FETCH REAL CHAT HISTORY WHEN A ROOM OPENS 🌟
  useEffect(() => {
    if (!activeChat || !session?.user) return;

    const fetchMessages = async () => {
      setIsLoadingMessages(true);

      // 🌟 FIXED FOREIGN KEY AMBIGUITY HERE 🌟
      // We explicitly tell Supabase to join the profile of the SENDER
      let query = supabase
        .from("messages")
        .select(
          `*, sender:profiles!messages_sender_id_fkey(username, avatar_url)`
        )
        .order("created_at", { ascending: true });

      if (activeChat.type === "world") {
        const cleanWorldId = activeChat.id.replace("world_", "");
        query = query.eq("world_id", cleanWorldId);
      } else {
        query = query
          .is("world_id", null)
          .or(
            `and(sender_id.eq.${session.user.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${session.user.id})`
          );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching messages:", error);
      } else if (data) {
        const formattedMessages = data.map((msg) => ({
          id: msg.id,
          type: msg.msg_type || "text",
          sender: msg.sender?.username || "Traveler",
          text: msg.content,
          mediaUrl: msg.media_url,
          lat: msg.lat,
          lng: msg.lng,
          time: new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isMe: msg.sender_id === session.user.id,
        }));

        setMessagesByChat((prev) => ({
          ...prev,
          [activeChat.id]: formattedMessages,
        }));
        setTimeout(
          () => scrollViewRef.current?.scrollToEnd({ animated: false }),
          100
        );
      }
      setIsLoadingMessages(false);
    };

    fetchMessages();

    // 🌟 REALTIME: LISTEN FOR NEW INCOMING MESSAGES 🌟
    const channel = supabase
      .channel(`chat_room_${activeChat.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new;

          // Ignore my own messages (already added via Optimistic UI)
          if (msg.sender_id === session.user.id) return;

          // Ensure the real-time message actually belongs in the currently open window!
          let belongsToChat = false;
          if (
            activeChat.type === "world" &&
            msg.world_id === activeChat.id.replace("world_", "")
          ) {
            belongsToChat = true;
          } else if (
            activeChat.type === "dm" &&
            !msg.world_id &&
            (msg.sender_id === activeChat.id ||
              msg.receiver_id === activeChat.id)
          ) {
            belongsToChat = true;
          }

          if (belongsToChat) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", msg.sender_id)
              .single();

            const incomingMsg = {
              id: msg.id,
              type: msg.msg_type || "text",
              sender: profileData?.username || "Traveler",
              text: msg.content,
              mediaUrl: msg.media_url,
              lat: msg.lat,
              lng: msg.lng,
              time: new Date(msg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              isMe: false,
            };

            setMessagesByChat((prev) => ({
              ...prev,
              [activeChat.id]: [...(prev[activeChat.id] || []), incomingMsg],
            }));
            setTimeout(
              () => scrollViewRef.current?.scrollToEnd({ animated: true }),
              100
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, session]);

  // 🌟 3. INSERT MESSAGE INTO DATABASE 🌟
  const sendMessageToDB = async (payload) => {
    if (!activeChat || !session?.user) return;

    // A. Optimistic UI Update (Shows instantly)
    const tempMsg = {
      id: Date.now(),
      type: payload.type,
      sender: session.user.user_metadata?.username || "You",
      text: payload.text,
      mediaUrl: payload.mediaUrl,
      lat: payload.lat,
      lng: payload.lng,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isMe: true,
    };

    setMessagesByChat((prev) => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), tempMsg],
    }));
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100
    );

    // B. Save to Database
    const cleanWorldId =
      activeChat.type === "world" ? activeChat.id.replace("world_", "") : null;

    const insertData = {
      sender_id: session.user.id,
      receiver_id: activeChat.type === "dm" ? activeChat.id : null,
      world_id: cleanWorldId,
      msg_type: payload.type,
      content: payload.text || null,
      media_url: payload.mediaUrl || null,
      lat: payload.lat || null,
      lng: payload.lng || null,
    };

    const { error } = await supabase.from("messages").insert([insertData]);
    if (error) {
      console.error(error);
      toast.error("Failed to deliver message.");
    }
  };

  // INITIALIZE WEBRTC SIGNALING
  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase.channel(`signaling_${session.user.id}`);
    channel
      .on("broadcast", { event: "webrtc_signal" }, async ({ payload }) => {
        const {
          type,
          sdp,
          candidate,
          callerId,
          callerName,
          callerAvatar,
          callType: incomingType,
        } = payload;
        if (type === "offer") {
          setIncomingCallData({
            callerId,
            callerName,
            callerAvatar,
            sdp,
            incomingType,
          });
          setCallType(incomingType);
          setCallState("ringing");
        } else if (type === "answer" && pcRef.current) {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(sdp)
          );
        } else if (type === "ice-candidate" && pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else if (type === "end-call") {
          cleanupCall();
          toast.info("Call ended.");
        }
      })
      .subscribe();

    signalingChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      cleanupCall();
    };
  }, [session]);

  const cleanupCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setCallState("idle");
    setIncomingCallData(null);
  };

  const sendSignal = (targetId, payload) => {
    supabase.channel(`signaling_${targetId}`).send({
      type: "broadcast",
      event: "webrtc_signal",
      payload: { ...payload, callerId: session.user.id },
    });
  };

  // INITIATE CALL
  const handleStartCall = async (type) => {
    if (activeChat.type === "world") {
      toast.info("Group calls coming in Phase 4!");
      return;
    }
    setCallType(type);
    setCallState("calling");
    const targetId = activeChat.id;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "Video",
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate)
          sendSignal(targetId, {
            type: "ice-candidate",
            candidate: e.candidate,
          });
      };
      pc.ontrack = (e) => {
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = e.streams[0];
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal(targetId, {
        type: "offer",
        sdp: offer,
        callType: type,
        callerName: session.user.user_metadata?.username || "Traveler",
        callerAvatar:
          session.user.user_metadata?.avatar_url ||
          "https://placehold.co/100/1c1d28/d3bc8e?text=?",
      });
    } catch (err) {
      toast.error("Could not access camera/mic.");
      cleanupCall();
    }
  };

  // ACCEPT CALL
  const acceptCall = async () => {
    setCallState("connected");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCallData.incomingType === "Video",
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate)
          sendSignal(incomingCallData.callerId, {
            type: "ice-candidate",
            candidate: e.candidate,
          });
      };
      pc.ontrack = (e) => {
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = e.streams[0];
      };

      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCallData.sdp)
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal(incomingCallData.callerId, { type: "answer", sdp: answer });
    } catch (err) {
      toast.error("Could not connect call.");
      cleanupCall();
    }
  };

  // END CALL
  const handleEndCall = () => {
    const targetId = activeChat?.id || incomingCallData?.callerId;
    if (targetId) sendSignal(targetId, { type: "end-call" });
    cleanupCall();
  };

  // --- CHAT UI LOGIC ---
  const handleOpenChat = (chatData) => {
    setActiveChat(chatData);
    setActiveView("chat");
  };

  const handleBackToInbox = () => {
    setActiveView("inbox");
    setActiveChat(null);
    setIsAttachmentOpen(false);
  };

  const uploadToSupabase = async (fileOrBlob, extension, fileType) => {
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${extension}`;
    const filePath = `uploads/${fileName}`;
    const { error } = await supabase.storage
      .from("chat-media")
      .upload(filePath, fileOrBlob, { contentType: fileType });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  // 🌟 MAP HANDLERS TO DATABASE 🌟
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    sendMessageToDB({ type: "text", text: inputText });
    setInputText("");
  };

  const handleShareLocation = () => {
    setIsAttachmentOpen(false);
    if (!userLocation) {
      toast.error("GPS signal lost.");
      return;
    }
    sendMessageToDB({
      type: "location",
      lat: userLocation[1],
      lng: userLocation[0],
    });
    toast.success("Location dropped in chat!");
  };

  const handleFlyToLocation = (lng, lat) => {
    if (mapRef && mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 16,
        pitch: 60,
        essential: true,
      });
      onClose();
    }
  };

  const triggerFilePicker = () => {
    setIsAttachmentOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const publicUrl = await uploadToSupabase(
        file,
        file.name.split(".").pop(),
        file.type
      );
      sendMessageToDB({
        type: isVideo ? "video" : "image",
        mediaUrl: publicUrl,
      });
    } catch (error) {
      toast.error("Upload failed.");
    } finally {
      setIsUploading(false);
      event.target.value = null;
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingDuration(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          setIsUploading(true);
          try {
            const publicUrl = await uploadToSupabase(
              audioBlob,
              "webm",
              "audio/webm"
            );
            sendMessageToDB({ type: "audio", mediaUrl: publicUrl });
          } catch (error) {
            toast.error("Upload failed.");
          } finally {
            setIsUploading(false);
            stream.getTracks().forEach((t) => t.stop());
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setIsAttachmentOpen(false);
        timerRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        toast.error("Microphone denied.");
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <View className="absolute top-0 right-0 w-full sm:w-[400px] h-full bg-[#1c1d28] z-50 flex-col shadow-2xl border-l border-[#3b3e52] animate-in slide-in-from-right duration-300 overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*,video/*"
        onChange={handleFileChange}
      />

      {/* 🌟 WEBRTC CALL OVERLAY 🌟 */}
      {callState !== "idle" && (
        <View className="absolute inset-0 z-[100] bg-[#1c1d28] flex-col animate-in fade-in zoom-in-95 duration-300">
          {/* Ringing State (Incoming) */}
          {callState === "ringing" && incomingCallData && (
            <View className="flex-1 items-center justify-center p-6">
              <View className="w-32 h-32 rounded-full border-4 border-[#d3bc8e] overflow-hidden mb-6 shadow-[0_0_40px_rgba(211,188,142,0.4)] animate-pulse">
                <img
                  src={incomingCallData.callerAvatar}
                  className="w-full h-full object-cover bg-[#2e3142]"
                  alt="Caller"
                />
              </View>
              <Text className="text-white text-2xl font-black mb-2">
                {incomingCallData.callerName}
              </Text>
              <Text className="text-gray-400 font-medium tracking-wide mb-12">
                Incoming {incomingCallData.incomingType} Call...
              </Text>

              <View className="flex-row gap-6 w-full justify-center">
                <TouchableOpacity
                  onPress={handleEndCall}
                  className="w-16 h-16 bg-red-500 rounded-full items-center justify-center shadow-lg hover:bg-red-600 transition-transform active:scale-90"
                >
                  <PhoneOff size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={acceptCall}
                  className="w-16 h-16 bg-green-500 rounded-full items-center justify-center shadow-lg hover:bg-green-600 transition-transform active:scale-90"
                >
                  <PhoneCall size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Calling State (Outgoing) */}
          {callState === "calling" && (
            <View className="flex-1 items-center justify-center p-6">
              <View className="w-24 h-24 rounded-full border-2 border-gray-600 overflow-hidden mb-6 opacity-50 animate-pulse">
                <RNImage
                  source={{
                    uri: activeChat?.avatar || "https://placehold.co/100",
                  }}
                  className="w-full h-full object-cover"
                />
              </View>
              <Text className="text-white text-xl font-bold mb-2">
                Calling {activeChat?.name}...
              </Text>
              <Text className="text-[#d3bc8e] font-medium tracking-wide mb-12 animate-pulse">
                Waiting for answer...
              </Text>
              <TouchableOpacity
                onPress={handleEndCall}
                className="w-16 h-16 bg-red-500 rounded-full items-center justify-center shadow-lg hover:bg-red-600 transition-transform active:scale-90"
              >
                <PhoneOff size={28} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* Connected State (Active Call) */}
          {callState === "connected" && (
            <View className="flex-1 bg-black relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ display: callType === "Video" ? "block" : "none" }}
              />
              <View className="absolute top-12 right-4 w-28 h-40 bg-[#1c1d28] rounded-xl border-2 border-[#d3bc8e] overflow-hidden shadow-2xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              </View>
              {callType === "Voice" && (
                <View className="absolute inset-0 flex items-center justify-center bg-[#1c1d28]">
                  <View className="w-32 h-32 rounded-full bg-[#2e3142] border border-[#3b3e52] items-center justify-center shadow-[0_0_50px_rgba(211,188,142,0.2)]">
                    <Phone
                      size={48}
                      color="#d3bc8e"
                      className="animate-pulse"
                    />
                  </View>
                  <Text className="text-white text-xl font-bold mt-6">
                    {activeChat?.name || incomingCallData?.callerName}
                  </Text>
                  <Text className="text-green-400 font-mono mt-2">00:00</Text>
                </View>
              )}
              <View className="absolute bottom-10 left-0 w-full flex-row justify-center items-center gap-6">
                <TouchableOpacity className="w-14 h-14 bg-[#2e3142]/80 backdrop-blur-md rounded-full items-center justify-center border border-[#3b3e52]">
                  <Mic size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleEndCall}
                  className="w-16 h-16 bg-red-500 rounded-full items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:bg-red-600 transition-transform active:scale-90"
                >
                  <PhoneOff size={28} color="white" />
                </TouchableOpacity>
                {callType === "Video" && (
                  <TouchableOpacity className="w-14 h-14 bg-[#2e3142]/80 backdrop-blur-md rounded-full items-center justify-center border border-[#3b3e52]">
                    <Video size={24} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* 🌟 INBOX VIEW 🌟 */}
      {activeView === "inbox" && (
        <View className="flex-1 flex-col">
          <View className="flex-row justify-between items-center px-5 py-4 bg-[#1c1d28] border-b border-[#3b3e52] pt-12">
            <Text className="text-2xl font-black text-white tracking-tight">
              Messages
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 bg-[#2e3142] rounded-full border border-[#3b3e52]"
            >
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-3 py-4">
            {currentWorld?.id !== "base" && (
              <View className="mb-6">
                <Text className="text-[#d3bc8e] font-bold text-xs uppercase tracking-widest mb-3 ml-2">
                  Active World
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    handleOpenChat({
                      id: `world_${currentWorld.id}`,
                      name: `${currentWorld.name} Lobby`,
                      type: "world",
                    })
                  }
                  className="flex-row items-center p-4 bg-[#2e3142] border border-[#d3bc8e]/50 rounded-2xl shadow-lg active:scale-95 transition-transform"
                >
                  <View className="w-12 h-12 rounded-full bg-[#1c1d28] border-2 border-[#d3bc8e] items-center justify-center shadow-[0_0_15px_rgba(211,188,142,0.4)]">
                    <Globe size={24} color="#d3bc8e" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-white font-bold text-lg">
                      {currentWorld.name} Party
                    </Text>
                    <Text className="text-green-400 font-medium text-xs mt-0.5">
                      Session Active
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            <Text className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-3 ml-2">
              Direct Messages
            </Text>

            {isLoadingDMs ? (
              <ActivityIndicator
                color="#d3bc8e"
                size="small"
                className="mt-4"
              />
            ) : realDMs.length === 0 ? (
              <Text className="text-gray-500 text-center mt-4 font-medium">
                No other travelers found.
              </Text>
            ) : (
              realDMs.map((dm) => (
                <TouchableOpacity
                  key={dm.id}
                  onPress={() =>
                    handleOpenChat({
                      id: dm.id,
                      name: dm.name,
                      type: "dm",
                      avatar: dm.avatar,
                    })
                  }
                  className="flex-row items-center p-4 bg-[#1c1d28] hover:bg-[#2e3142] border-b border-[#3b3e52] active:bg-[#3b3e52] transition-colors"
                >
                  <RNImage
                    source={{ uri: dm.avatar }}
                    className="w-12 h-12 rounded-full border border-[#3b3e52]"
                  />
                  <View className="ml-4 flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-white font-bold text-base">
                        {dm.name}
                      </Text>
                    </View>
                    <Text
                      className="text-gray-400 text-sm truncate"
                      numberOfLines={1}
                    >
                      {dm.lastMessage}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* 🌟 CHAT ROOM VIEW 🌟 */}
      {activeView === "chat" && activeChat && (
        <View className="flex-1 flex-col">
          <View className="flex-row justify-between items-center px-4 py-4 bg-[#2e3142] border-b border-[#3b3e52] pt-12 shadow-md">
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={handleBackToInbox}
                className="p-2 -ml-2 rounded-full hover:bg-[#3b3e52]"
              >
                <ArrowLeft size={20} color="#d3bc8e" />
              </TouchableOpacity>
              <View>
                <Text className="text-xl font-black text-white tracking-tight">
                  {activeChat.name}
                </Text>
                <Text className="text-[#d3bc8e] text-xs font-bold uppercase tracking-widest mt-0.5">
                  {activeChat.type === "world"
                    ? "Party Chat"
                    : "Direct Message"}
                </Text>
              </View>
            </View>

            {activeChat.type === "dm" && (
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => handleStartCall("Voice")}
                  className="w-10 h-10 bg-[#1c1d28] rounded-full items-center justify-center border border-[#3b3e52] hover:border-[#d3bc8e]"
                >
                  <Phone size={18} color="#d3bc8e" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleStartCall("Video")}
                  className="w-10 h-10 bg-[#1c1d28] rounded-full items-center justify-center border border-[#3b3e52] hover:border-[#d3bc8e]"
                >
                  <Video size={18} color="#d3bc8e" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Chat Feed */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-4 py-4"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {isLoadingMessages && (
              <ActivityIndicator
                color="#d3bc8e"
                size="small"
                className="mb-4"
              />
            )}

            {(messagesByChat[activeChat.id] || []).map((msg) => (
              <View
                key={msg.id}
                className={`mb-4 max-w-[85%] ${
                  msg.isMe ? "self-end" : "self-start"
                }`}
              >
                <View className="flex-row items-baseline justify-between mb-1">
                  {!msg.isMe && (
                    <Text className="text-gray-400 text-[10px] font-bold ml-1">
                      {msg.sender}
                    </Text>
                  )}
                </View>

                <View
                  className={`p-3 rounded-2xl ${
                    msg.isMe
                      ? "bg-[#d3bc8e] rounded-tr-sm"
                      : "bg-[#2e3142] border border-[#3b3e52] rounded-tl-sm"
                  }`}
                >
                  {msg.type === "text" && (
                    <Text
                      className={`${
                        msg.isMe ? "text-[#1c1d28]" : "text-white"
                      } font-medium text-sm leading-5`}
                    >
                      {msg.text}
                    </Text>
                  )}

                  {msg.type === "location" && (
                    <TouchableOpacity
                      onPress={() => handleFlyToLocation(msg.lng, msg.lat)}
                      className="active:opacity-80"
                    >
                      <View className="flex-row items-center gap-3 bg-[#1c1d28]/20 p-2 rounded-xl mb-1">
                        <View
                          className={`w-10 h-10 rounded-full items-center justify-center ${
                            msg.isMe ? "bg-[#1c1d28]" : "bg-[#d3bc8e]"
                          }`}
                        >
                          <MapPin
                            size={20}
                            color={msg.isMe ? "#d3bc8e" : "#1c1d28"}
                          />
                        </View>
                        <View>
                          <Text
                            className={`${
                              msg.isMe ? "text-[#1c1d28]" : "text-white"
                            } font-bold text-base`}
                          >
                            Live Location
                          </Text>
                          <Text
                            className={`${
                              msg.isMe ? "text-[#1c1d28]/70" : "text-gray-400"
                            } text-xs`}
                          >
                            Tap to track on map
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}

                  {msg.type === "image" && (
                    <div className="rounded-xl overflow-hidden max-w-[200px] border border-[#1c1d28]/20">
                      <img
                        src={msg.mediaUrl}
                        alt="Upload"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}
                  {msg.type === "video" && (
                    <div className="rounded-xl overflow-hidden max-w-[220px] bg-black border border-[#1c1d28]/20">
                      <video
                        src={msg.mediaUrl}
                        controls
                        className="w-full h-auto"
                      />
                    </div>
                  )}
                  {msg.type === "audio" && (
                    <div
                      className={`p-1 rounded-full ${
                        msg.isMe ? "bg-[#1c1d28]/10" : "bg-[#1c1d28]"
                      }`}
                    >
                      <audio
                        src={msg.mediaUrl}
                        controls
                        className="h-10 max-w-[200px]"
                      />
                    </div>
                  )}
                </View>
                <Text
                  className={`text-gray-500 text-[9px] mt-1 ${
                    msg.isMe ? "text-right mr-1" : "ml-1"
                  }`}
                >
                  {msg.time}
                </Text>
              </View>
            ))}
            {isUploading && (
              <View className="self-end mb-4 mr-2">
                <ActivityIndicator color="#d3bc8e" size="small" />
              </View>
            )}
          </ScrollView>

          {/* Attachment Menu */}
          {isAttachmentOpen && (
            <View className="absolute bottom-20 left-4 bg-[#2e3142] border border-[#3b3e52] rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-5">
              <TouchableOpacity
                onPress={triggerFilePicker}
                className="flex-row items-center p-3 hover:bg-[#3b3e52] rounded-xl mb-1"
              >
                <ImageIcon size={20} color="#d3bc8e" />
                <Text className="text-white font-medium ml-3">
                  Photo & Video
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShareLocation}
                className="flex-row items-center p-3 hover:bg-[#3b3e52] rounded-xl"
              >
                <MapPin size={20} color="#4ade80" />
                <Text className="text-white font-medium ml-3">
                  Share Location
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input Area */}
          <View className="p-4 bg-[#1c1d28] border-t border-[#3b3e52]">
            {isRecording ? (
              <View className="flex-row items-center justify-between bg-[#2e3142] border border-red-500/50 rounded-full px-4 h-12">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3" />
                  <Text className="text-white font-mono">
                    {formatTime(recordingDuration)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleRecording}
                  className="w-8 h-8 bg-red-500 rounded-full items-center justify-center shadow-lg"
                >
                  <Square size={14} color="white" fill="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => setIsAttachmentOpen(!isAttachmentOpen)}
                  className={`p-3 rounded-full border transition-colors ${
                    isAttachmentOpen
                      ? "bg-[#d3bc8e] border-[#d3bc8e]"
                      : "bg-[#2e3142] border-[#3b3e52] hover:bg-[#3b3e52]"
                  }`}
                >
                  <Paperclip
                    size={20}
                    color={isAttachmentOpen ? "#1c1d28" : "#9ca3af"}
                  />
                </TouchableOpacity>
                <View className="flex-1 bg-[#2e3142] border border-[#3b3e52] rounded-full px-4 min-h-[48px] justify-center">
                  <TextInput
                    placeholder="Message..."
                    placeholderTextColor="#6b7280"
                    value={inputText}
                    onChangeText={setInputText}
                    className="text-white text-base outline-none"
                    multiline
                    maxLength={500}
                  />
                </View>
                {inputText.trim() ? (
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    className="w-12 h-12 bg-[#d3bc8e] rounded-full items-center justify-center shadow-lg hover:bg-[#e6ce9a] transition-colors"
                  >
                    <Send size={20} color="#1c1d28" style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={toggleRecording}
                    className="w-12 h-12 bg-[#2e3142] border border-[#3b3e52] rounded-full items-center justify-center hover:bg-[#3b3e52] transition-colors"
                  >
                    <Mic size={20} color="#d3bc8e" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
