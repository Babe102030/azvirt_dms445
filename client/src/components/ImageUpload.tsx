import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Image, Upload, X, Loader2, FileImage } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface ImageUploadProps {
  onImageAnalyzed?: (analysis: string, imageUrl: string) => void;
  onTextExtracted?: (text: string, imageUrl: string) => void;
  mode?: 'analyze' | 'ocr' | 'both';
  label?: string;
}

export function ImageUpload({
  onImageAnalyzed,
  onTextExtracted,
  mode = 'both',
  label = 'Upload Image',
}: ImageUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeImageMutation = trpc.ai.analyzeImage.useMutation();
  const extractTextMutation = trpc.ai.extractTextFromImage.useMutation();

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image size must be less than 10MB');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleProcess = async () => {
    if (!imageFile || !previewUrl) return;

    setIsProcessing(true);

    try {
      // Convert to base64 for upload
      const base64Data = previewUrl.split(',')[1];

      // Upload to storage (simplified - you may want to use your storage service)
      const timestamp = Date.now();
      const fileName = `ai-upload-${timestamp}-${imageFile.name}`;

      // For now, we'll use the base64 data URL directly
      // In production, you should upload to S3 and get a proper URL
      const imageUrl = previewUrl;

      if (mode === 'ocr' || mode === 'both') {
        const result = await extractTextMutation.mutateAsync({
          imageUrl,
          language: 'en',
        });

        if (result.success && result.text && onTextExtracted) {
          onTextExtracted(result.text, imageUrl);
        }
      }

      if (mode === 'analyze' || mode === 'both') {
        const result = await analyzeImageMutation.mutateAsync({
          imageUrl,
          prompt: 'Analyze this image and provide a detailed description. If it contains text, extract and include it. If it appears to be a document, invoice, or form, describe its structure and content.',
        });

        if (result.success && result.analysis && onImageAnalyzed) {
          onImageAnalyzed(result.analysis, imageUrl);
        }
      }

      // Clear the selection after processing
      handleClear();
    } catch (error) {
      console.error('Image processing error:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setImageFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!previewUrl ? (
        <Card
          className={`p-8 border-2 border-dashed transition-colors cursor-pointer ${
            dragActive
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
              : 'border-border hover:border-orange-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <FileImage className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-medium">{label}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click to browse or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                PNG, JPG, JPEG up to 10MB
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-900"
              />
              {!isProcessing && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* File Info */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileImage className="h-4 w-4" />
                <span>{imageFile?.name}</span>
                <span className="text-xs">
                  ({((imageFile?.size || 0) / 1024).toFixed(2)} KB)
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Image className="h-4 w-4 mr-2" />
                    {mode === 'ocr'
                      ? 'Extract Text'
                      : mode === 'analyze'
                        ? 'Analyze Image'
                        : 'Process Image'}
                  </>
                )}
              </Button>
              {!isProcessing && (
                <Button onClick={handleClear} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>

            {/* Processing Status */}
            {isProcessing && (
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  {mode === 'ocr'
                    ? 'Extracting text from image...'
                    : mode === 'analyze'
                      ? 'Analyzing image content...'
                      : 'Processing image with AI vision model...'}
                </p>
                <p className="text-xs mt-1">This may take a few moments</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
