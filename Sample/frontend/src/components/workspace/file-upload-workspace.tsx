import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@utils/cn';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

interface FileUploadWorkspaceProps {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  readOnly?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function FileUploadWorkspace({
  value = [],
  onChange,
  readOnly = false,
  accept = '*',
  maxFiles = 5,
  maxSizeMB = 10,
}: FileUploadWorkspaceProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = useCallback((fileList: FileList | File[]) => {
    setError('');
    const files = Array.from(fileList);
    const remaining = maxFiles - value.length;
    
    if (files.length > remaining) {
      setError(`You can only upload ${remaining} more file(s)`);
      return;
    }

    const oversized = files.find((f) => f.size > maxSizeMB * 1024 * 1024);
    if (oversized) {
      setError(`File "${oversized.name}" exceeds the ${maxSizeMB}MB limit`);
      return;
    }

    const newFiles: UploadedFile[] = [];
    let processed = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: e.target?.result as string,
        });
        processed++;
        if (processed === files.length) {
          onChange([...value, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [value, onChange, maxFiles, maxSizeMB]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!readOnly && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [readOnly, processFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeFile = (index: number) => {
    if (!readOnly) {
      onChange(value.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!readOnly && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 transition-all',
            dragOver
              ? 'border-primary-500 bg-primary-50'
              : 'border-border bg-surface-secondary hover:border-primary-300 hover:bg-primary-50/30',
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Upload className={cn('h-6 w-6', dragOver ? 'text-primary-600' : 'text-primary-500')} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-text-primary">
              {dragOver ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              or click to browse &middot; Max {maxFiles} files, {maxSizeMB}MB each
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* File list */}
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50">
                {file.type.startsWith('image/') && file.dataUrl ? (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <FileText className="h-4 w-4 text-accent-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                <p className="text-xs text-text-tertiary">{formatSize(file.size)}</p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-accent-500 shrink-0" />
              {!readOnly && (
                <button
                  onClick={() => removeFile(index)}
                  className="rounded-md p-1 text-text-tertiary hover:bg-red-50 hover:text-error transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && readOnly && (
        <div className="rounded-lg border border-dashed border-border bg-surface-secondary p-6 text-center">
          <p className="text-sm text-text-tertiary">No files uploaded</p>
        </div>
      )}
    </div>
  );
}

export default FileUploadWorkspace;
