import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { uid } from './store';

const dir = () => new Directory(Paths.document, 'photos');

/** Kopiuje zdjęcie z galerii / aparatu do pamięci aplikacji, żeby nie zniknęło z cache. */
async function keep(uri: string): Promise<string> {
  const d = dir();
  d.create({ idempotent: true, intermediates: true });
  const ext = uri.match(/\.(jpe?g|png|webp|heic)(\?|$)/i)?.[1]?.toLowerCase() ?? 'jpg';
  const dest = new File(d, `${uid()}.${ext}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

/** Wybiera zdjęcia z galerii (do 10 naraz) i zwraca ich trwałe adresy. */
export async function pickPhotos(): Promise<string[]> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 10, quality: 0.8 });
  if (res.canceled) return [];
  return Promise.all(res.assets.map((a) => keep(a.uri)));
}

/** Robi zdjęcie aparatem; zwraca null, gdy anulowano lub brak zgody. */
export async function takePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Brak zgody na używanie aparatu (Ustawienia telefonu → Aplikacje → Porady AI → Uprawnienia).');
  const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (res.canceled || !res.assets[0]) return null;
  return keep(res.assets[0].uri);
}

export function removePhoto(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // plik już nie istnieje – nic do zrobienia
  }
}
