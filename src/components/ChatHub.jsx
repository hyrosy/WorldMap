import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image as RNImage,
  Platform,
} from "react-native";
import {
  X,
  Send,
  Paperclip,
  MapPin,
  Image as ImageIcon,
  Mic,
  Phone,
  Video as VideoIcon,
  Square,
  Play,
  ArrowLeft,
  Users,
  Globe,
  PhoneCall,
  PhoneOff,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import * as ImagePicker from "expo-image-picker";
import { Audio, Video as ExpoVideo } from "expo-av";

// 🌟 DYNAMIC WEBRTC IMPORTS (CROSS-PLATFORM MAGIC) 🌟
let RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  RTCView;

if (Platform.OS !== "web") {
  const webrtc = require("react-native-webrtc");
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  mediaDevices = webrtc.mediaDevices;
  RTCView = webrtc.RTCView;
} else {
  RTCPeerConnection =
    window.RTCPeerConnection || window.webkitRTCPeerConnection;
  RTCIceCandidate = window.RTCIceCandidate;
  RTCSessionDescription = window.RTCSessionDescription;
  mediaDevices = navigator.mediaDevices;
}

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function ChatHub({
  isOpen,
  onClose,
  userLocation,
  mapRef,
  currentWorld,
}) {
  const { session } = useAuth();

  const [activeView, setActiveView] = useState("inbox");
  const [activeChat, setActiveChat] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [inputText, setInputText] = useState("");
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [realDMs, setRealDMs] = useState([]);
  const [isLoadingDMs, setIsLoadingDMs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null);
  const timerRef = useRef(null);
  const scrollViewRef = useRef();

  // 🌟 CALL STATES 🌟
  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState("Video");
  const [incomingCallData, setIncomingCallData] = useState(null);

  // Web Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Native Mobile Stream States
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const pcRef = useRef(null);
  const signalingChannelRef = useRef(null);

  // --- 1. FETCH INBOX ---
  useEffect(() => {
    if (!session?.user || !isOpen) return;

    const fetchInboxData = async () => {
      setIsLoadingDMs(true);
      const { data: users } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .neq("id", session.user.id);
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .or(`receiver_id.eq.${session.user.id},sender_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false });

      if (users) {
        const formattedDMs = users.map((user) => {
          const dmHistory =
            messages?.filter(
              (m) =>
                (m.sender_id === session.user.id &&
                  m.receiver_id === user.id) ||
                (m.sender_id === user.id && m.receiver_id === session.user.id)
            ) || [];
          const lastMsg = dmHistory[0];
          const unreadCount = dmHistory.filter(
            (m) => m.receiver_id === session.user.id && !m.is_read
          ).length;

          let lastMessageText = "Tap to view messages...";
          if (lastMsg) {
            if (lastMsg.msg_type === "image") lastMessageText = "📷 Image";
            else if (lastMsg.msg_type === "audio")
              lastMessageText = "🎤 Voice Note";
            else if (lastMsg.msg_type === "location")
              lastMessageText = "📍 Shared Location";
            else lastMessageText = lastMsg.content;
          }

          return {
            id: user.id,
            name: user.username || "Traveler",
            avatar:
              user.avatar_url ||
              `https://placehold.co/100/1c1d28/d3bc8e?text=${
                user.username ? user.username[0].toUpperCase() : "?"
              }`,
            lastMessage: lastMessageText,
            unreadCount: unreadCount,
          };
        });
        setRealDMs(formattedDMs);
      }
      setIsLoadingDMs(false);
    };
    fetchInboxData();
  }, [session, isOpen, activeView]);

  // --- 2. CHAT HISTORY ---
  useEffect(() => {
    if (!activeChat || !session?.user) return;

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      let query = supabase
        .from("messages")
        .select(
          `*, sender:profiles!messages_sender_id_fkey(username, avatar_url)`
        )
        .order("created_at", { ascending: true });

      if (activeChat.type === "world") {
        query = query.eq("world_id", activeChat.id.replace("world_", ""));
      } else {
        query = query
          .is("world_id", null)
          .or(
            `and(sender_id.eq.${session.user.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${session.user.id})`
          );
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("receiver_id", session.user.id)
          .eq("sender_id", activeChat.id);
      }

      const { data } = await query;
      if (data) {
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

    const channel = supabase
      .channel(`chat_room_${activeChat.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new;
          if (msg.sender_id === session.user.id) return;

          let belongsToChat = false;
          if (
            activeChat.type === "world" &&
            msg.world_id === activeChat.id.replace("world_", "")
          )
            belongsToChat = true;
          else if (
            activeChat.type === "dm" &&
            !msg.world_id &&
            (msg.sender_id === activeChat.id ||
              msg.receiver_id === activeChat.id)
          )
            belongsToChat = true;

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

            if (activeChat.type === "dm")
              await supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", msg.id);
            setTimeout(
              () => scrollViewRef.current?.scrollToEnd({ animated: true }),
              100
            );
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeChat, session]);

  const sendMessageToDB = async (payload) => {
    if (!activeChat || !session?.user) return;
    const tempMsg = {
      id: Date.now(),
      type: payload.type,
      sender: "You",
      text: payload.text,
      mediaUrl: payload.mediaUrl,
      lat: payload.lat,
      lng: payload.lng,
      time: "Now",
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

    const insertData = {
      sender_id: session.user.id,
      msg_type: payload.type,
      is_read: false,
    };
    if (activeChat.type === "dm") insertData.receiver_id = activeChat.id;
    else if (activeChat.type === "world")
      insertData.world_id = activeChat.id.replace("world_", "");

    if (payload.text) insertData.content = payload.text;
    if (payload.mediaUrl) insertData.media_url = payload.mediaUrl;
    if (payload.lat) insertData.lat = payload.lat;
    if (payload.lng) insertData.lng = payload.lng;
    if (!insertData.content) insertData.content = "";

    await supabase.from("messages").insert([insertData]);
  };

  const uploadToSupabase = async (uri, fileType) => {
    const extension = uri.split(".").pop();
    const filePath = `uploads/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${extension}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    await supabase.storage
      .from("chat-media")
      .upload(filePath, blob, { contentType: fileType });
    return supabase.storage.from("chat-media").getPublicUrl(filePath).data
      .publicUrl;
  };

  const triggerFilePicker = async () => {
    setIsAttachmentOpen(false);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setIsUploading(true);
      try {
        const asset = result.assets[0];
        const isVideo = asset.type === "video";
        const publicUrl = await uploadToSupabase(
          asset.uri,
          isVideo ? "video/mp4" : "image/jpeg"
        );
        sendMessageToDB({
          type: isVideo ? "video" : "image",
          mediaUrl: publicUrl,
        });
      } catch (error) {
        toast.error("Upload failed.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      clearInterval(timerRef.current);
      setRecordingDuration(0);
      setIsUploading(true);
      try {
        const publicUrl = await uploadToSupabase(uri, "audio/m4a");
        sendMessageToDB({ type: "audio", mediaUrl: publicUrl });
      } catch (err) {
      } finally {
        setIsUploading(false);
      }
    } else {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
        setIsAttachmentOpen(false);
        timerRef.current = setInterval(
          () => setRecordingDuration((prev) => prev + 1),
          1000
        );
      } catch (err) {}
    }
  };

  const playSound = async (uri) => {
    try {
      if (playingAudio) await playingAudio.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri });
      setPlayingAudio(sound);
      await sound.playAsync();
    } catch (err) {}
  };

  // 🌟 LOCATION HANDLERS 🌟
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
    toast.success("Location dropped!");
  };

  const handleFlyToLocation = (lng, lat) => {
    if (mapRef && mapRef.current) {
      if (Platform.OS === "web") {
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: 16,
          pitch: 60,
          essential: true,
        });
      } else {
        // Native fallback (if using @rnmapbox/maps)
        if (mapRef.current.setCamera) {
          mapRef.current.setCamera({
            centerCoordinate: [lng, lat],
            zoomLevel: 16,
            pitch: 60,
            animationDuration: 2000,
          });
        }
      }
      onClose();
    }
  };

  // 🌟 NATIVE + WEB CALL LOGIC 🌟
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
    if (localStream) {
      if (Platform.OS === "web")
        localStream.getTracks().forEach((track) => track.stop());
      else localStream.release(); // Native cleanup
    }
    setLocalStream(null);
    setRemoteStream(null);
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

  const handleStartCall = async (type) => {
    if (activeChat.type === "world") {
      toast.info("Group calls coming in Phase 4!");
      return;
    }
    setCallType(type);
    setCallState("calling");
    const targetId = activeChat.id;

    try {
      const stream = await mediaDevices.getUserMedia({
        video: type === "Video",
        audio: true,
      });
      setLocalStream(stream);

      if (Platform.OS === "web") {
        setTimeout(() => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }, 100);
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add tracks to connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate)
          sendSignal(targetId, {
            type: "ice-candidate",
            candidate: e.candidate,
          });
      };

      pc.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          setRemoteStream(e.streams[0]);
          if (Platform.OS === "web") {
            setTimeout(() => {
              if (remoteVideoRef.current)
                remoteVideoRef.current.srcObject = e.streams[0];
            }, 100);
          }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal(targetId, {
        type: "offer",
        sdp: offer,
        callType: type,
        callerName: session.user.user_metadata?.username,
        callerAvatar:
          session.user.user_metadata?.avatar_url || "https://placehold.co/100",
      });
    } catch (err) {
      toast.error("Could not access camera/mic.");
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    setCallState("connected");
    try {
      const stream = await mediaDevices.getUserMedia({
        video: incomingCallData.incomingType === "Video",
        audio: true,
      });
      setLocalStream(stream);

      if (Platform.OS === "web") {
        setTimeout(() => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }, 100);
      }

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
        if (e.streams && e.streams[0]) {
          setRemoteStream(e.streams[0]);
          if (Platform.OS === "web") {
            setTimeout(() => {
              if (remoteVideoRef.current)
                remoteVideoRef.current.srcObject = e.streams[0];
            }, 100);
          }
        }
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

  if (!isOpen) return null;

  return (
    <View className="absolute top-0 right-0 w-full sm:w-[400px] h-full bg-[#1c1d28] z-50 flex-col shadow-2xl border-l border-[#3b3e52] animate-in slide-in-from-right duration-300 overflow-hidden">
      {/* 🌟 UNIVERSAL WEBRTC CALL OVERLAY 🌟 */}
      {callState !== "idle" && (
        <View className="absolute inset-0 z-[100] bg-[#1c1d28] flex-col animate-in fade-in zoom-in-95 duration-300">
          {callState === "ringing" && incomingCallData && (
            <View className="flex-1 items-center justify-center p-6">
              <View className="w-32 h-32 rounded-full border-4 border-[#d3bc8e] overflow-hidden mb-6 shadow-[0_0_40px_rgba(211,188,142,0.4)] animate-pulse">
                <RNImage
                  source={{ uri: incomingCallData.callerAvatar }}
                  className="w-full h-full object-cover bg-[#2e3142]"
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
                  onPress={cleanupCall}
                  className="w-16 h-16 bg-red-500 rounded-full items-center justify-center"
                >
                  <PhoneOff size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={acceptCall}
                  className="w-16 h-16 bg-green-500 rounded-full items-center justify-center"
                >
                  <PhoneCall size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

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
                onPress={cleanupCall}
                className="w-16 h-16 bg-red-500 rounded-full items-center justify-center"
              >
                <PhoneOff size={28} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {callState === "connected" && (
            <View className="flex-1 bg-black relative">
              {/* REMOTE VIDEO (Web vs Native) */}
              {Platform.OS === "web" ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ display: callType === "Video" ? "block" : "none" }}
                />
              ) : (
                remoteStream &&
                callType === "Video" && (
                  <RTCView
                    streamURL={remoteStream.toURL()}
                    style={{ flex: 1 }}
                    objectFit="cover"
                  />
                )
              )}

              {/* LOCAL PIP VIDEO (Web vs Native) */}
              <View className="absolute top-12 right-4 w-28 h-40 bg-[#1c1d28] rounded-xl border-2 border-[#d3bc8e] overflow-hidden shadow-2xl z-50">
                {Platform.OS === "web" ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                ) : (
                  localStream && (
                    <RTCView
                      streamURL={localStream.toURL()}
                      style={{ flex: 1 }}
                      objectFit="cover"
                      mirror={true}
                    />
                  )
                )}
              </View>

              {callType === "Voice" && (
                <View className="absolute inset-0 flex items-center justify-center bg-[#1c1d28]">
                  <View className="w-32 h-32 rounded-full bg-[#2e3142] border border-[#3b3e52] items-center justify-center">
                    <Phone
                      size={48}
                      color="#d3bc8e"
                      className="animate-pulse"
                    />
                  </View>
                  <Text className="text-white text-xl font-bold mt-6">
                    {activeChat?.name || incomingCallData?.callerName}
                  </Text>
                </View>
              )}

              {/* Call Controls */}
              <View className="absolute bottom-10 left-0 w-full flex-row justify-center items-center gap-6 z-50">
                <TouchableOpacity className="w-14 h-14 bg-[#2e3142]/80 backdrop-blur-md rounded-full items-center justify-center border border-[#3b3e52]">
                  <Mic size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cleanupCall}
                  className="w-16 h-16 bg-red-500 rounded-full items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                >
                  <PhoneOff size={28} color="white" />
                </TouchableOpacity>
                {callType === "Video" && (
                  <TouchableOpacity className="w-14 h-14 bg-[#2e3142]/80 backdrop-blur-md rounded-full items-center justify-center border border-[#3b3e52]">
                    <VideoIcon size={24} color="white" />
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
                  onPress={() => {
                    setActiveChat({
                      id: `world_${currentWorld.id}`,
                      name: `${currentWorld.name} Lobby`,
                      type: "world",
                    });
                    setActiveView("chat");
                  }}
                  className="flex-row items-center p-4 bg-[#2e3142] border border-[#d3bc8e]/50 rounded-2xl shadow-lg"
                >
                  <View className="w-12 h-12 rounded-full bg-[#1c1d28] border-2 border-[#d3bc8e] items-center justify-center">
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
              <Text className="text-gray-500 text-center mt-4">
                No other travelers found.
              </Text>
            ) : (
              realDMs.map((dm) => (
                <TouchableOpacity
                  key={dm.id}
                  onPress={() => {
                    setActiveChat({ id: dm.id, name: dm.name, type: "dm" });
                    setActiveView("chat");
                  }}
                  className="flex-row items-center p-4 bg-[#1c1d28] border-b border-[#3b3e52]"
                >
                  <RNImage
                    source={{ uri: dm.avatar }}
                    className="w-12 h-12 rounded-full border border-[#3b3e52]"
                  />
                  <View className="ml-4 flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text
                        className={`font-bold text-base ${
                          dm.unreadCount > 0 ? "text-white" : "text-gray-300"
                        }`}
                      >
                        {dm.name}
                      </Text>
                      {dm.unreadCount > 0 && (
                        <View className="bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                          <Text className="text-white font-bold text-[10px]">
                            {dm.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      className={`${
                        dm.unreadCount > 0
                          ? "text-white font-bold"
                          : "text-gray-500"
                      } text-sm truncate`}
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
                onPress={() => {
                  setActiveView("inbox");
                  setActiveChat(null);
                }}
                className="p-2 -ml-2 rounded-full"
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
                  className="w-10 h-10 bg-[#1c1d28] rounded-full items-center justify-center border border-[#3b3e52]"
                >
                  <Phone size={18} color="#d3bc8e" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleStartCall("Video")}
                  className="w-10 h-10 bg-[#1c1d28] rounded-full items-center justify-center border border-[#3b3e52]"
                >
                  <VideoIcon size={18} color="#d3bc8e" />
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
                      onPress={() => {
                        if (Platform.OS === "web")
                          handleFlyToLocation(msg.lng, msg.lat);
                      }}
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
                    <RNImage
                      source={{ uri: msg.mediaUrl }}
                      style={{ width: 200, height: 200, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  )}
                  {msg.type === "video" && (
                    <ExpoVideo
                      source={{ uri: msg.mediaUrl }}
                      style={{
                        width: 220,
                        height: 300,
                        borderRadius: 12,
                        backgroundColor: "black",
                      }}
                      useNativeControls
                      resizeMode="contain"
                    />
                  )}
                  {msg.type === "audio" && (
                    <TouchableOpacity
                      onPress={() => playSound(msg.mediaUrl)}
                      className={`flex-row items-center gap-3 p-2 rounded-full ${
                        msg.isMe ? "bg-[#1c1d28]/10" : "bg-[#1c1d28]"
                      }`}
                    >
                      <View className="w-8 h-8 rounded-full bg-[#d3bc8e] items-center justify-center">
                        <Play size={16} color="#1c1d28" fill="#1c1d28" />
                      </View>
                      <Text
                        className={
                          msg.isMe
                            ? "text-[#1c1d28] font-medium"
                            : "text-white font-medium"
                        }
                      >
                        Play Audio
                      </Text>
                    </TouchableOpacity>
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

          {/* Attachment & Input */}
          {isAttachmentOpen && (
            <View className="absolute bottom-20 left-4 bg-[#2e3142] border border-[#3b3e52] rounded-2xl p-2 shadow-2xl">
              <TouchableOpacity
                onPress={triggerFilePicker}
                className="flex-row items-center p-3 rounded-xl mb-1"
              >
                <ImageIcon size={20} color="#d3bc8e" />
                <Text className="text-white font-medium ml-3">
                  Photo & Video
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShareLocation}
                className="flex-row items-center p-3 rounded-xl"
              >
                <MapPin size={20} color="#4ade80" />
                <Text className="text-white font-medium ml-3">
                  Share Location
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View className="p-4 bg-[#1c1d28] border-t border-[#3b3e52]">
            {recording ? (
              <View className="flex-row items-center justify-between bg-[#2e3142] border border-red-500/50 rounded-full px-4 h-12">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3" />
                  <Text className="text-white font-mono">{`${Math.floor(
                    recordingDuration / 60
                  )}:${recordingDuration % 60 < 10 ? "0" : ""}${
                    recordingDuration % 60
                  }`}</Text>
                </View>
                <TouchableOpacity
                  onPress={toggleRecording}
                  className="w-8 h-8 bg-red-500 rounded-full items-center justify-center"
                >
                  <Square size={14} color="white" fill="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => setIsAttachmentOpen(!isAttachmentOpen)}
                  className={`p-3 rounded-full border ${
                    isAttachmentOpen
                      ? "bg-[#d3bc8e] border-[#d3bc8e]"
                      : "bg-[#2e3142] border-[#3b3e52]"
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
                    className="text-white text-base"
                    multiline
                    maxLength={500}
                  />
                </View>
                {inputText.trim() ? (
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    className="w-12 h-12 bg-[#d3bc8e] rounded-full items-center justify-center"
                  >
                    <Send size={20} color="#1c1d28" style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={toggleRecording}
                    className="w-12 h-12 bg-[#2e3142] border border-[#3b3e52] rounded-full items-center justify-center"
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
