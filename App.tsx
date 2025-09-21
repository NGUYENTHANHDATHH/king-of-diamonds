
import React, { useState, useEffect } from 'react';
import { GameState, GamePhase, Player } from './types';
import socket from './socket';
import PlayerStatus from './components/PlayerStatus';
import GameBoard from './components/GameBoard';
import ResultsModal from './components/ResultsModal';
import Lobby from './components/Lobby';
import GameOverScreen from './components/GameOverScreen';
import Login from './components/Login';
import RoomSelection from './components/RoomSelection';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(() => localStorage.getItem('playerName'));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerName) return;

    let disconnectTimeout: NodeJS.Timeout;

    const handleConnect = () => {
      console.log('Connected to server with id:', socket.id);
      setClientId(socket.id);
      setError(null); // Clear any connection errors
      
      const path = window.location.pathname;
      const roomIdMatch = path.match(/\/room\/([A-Z0-9]{6})/);
      if (roomIdMatch) {
        const roomId = roomIdMatch[1];
        console.log('Rejoining room after reconnect:', roomId);
        socket.emit('joinRoom', { roomId, name: playerName });
      }
    };

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to server. Please check your connection.');
    };

    const handleGameStateUpdate = (newState: GameState) => {
      console.log('Game state update received:', newState);
      setGameState(newState);
      setError(null);
    };

    const handleRoomCreated = ({ roomId }: { roomId: string }) => {
        window.history.pushState({}, '', `/room/${roomId}`);
        socket.emit('joinRoom', { roomId, name: playerName });
    };

    const handleError = (data: { message: string }) => {
      console.error('Server error:', data.message);
      setError(data.message);
      // If room not found, clear URL and state
      if (data.message.toLowerCase().includes('not found')) {
        window.history.pushState({}, '', '/');
        setGameState(null);
      }
    };

    const handleDisconnect = (reason: string) => {
      console.log('Disconnected from server:', reason);
      
      // Clear any existing timeout
      if (disconnectTimeout) {
        clearTimeout(disconnectTimeout);
      }
      
      // Only show error for truly unexpected disconnections
      // "transport close" can happen during normal operations, so we'll be more specific
      if (reason === 'io server disconnect' || 
          reason === 'io client disconnect') {
        // These are normal disconnections, don't show error
        return;
      }
      
      // For transport issues, only show error if it's not a brief reconnection
      if (reason === 'transport close' || reason === 'transport error') {
        // Wait a bit to see if it reconnects quickly
        disconnectTimeout = setTimeout(() => {
          setError('Connection lost. Attempting to reconnect...');
        }, 3000); // Wait 3 seconds for transport issues
        return;
      }
      
      // For other unexpected disconnections, show error immediately
      if (reason === 'ping timeout' || reason === 'server namespace disconnect') {
        setError('Connection lost. Attempting to reconnect...');
      }
    };

    const handleReconnect = () => {
      console.log('Reconnected to server');
      // Clear any pending disconnect timeout
      if (disconnectTimeout) {
        clearTimeout(disconnectTimeout);
      }
      setError(null);
    };

    const handleReconnectAttempt = (attemptNumber: number) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
    };

    const handleReconnectError = (error: Error) => {
      console.error('Reconnection failed:', error);
      setError('Failed to reconnect. Please refresh the page.');
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('roomCreated', handleRoomCreated);
    socket.on('error', handleError);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect_error', handleReconnectError);
    
    socket.connect();

    // Debug: Log connection status periodically
    const connectionCheck = setInterval(() => {
      console.log('Socket status check:', {
        connected: socket.connected,
        id: socket.id
      });
    }, 5000);

    return () => {
      clearInterval(connectionCheck);
      // Clear any pending timeout
      if (disconnectTimeout) {
        clearTimeout(disconnectTimeout);
      }
      
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('roomCreated', handleRoomCreated);
      socket.off('error', handleError);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect_error', handleReconnectError);
      socket.disconnect();
    };
  }, [playerName]); // Only run when playerName changes

  const handleLogin = (name: string) => {
    localStorage.setItem('playerName', name);
    setPlayerName(name);
  };

  const handleCreateRoom = () => socket.emit('createRoom', { name: playerName });
  const handleJoinRoom = (roomId: string) => {
    window.history.pushState({}, '', `/room/${roomId}`);
    socket.emit('joinRoom', { roomId, name: playerName });
  }

  const handleReconnect = () => {
    console.log('Manual reconnect requested');
    setError(null);
    socket.connect();
  };

  const handleStartGame = () => {
    console.log('Starting game for room:', gameState?.roomId);
    console.log('Current game state:', gameState);
    console.log('Socket connected:', socket.connected);
    console.log('Socket ID:', socket.id);
    
    if (!gameState?.roomId) {
      console.error('Cannot start game: roomId is undefined');
      setError('Cannot start game: room ID is missing');
      return;
    }
    
    if (!socket.connected) {
      console.error('Cannot start game: socket is not connected');
      setError('Connection lost. Please wait for reconnection...');
      // Try to reconnect
      socket.connect();
      return;
    }
    
    socket.emit('startGame', { roomId: gameState.roomId });
  };
  const handlePlayerChoice = (choice: number) => socket.emit('playerChoice', { choice, roomId: gameState?.roomId });
  const handleRestartGame = () => socket.emit('restartGame', { roomId: gameState?.roomId });

  if (!playerName) {
    return <Login onLogin={handleLogin} />;
  }

  if (!gameState) {
    const path = window.location.pathname;
    if (path.match(/\/room\/([A-Z0-9]{6})/)) {
      return (
        <div className="min-h-screen bg-kod-bg flex items-center justify-center text-2xl">
          Joining room...
        </div>
      );
    }
    return <RoomSelection onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
  }

  const { players, spectators, gamePhase, round, timer, results, newRuleIntroduced, roomId } = gameState;
  const activePlayers = players.filter(p => !p.isEliminated);
  const currentPlayer = players.find(p => p.id === clientId);
  const isSpectator = spectators.some(s => s.id === clientId);

  const renderGameContent = () => {
    switch (gamePhase) {
      case GamePhase.LOBBY:
        return <Lobby onStart={handleStartGame} players={players} spectators={spectators} clientId={clientId} roomId={roomId} gamePhase={gamePhase} error={error} isConnected={socket.connected} onReconnect={handleReconnect} />;
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
            isSpectator={isSpectator}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-kod-bg font-mono p-4 lg:p-8 flex flex-col items-center">
      {error && <div className="absolute top-4 bg-kod-red text-white p-3 rounded-lg shadow-lg animate-fade-in">{error}</div>}
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
                 {spectators.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-lg font-bold mb-3 border-b-2 border-gray-600 pb-2">Spectators ({spectators.length})</h2>
                    <div className="space-y-2 text-sm text-gray-400">
                      {spectators.map(spectator => (
                        <div key={spectator.id} className="p-2 bg-kod-light-gray/50 rounded">{spectator.name} {spectator.id === clientId && "(You)"}</div>
                      ))}
                    </div>
                  </div>
                )}
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
