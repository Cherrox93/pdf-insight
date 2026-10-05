import { useId, useRef, useState, type DragEvent } from 'react';

interface DropzoneProps {
  onFile: (file: File) => void;
}

/** F-01: drag & drop oraz wybór pliku. Obsługa klawiaturą przez natywny przycisk. */
export function Dropzone({ onFile }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // Ignorujemy przejście kursora nad elementy potomne.
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragging(false);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setIsDragging(true);
      }}
      onDragLeave={handleDragLeave}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors sm:px-8 sm:py-14 ${
        isDragging ? 'border-accent bg-accent/10' : 'border-border bg-surface'
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-12 w-12 text-accent" fill="none">
        <path
          d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 18v-6 M9 15l3-3 3 3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div>
        <p className="text-lg font-semibold">
          {isDragging ? 'Upuść plik, aby rozpocząć analizę' : 'Przeciągnij i upuść plik PDF'}
        </p>
        <p id={hintId} className="mt-1 text-sm text-muted">
          lub wybierz go z dysku · tylko PDF, maks. 10 MB
        </p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-describedby={hintId}
        className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-bg hover:bg-accent/90"
      >
        Wybierz plik PDF
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
