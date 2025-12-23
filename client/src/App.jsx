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
    const [role, setRole] = useState("unknown");
    const [gameState, setGameState] = useState({board: [], hand: [], commander: [], exile: [], graveyard: []})

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const roleParam = params.get("role");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRole(roleParam);

        socket.on("update_state", (newState) => {
            setGameState(newState);
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
        <div>
            <h1>Select your role:</h1>
            <ul>
                <li><a href=".?role=board">Join as Board</a></li>
                <li><a href=".?role=hand">Join as Hand</a></li>
            </ul>
        </div>
    );
}