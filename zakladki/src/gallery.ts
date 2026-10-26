// W SDK 58 albumy i stronicowanie zdjęć są w starszym API pod tą ścieżką
import * as MediaLibrary from 'expo-media-library/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking } from 'react-native';

/** Otwiera to jedno zdjęcie w aplikacji Galeria telefonu (bez szukania wśród wszystkich zdjęć). */
export async function openInGallery(assetId: string): Promise<boolean> {
  const uri = `content://media/external/images/media/${assetId}`;
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: uri, type: 'image/*', flags: 1 });
    return true;
  } catch {
    try {
      await Linking.openURL(uri);
      return true;
    } catch {
      return false;
    }
  }
}
import { Item } from './types';
import { newId } from './store';

export type AlbumInfo = { id: string; title: string; count: number };

export type Access = 'all' | 'limited' | 'none';

/** „limited” = telefon dał dostęp tylko do wybranych zdjęć (Android 14+), wtedy import widzi tylko je. */
export async function ensureGalleryAccess(): Promise<Access> {
  const read = (r: { granted: boolean; accessPrivileges?: string }): Access =>
    !r.granted ? 'none' : r.accessPrivileges === 'limited' ? 'limited' : 'all';
  const cur = read(await MediaLibrary.getPermissionsAsync(false, ['photo']));
  if (cur === 'all') return cur;
  const req = read(await MediaLibrary.requestPermissionsAsync(false, ['photo']));
  return req === 'none' ? cur : req;
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
): Promise<{ items: Item[]; seen: number }> {
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
  return { items: out, seen };
}
