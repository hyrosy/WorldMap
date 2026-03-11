import React, { useState } from "react";
import { toast } from "sonner";
import useShare from "@/hooks/useShare";

export function ShareModal({ isOpen, onClose, activeMapId, currentUserId }) {
  const [friendUsername, setFriendUsername] = useState("");
  const { shareWithFriend, isSending } = useShare();

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const baseUrl = window.location.origin;
    const shareLink = `${baseUrl}/map?route=${activeMapId}`;

    navigator.clipboard
      .writeText(shareLink)
      .then(() => {
        toast.success("Link Copied!", {
          description: "Anyone with this link can view your itinerary.",
          style: {
            background: "#2e3142",
            border: "1px solid #d3bc8e",
            color: "#d3bc8e",
          },
        });
      })
      .catch(() => toast.error("Failed to copy link"));
  };

  const handleSend = async () => {
    const success = await shareWithFriend(
      activeMapId,
      currentUserId,
      friendUsername
    );
    if (success) {
      setFriendUsername("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1c1d28]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#2e3142] border border-[#d3bc8e]/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#d3bc8e]/50 hover:text-[#d3bc8e] transition-colors"
        >
          ✕
        </button>

        <h3 className="text-[#d3bc8e] font-bold text-lg tracking-wide mb-1">
          Share with a Traveler
        </h3>
        <p className="text-gray-400 text-xs mb-6">
          Send this custom itinerary directly to their app.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter exact username..."
            value={friendUsername}
            onChange={(e) => setFriendUsername(e.target.value)}
            className="w-full bg-[#1c1d28] border border-[#3b3e52] focus:border-[#d3bc8e] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isSending}
            className="w-full h-12 rounded-full bg-[#e6ce9a] hover:bg-[#d3bc8e] disabled:opacity-50 text-[#1c1d28] font-bold tracking-wide flex items-center justify-center transition-colors"
          >
            {isSending ? "Sending..." : "Send Itinerary"}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="h-[1px] flex-1 bg-[#3b3e52]"></div>
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-widest">
            OR
          </span>
          <div className="h-[1px] flex-1 bg-[#3b3e52]"></div>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full h-12 mt-4 rounded-full border border-[#3b3e52] hover:border-[#d3bc8e]/50 text-[#d3bc8e] font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors"
        >
          Copy Public Link
        </button>
      </div>
    </div>
  );
}
