import { useState } from "react";
import ContextMenu from "./contextMenu.jsx";

export default function ZoneViewer({title, cards, onClose, onMove}) {
    const [menuState, setMenuState] = useState(null);
    const optionsByTitle = {
        LIBRARY: [
            { label: "Send to Hand", action: "hand" },
            { label: "Send to Graveyard", action: "graveyard" },
            { label: "Exile", action: "exile" },
            { label: "Play to Board", action: "board" },
            { label: "Top of library", action: "top" },
            { label: "X from Top of library", action: "position" },
            { label: "Bottom of library", action: "bottom" },
        ],
        GRAVEYARD: [
            { label: "Send to Hand", action: "hand" },
            { label: "Exile", action: "exile" },
            { label: "Play to Board", action: "board" },
            { label: "Top of library", action: "top" },
            { label: "X from Top of library", action: "position" },
            { label: "Bottom of library", action: "bottom" },
        ],
        EXILE: [
            { label: "Send to Hand", action: "hand" },
            { label: "Send to Graveyard", action: "graveyard" },
            { label: "Play to Board", action: "board" },
            { label: "Top of library", action: "top" },
            { label: "X from Top of library", action: "position" },
            { label: "Bottom of library", action: "bottom" },
        ],
    };

    const options = optionsByTitle[title];
    console.log(title);


    const handleContextMenu = (e, cardId) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuState({ x: e.clientX, y: e.clientY, cardId});
    }

    const handleMenuAction = (action, payload) => {
        if (!menuState) return;
        onMove(menuState.cardId, action, payload);
        setMenuState(null);
    }

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            zIndex: 2000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: '20px'
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: '1000px', color: "white", marginBototm: "20px" }}>
                <h2>{title} ({cards.length})</h2>
                <button onClick={onClose} style={{padding: '10px 20px', cursor: 'pointer', backgroundColor: '#e74c3c', border: 'none', color: 'white', borderRadius: '4px'}}>
                    Close
                </button>
            </div>

            <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                gap: '15px',
                justifyContent: "center",
                overflowY: 'auto',
                width: '100%',
                maxWidth: '1500px',
                paddingBottom: '50px',
            }}>
                {cards.map((card) => (
                    <div key={card.id}
                    onClick={(e) => handleContextMenu(e, card.id)}
                     onContextMenu={(e) => {handleContextMenu(e, card.id)}}
                    style={{position: 'relative'}}>
                        <img
                            src={card.imageUrl}
                            alt={card.name}
                            style={{width: '150px', borderRadius: '6px', cursor: 'context-menu'}}
                        />
                    </div>
                ))}
            </div>
            {menuState && (
                <ContextMenu
                    x={menuState.x}
                    y={menuState.y}
                    onAction={handleMenuAction}
                    onClose={() => {setMenuState(null)}}
                    options={options}
                />
            )}
        </div>
    )
}