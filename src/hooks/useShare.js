import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function useShare() {
  const [isSending, setIsSending] = useState(false);

  const shareWithFriend = async (mapId, currentUserId, friendUsername) => {
    if (!friendUsername.trim()) {
      toast.error("Please enter a username");
      return false;
    }

    setIsSending(true);

    try {
      // 1. Find the friend
      const { data: friendProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", friendUsername.trim())
        .single();

      if (profileError || !friendProfile) {
        toast.error("Traveler not found", {
          description: "Double check the username!",
        });
        return false;
      }

      // 2. Insert into shared_maps
      const { error: shareError } = await supabase
        .from("shared_maps")
        .insert([
          {
            map_id: mapId,
            sender_id: currentUserId,
            receiver_id: friendProfile.id,
          },
        ]);

      if (shareError) {
        if (shareError.code === "23505") {
          toast.info("Already Shared", {
            description: "You already sent this map to them!",
          });
        } else {
          throw shareError;
        }
        return false;
      }

      toast.success("Itinerary Sent!", {
        description: `${friendUsername} will see it in their inbox.`,
        style: {
          background: "#2e3142",
          border: "1px solid #d3bc8e",
          color: "#d3bc8e",
        },
      });
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to share itinerary");
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return { shareWithFriend, isSending };
}
