import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFileSelected: (base64: string, fileName: string) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = (file: File) => {
    setError(null);
    if (file.type !== 'application/pdf') {
      setError('Por favor sube un archivo PDF válido.');
      return;
    }

    // Limit size if necessary (e.g., 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError('El archivo es demasiado grande (Máx 20MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Remove Data URI prefix
      const base64 = result.split(',')[1];
      onFileSelected(base64, file.name);
    };
    reader.onerror = () => {
      setError('Error al leer el archivo.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-6">
      <div 
        className={`relative group cursor-pointer transition-all duration-300 ease-in-out
          border-2 border-dashed rounded-2xl p-10 text-center
          ${dragActive 
            ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' 
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 bg-white shadow-sm'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isLoading && document.getElementById('file-upload')?.click()}
      >
        <input 
          id="file-upload" 
          type="file" 
          className="hidden" 
          accept=".pdf"
          onChange={handleChange}
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`p-4 rounded-full transition-colors ${dragActive ? 'bg-indigo-200' : 'bg-indigo-50 group-hover:bg-indigo-100'}`}>
            {isLoading ? (
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-indigo-600" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800">
              {isLoading ? 'Procesando Documento...' : 'Sube tu PDF'}
            </h3>
            <p className="text-slate-500 text-sm max-w-[260px] mx-auto">
              {isLoading 
                ? 'La IA está leyendo y estructurando tu libro. Esto puede tardar un momento.' 
                : 'Arrastra y suelta aquí, o haz clic para seleccionar'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {!isLoading && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <FeatureItem 
            icon={<FileText className="w-5 h-5" />} 
            title="Estructurado" 
            desc="Detecta capítulos automáticamente" 
          />
          <FeatureItem 
            icon={<span className="text-lg font-serif font-bold">Aa</span>} 
            title="Legible" 
            desc="Formato optimizado para lectura" 
          />
          <FeatureItem 
            icon={<div className="w-5 h-5 flex items-center justify-center border-2 border-current rounded text-[10px] font-bold">AI</div>} 
            title="Potenciado por IA" 
            desc="Gemini 1.5 Flash" 
          />
        </div>
      )}
    </div>
  );
};

const FeatureItem = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center gap-2">
    <div className="text-indigo-500">{icon}</div>
    <div className="font-semibold text-slate-700 text-sm">{title}</div>
    <div className="text-xs text-slate-400">{desc}</div>
  </div>
);
