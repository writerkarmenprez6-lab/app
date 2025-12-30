import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Book, Bookmark, Highlight, UserBookData } from '../types';
import { 
  Menu, ChevronLeft, ChevronRight, Settings, 
  Moon, Sun, Type, Download, Home, Bookmark as BookmarkIcon,
  Highlighter, Trash2, X
} from 'lucide-react';

interface ReaderProps {
  book: Book;
  onReset: () => void;
}

type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export const Reader: React.FC<ReaderProps> = ({ book, onReset }) => {
  // --- State Initialization with Persistence ---
  
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Initialize theme from localStorage
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('reader_theme') as any) || 'light';
    }
    return 'light';
  });

  // Initialize font size from localStorage
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const size = localStorage.getItem('reader_fontSize');
      return size ? parseInt(size) : 18;
    }
    return 18;
  });

  const [showSettings, setShowSettings] = useState(false);
  
  // User Data State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  
  // Selection / Floating Menu State
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  const [activeColor, setActiveColor] = useState<HighlightColor>('yellow');

  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldRestoreScroll = useRef(false);
  const initialScrollPos = useRef(0);
  
  // Ref to hold current state for event handlers/timers to avoid stale closures
  const stateRef = useRef({ bookmarks, highlights, currentChapterIndex });

  // Improved storage key including author to avoid collisions
  const storageKey = `pdf-reader-data-${book.title.replace(/\s+/g, '-').toLowerCase()}-${book.author.replace(/\s+/g, '-').toLowerCase()}`;

  // Update stateRef whenever state changes
  useEffect(() => {
    stateRef.current = { bookmarks, highlights, currentChapterIndex };
  }, [bookmarks, highlights, currentChapterIndex]);

  // --- Theme Styles Configuration ---
  const themeStyles = {
    light: {
      bg: 'bg-white',
      text: 'text-slate-900',
      uiBg: 'bg-slate-50', // Sidebar
      popoverBg: 'bg-white',
      border: 'border-slate-200',
      hover: 'hover:bg-black/5',
      active: 'bg-black/10',
      scrollThumb: 'bg-slate-300',
      highlightMenu: 'bg-slate-900 text-white'
    },
    sepia: {
      bg: 'bg-[#f4ecd8]',
      text: 'text-[#5b4636]',
      uiBg: 'bg-[#efe6d0]', // Sidebar slightly darker
      popoverBg: 'bg-[#f4ecd8]',
      border: 'border-[#e3dcc8]',
      hover: 'hover:bg-[#5b4636]/10',
      active: 'bg-[#5b4636]/10',
      scrollThumb: 'bg-[#d3cbb7]',
      highlightMenu: 'bg-[#4a3b2a] text-[#f4ecd8]'
    },
    dark: {
      bg: 'bg-slate-900',
      text: 'text-slate-300',
      uiBg: 'bg-slate-800', // Sidebar
      popoverBg: 'bg-slate-800',
      border: 'border-slate-700',
      hover: 'hover:bg-white/10',
      active: 'bg-white/10',
      scrollThumb: 'bg-slate-600',
      highlightMenu: 'bg-slate-700 text-white'
    }
  };

  const currentStyles = themeStyles[theme];

  // --- Persistence & Logic ---

  // Helper to save data
  const saveUserData = useCallback((scrollPos: number) => {
    const data: UserBookData = {
      bookmarks: stateRef.current.bookmarks,
      highlights: stateRef.current.highlights,
      lastReadChapter: stateRef.current.currentChapterIndex,
      scrollPosition: scrollPos
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [storageKey]);

  // Save Theme & FontSize
  useEffect(() => {
    localStorage.setItem('reader_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('reader_fontSize', fontSize.toString());
  }, [fontSize]);

  // Load Book Data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data: UserBookData = JSON.parse(saved);
        if (data.bookmarks) setBookmarks(data.bookmarks);
        if (data.highlights) setHighlights(data.highlights);
        
        if (typeof data.lastReadChapter === 'number') {
          setCurrentChapterIndex(data.lastReadChapter);
          if (data.scrollPosition && data.scrollPosition > 0) {
            initialScrollPos.current = data.scrollPosition;
            shouldRestoreScroll.current = true;
          }
        }
      }
    } catch (e) {
      console.error("Failed to load user data", e);
    }
  }, [storageKey]);

  // Save data on structural changes (bookmarks, highlights)
  // We use current scroll position when saving these interactions
  useEffect(() => {
    // Prevent overwriting scroll position with 0 if we are in the initial restore phase
    // or if the content ref isn't ready.
    const currentScroll = contentRef.current?.scrollTop || 0;
    saveUserData(currentScroll);
  }, [bookmarks, highlights, saveUserData]);

  // Handle scroll event with debounce
  const handleScroll = () => {
    if (!contentRef.current) return;
    const currentScroll = contentRef.current.scrollTop;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      // Only save if we are not in the middle of a chapter transition or restore
      if (!shouldRestoreScroll.current) {
        saveUserData(currentScroll);
      }
    }, 500); 
  };

  // --- Window Resize Handling ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll Management on Chapter Change
  useEffect(() => {
    if (contentRef.current) {
      if (shouldRestoreScroll.current) {
        // Restore saved position on initial load
        contentRef.current.scrollTop = initialScrollPos.current;
        shouldRestoreScroll.current = false;
      } else {
        // Scroll to top for normal navigation
        contentRef.current.scrollTop = 0;
        // If we navigated manually, save the new position (0) immediately
        saveUserData(0);
      }
    }
    setSelectionMenu(null); // Close menu on chapter change
  }, [currentChapterIndex, saveUserData]);

  // --- Logic: Bookmarking ---

  const isBookmarked = bookmarks.some(b => b.chapterIndex === currentChapterIndex);

  const toggleBookmark = () => {
    if (isBookmarked) {
      setBookmarks(prev => prev.filter(b => b.chapterIndex !== currentChapterIndex));
    } else {
      setBookmarks(prev => [...prev, { chapterIndex: currentChapterIndex, timestamp: Date.now() }]);
    }
  };

  // --- Logic: Highlighting ---

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setSelectionMenu(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 2) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate position relative to viewport
    setSelectionMenu({
      x: rect.left + (rect.width / 2),
      y: rect.top - 10, // Just above the selection
      text: text
    });
  }, []);

  const addHighlight = (color: HighlightColor) => {
    if (!selectionMenu) return;

    const newHighlight: Highlight = {
      id: Date.now().toString(),
      chapterIndex: currentChapterIndex,
      text: selectionMenu.text,
      color,
      date: Date.now()
    };

    setHighlights(prev => [...prev, newHighlight]);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const removeHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  // --- Rendering Content ---

  // Safety function to escape HTML special characters
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const getRenderedContent = () => {
    const rawContent = book.chapters[currentChapterIndex].content;
    const currentHighlights = highlights.filter(h => h.chapterIndex === currentChapterIndex);

    // 1. Escape the base HTML first to prevent XSS from raw text and handle newlines
    let safeContent = escapeHtml(rawContent).replace(/\n/g, '<br/>');

    // 2. Sort highlights by length descending to ensure longer phrases are matched first
    currentHighlights.sort((a, b) => b.text.length - a.text.length);

    // 3. Apply highlights using placeholders to prevent nested tag corruption
    // This is crucial: if a highlighted text contains words like "class" or "span", 
    // naive replacement would break previously inserted <mark> tags.
    const replacements: { placeholder: string, mark: string }[] = [];

    currentHighlights.forEach((h, index) => {
      // Create a unique placeholder that won't appear in natural text
      const placeholder = `__HIGHLIGHT_${index}_${h.id}__`;
      const escapedText = escapeHtml(h.text).replace(/\n/g, '<br/>');
      
      const colorClass = {
        yellow: 'bg-yellow-200 text-slate-900',
        green: 'bg-green-200 text-slate-900',
        blue: 'bg-blue-200 text-slate-900',
        pink: 'bg-pink-200 text-slate-900'
      }[h.color];

      const mark = `<mark class="${colorClass} rounded px-0.5 cursor-pointer hover:brightness-95 transition-all" data-highlight-id="${h.id}" title="Haz clic para eliminar">${escapedText}</mark>`;
      
      replacements.push({ placeholder, mark });
      
      // Escape regex special characters in the text
      const regex = new RegExp(escapedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      safeContent = safeContent.replace(regex, placeholder);
    });

    // 4. Restore placeholders with actual HTML mark tags
    replacements.forEach(({ placeholder, mark }) => {
      safeContent = safeContent.split(placeholder).join(mark);
    });

    return { __html: safeContent };
  };

  const nextChapter = () => {
    if (currentChapterIndex < book.chapters.length - 1) {
      setCurrentChapterIndex(prev => prev + 1);
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(prev => prev - 1);
    }
  };

  const downloadMarkdown = () => {
    const content = `# ${book.title}\n\nAuthor: ${book.author}\n\n${book.chapters.map(c => `## ${c.title}\n\n${c.content}`).join('\n\n')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`fixed inset-0 flex flex-col ${currentStyles.bg} ${currentStyles.text} transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      
      {/* Floating Highlight Toolbar */}
      {selectionMenu && (
        <div 
          className={`fixed z-50 flex items-center gap-3 p-2 rounded-xl shadow-2xl animate-fadeIn transform -translate-x-1/2 -translate-y-full ${currentStyles.highlightMenu} border border-white/10`}
          style={{ left: selectionMenu.x, top: selectionMenu.y - 12 }}
          onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
        >
          {/* Color Picker */}
          <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg">
            {(['yellow', 'green', 'blue', 'pink'] as HighlightColor[]).map((c) => (
               <button
                 key={c}
                 onClick={() => setActiveColor(c)}
                 className={`w-6 h-6 rounded-full transition-all duration-200 ${
                   c === 'yellow' ? 'bg-yellow-400' : 
                   c === 'green' ? 'bg-green-400' :
                   c === 'blue' ? 'bg-blue-400' : 'bg-pink-400'
                 } ${activeColor === c ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                 title={`Color ${c}`}
               />
            ))}
          </div>

          <div className="w-px h-8 bg-white/20"></div>

          {/* Add Action */}
          <button 
            onClick={() => addHighlight(activeColor)} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-all font-semibold text-xs uppercase tracking-wider active:scale-95"
          >
            <Highlighter className="w-4 h-4" />
            <span>Resaltar</span>
          </button>
        </div>
      )}

      {/* Top Bar */}
      <header className={`h-16 flex items-center justify-between px-4 border-b ${currentStyles.border} z-20 relative select-none`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg transition-colors ${currentStyles.hover}`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm md:text-base leading-tight truncate max-w-[150px] md:max-w-xs">{book.title}</h1>
            <span className="text-xs opacity-70 truncate max-w-[100px]">{book.author}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
           <button 
             onClick={toggleBookmark}
             className={`p-2 rounded-lg transition-colors ${
                isBookmarked 
                  ? 'text-amber-500 bg-amber-500/10' 
                  : `${currentStyles.hover} opacity-60 hover:opacity-100`
             }`}
             title={isBookmarked ? "Quitar marcador" : "Añadir marcador"}
           >
             <BookmarkIcon className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
           </button>

           <div className={`w-px h-6 bg-current opacity-10 mx-1`}></div>

           <button 
            onClick={downloadMarkdown}
            className={`p-2 hidden md:flex items-center gap-2 rounded-lg transition-colors text-xs font-medium ${currentStyles.hover}`}
            title="Descargar Markdown"
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Guardar</span>
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? currentStyles.active : currentStyles.hover}`}
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={onReset}
            className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
            title="Cerrar libro"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Popover */}
        {showSettings && (
          <div className={`absolute top-full right-4 mt-2 w-64 p-4 rounded-xl shadow-xl border ${currentStyles.popoverBg} ${currentStyles.border}`}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold opacity-50 uppercase mb-2 block">Tema</label>
                <div className={`flex gap-2 p-1 rounded-lg ${theme === 'dark' ? 'bg-black/20' : 'bg-black/5'}`}>
                  <button onClick={() => setTheme('light')} className={`flex-1 p-2 rounded flex justify-center ${theme === 'light' ? 'bg-white shadow text-slate-900' : 'hover:bg-black/5'}`}><Sun className="w-4 h-4" /></button>
                  <button onClick={() => setTheme('sepia')} className={`flex-1 p-2 rounded flex justify-center ${theme === 'sepia' ? 'bg-[#f4ecd8] shadow text-[#5b4636]' : 'hover:bg-black/5'}`}><div className="w-4 h-4 rounded-full bg-[#f4ecd8] border border-[#5b4636]"></div></button>
                  <button onClick={() => setTheme('dark')} className={`flex-1 p-2 rounded flex justify-center ${theme === 'dark' ? 'bg-slate-700 shadow text-white' : 'hover:bg-white/10'}`}><Moon className="w-4 h-4" /></button>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold opacity-50 uppercase mb-2 block">Tamaño Fuente</label>
                <div className="flex items-center gap-3">
                  <Type className="w-4 h-4" />
                  <input 
                    type="range" 
                    min="14" 
                    max="32" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className={`flex-1 accent-indigo-500 h-1.5 rounded-lg appearance-none cursor-pointer ${theme === 'dark' ? 'bg-white/20' : 'bg-black/10'}`}
                  />
                  <span className="text-xs font-mono w-6 text-right">{fontSize}</span>
                </div>
              </div>

               {/* Highlights Management in Settings */}
               {highlights.length > 0 && (
                <div className="pt-4 border-t border-current border-opacity-10">
                  <label className="text-xs font-semibold opacity-50 uppercase mb-2 block">
                    Resaltados ({highlights.length})
                  </label>
                  <button 
                    onClick={() => setHighlights([])}
                    className="w-full text-xs flex items-center justify-center gap-2 p-2 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-3 h-3" /> Limpiar todos
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar */}
        <div className={`
          absolute inset-y-0 left-0 z-10 w-64 transform transition-transform duration-300 ease-in-out
          border-r ${currentStyles.uiBg} ${currentStyles.border}
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}>
          <div className="h-full overflow-y-auto p-4 reader-scroll">
            <h3 className="font-bold text-xs uppercase opacity-50 mb-4 px-2">Tabla de Contenidos</h3>
            <div className="space-y-1">
              {book.chapters.map((chapter, idx) => {
                const hasBookmark = bookmarks.some(b => b.chapterIndex === idx);
                const hasHighlights = highlights.some(h => h.chapterIndex === idx);
                const isActive = currentChapterIndex === idx;
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentChapterIndex(idx);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${
                      isActive 
                        ? 'bg-indigo-500 text-white font-medium' 
                        : `${currentStyles.hover} opacity-80 hover:opacity-100`
                    }`}
                  >
                    <div className="truncate flex-1">{chapter.title}</div>
                    <div className="flex items-center gap-1 ml-2">
                       {hasHighlights && (
                         <div className={`w-1.5 h-1.5 rounded-full bg-yellow-400 ${isActive ? 'ring-1 ring-white' : ''}`}></div>
                       )}
                       {hasBookmark && (
                         <BookmarkIcon className={`w-3 h-3 ${isActive ? 'fill-white' : 'fill-amber-500 text-amber-500'}`} />
                       )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 relative flex flex-col h-full overflow-hidden">
          <div 
            ref={contentRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto reader-scroll p-6 md:p-12 lg:px-20 scroll-smooth"
          >
            <article 
              className="max-w-3xl mx-auto font-serif leading-relaxed transition-all duration-300"
              style={{ fontSize: `${fontSize}px` }}
              onMouseUp={handleTextSelection}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-8 opacity-90 select-none">{book.chapters[currentChapterIndex].title}</h2>
              
              {/* Content Rendered with Highlights */}
              <div 
                className="markdown-body space-y-6 opacity-90"
                dangerouslySetInnerHTML={getRenderedContent()}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  // Allow deleting highlights by clicking on them
                  if (target.tagName === 'MARK' && target.dataset.highlightId) {
                    if (window.confirm('¿Deseas eliminar este resaltado?')) {
                      removeHighlight(target.dataset.highlightId);
                    }
                  }
                }}
              />

              {/* Chapter Navigation Footer */}
              <div className="mt-20 pt-10 border-t border-current border-opacity-10 flex justify-between items-center text-sm select-none">
                 <button 
                  onClick={prevChapter}
                  disabled={currentChapterIndex === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentChapterIndex === 0 ? 'opacity-0 pointer-events-none' : currentStyles.hover
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <span className="opacity-50 text-xs">
                   {currentChapterIndex + 1} / {book.chapters.length}
                </span>
                <button 
                  onClick={nextChapter}
                  disabled={currentChapterIndex === book.chapters.length - 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                     currentChapterIndex === book.chapters.length - 1 ? 'opacity-0 pointer-events-none' : currentStyles.hover
                  }`}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </article>
          </div>
        </main>
      </div>
    </div>
  );
};