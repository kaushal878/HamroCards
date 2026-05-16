import React from 'react';
import ReactDOM from 'react-dom/client';
import { motion } from 'framer-motion';
import { useSocketRoom } from './lib/useSocketRoom';
import { CardView } from './components/CardView';
import './styles.css';

function App() {
  const game = useSocketRoom();
  return <main className="min-h-screen bg-slate-950 text-white">
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-felt/90 p-8 shadow-2xl ring-1 ring-emerald-300/20">
        <p className="text-sm uppercase tracking-[0.4em] text-gold">Free-tier multiplayer platform</p>
        <h1 className="mt-3 text-5xl font-black">HamroCards</h1>
        <p className="mt-3 max-w-2xl text-emerald-50">Server-authoritative Callbreak, Rummy, Kitty and future card-game plug-ins over Socket.io with Supabase + Upstash free-tier persistence.</p>
      </motion.header>

      <section className="grid gap-4 rounded-2xl bg-white/10 p-4 md:grid-cols-4">
        <input className="rounded-xl bg-slate-900 p-3" value={game.username} onChange={(event) => game.setUsername(event.target.value)} placeholder="Username" />
        <select className="rounded-xl bg-slate-900 p-3" value={game.gameType} onChange={(event) => game.setGameType(event.target.value as typeof game.gameType)}>
          <option value="callbreak">Callbreak</option><option value="rummy">Rummy</option><option value="kitty">Kitty</option>
        </select>
        <input className="rounded-xl bg-slate-900 p-3" value={game.roomId} onChange={(event) => game.setRoomId(event.target.value)} placeholder="Room ID" />
        <div className="flex gap-2"><button onClick={game.createRoom} className="rounded-xl bg-gold px-4 py-3 font-bold text-slate-950">Create</button><button onClick={game.joinRoom} className="rounded-xl bg-emerald-500 px-4 py-3 font-bold">Join</button></div>
      </section>

      {game.snapshot && <section className="rounded-3xl bg-felt p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-emerald-100">Room {game.snapshot.roomId}</p><h2 className="text-2xl font-bold">{game.snapshot.gameType} · {game.snapshot.gamePhase}</h2></div><button onClick={game.startGame} className="rounded-xl bg-white px-4 py-2 font-bold text-felt">Start game</button></div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">{game.snapshot.players.map((player) => <div key={player.id} className={`rounded-2xl p-4 ${game.snapshot?.currentTurn === player.id ? 'bg-gold text-slate-950' : 'bg-white/10'}`}><b>{player.username}</b><p>{player.cardCount} cards · {player.connected ? 'online' : 'paused'}</p></div>)}</div>
        <div className="mt-8 flex flex-wrap gap-3">{game.snapshot.hand?.map((card) => <button key={card.id} onClick={() => game.playCard(card.id)}><CardView card={card} /></button>)}</div>
        {game.snapshot.gamePhase === 'bidding' && <div className="mt-6 flex gap-2">{[1,2,3,4,5].map((bid) => <button key={bid} onClick={() => game.bid(bid)} className="rounded-lg bg-gold px-4 py-2 font-bold text-slate-950">Bid {bid}</button>)}</div>}
      </section>}
      {game.error && <p className="rounded-xl bg-red-500/20 p-4 text-red-100">{game.error}</p>}
    </section>
  </main>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
