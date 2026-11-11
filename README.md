# Porady AI

Aplikacja na Androida (Samsung) w stylu „Przepiśnika”, ale dla porad o AI z TikToka.
Wklejasz link do filmu → aplikacja pobiera opis, a AI rozpisuje go na **kroki, prompty i potrzebne narzędzia**.

## Funkcje
- Import z linku TikTok (oEmbed: opis, autor, miniatura) + wykrywanie linku w schowku
- Opcjonalna transkrypcja/opis wklejany ręcznie (TikTok nie udostępnia audio)
- Porządkowanie przez Claude (własny klucz API w *Więcej → Ustawienia AI*) lub tryb offline
- Widok porady: podsumowanie, narzędzia, prompty z przyciskiem „Kopiuj”, odhaczane kroki
- Tryb **krok po kroku** z paskiem postępu i promptem do wklejenia w danym kroku
- Zbiory, ulubione, ocena, notatki, wyszukiwarka i kategorie
- Zakładka *Narzędzia* (czego potrzebujesz do niewypróbowanych porad) i *Prompty* (biblioteka)
- Dane lokalnie na telefonie (AsyncStorage)

## Uruchomienie
```bash
npm install
npx expo start        # zeskanuj QR aplikacją Expo Go na Samsungu
```

## Budowa APK na Samsunga
```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview   # zwraca link do .apk
```

## Uwagi
- Klucz API jest zapisany tylko na urządzeniu i wysyłany wyłącznie do `api.anthropic.com`.
- „Udostępnij → Porady AI” z TikToka wymaga dev-buildu z intent filterem; na razie link kopiujesz, a aplikacja sama go wykrywa.
