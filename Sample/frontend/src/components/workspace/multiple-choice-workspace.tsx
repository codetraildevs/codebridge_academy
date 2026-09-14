import { useState } from 'react';
import { cn } from '@utils/cn';
import { CheckCircle2, Circle } from 'lucide-react';

interface MultipleChoiceOption {
  text: string;
  isCorrect?: boolean;
}

interface MultipleChoiceWorkspaceProps {
  options: MultipleChoiceOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  readOnly?: boolean;
}

export function MultipleChoiceWorkspace({
  options,
  value,
  onChange,
  multiple = false,
  readOnly = false,
}: MultipleChoiceWorkspaceProps) {
  const selectedValues = multiple
    ? (Array.isArray(value) ? value : [])
    : (typeof value === 'string' ? [value] : []);

  const handleSelect = (optionText: string) => {
    if (readOnly) return;

    if (multiple) {
      const newSelection = selectedValues.includes(optionText)
        ? selectedValues.filter((v) => v !== optionText)
        : [...selectedValues, optionText];
      onChange(newSelection);
    } else {
      onChange(optionText);
    }
  };

  return (
    <div className="space-y-2">
      {options.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-secondary p-6 text-center">
          <p className="text-sm text-text-tertiary">No options available</p>
        </div>
      ) : (
        options.map((option, index) => {
          const isSelected = selectedValues.includes(option.text);
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(option.text)}
              disabled={readOnly}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all',
                isSelected
                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                  : 'border-border bg-white hover:border-primary-200 hover:bg-surface-secondary',
                readOnly && 'cursor-default opacity-80',
              )}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                {multiple ? (
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors',
                      isSelected
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-border',
                    )}
                  >
                    {isSelected && <CheckCircle2 className="h-4 w-4" />}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                      isSelected
                        ? 'border-primary-600'
                        : 'border-border',
                    )}
                  >
                    {isSelected && <Circle className="h-3 w-3 fill-primary-600 text-primary-600" />}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className={cn(
                  'text-sm',
                  isSelected ? 'font-medium text-primary-900' : 'text-text-primary',
                )}>
                  {option.text}
                </p>
              </div>
              {isSelected && (
                <CheckCircle2 className="h-5 w-5 text-primary-600 shrink-0" />
              )}
            </button>
          );
        })
      )}
    </div>
  );
}

export default MultipleChoiceWorkspace;
