import React, { useState, useEffect } from 'react';
import { GameState, GamePhase } from './types';
import socket from './socket';
import PlayerStatus from './components/PlayerStatus';
import GameBoard from './components/GameBoard';
import ResultsModal from './components/ResultsModal';
import Lobby from './components/Lobby';
import GameOverScreen from './components/GameOverScreen';
import { INITIAL_PLAYER_COUNT } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    socket.on('connect', () => {
      setClientId(socket.id);
    });

    socket.on('gameStateUpdate', (newState: GameState) => {
      setGameState(newState);
    });
    
    // On mount, request the current state from server
    socket.emit('requestInitialState');

    return () => {
      socket.off('connect');
      socket.off('gameStateUpdate');
    };
  }, []);

  const handleStartGame = () => socket.emit('startGame');
  const handlePlayerChoice = (choice: number) => socket.emit('playerChoice', choice);
  const handleRestartGame = () => socket.emit('restartGame');

  if (!gameState) {
    return (
      <div className="min-h-screen bg-kod-bg flex items-center justify-center text-2xl">
        Connecting to server...
      </div>
    );
  }

  const { players, gamePhase, round, timer, results, newRuleIntroduced } = gameState;
  const activePlayers = players.filter(p => !p.isEliminated);
  const currentPlayer = players.find(p => p.id === clientId);

  const renderGameContent = () => {
    switch (gamePhase) {
      case GamePhase.LOBBY:
        return <Lobby onStart={handleStartGame} players={players} clientId={clientId} />;
      case GamePhase.INTRODUCTION:
        return (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <h1 className="text-4xl lg:text-6xl font-bold text-kod-cyan mb-4">Round {round}</h1>
            <p className="text-xl lg:text-2xl">Prepare yourself.</p>
          </div>
        );
      case GamePhase.GAME_OVER:
        return <GameOverScreen onRestart={handleRestartGame} finalRound={round} isHost={currentPlayer?.isHost} />;
      case GamePhase.GAME_CLEAR:
        return <GameOverScreen onRestart={handleRestartGame} finalRound={round} isClear={true} isHost={currentPlayer?.isHost} />;
      case GamePhase.CHOOSING:
      case GamePhase.RESULTS:
        return (
          <GameBoard 
            players={players} 
            timer={timer}
            gamePhase={gamePhase}
            onPlayerChoice={handlePlayerChoice}
            newRuleIntroduced={newRuleIntroduced}
            currentPlayer={currentPlayer}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-kod-bg font-mono p-4 lg:p-8 flex flex-col items-center">
      <header className="w-full max-w-7xl mb-4 lg:mb-8 flex justify-between items-center">
        <h1 className="text-2xl lg:text-4xl font-bold text-kod-cyan tracking-widest">KING OF DIAMONDS</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg lg:text-xl">Round: <span className="text-kod-cyan font-semibold">{round}</span></div>
          <div className="text-lg lg:text-xl">Players: <span className="text-kod-cyan font-semibold">{activePlayers.length}/{players.length}</span></div>
        </div>
      </header>
      
      <main className="w-full max-w-7xl flex-grow flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/4 w-full">
            <div className="bg-kod-gray p-4 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4 border-b-2 border-kod-cyan pb-2">Players</h2>
                <div className="space-y-3">
                    {players.map(player => <PlayerStatus key={player.id} player={player} gamePhase={gamePhase} clientId={clientId} />)}
                </div>
            </div>
        </aside>
        <section className="lg:w-3/4 w-full flex-grow bg-kod-gray p-4 rounded-lg shadow-lg">
            {renderGameContent()}
        </section>
      </main>

      {gamePhase === GamePhase.RESULTS && results && (
          <ResultsModal results={results} />
      )}
    </div>
  );
};

export default App;
