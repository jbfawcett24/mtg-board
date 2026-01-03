import { io } from "socket.io-client";
import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import Board from "./board.jsx";
import Hand from "./hand.jsx";
import DeckSelect from "./DeckSelect.jsx";
import Popup from "./ResetGame.jsx";

const socket = io.connect({
    auth: {
        code: "mtg2025"
    }
});

export default function App() {
    const [gameState, setGameState] = useState({ board: [], hand: [], commander: [], exile: [], graveyard: [] });
    const [appStatus, setAppStatus] = useState("LOADING");
    const [serverIp, setServerIp] = useState("localhost");
    const [deckList, setDeckList] = useState([]);

    const [showDeckSelector, setShowDeckSelector] = useState(false);
    const [selectedDeck, setSelectedDeck] = useState(null);
    const [importDeck, setImportDeck] = useState(null);

    const [role, setRole] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get("role");
    });

    useEffect(() => {
        socket.on("update_state", (newState) => {
            setGameState(newState);
        });

        socket.on("decks_loaded", (data) => {
            console.log("RECEIVED DATA:", data);
            setAppStatus("READY");
            if (data?.ip) setServerIp(data.ip);
            if (data?.decks) setDeckList(data.decks);
        });

        socket.on("no_decks", () => {
            setAppStatus("NO_DECKS");
        });

        socket.on("import_error", (message) => {
            alert(`Error importing deck: ${message}`);
        });

        socket.emit("refresh_decks");

        return () => {
            socket.off("update_state");
            socket.off("decks_loaded");
            socket.off("no_decks");
            socket.off("import_error")
        };
    }, []);

    const handleDeckChosen = (deckName) => {
        const deck = deckList.find(d => d.name === deckName);
        if (deck) {
            setSelectedDeck(deck);
            setShowDeckSelector(false);
            socket.emit('deck_selected', { deckName });
        }
    };

    const startGame = () => {
        setRole("board");
    };

    const handleCloseApp = () => {
        if (window.close) {
            window.close();
        }
    };

    if (role === 'board') return <Board gameState={gameState} socket={socket} setRole={setRole}/>;
    if (role === 'hand') return <Hand gameState={gameState} socket={socket} />;

    if (appStatus === "LOADING") {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={{color: '#fff'}}>Connecting to Core...</h2>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (appStatus === "NO_DECKS") {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={{ color: "#ef4444", marginBottom: '10px' }}>No Decks Found</h2>
                    <p style={{ color: "#aaa", marginBottom: '20px', textAlign: 'center' }}>
                        Please add deck folders to your <br/>
                        <code>Documents/MTG-Board/Decks</code> folder.
                    </p>

                    <div style={styles.buttonGroup}>
                        {/*<button*/}
                        {/*    style={styles.secondaryButton}*/}
                        {/*    onClick={() => socket.emit("open_folder")}*/}
                        {/*>*/}
                        {/*    Open Folder*/}
                        {/*</button>*/}
                        <button
                            style={styles.secondaryButton}
                            onClick={() => {setImportDeck({show: true, url: ""})}}
                            >
                            Import Deck
                        </button>
                        <button
                            style={styles.primaryButton}
                            onClick={() => socket.emit("refresh_decks")}
                        >
                            Refresh
                        </button>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <button style={styles.dangerButton} onClick={handleCloseApp}>Close App</button>
                    </div>
                </div>
                {importDeck && (
                    <ImportDeckForm
                        importDeck={importDeck}
                        setImportDeck={setImportDeck}
                        onSubmit={() => {socket.emit("create_new_deck", importDeck.url); setImportDeck(null);}}
                    />
                )}
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.contentWrapper}>

                {/* 2. CENTER CONTENT (Cards) */}
                {/* This flexRow now auto-margins to center itself vertically */}
                <div style={styles.flexRow}>

                    {/* LEFT CARD: Game Controls */}
                    <div style={styles.card}>
                        {!selectedDeck ? (
                            <>
                                <h2 style={{color: 'white', marginBottom: '20px'}}>Setup Session</h2>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '10px', width: '100%'}}>
                                    <button
                                        style={styles.primaryButton}
                                        onClick={() => setShowDeckSelector(true)}
                                    >
                                        Select Deck
                                    </button>
                                    <button
                                        style={styles.secondaryButton}
                                        onClick={() => setImportDeck({show: true, url: ""})}
                                    >
                                        Import Deck
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
                                <h3 style={{color: 'white', marginBottom: '15px'}}>Selected Deck</h3>
                                <img
                                    src={selectedDeck.imageUrl}
                                    alt={selectedDeck.name}
                                    style={styles.previewImage}
                                />
                                <div style={{display: 'flex', gap: '10px', marginTop: '15px', width: '100%'}}>
                                    <button
                                        style={{...styles.secondaryButton, flex: 1}}
                                        onClick={() => setShowDeckSelector(true)}
                                    >
                                        Swap
                                    </button>
                                    <button
                                        style={{...styles.secondaryButton, flex: 1}}
                                        onClick={() => setImportDeck({show: true, url: ""})}
                                    >
                                        Import New Deck
                                    </button>
                                </div>
                                {/* Added Import Button below the main actions */}
                                <button
                                    style={{...styles.startButton, flex: 1}}
                                    onClick={startGame}
                                >
                                    Start Game
                                </button>

                            </div>
                        )}
                    </div>

                    {/* RIGHT CARD: QR Code */}
                    <div style={styles.card}>
                        <h3 style={{marginBottom: '15px', color: '#ccc'}}>Join Hand</h3>
                        <div style={{background: 'white', padding: '10px', borderRadius: '8px'}}>
                            <QRCode value={`http://${serverIp}:3001/?role=hand`} size={300} />
                        </div>
                        <p style={{marginTop: '10px', color: '#888', fontFamily: 'monospace'}}>
                            {serverIp}:3001
                        </p>
                    </div>
                </div>

                {/* 3. FOOTER (Close Button) */}
                <div style={{ marginBottom: '20px' }}>
                    <button style={styles.dangerButton} onClick={handleCloseApp}>Close App</button>
                </div>
            </div>

            {showDeckSelector && (
                <DeckSelect
                    deckList={deckList}
                    onDeckSelect={handleDeckChosen}
                    onClose={() => setShowDeckSelector(false)}
                />
            )}
            {importDeck && (
                <ImportDeckForm
                    importDeck={importDeck}
                    setImportDeck={setImportDeck}
                    onSubmit={() => {socket.emit("create_new_deck", importDeck.url); setImportDeck(null);}}
                />
            )}
        </div>
    );
}

const styles = {
    container: {
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: "#111827",
        backgroundImage: `url("/background.jpg")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
    },
    contentWrapper: {
        textAlign: "center",
        maxWidth: "1100px",
        width: "100%",
        height: "100vh",     // Force full height
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start", // Start from top, we use auto margins to space center
    },
    // Updated Flex Row for Separation
    flexRow: {
        display: "flex",
        gap: "80px",        // LARGE GAP
        flexWrap: "wrap",
        flexDirection: "row",
        alignItems: "stretch", // Ensures both cards are same height
        justifyContent: "center",
        width: "100%",
        marginTop: "auto",  // Pushes this block to vertical center
        marginBottom: "auto",
    },
    card: {
        backgroundColor: "#222",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center", // Center content vertically inside card
        minWidth: "200px",      // Slightly wider cards
        flex: "1",              // Allow them to grow evenly
        maxWidth: "450px"
    },
    buttonGroup: {
        display: "flex",
        gap: "10px",
        marginTop: "10px",
        alignItems: "center"
    },
    primaryButton: {
        backgroundColor: "#3498db",
        color: "white",
        border: "none",
        padding: "15px 30px",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
        transition: "transform 0.1s",
        fontSize: "1.1rem"
    },
    startButton: {
        backgroundColor: "#10b981",
        color: "white",
        border: "none",
        padding: "12px",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "1rem",
        width: "100%",
        marginTop: "10px"
    },
    secondaryButton: {
        backgroundColor: "transparent",
        border: "1px solid #4b5563",
        color: "#e5e7eb",
        padding: "12px",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "1rem",
    },
    dangerButton: {
        backgroundColor: "transparent",
        color: "#9ca3af",
        border: "none",
        cursor: "pointer",
        fontSize: "1rem",
        padding: "10px",
        textDecoration: "underline",
        opacity: 0.8
    },
    previewImage: {
        width: "180px",
        height: "250px",
        borderRadius: "10px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
        objectFit: "cover",
        border: "1px solid #444",
        marginBottom: "15px"
    },
};

// Replace your existing ImportDeckForm function with this one:

function ImportDeckForm({ importDeck, setImportDeck, onSubmit }) {
    return (
        <Popup
            content={
                <form
                    onSubmit={(e) => { e.preventDefault(); onSubmit(importDeck.url); }}
                    style={{display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', padding: "5%"}}
                >
                    <input
                        type="text"
                        value={importDeck.url}
                        onChange={(e) => {setImportDeck({...importDeck, url: e.target.value})}}
                        placeholder="Paste Deck URL (Moxfield or Archidekt)"
                        style={{
                            margin: "10px",
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #4b5563',
                            backgroundColor: '#374151',
                            color: '#e5e7eb',
                            fontSize: '1rem',
                            outline: 'none'
                        }}
                    />
                    <div style={{display: 'flex', gap: '10px', margin: "10px"}}>
                        <button
                            type="button"
                            onClick={() => setImportDeck(null)}
                            style={{
                                ...styles.secondaryButton,
                                flex: 1,
                                justifyContent: 'center'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                ...styles.primaryButton,
                                flex: 1,
                                justifyContent: 'center'
                            }}
                        >
                            Import
                        </button>
                    </div>
                </form>
            }
            onClose={() => setImportDeck(null)}
        />
    )
}