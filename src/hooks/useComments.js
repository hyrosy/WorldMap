// src/hooks/useComments.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const COMMENTS_PER_PAGE = 3;

export default function useComments(locationId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // This is the core fetch logic, wrapped in useCallback for stability
  const fetchComments = useCallback(async (loadMore = false) => {
    if (!locationId) return;

    setLoading(true);

    const from = loadMore ? comments.length : 0;
    const to = from + COMMENTS_PER_PAGE - 1;
    const user = (await supabase.auth.getUser()).data.user;
    try {
      // We now also fetch the votes for each comment
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, image_urls, user_id,
          profiles ( username ),
          comment_votes ( user_id, vote_type )
        `)
        .eq('wordpress_location_id', locationId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      // Process comments to add vote counts and user's vote
      const processedComments = data.map(comment => {
        const upvotes = comment.comment_votes.filter(v => v.vote_type === true).length;
        const downvotes = comment.comment_votes.filter(v => v.vote_type === false).length;
        // **FIX 1:** Correctly find the current user's vote from the array of all votes
        const userVoteRecord = user ? comment.comment_votes.find(v => v.user_id === user.id) : null;
        const userVote = userVoteRecord?.vote_type ?? null;
        return { ...comment, upvotes, downvotes, userVote };
      });

      // If loading more, append. Otherwise, replace.
      setComments(prev => (loadMore ? [...prev, ...processedComments] : processedComments));
      
      // If we received fewer items than we asked for, we've reached the end
      if (data.length < COMMENTS_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [locationId, comments.length]);


  // This useEffect triggers the INITIAL fetch only when the locationId changes
  useEffect(() => {
    // Reset state when the pin changes to prevent showing old data
    setComments([]);
    setHasMore(true);
    fetchComments(false); // `false` indicates it's an initial load, not "load more"
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]); // IMPORTANT: This only runs when the location ID changes

  
  const postComment = async (commentData) => {
    const { content, userId, wordpressLocationId, imageUrls = [] } = commentData;
    if ((!content || !content.trim()) && imageUrls.length === 0) return null;
    if (!userId || !wordpressLocationId) {
        console.error("Missing userId or wordpressLocationId");
        return null;
    }
    try {
        const { data, error } = await supabase
            .from('comments')
            .insert({ content, user_id: userId, wordpress_location_id: wordpressLocationId, image_urls: imageUrls })
            .select('id, content, created_at, image_urls, user_id, profiles(username)') // Added user_id
            .single();
        if (error) throw error;
        // Manually add vote properties to new comment for consistency
        const newComment = { ...data, upvotes: 0, downvotes: 0, userVote: null, comment_votes: [] };
        setComments(prev => [newComment, ...prev]);
        return newComment;
    } catch (error) {
        console.error("Error posting comment:", error);
        return null;
    }
  };

  // --- NEW FUNCTION TO DELETE A COMMENT ---
  const deleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;

      // Remove the comment from the local state for an instant UI update
      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // --- NEW: VOTE HANDLING LOGIC ---
  const handleVote = async (commentId, voteType) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
        alert('You must be logged in to vote.');
        return;
    }

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    const currentVote = comment.userVote;

    const isRemovingVote = currentVote === voteType;

    // Optimistic UI Update (this remains the same)
    setComments(prev => prev.map(c => {
        if (c.id === commentId) {
            let { upvotes, downvotes, userVote: newVoteState } = c;
            if (currentVote === true) upvotes--;
            if (currentVote === false) downvotes--;
            
            if (isRemovingVote) {
                newVoteState = null;
            } else {
                if (voteType === true) upvotes++;
                if (voteType === false) downvotes++;
                newVoteState = voteType;
            }
            return { ...c, upvotes, downvotes, userVote: newVoteState };
        }
        return c;
    }));
    
    // Database operation
    if (isRemovingVote) {
        const { error } = await supabase.from('comment_votes').delete().match({ user_id: user.id, comment_id: commentId });
        if (error) {
            console.error("Error removing vote:", error);
            alert("Could not remove vote. Please try again.");
            fetchComments(); // Re-fetch data to correct the UI if the DB operation failed
        }
    } else {
        const { error } = await supabase.from('comment_votes').upsert({ user_id: user.id, comment_id: commentId, vote_type: voteType });
        if (error) {
            console.error("Error saving vote:", error);
            alert("Could not save vote. Please try again.");
            fetchComments(); // Re-fetch data to correct the UI
        }
    }
  };

  return { 
      comments, 
      loading,
      hasMore, 
      fetchMoreComments: () => fetchComments(true), // `true` indicates load more
      postComment,
      deleteComment,
      handleVote 
  };
}