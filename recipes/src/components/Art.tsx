import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

const INK = '#16110F';
const S = { stroke: INK, strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const NOFILL = { fill: 'none' } as const;

/** Buźka: oczy, rumieńce i uśmiech – wspólny element wszystkich postaci. */
function Face({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <G>
      <Circle cx={x - 9 * s} cy={y} r={2.9 * s} fill={INK} />
      <Circle cx={x + 9 * s} cy={y} r={2.9 * s} fill={INK} />
      <Circle cx={x - 16 * s} cy={y + 6 * s} r={4.2 * s} fill="#FF8A7A" opacity={0.75} />
      <Circle cx={x + 16 * s} cy={y + 6 * s} r={4.2 * s} fill="#FF8A7A" opacity={0.75} />
      <Path d={`M${x - 5 * s} ${y + 5 * s} Q${x} ${y + 10.5 * s} ${x + 5 * s} ${y + 5 * s}`} {...NOFILL} {...S} strokeWidth={2.6 * s} />
    </G>
  );
}

export type ArtKind = 'soup' | 'pancakes' | 'plate' | 'sandwich' | 'salad' | 'popcorn' | 'icecream' | 'cake' | 'drink' | 'cloche' | 'pot' | 'basket';

const KIND_BY_CATEGORY: Record<string, ArtKind> = {
  Śniadania: 'pancakes', Obiady: 'plate', Zupy: 'soup', Kolacje: 'sandwich', Sałatki: 'salad',
  Przekąski: 'popcorn', Desery: 'icecream', Ciasta: 'cake', Napoje: 'drink', Inne: 'cloche',
};
export const kindFor = (category: string): ArtKind => KIND_BY_CATEGORY[category] ?? 'cloche';

/** Rysunkowe postaci jedzenia z buźkami (styl: gruby obrys, płaskie kolory). */
export function Art({ kind, size = 100 }: { kind: ArtKind; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {kind === 'soup' && (
        <G>
          <Path d="M44 22 C37 31 51 35 44 46" {...NOFILL} {...S} />
          <Path d="M60 16 C53 25 67 29 60 40" {...NOFILL} {...S} />
          <Path d="M76 22 C69 31 83 35 76 46" {...NOFILL} {...S} />
          <Path d="M20 56 H100 C100 84 82 102 60 102 C38 102 20 84 20 56 Z" fill="#FF8A7A" {...S} />
          <Rect x={12} y={50} width={96} height={12} rx={6} fill="#FFFFFF" {...S} />
          <Face x={60} y={78} />
        </G>
      )}
      {kind === 'pancakes' && (
        <G>
          <Rect x={16} y={78} width={88} height={22} rx={11} fill="#F2B968" {...S} />
          <Rect x={20} y={58} width={80} height={22} rx={11} fill="#F7CB84" {...S} />
          <Rect x={24} y={38} width={72} height={22} rx={11} fill="#F2B968" {...S} />
          <Rect x={46} y={22} width={28} height={16} rx={5} fill="#FDD34D" {...S} />
          <Path d="M28 46 Q60 56 92 46" {...NOFILL} stroke="#B5651D" strokeWidth={5} strokeLinecap="round" />
          <Face x={60} y={89} s={0.85} />
        </G>
      )}
      {kind === 'plate' && (
        <G>
          <Circle cx={60} cy={64} r={46} fill="#FFFFFF" {...S} />
          <Circle cx={60} cy={64} r={32} fill="#FDD34D" {...S} />
          <Path d="M82 24 C94 16 106 22 104 36 C92 40 84 34 82 24 Z" fill="#8ED081" {...S} />
          <Face x={60} y={62} s={1.05} />
        </G>
      )}
      {kind === 'sandwich' && (
        <G>
          <Path d="M16 58 C14 26 106 26 104 58 Z" fill="#F2B968" {...S} />
          <Path d="M14 66 Q28 78 42 66 T70 66 T106 66 V74 H14 Z" fill="#8ED081" {...S} />
          <Rect x={14} y={74} width={92} height={12} rx={6} fill="#FF8A7A" {...S} />
          <Path d="M16 90 H104 C104 102 96 108 86 108 H34 C24 108 16 102 16 90 Z" fill="#F2B968" {...S} />
          <Face x={60} y={48} s={0.95} />
        </G>
      )}
      {kind === 'salad' && (
        <G>
          <Path d="M36 56 C22 36 40 22 54 44 Z" fill="#8ED081" {...S} />
          <Path d="M58 50 C56 26 80 18 84 42 Z" fill="#6CBF6F" {...S} />
          <Path d="M72 56 C78 40 100 40 98 60 Z" fill="#8ED081" {...S} />
          <Path d="M16 56 H104 C104 86 86 104 60 104 C34 104 16 86 16 56 Z" fill="#DDF3E4" {...S} />
          <Face x={60} y={80} />
        </G>
      )}
      {kind === 'popcorn' && (
        <G>
          <Circle cx={38} cy={50} r={13} fill="#FFF6D6" {...S} />
          <Circle cx={82} cy={50} r={13} fill="#FFF6D6" {...S} />
          <Circle cx={52} cy={36} r={13} fill="#FFF6D6" {...S} />
          <Circle cx={72} cy={34} r={12} fill="#FFF6D6" {...S} />
          <Path d="M26 54 H94 L86 108 H34 Z" fill="#FFFFFF" {...S} />
          <Path d="M43 54 L41 108 M60 54 V108 M77 54 L79 108" {...NOFILL} stroke="#FF8A7A" strokeWidth={9} />
          <Path d="M26 54 H94 L86 108 H34 Z" {...NOFILL} {...S} />
          <Face x={60} y={82} s={0.95} />
        </G>
      )}
      {kind === 'icecream' && (
        <G>
          <Path d="M36 64 L60 112 L84 64 Z" fill="#F2B968" {...S} />
          <Path d="M46 76 L72 76 M52 90 L68 90" {...NOFILL} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
          <Circle cx={60} cy={46} r={30} fill="#FFD9D3" {...S} />
          <Circle cx={60} cy={14} r={6} fill="#FF8A7A" {...S} />
          <Path d="M60 8 Q64 2 70 4" {...NOFILL} {...S} strokeWidth={2.6} />
          <Face x={60} y={48} />
        </G>
      )}
      {kind === 'cake' && (
        <G>
          <Rect x={56} y={26} width={8} height={22} rx={3} fill="#FDD34D" {...S} />
          <Path d="M60 8 C53 17 67 17 60 8 Z" fill="#FF8A7A" {...S} strokeWidth={2.6} />
          <Rect x={14} y={58} width={92} height={44} rx={14} fill="#FFD9D3" {...S} />
          <Path d="M14 70 C14 44 106 44 106 70 Q96 78 86 70 Q76 80 66 70 Q56 80 46 70 Q36 80 26 70 Q18 74 14 70 Z" fill="#FFFFFF" {...S} />
          <Face x={60} y={86} s={0.95} />
        </G>
      )}
      {kind === 'drink' && (
        <G>
          <Path d="M70 6 L80 38" {...NOFILL} stroke={INK} strokeWidth={10} strokeLinecap="round" />
          <Path d="M70 6 L80 38" {...NOFILL} stroke="#FF8A7A" strokeWidth={4} strokeLinecap="round" />
          <Path d="M28 34 H92 L84 108 H36 Z" fill="#FFFFFF" {...S} />
          <Path d="M31 54 H89 L84 108 H36 Z" fill="#A8E6BC" {...S} />
          <Face x={60} y={80} s={0.95} />
        </G>
      )}
      {kind === 'cloche' && (
        <G>
          <Circle cx={60} cy={28} r={7} fill="#FDD34D" {...S} />
          <Path d="M14 88 C14 38 106 38 106 88 Z" fill="#E1E8FB" {...S} />
          <Rect x={8} y={88} width={104} height={12} rx={6} fill="#FFFFFF" {...S} />
          <Face x={60} y={72} />
        </G>
      )}
      {kind === 'pot' && (
        <G>
          <Path d="M46 14 C40 22 52 26 46 34" {...NOFILL} {...S} />
          <Path d="M72 12 C66 20 78 24 72 32" {...NOFILL} {...S} />
          <Rect x={4} y={64} width={18} height={12} rx={6} fill="#FFFFFF" {...S} />
          <Rect x={98} y={64} width={18} height={12} rx={6} fill="#FFFFFF" {...S} />
          <Rect x={18} y={54} width={84} height={52} rx={18} fill="#FF8A7A" {...S} />
          <Path d="M14 54 C14 36 106 36 106 54 Z" fill="#FDD34D" {...S} />
          <Circle cx={60} cy={36} r={6} fill="#FFFFFF" {...S} />
          <Face x={60} y={82} s={1.1} />
        </G>
      )}
      {kind === 'basket' && (
        <G>
          <Path d="M34 52 C34 18 86 18 86 52" {...NOFILL} {...S} />
          <Path d="M12 52 H108 L98 104 H22 Z" fill="#FDD34D" {...S} />
          <Path d="M40 52 L44 104 M60 52 V104 M80 52 L76 104" {...NOFILL} stroke={INK} strokeWidth={2.5} />
          <Face x={60} y={80} />
        </G>
      )}
    </Svg>
  );
}

/** Logo aplikacji: żółty kwadrat z uśmiechniętym garnkiem. */
export function Logo({ size = 46 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Rect x={4} y={4} width={112} height={112} rx={30} fill="#FDD34D" stroke={INK} strokeWidth={4} />
      <G transform="translate(9 11) scale(0.9)">
        <Path d="M46 14 C40 22 52 26 46 34" {...NOFILL} {...S} />
        <Path d="M72 12 C66 20 78 24 72 32" {...NOFILL} {...S} />
        <Rect x={4} y={64} width={18} height={12} rx={6} fill="#FFFFFF" {...S} />
        <Rect x={98} y={64} width={18} height={12} rx={6} fill="#FFFFFF" {...S} />
        <Rect x={18} y={54} width={84} height={52} rx={18} fill="#FF8A7A" {...S} />
        <Path d="M14 54 C14 36 106 36 106 54 Z" fill="#FFFFFF" {...S} />
        <Circle cx={60} cy={36} r={6} fill="#FDD34D" {...S} />
        <Face x={60} y={82} s={1.1} />
      </G>
    </Svg>
  );
}
