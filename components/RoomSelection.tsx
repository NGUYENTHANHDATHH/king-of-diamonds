
import React, { useState, useEffect } from 'react';
import { config } from '../config';

interface Room {
    roomId: string;
    playerCount: number;
    maxPlayers: number;
    hostName: string;
}

interface RoomSelectionProps {
    onCreateRoom: () => void;
    onJoinRoom: (roomId: string) => void;
}

const RoomSelection: React.FC<RoomSelectionProps> = ({ onCreateRoom, onJoinRoom }) => {
    const [roomId, setRoomId] = useState('');
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRooms = async () => {
        try {
            const response = await fetch(`${config.getServerUrl()}/api/rooms`);
            const data = await response.json();
            setAvailableRooms(data.rooms || []);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            setAvailableRooms([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
        // Refresh rooms every 5 seconds
        const interval = setInterval(fetchRooms, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId.trim()) {
            onJoinRoom(roomId.trim().toUpperCase());
        }
    };

    const handleJoinRoom = (roomId: string) => {
        onJoinRoom(roomId);
    };

    return (
        <div className="min-h-screen bg-kod-bg flex flex-col items-center justify-center text-center p-4 animate-fade-in">
            <h1 className="text-5xl lg:text-7xl font-bold text-kod-cyan mb-12">Join a Game</h1>
            <div className="w-full max-w-4xl space-y-8">
                <button
                    onClick={onCreateRoom}
                    className="bg-kod-cyan text-black font-bold py-4 px-12 rounded text-2xl w-full hover:bg-white hover:shadow-cyan-glow transition-all duration-300"
                >
                    Create a New Room
                </button>

                <div className="relative flex items-center">
                    <div className="flex-grow border-t border-kod-light-gray"></div>
                    <span className="flex-shrink mx-4 text-kod-light-gray">OR</span>
                    <div className="flex-grow border-t border-kod-light-gray"></div>
                </div>

                {/* Available Rooms Section */}
                <div className="bg-kod-gray p-8 rounded-lg shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-kod-text">Available Rooms</h2>
                        <button
                            onClick={fetchRooms}
                            className="text-kod-cyan hover:text-white transition-colors duration-300"
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                    
                    {loading ? (
                        <div className="text-kod-light-gray">Loading rooms...</div>
                    ) : availableRooms.length === 0 ? (
                        <div className="text-kod-light-gray">No rooms available. Create one above!</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableRooms.map((room) => (
                                <div
                                    key={room.roomId}
                                    className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                                        room.playerCount >= room.maxPlayers
                                            ? 'bg-gray-600 border-gray-500 cursor-not-allowed opacity-60'
                                            : 'bg-kod-light-gray border-transparent hover:border-kod-cyan cursor-pointer'
                                    }`}
                                    onClick={() => room.playerCount < room.maxPlayers && handleJoinRoom(room.roomId)}
                                >
                                    <div className="text-lg font-bold text-kod-cyan mb-2">{room.roomId}</div>
                                    <div className="text-sm text-kod-text mb-1">Host: {room.hostName}</div>
                                    <div className="text-sm text-kod-text">
                                        Players: {room.playerCount}/{room.maxPlayers}
                                    </div>
                                    <div className={`mt-3 text-xs ${
                                        room.playerCount >= room.maxPlayers 
                                            ? 'text-gray-400' 
                                            : 'text-kod-cyan'
                                    }`}>
                                        {room.playerCount >= room.maxPlayers ? 'Room Full' : 'Click to join'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative flex items-center">
                    <div className="flex-grow border-t border-kod-light-gray"></div>
                    <span className="flex-shrink mx-4 text-kod-light-gray">OR</span>
                    <div className="flex-grow border-t border-kod-light-gray"></div>
                </div>

                <form onSubmit={handleJoin} className="bg-kod-gray p-8 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold mb-6 text-kod-text">Join with Room Code</h2>
                    <input
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder="Enter Room ID"
                        maxLength={6}
                        className="w-full bg-kod-light-gray text-kod-text p-4 rounded text-lg text-center uppercase focus:outline-none focus:ring-2 focus:ring-kod-cyan mb-6"
                        required
                    />
                    <button
                        type="submit"
                        className="bg-kod-light-gray border-2 border-kod-cyan text-kod-cyan font-bold py-3 px-10 rounded text-xl w-full hover:bg-kod-cyan hover:text-black transition-all duration-300 disabled:bg-gray-500 disabled:text-gray-400 disabled:border-gray-500 disabled:cursor-not-allowed"
                        disabled={!roomId.trim()}
                    >
                        Join Room
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RoomSelection;
