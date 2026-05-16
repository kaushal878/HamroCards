import type { Card } from '@hamrocards/shared';

const suitGlyph = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' } as const;

export function CardView({ card }: { card: Card }) {
  const red = card.suit === 'diamonds' || card.suit === 'hearts';
  return <div className={`flex h-36 w-24 flex-col justify-between rounded-xl bg-white p-3 text-xl font-black shadow-lg transition hover:-translate-y-2 ${red ? 'text-red-600' : 'text-slate-950'}`}>
    <span>{card.rank}</span><span className="self-center text-4xl">{suitGlyph[card.suit]}</span><span className="self-end rotate-180">{card.rank}</span>
  </div>;
}
