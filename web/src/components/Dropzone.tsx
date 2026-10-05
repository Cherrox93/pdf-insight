import { Braces, FileUp, ScanText, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { buttonPrimary } from '../lib/styles';

interface DropzoneProps {
  onFile: (file: File) => void;
  /** Ustawia fokus na przycisku wyboru pliku (powrót z wyniku/błędu - fokus nie ginie). */
  focusOnMount?: boolean;
}

const FEATURES = [
  { icon: ShieldCheck, label: 'PDF do 10 MB' },
  { icon: ScanText, label: 'Skany przez OCR' },
  { icon: Braces, label: 'Eksport JSON' },
];

/** F-01: drag & drop oraz wybór pliku. Obsługa klawiaturą przez natywny przycisk. */
export function Dropzone({ onFile, focusOnMount = false }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (focusOnMount) buttonRef.current?.focus();
  }, [focusOnMount]);

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
      data-dragging={isDragging}
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
      className={`card dropzone-ring flex flex-col items-center gap-6 px-5 py-10 text-center transition-all duration-300 sm:px-10 sm:py-14 ${
        isDragging ? 'scale-[1.01] bg-accent-soft' : ''
      }`}
    >
      <div
        className={`flex size-16 items-center justify-center rounded-2xl border border-border-strong bg-surface-solid text-accent-text shadow-card transition-transform duration-300 ${
          isDragging ? '-translate-y-1 scale-110' : ''
        }`}
        style={{ animation: 'pulse-ring 2.4s ease-out infinite' }}
      >
        <FileUp className="size-7" strokeWidth={1.8} aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <p className="text-xl font-semibold tracking-tight sm:text-2xl">
          {isDragging ? 'Upuść plik, aby rozpocząć' : 'Przeciągnij i upuść plik PDF'}
        </p>
        <p id={hintId} className="text-sm text-muted">
          albo wybierz go z dysku - analiza zajmuje zwykle kilkanaście sekund
        </p>
      </div>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-describedby={hintId}
        className={`${buttonPrimary} px-6 py-3 text-base`}
      >
        <FileUp aria-hidden="true" />
        Wybierz plik PDF
      </button>

      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted">
        {FEATURES.map(({ icon: Icon, label }) => (
          <li key={label} className="inline-flex items-center gap-1.5">
            <Icon className="size-3.5 text-accent-text" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>

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
