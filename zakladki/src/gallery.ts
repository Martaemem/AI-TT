// W SDK 58 albumy i stronicowanie zdjęć są w starszym API pod tą ścieżką
import * as MediaLibrary from 'expo-media-library/legacy';
import { Item } from './types';
import { newId } from './store';

export type AlbumInfo = { id: string; title: string; count: number };

export async function ensureGalleryAccess(): Promise<boolean> {
  const cur = await MediaLibrary.getPermissionsAsync(false, ['photo']);
  if (cur.granted) return true;
  const req = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  return req.granted;
}

export async function listAlbums(): Promise<AlbumInfo[]> {
  const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
  return albums
    .filter((a) => a.assetCount > 0)
    .map((a) => ({ id: a.id, title: a.title, count: a.assetCount }))
    .sort((a, b) => b.count - a.count);
}

const fmtDay = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/**
 * Tworzy wpisy dla zdjęć z albumu, których jeszcze nie ma w aplikacji.
 * Zdjęcia nie są kopiowane – wpis wskazuje na plik w galerii.
 */
export async function importAlbum(
  album: AlbumInfo,
  known: Set<string>,
  onProgress: (done: number, total: number) => void,
): Promise<Item[]> {
  const out: Item[] = [];
  let after: string | undefined;
  let seen = 0;
  for (;;) {
    const page = await MediaLibrary.getAssetsAsync({
      album: album.id,
      mediaType: [MediaLibrary.MediaType.photo],
      first: 200,
      after,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    for (const a of page.assets) {
      seen++;
      if (known.has(a.id)) continue;
      known.add(a.id);
      const created = a.creationTime ? new Date(a.creationTime).toISOString() : new Date().toISOString();
      out.push({
        id: newId(),
        title: `${album.title} · ${fmtDay(a.creationTime || Date.now())}`,
        note: '',
        photos: [a.uri],
        cats: [],
        createdAt: created,
        updatedAt: new Date().toISOString(),
        assetId: a.id,
        album: album.title,
      });
    }
    onProgress(seen, album.count);
    if (!page.hasNextPage) break;
    after = page.endCursor;
  }
  return out;
}
