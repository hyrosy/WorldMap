// src/components/CommentForm.js
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // We'll need to add this
import { Input } from '@/components/ui/input';
import { ImagePlus, X } from 'lucide-react';

export default function CommentForm({ locationId, onCommentPosted }) {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event) => {
    if (event.target.files) {
      // Allow up to 3 files
      setFiles(Array.from(event.target.files).slice(0, 3));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!content.trim() && files.length === 0) return;

    setUploading(true);

    let imageUrls = [];
    if (files.length > 0) {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('comment-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          setUploading(false);
          return; // Stop if any upload fails
        }

        const { data: { publicUrl } } = supabase.storage
          .from('comment-images')
          .getPublicUrl(filePath);
        
        imageUrls.push(publicUrl);
      }
    }

    // Pass both content and imageUrls to the parent to post
    await onCommentPosted(content, imageUrls);

    // Reset form
    setContent('');
    setFiles([]);
    setUploading(false);
  };

  return (
    <div className="p-4 border-t">
      <h3 className="font-semibold mb-2">Leave a Comment</h3>
      <form onSubmit={handleSubmit}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience..."
          className="mb-2"
        />
        <div className="flex justify-between items-center">
          <label htmlFor="file-upload" className="cursor-pointer text-gray-500 hover:text-gray-800">
            <ImagePlus size={24} />
            <Input id="file-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          <Button type="submit" disabled={uploading}>
            {uploading ? 'Posting...' : 'Post'}
          </Button>
        </div>
        {files.length > 0 && (
            <div className="mt-2 text-sm text-gray-500">
                Selected {files.length} file(s): {files.map(f => f.name).join(', ')}
            </div>
        )}
      </form>
    </div>
  );
}