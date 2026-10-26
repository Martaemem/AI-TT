import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const dir = () => new Directory(Paths.document, 'zdjecia');

/** Czy zdjęcie jest już na stałe w pamięci aplikacji. */
export const isStored = (uri: string) => uri.startsWith(dir().uri);

/** Kopiuje zdjęcie (z galerii, aparatu albo udostępnione) do pamięci aplikacji i zwraca nowy adres. */
export function storePhoto(uri: string): string {
  if (isStored(uri)) return uri;
  const d = dir();
  if (!d.exists) d.create({ intermediates: true });
  const src = new File(uri.startsWith('file://') || uri.startsWith('content://') ? uri : 'file://' + uri);
  const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
  const dest = new File(d, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
  src.copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string): void {
  if (!isStored(uri)) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // plik już nie istnieje
  }
}

export async function pickFromGallery(): Promise<string[]> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
  return res.canceled ? [] : res.assets.map((a) => a.uri);
}

export async function takePhoto(): Promise<string[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Brak zgody na aparat');
  const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  return res.canceled ? [] : res.assets.map((a) => a.uri);
}
