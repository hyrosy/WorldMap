'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Alert, Platform } from 'react-native';

const COMMENTS_PER_PAGE = 3;

// Helper function for cross-platform alerts
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function useComments(locationId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const fetchComments = useCallback(async (loadMore = false) => {
    if (!locationId) return;

    setLoading(true);

    const from = loadMore ? comments.length : 0;
    const to = from + COMMENTS_PER_PAGE - 1;
    const user = (await supabase.auth.getUser()).data.user;
    
    try {
      // UPDATED SCHEMA: Use location_id instead of wordpress_location_id
      // UPDATED SCHEMA: Use is_upvote instead of vote_type
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, image_urls, user_id,
          profiles ( username ),
          comment_votes ( user_id, is_upvote )
        `)
        .eq('location_id', locationId) 
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      const processedComments = data.map(comment => {
        // Handle potentially null comment_votes array
        const votes = comment.comment_votes || [];
        const upvotes = votes.filter(v => v.is_upvote === true).length;
        const downvotes = votes.filter(v => v.is_upvote === false).length;
        
        const userVoteRecord = user ? votes.find(v => v.user_id === user.id) : null;
        const userVote = userVoteRecord?.is_upvote ?? null;
        
        return { ...comment, upvotes, downvotes, userVote };
      });

      setComments(prev => (loadMore ? [...prev, ...processedComments] : processedComments));
      
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


  useEffect(() => {
    setComments([]);
    setHasMore(true);
    fetchComments(false); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]); 

  
  const postComment = async (commentData) => {
    // locationId replaced wordpressLocationId
    const { content, userId, locationId: targetLocationId, imageUrls = [] } = commentData;
    
    if ((!content || !content.trim()) && imageUrls.length === 0) return null;
    if (!userId || !targetLocationId) {
        console.error("Missing userId or locationId");
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('comments')
            // UPDATED SCHEMA: Use location_id
            .insert({ content, user_id: userId, location_id: targetLocationId, image_urls: imageUrls })
            .select('id, content, created_at, image_urls, user_id, profiles(username)') 
            .single();
            
        if (error) throw error;
        
        const newComment = { ...data, upvotes: 0, downvotes: 0, userVote: null, comment_votes: [] };
        setComments(prev => [newComment, ...prev]);
        return newComment;
    } catch (error) {
        console.error("Error posting comment:", error);
        showAlert("Error", "Could not post comment. Please try again.");
        return null;
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;

      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      showAlert("Error", "Could not delete comment.");
    }
  };

  const handleVote = async (commentId, isUpvote) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
        showAlert('Authentication Required', 'You must be logged in to vote.');
        return;
    }

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    const currentVote = comment.userVote;

    const isRemovingVote = currentVote === isUpvote;

    // Optimistic UI Update
    setComments(prev => prev.map(c => {
        if (c.id === commentId) {
            let { upvotes, downvotes, userVote: newVoteState } = c;
            if (currentVote === true) upvotes--;
            if (currentVote === false) downvotes--;
            
            if (isRemovingVote) {
                newVoteState = null;
            } else {
                if (isUpvote === true) upvotes++;
                if (isUpvote === false) downvotes++;
                newVoteState = isUpvote;
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
            showAlert("Error", "Could not remove vote. Please try again.");
            fetchComments(false); 
        }
    } else {
        // UPDATED SCHEMA: Use is_upvote
        const { error } = await supabase.from('comment_votes').upsert({ user_id: user.id, comment_id: commentId, is_upvote: isUpvote }, { onConflict: 'comment_id,user_id' });
        if (error) {
            console.error("Error saving vote:", error);
            showAlert("Error", "Could not save vote. Please try again.");
            fetchComments(false); 
        }
    }
  };

  return { 
      comments, 
      loading,
      hasMore, 
      fetchMoreComments: () => fetchComments(true), 
      postComment,
      deleteComment,
      handleVote 
  };
}