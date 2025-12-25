import {io} from "socket.io-client";
import {useState, useEffect} from "react";
import Board from "./board.jsx";
import Hand from "./hand.jsx";

const socket  = io.connect({
    auth: {
        code: "mtg2025" // Must match SHARED_SECRET in server/index.js
    }
});

export default function App() {
    const [gameState, setGameState] = useState({board: [], hand: [], commander: [], exile: [], graveyard: []})
    const [loadingState, setLoadingState] = useState(true);
    const [role] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get("role");
    });

    useEffect(() => {
        socket.on("update_state", (newState) => {
            console.log(newState);
            setGameState(newState);
        })

        socket.on("decks_loaded", () => {
            setLoadingState(false);
        })

        return () => socket.off("update_state");
    }, []);

    if(role === 'board') {
        return (
            <Board gameState={gameState} socket={socket} />
        )
    }

    if(role === 'hand') {
        return (
            <Hand gameState={gameState} socket={socket} />
        )
    }

    return (
        !loadingState ? (
            <div>
                <h1>Select your role:</h1>
                <ul>
                    <li><a href=".?role=board">Join as Board</a></li>
                    <li><a href=".?role=hand">Join as Hand</a></li>
                </ul>
            </div>
        ) : (
            <p>Loading...</p>
            )
    );
}