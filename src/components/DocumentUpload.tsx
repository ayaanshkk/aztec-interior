// components/DocumentUpload.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export default function DocumentUpload({ customerId, onUploadSuccess }: {
  customerId: string;
  onUploadSuccess: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Upload to Vercel Blob via Next.js API
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await uploadRes.json();

      // 2. Save to backend database
      const token = localStorage.getItem('token');
      const backendFormData = new FormData();
      backendFormData.append('client_id', customerId);
      backendFormData.append('file_url', url);
      backendFormData.append('file_name', file.name);
      backendFormData.append('category', 'drawing');

      const saveRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/files/save-document`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: backendFormData,
        }
      );

      if (!saveRes.ok) {
        throw new Error('Failed to save document');
      }

      alert('Document uploaded successfully!');
      onUploadSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        id="document-upload"
        className="hidden"
        onChange={handleFileUpload}
        disabled={uploading}
      />
      <label htmlFor="document-upload">
        <Button disabled={uploading} asChild>
          <span>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Document'}
          </span>
        </Button>
      </label>
    </div>
  );
}