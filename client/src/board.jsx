import Card from "./card.jsx"
import {useEffect, useState} from "react"
import ContextMenu from "./contextMenu.jsx"
import ZoneViewer from "./ZoneViewer.jsx";
import DeckSelect from "./DeckSelect.jsx";
import {motion, AnimatePresence} from "framer-motion";
import CounterSelector from "./CounterSelector.jsx";
import ResetGame from "./ResetGame.jsx";
import Popup from "./ResetGame.jsx";

export default function Board({ gameState, socket}) {
    const [menuState, setMenuState] = useState(null)
    const [viewingZone, setViewingZone] = useState(null)
    const [deckSelect, setDeckSelect] = useState(null)
    const [addCounter, setAddCounter] = useState(null)
    const [ reset, setReset ] = useState(false);
    const [position, setPosition] = useState(null);
    const [topCardShow, setTopCardShow] = useState(false);

    const bgImage = gameState.theme?.background || "/background.jpg"
    const cardBackImg = gameState.theme?.cardBack || "/card-back.jpg"

    const findCardById = (id) => {
        const searchKeys = ["board", "commander", "tokenBoard"]
        let card;
        for(const key of searchKeys) {
            console.log(gameState);
            console.log(key)
            if (gameState[key] && Array.isArray(gameState[key])) {
                const card = gameState[key].find(c => c.id === id);
                if (card) return card;
            }
        }

        return card;
    }

    const handleContextMenu = (e, cardId) => {
        console.log("context menu")
        e.preventDefault();

        const x = e.x || e.clientX;
        const y = e.y || e.clientY;

        setMenuState({x, y, cardId});
    }

    const handleLibraryContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuState({
            x: e.clientX,
            y: e.clientY,
            cardId: "LIBRARY_MENU"
        });
    }

    const handleMenuAction = (action) => {

        if(!menuState) return;

        switch(action) {
            case "reset":
                setReset(true);
                break;
            case "shuffle":
                socket.emit("shuffle")
                break;
            case "viewLibrary":
                setViewingZone("library");
                break;
            case "showTopCard":
                setTopCardShow((prev) => !prev);
                break;
            case "moveTo": {
                const { cardId } = menuState;
                performMove(cardId, action);
                return;
                }
            default: {
                const { cardId } = menuState;
                performMove(cardId, action);
            }
        }
        setMenuState(null);
    }

    const performMove= (cardId, action) => {
        console.log(action);
        switch(action) {
            case "top":
                socket.emit('move_zone', {cardId, targetZone: 'library', position: 'top'})
                break;
            case "bottom":
                socket.emit('move_zone', {cardId, targetZone: 'library', position: 'bottom'});
                break;
            case "position":
                setPosition({cardId: cardId, position: 0});
                break;
            case "topStack":
            {
                //find the highest number of cards
                const zIndexNum = Math.max(gameState.tokenBoard.length, gameState.board.length) + 2;
                console.log(`moving to position ${zIndexNum}`)
                socket.emit('card_update', {id: cardId, changes:{zIndex: zIndexNum}});
                break;
            }
            case "bottomStack":
            {
                socket.emit('card_update', {id: cardId, changes: {zIndex: 1}})
                break;
            }
            case "addCounter":
                setAddCounter(cardId);
                break;
            case "moveTo":
                console.log("moving");
                setMenuState(prev => {
                    const updated = {
                        ...prev,
                        options: [
                            {label: "Hand", action: "hand"},
                            {label: "Graveyard", action: "graveyard"},
                            {label: "Exile", action: "exile"},
                            {label: "Top of library", action: "top"},
                            {label: "X from Top of library", action: "position"},
                            {label: "Bottom of library", action: "bottom"},
                        ]
                    };
                    console.log("New State scheduled:", updated);
                    return updated;
                });
                break;
            case "flipCard": {
                const card = findCardById(cardId);
                console.log(card);
                socket.emit('card_update', {id: cardId, changes: {isFlipped: !card?.isFlipped}});
                break;
            }
            default:
                socket.emit('move_zone', {cardId, targetZone: action})
                break;
        }
    }

    const handleAddCounter = (power, toughness) => {
        console.log(`Adding Counter: ${power}/${toughness} to ${addCounter}`);
        socket.emit('add_counter', {id: addCounter, changes: {power: power, toughness: toughness}});
        setAddCounter(null);
    }

    useEffect(() => {
        const handleDeckSelect = (decks) => {
            setDeckSelect(decks);
            console.log(deckSelect);
        };

        socket.on('select_deck', handleDeckSelect);

        return () => {
            socket.off('select_deck', handleDeckSelect);
        };
    }, [deckSelect, socket]);

    return (
        <div
            onClick={() => setMenuState(null)}
            style={{
                width: "100vw",
                height: "100vh",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <AnimatePresence>
                <motion.div
                    key={bgImage}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.8}}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        zIndex: 0 // Ensure it sits behind everything
                    }}
                />
            </AnimatePresence>
            <div
            style={{
                position: "absolute",
                right: '10px',
                top: '5%',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                zIndex: 100
            }}>
                <AnimatePresence mode="popLayout">
                    {/* Inside Board.jsx */}
                    <div
                        onClick={handleLibraryContextMenu}
                        onContextMenu={handleLibraryContextMenu}
                        style={{
                            width: '150px',
                            aspectRatio: '63/88',
                            perspective: '1000px', // Adds 3D depth
                            cursor: 'pointer',
                            zIndex: 101,
                            borderRadius: '8px',
                            border: '2px dashed white',
                            overflow: 'hidden'
                        }}
                    >
                        <motion.div
                            initial={false}
                            animate={{ rotateY: topCardShow ? 180 : 0 }}
                            transition={{ duration: 0.6, animationDirection: "normal" }}
                            style={{
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                transformStyle: 'preserve-3d',
                                borderRadius: "8px"// Necessary for 3D stacking
                            }}
                        >
                            {/* BACK OF CARD (Visible when topCardShow is false) */}
                            <div
                                style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    backfaceVisibility: 'hidden',
                                    backgroundImage: `url(${cardBackImg})`,
                                    backgroundSize: 'cover',
                                    borderRadius: "8px"
                                }}
                            />

                            {/* FRONT OF CARD (Visible when topCardShow is true) */}
                            <div
                                style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)', // Pre-rotated so it faces "back"
                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                    backgroundImage: gameState.library?.length > 0
                                        ? `url(${gameState.library[gameState.library.length - 1]?.imageUrl})`
                                        : 'none',
                                    backgroundSize: 'cover',
                                }}
                            />
                        </motion.div>
                    </div>
                </AnimatePresence>
                <div onClick={() => {setViewingZone('graveyard')}} style={zoneStyle}>
                    Graveyard
                </div>
                <div onClick={() => {setViewingZone('exile')}} style={zoneStyle}>
                    Exile
                </div>
            </div>
            <AnimatePresence>
            {gameState.board.map((card) => (
                <Card key={card.id} data={card} socket={socket} onContextMenu={handleContextMenu} />
            ))}
            </AnimatePresence>
            <AnimatePresence>
            {gameState.commander.map((card) => (
                <Card key={card.id} data={card} socket={socket} onContextMenu={handleContextMenu} />
            ))}
            </AnimatePresence>
            <AnimatePresence>
            {gameState.tokenBoard && gameState.tokenBoard.map((card) => (
                <Card
                    key={card.id}
                    data={card}
                    socket={socket}
                    onContextMenu={handleContextMenu}
                />
            ))}
            </AnimatePresence>
            {menuState && (
                <ContextMenu
                    x={menuState.x}
                    y={menuState.y}
                    onAction={handleMenuAction}
                    onClose={() => {setMenuState(null)}}
                    options = {menuState.cardId === "LIBRARY_MENU" ? [
                        {label: "View Library", action: "viewLibrary"},
                        {label: topCardShow ? "Hide Top Card" : "Show Top Card", action: "showTopCard"},
                        {label: "Shuffle", action: "shuffle"},
                        {label: "Reset Game", action: "reset"},
                    ] : menuState.options || undefined}
                    gameState={gameState}
                    cardId={menuState.cardId}
                />
            )}
            {viewingZone && (
                <ZoneViewer
                    title={viewingZone.toUpperCase()}
                    cards={gameState[viewingZone]}
                    onClose={() => {setViewingZone(null)}}
                    socket={socket}
                    onMove={(id, action, payload) => performMove(id, action, payload)}
                />
            )}
            {deckSelect && (
                <DeckSelect
                    socket={socket}
                    deckList={deckSelect}
                    onClose={() => {setDeckSelect(null)}}
                />
            )}
            <AnimatePresence>
            {addCounter && (
                <CounterSelector
                    onClose={() => {setAddCounter(null)}}
                    onSubmit={handleAddCounter}
                />
            )}
            </AnimatePresence>
            <AnimatePresence>
            {reset && (
                <Popup
                    onClose={() => {setReset(false)}}
                    content={
                    <>
                        <h2>Reset Game?</h2>
                        <div
                        style={{
                        display: "flex",
                        marginBottom: "15px",
                        justifyContent: "space-evenly",
                        width: "100%"
                    }}
                >
                    <motion.button
                        onClick={() => {
                            setReset(false);
                            socket.emit("reset_game")}}
                        whileTap={{scale: 0.9, backgroundColor: "#ae392b", color: "white"}}
                        style={{
                            backgroundColor: "#db4332",
                            color: "white",
                            width: "80px",
                            height: "40px",
                            textAlign: "center",
                            padding: 0
                        }}
                    >Yes</motion.button>
                    <motion.button
                        onClick={() => {setReset(false)}}
                        whileTap={{scale: 0.9, backgroundColor: "#222", color: "white"}}
                        style={{
                            backgroundColor: "#333",
                            color: "white",
                            width: "80px",
                            height: "40px",
                            textAlign: "center",
                            padding: 0
                        }}
                    >No</motion.button>
                </div>
                </>
                }
                />
            )}
            </AnimatePresence>
            <AnimatePresence>
            {position !==null && (
                <Popup
                    onClose={() => {setPosition(null)}}
                    content={
                        <PositionSelect
                            libPosition={position}
                            setPosition={setPosition}
                            onSubmit={(val) => {
                                socket.emit('move_zone', {
                                    cardId: position.cardId,
                                    targetZone: 'library',
                                    position: val
                                });
                                setPosition(null);
                            }}
                        />
                    }
                />
            )}
            </AnimatePresence>
        </div>
    )
}

const zoneStyle = {
    width: '150px',
    aspectRatio: '3/4',
    border: '2px dashed white',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    usrSelect: 'none',
}

function PositionSelect({ onSubmit, libPosition, setPosition }) {
    const {position} = libPosition;
    const buttonStyle = {
        width: '40px',
        height: '40px',
        padding: "0"
    }

    const updateVal = (diff) => {
        setPosition(prev => ({
            ...prev,
            position: Math.max(0, prev.position + diff)
        }));
    };

    return (
        <>
            <h2 style={{padding: 0, margin: "2%"}}>Select Position</h2>
            <div
                style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <motion.button
                    whileTap={{scale: 0.9, backgroundColor: "#222", color: "white"}}
                    onClick={() => updateVal(-1)}
                    style={buttonStyle}
                >-</motion.button>
                <p style={{width:"40px", textAlign:"center"}}>{position}</p>
                <motion.button
                    whileTap={{scale: 0.9, backgroundColor: "#222", color: "white"}}
                    onClick={() => updateVal(1)}
                    style={buttonStyle}
                >+</motion.button>
            </div>
            <motion.button
                onClick={() => onSubmit(position)}
                whileTap={{scale: 0.9, backgroundColor: "#222", color: "white"}}
                style={{marginBottom: "2.5%", width: "95%"}}
            >Move to Library</motion.button>
        </>
    )
}