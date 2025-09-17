import React from 'react';
import { Player } from '../types';

interface LobbyProps {
  onStart: () => void;
  players: Player[];
  clientId: string | null;
}

const Lobby: React.FC<LobbyProps> = ({ onStart, players, clientId }) => {
  const currentPlayer = players.find(p => p.id === clientId);
  const isHost = currentPlayer?.isHost ?? false;
  const canStart = isHost && players.length >= 2;

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-4 animate-fade-in">
      <h1 className="text-5xl lg:text-7xl font-bold text-kod-cyan mb-4">King of Diamonds</h1>
      <div className="w-full max-w-3xl mb-8">
        <div className="bg-kod-gray p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-kod-cyan">Players in Lobby ({players.length}/5)</h2>
          <div className="space-y-2 text-left">
            {players.map(p => (
              <div key={p.id} className="bg-kod-light-gray p-3 rounded flex justify-between items-center">
                <span className="font-semibold text-lg">{p.name} {p.id === clientId && "(You)"}</span>
                <span>{p.isHost ? '👑 Host' : 'Joined'}</span>
              </div>
            ))}
             {Array.from({ length: 5 - players.length }).map((_, i) => (
                <div key={i} className="bg-kod-light-gray/50 p-3 rounded text-gray-500">Waiting for player...</div>
             ))}
          </div>
        </div>
      </div>
      
      {isHost ? (
        <button
          onClick={onStart}
          disabled={!canStart}
          className="bg-kod-cyan text-black font-bold py-4 px-12 rounded text-2xl hover:bg-white hover:shadow-cyan-glow transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:shadow-none animate-pulse"
        >
          {players.length < 2 ? 'Waiting for more players...' : 'Begin Game'}
        </button>
      ) : (
        <p className="text-xl text-gray-400">Waiting for the host to start the game...</p>
      )}

    </div>
  );
};

export default Lobby;
