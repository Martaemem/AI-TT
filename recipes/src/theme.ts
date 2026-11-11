import { ViewStyle } from 'react-native';

/** Paleta w stylu „Dozzy”: kremowe tło, żółty i koralowy, grube czarne obrysy. */
export const colors = {
  bg: '#FBF8F1',
  card: '#FFFFFF',
  ink: '#16110F',
  text: '#16110F',
  muted: '#6F655D',
  line: '#E6DFCF',
  yellow: '#FDD34D',
  coral: '#FF8A7A',
  mint: '#DDF3E4',
  lavender: '#E1E8FB',
  pink: '#FFD9D3',
  sand: '#F1EBDB',
  green: '#2E7D32',
  danger: '#E4574A',
};

export const fonts = {
  display: 'Baloo2_800ExtraBold',
  displayBold: 'Baloo2_700Bold',
  body: 'Nunito_600SemiBold',
  bodyMedium: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
};

/** Karta z grubym obrysem i „twardym” cieniem u dołu. */
export const box = (bg: string = colors.card, radius = 24): ViewStyle => ({
  backgroundColor: bg,
  borderWidth: 2.5,
  borderColor: colors.ink,
  borderBottomWidth: 6,
  borderRadius: radius,
});

/** Kolor tła kategorii (karty, ilustracje). */
export const CATEGORY_COLOR: Record<string, string> = {
  Śniadania: colors.yellow,
  Obiady: colors.pink,
  Zupy: colors.pink,
  Kolacje: colors.lavender,
  Sałatki: colors.mint,
  Przekąski: colors.yellow,
  Desery: colors.pink,
  Ciasta: colors.lavender,
  Napoje: colors.mint,
  Inne: colors.sand,
};
export const categoryColor = (c: string) => CATEGORY_COLOR[c] ?? colors.sand;
