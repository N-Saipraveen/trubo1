import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export function FileUpload() {
  const { setInputContent, setSourceType, setFileInfo } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const response = await api.uploadFile(file);

        if (response.success && response.data) {
          setInputContent(response.data.content);
          setSourceType(response.data.type);
          setFileInfo({
            name: response.data.filename,
            size: response.data.size,
          });
          toast.success(`File uploaded: ${response.data.filename}`);
        } else {
          toast.error(response.error || 'Upload failed');
        }
      } catch (error) {
        toast.error('Failed to upload file');
        console.error('Upload error:', error);
      } finally {
        setIsUploading(false);
      }
    },
    [setInputContent, setSourceType, setFileInfo]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <Card
      className={`transition-all duration-200 ${
        isDragging ? 'border-primary shadow-lg scale-[1.02]' : ''
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <CardContent className="p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {isUploading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            ) : (
              <Upload className="h-8 w-8 text-primary" />
            )}
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold">Upload Schema File</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Drag and drop or click to browse
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Supports .sql, .json, .bson, .yaml files</span>
          </div>

          <label htmlFor="file-upload">
            <Button
              variant="outline"
              disabled={isUploading}
              className="cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Browse Files
            </Button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".sql,.json,.bson,.yaml,.yml"
              onChange={onFileSelect}
              disabled={isUploading}
            />
          </label>

          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span>Max file size: 10MB</span>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
