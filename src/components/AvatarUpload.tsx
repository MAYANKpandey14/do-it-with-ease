
import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AvatarUploadProps {
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  size = 'md', 
  showUploadButton = true 
}) => {
  const { user, profile, updateProfile, loadProfile } = useAuthStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24'
  };

  const getAvatarUrl = () => {
    if (!profile?.avatar_url || imageError) return null;
    
    if (profile.avatar_url.startsWith('http')) {
      return profile.avatar_url;
    }
    
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(profile.avatar_url);
    
    return data.publicUrl;
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete existing avatar if it exists
      if (profile?.avatar_url && !profile.avatar_url.startsWith('http')) {
        await supabase.storage
          .from('avatars')
          .remove([profile.avatar_url]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: filePath });
      
      // Reload profile to ensure UI updates
      await loadProfile();
      
      setImageError(false);

      toast({
        title: 'Avatar uploaded',
        description: 'Your profile picture has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload avatar.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    uploadAvatar(file);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || profile?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <div className="flex items-center space-x-4">
      <Avatar className={sizeClasses[size]} role="img">
        <AvatarImage 
          src={getAvatarUrl() || undefined} 
          alt={`${profile?.full_name || 'User'}'s profile picture`}
          onError={handleImageError}
        />
        <AvatarFallback 
          className="text-lg font-medium bg-primary/10 text-primary"
          aria-label={`Profile initials: ${initials}`}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {showUploadButton && (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="sr-only"
            aria-label="Upload profile picture"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-describedby="avatar-upload-description"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Change Avatar</span>
              </>
            )}
          </Button>
          <div id="avatar-upload-description" className="sr-only">
            Upload a new profile picture. Supported formats: JPG, PNG, GIF. Maximum size: 5MB.
          </div>
        </div>
      )}
    </div>
  );
};
