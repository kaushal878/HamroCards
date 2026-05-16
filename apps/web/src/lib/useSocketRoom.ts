import { useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS, type GameType, type RoomSnapshot } from '@hamrocards/shared';

const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000';

export function useSocketRoom() {
  const socket = useMemo(() => io(serverUrl, { autoConnect: true }), []);
  const [username, setUsername] = useState(`Player-${Math.floor(Math.random() * 999)}`);
  const [playerId] = useState(() => crypto.randomUUID());
  const [gameType, setGameType] = useState<GameType>('callbreak');
  const [roomId, setRoomId] = useState('');
  const [snapshot, setSnapshot] = useState<RoomSnapshot>();
  const [error, setError] = useState('');

  socket.off(SOCKET_EVENTS.GAME_UPDATE).on(SOCKET_EVENTS.GAME_UPDATE, (next: RoomSnapshot) => setSnapshot(next));
  socket.off(SOCKET_EVENTS.CARD_DEAL).on(SOCKET_EVENTS.CARD_DEAL, (next: RoomSnapshot) => { if (next.players.some((p) => p.id === playerId)) setSnapshot(next); });
  socket.off(SOCKET_EVENTS.MOVE_VALIDATE).on(SOCKET_EVENTS.MOVE_VALIDATE, (result: { ok: boolean; error?: string }) => { if (!result.ok) setError(result.error ?? 'Move rejected'); });

  const emitAck = (event: string, payload: unknown) => socket.emit(event, payload, (response: { ok: boolean; snapshot?: RoomSnapshot; error?: string }) => {
    if (!response.ok) return setError(response.error ?? 'Request failed');
    setError('');
    if (response.snapshot) { setSnapshot(response.snapshot); setRoomId(response.snapshot.roomId); }
  });

  return { username, setUsername, gameType, setGameType, roomId, setRoomId, snapshot, error,
    createRoom: () => emitAck(SOCKET_EVENTS.ROOM_CREATE, { gameType, playerId, username }),
    joinRoom: () => emitAck(SOCKET_EVENTS.ROOM_JOIN, { roomId, playerId, username }),
    startGame: () => emitAck(SOCKET_EVENTS.GAME_START, { roomId: snapshot?.roomId ?? roomId }),
    bid: (bid: number) => emitAck(SOCKET_EVENTS.PLAYER_MOVE, { roomId: snapshot?.roomId, playerId, move: { type: 'BID', payload: { bid }, clientMoveId: crypto.randomUUID() } }),
    playCard: (cardId: string) => emitAck(SOCKET_EVENTS.PLAYER_MOVE, { roomId: snapshot?.roomId, playerId, move: { type: 'PLAY_CARD', cardIds: [cardId], clientMoveId: crypto.randomUUID() } }) };
}
