import { useState, useCallback, useEffect } from 'react';
import type { ModuleComponentProps } from './workspace-engine';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { candidatePortalApi, type SubmissionFile } from '@services/candidate-portal-service';
import { Upload, File, X, Check, FileText, Image, FileArchive, Loader2, AlertCircle, Download, Maximize2, ExternalLink } from 'lucide-react';

interface UploadedFile {
  fileObj: File;
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  uploadProgress: number; // 0–100
  error?: string;
  submissionId: string;
  record?: SubmissionFile;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];

function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext || '');
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext || '')) return Image;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return FileArchive;
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) return FileText;
  return File;
}

export function FileUploaderModule({ moduleKey, config, readOnly }: ModuleComponentProps) {
  const maxFiles = (config?.maxFiles as number) || 5;
  const maxFileSize = (config?.maxFileSize as number) || 10485760; // 10MB
  const submissionId = (config?.submissionId as string) || '';
  const fileInputId = `file-input-${moduleKey || 'default'}`;
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [lightboxLoaded, setLightboxLoaded] = useState(false);

  const uploadFile = useCallback(async (fileItem: UploadedFile) => {
    if (!fileItem.submissionId) {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'error', error: 'No submission ID', uploadProgress: 0 } : f)),
      );
      return;
    }

    setFiles((prev) =>
      prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'uploading', uploadProgress: 0 } : f)),
    );

    try {
      const record = await candidatePortalApi.uploadSubmissionFile(
        fileItem.submissionId,
        fileItem.fileObj,
        (percent) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, uploadProgress: percent } : f)),
          );
        },
      );
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'done', uploadProgress: 100, record } : f)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'error', uploadProgress: 0, error: message } : f)),
      );
    }
  }, [submissionId]);

  const handleFiles = async (newFiles: File[]) => {
    const remaining = maxFiles - files.filter((f) => f.status !== 'error').length;
    const oversized = newFiles.filter((f) => f.size > maxFileSize);
    const validFiles = newFiles.filter((f) => f.size <= maxFileSize);

    // Show oversized files immediately as errors
    if (oversized.length > 0) {
      oversized.forEach((f) => {
        const id = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setFiles((prev) => [
          ...prev,
          {
            fileObj: f,
            id,
            name: f.name,
            size: f.size,
            type: f.type,
            status: 'error' as const,
            uploadProgress: 0,
            submissionId,
            error: `Exceeds max file size of ${formatSize(maxFileSize)}`,
          },
        ]);
      });
    }

    const toAdd: UploadedFile[] = validFiles.slice(0, remaining).map((f) => ({
      fileObj: f,
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      status: 'pending' as const,
      uploadProgress: 0,
      submissionId,
    }));

    if (toAdd.length > 0) {
      setFiles((prev) => [...prev, ...toAdd]);

      // Upload each file sequentially
      for (const fileItem of toAdd) {
        await uploadFile(fileItem);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  };

  const retryUpload = (fileItem: UploadedFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'pending', uploadProgress: 0, error: undefined } : f)),
    );
    uploadFile({ ...fileItem, status: 'pending', uploadProgress: 0 });
  };

  // Reset lightbox loaded state when previewFile changes
  useEffect(() => {
    if (previewFile) setLightboxLoaded(false);
  }, [previewFile]);

  // Close lightbox on Escape key + lock body scroll
  useEffect(() => {
    if (!previewFile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewFile(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [previewFile]);

  // Track image thumbnail load failures separately (file upload succeeded, preview just failed)
  const handleImageError = useCallback((fileId: string) => {
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.add(fileId);
      return next;
    });
  }, []);

  const activeFiles = files.filter((f) => f.status !== 'error');
  const uploadCount = activeFiles.filter((f) => f.status === 'done').length;
  const totalUploadBytes = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-text-primary">File Upload</span>
          <Badge size="sm" variant="info">{uploadCount}/{maxFiles} uploaded</Badge>
        </div>
        {files.length > 0 && (
          <span className="text-xs text-text-tertiary">{formatSize(totalUploadBytes)} total</span>
        )}
      </div>

      {/* Drop Zone */}
      {!readOnly && activeFiles.length < maxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              document.getElementById(fileInputId)?.click();
            }
          }}
          className="border-2 border-dashed border-border rounded-xl px-6 py-8 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-colors cursor-pointer"
          onClick={() => document.getElementById(fileInputId)?.click()}
        >
          <Upload className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-secondary">
            Drag & drop files here, or <span className="text-primary-600 font-medium">browse</span>
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            Max {formatSize(maxFileSize)} per file &middot; {maxFiles} file(s) max
          </p>
          <input
            id={fileInputId}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.name);
            const isUploading = file.status === 'uploading';
            const isError = file.status === 'error';
            const isDone = file.status === 'done';
            const isImage = isImageFile(file.name) && isDone && !!file.record && !imageErrors.has(file.id);
            return (
              <div
                key={file.id}
                className={`relative overflow-hidden rounded-xl border ${
                  isError
                    ? 'border-red-200 bg-red-50'
                    : isDone
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-border bg-surface-secondary'
                }`}
              >
                {/* Animated progress bar background (only during upload) */}
                {isUploading && (
                  <div
                    className="absolute inset-0 bg-primary-100/40 pointer-events-none transition-all duration-300 ease-out"
                    style={{ width: `${file.uploadProgress}%` }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isImage ? (
                      <div className="relative shrink-0 group/image">
                        <img
                          src={candidatePortalApi.getSubmissionFileUrl(file.record?.id ?? '')}
                          alt={file.name}
                          className="h-10 w-10 rounded-lg object-cover border border-border cursor-pointer bg-surface-tertiary"
                          loading="lazy"
                          onError={() => handleImageError(file.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                          className="absolute -top-1 -right-1 rounded-full bg-background/80 border border-border p-0.5 opacity-0 group-hover/image:opacity-100 transition-opacity"
                          title="Preview image"
                        >
                          <Maximize2 className="h-3 w-3 text-text-secondary" />
                        </button>
                      </div>
                    ) : (
                      <Icon className={`h-5 w-5 shrink-0 ${
                        isError ? 'text-red-500' : 'text-text-tertiary'
                      }`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${
                        isError ? 'text-red-800' : 'text-text-primary'
                      }`}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-tertiary mt-0.5">
                        <span>{formatSize(file.size)}</span>
                        {isUploading && (
                          <>
                            <span className="text-primary-600 font-medium">
                              {file.uploadProgress}%
                            </span>
                            <span className="flex-1 max-w-[120px] h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
                              <span
                                className="block h-full rounded-full bg-primary-500 transition-all duration-300 ease-out"
                                style={{ width: `${file.uploadProgress}%` }}
                              />
                            </span>
                          </>
                        )}
                        {isDone && (
                          <span className="text-accent-600 font-medium">
                            {formatSize(file.size)} uploaded
                          </span>
                        )}
                        {isError && file.error && (
                          <span className="text-red-600">{file.error}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {isUploading && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary-50 text-primary-700 text-xs font-medium">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {file.uploadProgress}%
                      </div>
                    )}
                    {isDone && (
                      <Check className="h-4 w-4 text-accent-600" />
                    )}
                    {isError && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    {isDone && file.record && (
                      <a
                        href={candidatePortalApi.getSubmissionFileUrl(file.record.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md p-1 text-text-secondary hover:bg-surface-tertiary transition-colors"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    {!readOnly && file.status === 'pending' && (
                      <Button variant="ghost" size="sm" iconOnly onClick={() => removeFile(file.id)}>
                        <X className="h-4 w-4 text-error" />
                      </Button>
                    )}
                    {!readOnly && isError && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" iconOnly onClick={() => retryUpload(file)} title="Retry upload">
                          <Upload className="h-4 w-4 text-accent-600" />
                        </Button>
                        <Button variant="ghost" size="sm" iconOnly onClick={() => removeFile(file.id)}>
                          <X className="h-4 w-4 text-error" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {previewFile && previewFile.record && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] rounded-2xl overflow-hidden bg-surface-primary shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-primary">
              <div className="flex items-center gap-2 min-w-0">
                <Image className="h-4 w-4 text-text-tertiary shrink-0" />
                <p className="text-sm font-medium text-text-primary truncate">{previewFile.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={candidatePortalApi.getSubmissionFileUrl(previewFile.record.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md p-1.5 text-text-secondary hover:bg-surface-tertiary transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Button variant="ghost" size="sm" iconOnly onClick={() => setPreviewFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Image container */}
            <div className="relative flex items-center justify-center bg-black/10 p-2 min-h-[200px]">
              {!lightboxLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
                  <span className="text-xs text-text-tertiary">Loading image...</span>
                </div>
              )}
              <img
                src={candidatePortalApi.getSubmissionFileUrl(previewFile.record?.id ?? '')}
                alt={previewFile.name}
                className={`max-w-full max-h-[75vh] rounded-lg object-contain transition-opacity duration-300 ${
                  lightboxLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setLightboxLoaded(true)}
                onError={() => setLightboxLoaded(true)}
              />
            </div>
            {/* Lightbox footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface-primary text-xs text-text-tertiary">
              <span>{formatSize(previewFile.size)}</span>
              <span>Press ESC to close</span>
            </div>
          </div>
        </div>
      )}

      {files.length === 0 && (
        <div className="flex flex-col items-center py-6 text-center">
          <File className="h-12 w-12 text-text-tertiary" />
          <p className="mt-2 text-sm text-text-secondary">No files uploaded yet</p>
        </div>
      )}
    </div>
  );
}

export default FileUploaderModule;
