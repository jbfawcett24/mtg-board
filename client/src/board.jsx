import Card from "./card.jsx"
import {useEffect, useState} from "react"
import ContextMenu from "./contextMenu.jsx"
import ZoneViewer from "./ZoneViewer.jsx";
import DeckSelect from "./DeckSelect.jsx";

export default function Board({ gameState, socket}) {
    const [menuState, setMenuState] = useState(null)
    const [viewingZone, setViewingZone] = useState(null)
    const [deckSelect, setDeckSelect] = useState(null)

    const handleContextMenu = (e, cardId) => {
        console.log("context menu")
        e.preventDefault();

        const x = e.x || e.clientX;
        const y = e.y || e.clientY;

        setMenuState({x, y, cardId});
    }

    const handleLibraryContextMenu = (e) => {
        e.preventDefault();
        setMenuState({
            x: e.clientX,
            y: e.clientY,
            cardId: "LIBRARY_MENU"
        });
    }

    const handleMenuAction = (action, payload) => {
        if(!menuState) return;

        if (action === "reset") {
            if(confirm("Are you sure you want to reset?")) {
                socket.emit("reset_game");
            }
        } else if(action === "shuffle") {
            socket.emit("shuffle");
        } else {
            const { cardId } = menuState;
            if (cardId !== "LIBRARY_MENU") {
                performMove(cardId, action, payload);
            }
        }
        setMenuState(null)
    }

    const performMove= (cardId, action, payload) => {
        if (action === 'tap') {
            const card = gameState.board.find(card => card.id === cardId);
            const newRot = card.rotation === 0 ? 90 : 0;
            socket.emit("card_update", {id: cardId, changes: { rotation: newRot }});
        } else if (action === 'top') {
            socket.emit('move_zone', {cardId, targetZone: 'library', position: 'top'})
        } else  if (action === 'bottom') {
            socket.emit('move_zone', {cardId, targetZone: 'library', position: 'bottom'})
        } else if( action === 'position') {
            socket.emit('move_zone', {cardId, targetZone: 'library', position: payload})
        } else {
            socket.emit('move_zone', {cardId, targetZone: action})
        }
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
                backgroundImage: "url(/background.png)",
                backgroundSize: "cover",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <div
            style={{
                position: "absolute",
                right: '10px',
                top: '7%',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                zIndex: 100
            }}>
                <div onClick={() => {setViewingZone('library')}} style={{
                    width: '210px',
                    aspectRatio: '63/88',
                    border: '2px dashed white',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: 'white',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    usrSelect: 'none',
                    backgroundImage: 'url(/card-back.jpg)',
                    backgroundSize: 'cover',
                    fontWeight: 'bold',
                    fontSize: '20px',
                }}
                onContextMenu={handleLibraryContextMenu}>
                    <br/>
                </div>
                <div onClick={() => {setViewingZone('graveyard')}} style={zoneStyle}>
                    Graveyard
                </div>
                <div onClick={() => {setViewingZone('exile')}} style={zoneStyle}>
                    Exile
                </div>
            </div>
            {gameState.board.map((card) => (
                <Card key={card.id} data={card} socket={socket} onContextMenu={handleContextMenu} />
            ))}
            {gameState.commander.map((card) => (
                <Card key={card.id} data={card} socket={socket} onContextMenu={handleContextMenu} />
            ))}
            {gameState.tokenBoard && gameState.tokenBoard.map((card) => (
                <Card
                    key={card.id} // FIX: Add unique Key
                    data={card}
                    socket={socket}
                    onContextMenu={handleContextMenu}
                />
            ))}
            {menuState && (
                <ContextMenu
                    x={menuState.x}
                    y={menuState.y}
                    onAction={handleMenuAction}
                    onClose={() => {setMenuState(null)}}
                    options = {menuState.cardId === "LIBRARY_MENU" ? [
                        {label: "Shuffle Library", action: "shuffle"},
                        {label: "Reset Game", action: "reset"},
                    ] : undefined}
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
        </div>
    )
}

const zoneStyle = {
    width: '210px',
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