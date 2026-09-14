import { useState } from 'react';
import type { ModuleComponentProps } from './workspace-engine';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Presentation, Plus, Trash2, MoveLeft, MoveRight, FileText, Eye } from 'lucide-react';

interface Slide {
  id: string;
  title: string;
  content: string;
}

export function PresentationModule({ moduleKey, config, readOnly }: ModuleComponentProps) {
  const maxSlides: number = (config['maxSlides'] as number) || 20;
  const [slides, setSlides] = useState<Slide[]>([
    { id: 'slide-1', title: 'Title Slide', content: 'Enter your presentation title here' },
  ]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const addSlide = () => {
    if (slides.length >= maxSlides) return;
    setSlides([...slides, { id: `slide-${Date.now()}`, title: 'New Slide', content: '' }]);
  };

  const removeSlide = (slideId: string) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((s) => s.id !== slideId);
    setSlides(newSlides);
    if (currentSlide >= newSlides.length) setCurrentSlide(newSlides.length - 1);
  };

  const updateSlide = (slideId: string, updates: Partial<Slide>) => {
    setSlides(slides.map((s) => (s.id === slideId ? { ...s, ...updates } : s)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-text-primary">Presentation Builder</span>
          <Badge size="sm" variant="info">{slides.length}/{maxSlides} slides</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
            icon={viewMode === 'edit' ? <Eye className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          >
            {viewMode === 'edit' ? 'Preview' : 'Edit'}
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Slide Thumbnails */}
        <div className="w-32 space-y-2 overflow-y-auto max-h-[400px] shrink-0">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(idx)}
              className={`w-full p-2 text-left rounded-lg border transition-all ${
                idx === currentSlide
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-border hover:border-border-hover'
              }`}
            >
              <span className="text-[10px] font-mono text-text-tertiary">Slide {idx + 1}</span>
              <p className="text-[10px] text-text-primary truncate">{slide.title || 'Untitled'}</p>
            </button>
          ))}
          {!readOnly && slides.length < maxSlides && (
            <button onClick={addSlide} className="w-full p-2 border-2 border-dashed border-border rounded-lg text-xs text-text-tertiary hover:border-primary-400 hover:text-primary-600">
              + Add Slide
            </button>
          )}
        </div>

        {/* Current Slide Editor */}
        <div className="flex-1">
          {(() => {
            const slide = slides[currentSlide];
            if (viewMode === 'edit' && slide) {
              return (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                    disabled={readOnly}
                    className="w-full px-4 py-2 text-lg font-semibold border border-border rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Slide Title"
                  />
                  <textarea
                    value={slide.content}
                    onChange={(e) => updateSlide(slide.id, { content: e.target.value })}
                    disabled={readOnly}
                    rows={10}
                    className="w-full px-4 py-3 text-sm border border-border rounded-xl resize-y focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Slide content..."
                  />
                </div>
              );
            }
            return (
            <div className="min-h-[300px] px-8 py-6 bg-white border border-border rounded-xl flex flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-4">{(slides[currentSlide] || {} as Slide).title || ''}</h2>
              <p className="text-text-secondary whitespace-pre-wrap">{(slides[currentSlide] || {} as Slide).content || ''}</p>
              <p className="mt-4 text-xs text-text-tertiary">Slide {currentSlide + 1} of {slides.length}</p>
            </div>
          );
          })()}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="sm" disabled={currentSlide <= 0} onClick={() => setCurrentSlide(currentSlide - 1)} icon={<MoveLeft className="h-4 w-4" />}>
          Previous
        </Button>
        <span className="text-xs text-text-tertiary">Slide {currentSlide + 1} of {slides.length}</span>
        <Button variant="ghost" size="sm" disabled={currentSlide >= slides.length - 1} onClick={() => setCurrentSlide(currentSlide + 1)} icon={<MoveRight className="h-4 w-4" />}>
          Next
        </Button>
      </div>
    </div>
  );
}

export default PresentationModule;
