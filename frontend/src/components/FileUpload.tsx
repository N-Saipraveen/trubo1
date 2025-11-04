import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card
        className={`glass-card glass-card-hover transition-all duration-300 border-2 ${
          isDragging ? 'border-primary shadow-2xl scale-[1.02] bg-primary/5' : 'border-white/40'
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <CardContent className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center justify-center gap-5"
          >
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3 }}
            className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/30"
          >
            {isUploading ? (
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
            ) : (
              <Upload className="h-10 w-10 text-white" />
            )}
          </motion.div>

          <div className="text-center">
            <h3 className="text-xl font-bold text-foreground">Upload Schema File</h3>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
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
    </motion.div>
  );
}
