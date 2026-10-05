export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type FileValidationResult = { ok: true } | { ok: false; message: string };

/** Każdy plik PDF zaczyna się sygnaturą „%PDF-”. */
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];

export function hasPdfSignature(bytes: Uint8Array): boolean {
  return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/** F-01: tylko PDF, maks. 10 MB. Sprawdzamy rozszerzenie/typ MIME oraz faktyczną sygnaturę pliku. */
export async function validatePdfFile(file: File): Promise<FileValidationResult> {
  const looksLikePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) {
    return { ok: false, message: 'Wybrany plik nie jest dokumentem PDF. Wybierz plik .pdf.' };
  }
  if (file.size === 0) {
    return { ok: false, message: 'Wybrany plik jest pusty.' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `Plik jest za duży (${formatMegabytes(file.size)}). Maksymalny rozmiar to 10 MB.`,
    };
  }
  const header = new Uint8Array(await file.slice(0, PDF_SIGNATURE.length).arrayBuffer());
  if (!hasPdfSignature(header)) {
    return {
      ok: false,
      message: 'Plik ma rozszerzenie .pdf, ale nie jest poprawnym dokumentem PDF.',
    };
  }
  return { ok: true };
}

export function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} MB`;
}
