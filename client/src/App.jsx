// File: App.jsx
import React, { useState, useEffect, useRef } from "react";

const socket = new WebSocket("ws://localhost:8080");

function App() {
  const [step, setStep] = useState("login");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [votes, setVotes] = useState({ optionA: 0, optionB: 0 });
  const [hasVoted, setHasVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("voteData"));
    if (stored && stored.roomCode === roomCode) {
      setHasVoted(true);
    }

    socket.onopen = () => {
      setError(null);
    };

    socket.onmessage = (msg) => {
      try {
        const { type, data } = JSON.parse(msg.data);

        if (type === "ROOM_CREATED") {
          setRoomCode(data);
          setStep("poll");
          startTimer(data);
        }

        if (type === "ROOM_JOINED") {
          setVotes(data.votes);
          setRoomCode(data.roomCode);
          setStep("poll");
          startTimer(data.roomCode);
        }

        if (type === "VOTE_UPDATE") {
          setVotes(data);
        }

        if (type === "VOTING_ENDED") {
          clearInterval(timerRef.current);
          setTimeLeft(0);
          setError("Voting has ended!");
        }

        if (type === "ERROR") {
          setError(data);
        }
      } catch (err) {
        setError("Failed to process server message");
      }
    };

    socket.onerror = () => {
      setError("Failed to connect to server. Please ensure the server is running.");
    };

    return () => {
      socket.onmessage = null;
      socket.onerror = null;
      socket.onopen = null;
    };
  }, [roomCode]);

  const startTimer = (room) => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          socket.send(JSON.stringify({ type: "TIMER_END", data: room }));
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVote = (option) => {
    if (hasVoted || timeLeft <= 0) return;

    socket.send(
      JSON.stringify({
        type: "VOTE",
        data: { roomCode, option },
      })
    );
    localStorage.setItem("voteData", JSON.stringify({ roomCode, voted: true }));
    setHasVoted(true);
  };

  const handleCreateRoom = () => {
    if (!name) return setError("Enter your name");
    socket.send(JSON.stringify({ type: "CREATE_ROOM", data: { name } }));
  };

  const handleJoinRoom = () => {
    if (!name || !roomCode) return setError("Enter both name and room code");
    socket.send(JSON.stringify({ type: "JOIN_ROOM", data: { name, roomCode } }));
  };

  if (step === "login") {
    return (
      <div className="bg-gradient-to-r from-blue-300 to-purple-500 h-screen flex justify-center items-center">
        <div className="py-8 px-6 max-w-md w-full bg-white bg-opacity-30 rounded-lg shadow-lg backdrop-blur-xl backdrop-filter">
          <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-5">Live Poll Battle</h1>
          <p className="text-lg text-center text-gray-700 mb-8">Join or create a room to vote</p>
          {error && (
            <div className="text-red-600 text-sm font-semibold bg-red-50 p-2 rounded mb-4 text-center">{error}</div>
          )}
          <form className="flex flex-col">
            <div className="mb-4">
              <input
                className="bg-transparent border rounded-lg shadow border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 py-2 px-4 block w-full appearance-none leading-normal"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <button
              className="bg-gradient-to-r from-purple-400 to-indigo-500 text-white font-semibold py-2 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out mb-4"
              type="button"
              onClick={handleCreateRoom}
            >
              🎉 Create Room
            </button>
            <div className="mb-4">
              <input
                className="bg-transparent border rounded-lg shadow border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 py-2 px-4 block w-full appearance-none leading-normal"
                type="text"
                placeholder="Enter Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                required
              />
            </div>
            <button
              className="bg-gradient-to-r from-indigo-400 to-purple-500 text-white font-semibold py-2 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out"
              type="button"
              onClick={handleJoinRoom}
            >
              🔑 Join Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-200 via-pink-200 to-purple-200">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center space-y-8 transform transition-all hover:scale-105">
        <h2 className="text-xl font-semibold text-gray-700">
          Room: <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{roomCode}</span>
        </h2>
        <p className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <span role="img" aria-label="cat">🐱</span> Cats vs <span role="img" aria-label="dog">🐶</span> Dogs
        </p>
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg inline-block">
          <span role="img" aria-label="timer">⏳</span> Voting ends in: <strong>{timeLeft}s</strong>
        </div>
        {error && (
          <div className="text-red-600 text-sm font-semibold bg-red-50 p-2 rounded">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-6 mt-6">
          <button
            onClick={() => handleVote("optionA")}
            className={`p-6 rounded-2xl shadow-lg border-2 transition-all transform hover:scale-105 ${
              hasVoted || timeLeft <= 0
                ? "bg-gray-200 cursor-not-allowed border-gray-300"
                : "bg-indigo-100 hover:bg-indigo-200 border-indigo-300"
            }`}
            disabled={hasVoted || timeLeft <= 0}
          >
            <span className="text-2xl">🐱 Cats</span>
            <br />
            <span className="text-3xl font-extrabold text-indigo-600">{votes.optionA}</span>
          </button>
          <button
            onClick={() => handleVote("optionB")}
            className={`p-6 rounded-2xl shadow-lg border-2 transition-all transform hover:scale-105 ${
              hasVoted || timeLeft <= 0
                ? "bg-gray-200 cursor-not-allowed border-gray-300"
                : "bg-green-100 hover:bg-green-200 border-green-300"
            }`}
            disabled={hasVoted || timeLeft <= 0}
          >
            <span className="text-2xl">🐶 Dogs</span>
            <br />
            <span className="text-3xl font-extrabold text-green-600">{votes.optionB}</span>
          </button>
        </div>
        {hasVoted && (
          <div className="text-green-600 text-base font-semibold flex items-center justify-center gap-2">
            <span role="img" aria-label="check">✅</span> You have voted!
          </div>
        )}
        {timeLeft <= 0 && (
          <div className="text-red-600 text-base font-semibold flex items-center justify-center gap-2">
            <span role="img" aria-label="stop">⛔</span> Voting ended
          </div>
        )}
      </div>
    </div>
  );
}

export default App;