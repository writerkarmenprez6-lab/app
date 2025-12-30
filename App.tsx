import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { Reader } from './components/Reader';
import { convertPdfToBook } from './services/geminiService';
import { AppState, Book, ProcessingStatus } from './types';
import { BookOpen, Sparkles } from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [book, setBook] = useState<Book | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ step: "", progress: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (base64: string, fileName: string) => {
    setAppState(AppState.PROCESSING);
    setError(null);
    setStatus({ step: "Iniciando...", progress: 0 });

    try {
      const generatedBook = await convertPdfToBook(base64, (currentStatus) => setStatus(currentStatus));
      setBook(generatedBook);
      setAppState(AppState.READING);
    } catch (err: any) {
      console.error(err);
      setError("No se pudo procesar el PDF. Asegúrate de que el PDF contenga texto seleccionable o intenta con uno más corto.");
      setAppState(AppState.IDLE); 
    }
  };

  const handleReset = () => {
    setBook(null);
    setAppState(AppState.IDLE);
    setError(null);
    setStatus({ step: "", progress: 0 });
  };

  if (appState === AppState.READING && book) {
    return <Reader book={book} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-700">
          <BookOpen className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight">PDF<span className="text-slate-900">Reader</span>.ai</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-500 bg-white/50 px-3 py-1 rounded-full border border-slate-200">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Powered by Gemini 1.5</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 right-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

        <div className="relative z-10 w-full max-w-2xl text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
            Convierte tus PDFs en <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              E-Books Interactivos
            </span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto leading-relaxed">
            Sube cualquier documento PDF y nuestra IA extraerá el contenido, identificará los capítulos y te ofrecerá una experiencia de lectura premium.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="relative z-10 w-full">
          <FileUpload 
            onFileSelected={handleFileSelected} 
            isLoading={appState === AppState.PROCESSING} 
          />
        </div>

        {/* Status Message & Progress Bar */}
        {appState === AppState.PROCESSING && (
           <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-md mx-auto">
             <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
               <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${Math.max(5, status.progress)}%` }}
               ></div>
             </div>
             <div className="flex items-center justify-between w-full text-sm">
                <span className="font-medium text-indigo-700 animate-pulse">{status.step}</span>
                <span className="font-mono text-slate-400">{status.progress}%</span>
             </div>
           </div>
        )}

        {/* Error Message */}
        {error && appState === AppState.IDLE && (
           <div className="mt-4 text-center max-w-md mx-auto">
             <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg inline-block border border-red-100">
               {error}
             </p>
           </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-400 text-sm relative z-10">
        <p>&copy; {new Date().getFullYear()} PDFReader.ai - Transforma tu lectura.</p>
      </footer>
      
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}