import { extractTextFromImage, isSupported } from 'expo-text-extractor';

/**
 * Odczyt tekstu ze slajdów (zrzutów ekranu) wbudowanym w telefon rozpoznawaniem tekstu Google ML Kit.
 * Działa lokalnie: bez klucza AI, bez internetu i za darmo. Porządkowaniem treści zajmuje się potem zwykłe AI.
 */
export async function readSlides(uris: string[]): Promise<string> {
  if (!isSupported) throw new Error('Ten telefon nie obsługuje rozpoznawania tekstu ze zdjęć.');
  const slides: string[] = [];
  for (const uri of uris) {
    const lines = await extractTextFromImage(uri);
    const text = lines.map((l) => l.trim()).filter(Boolean).join('\n');
    if (text) slides.push(text);
  }
  return slides.join('\n\n');
}
