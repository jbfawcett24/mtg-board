import { motion } from "framer-motion";
import useLongPress from "./useLongPress.js";
import {useRef, useState} from "react";

export default function Hand({ gameState, socket }) {
    const [zoomedCardId, setZoomedCardId] = useState(null);
    const [viewMode, setViewMode] = useState('hand')

    const isCoolDown = useRef(false);

    const playCard = (cardId) => {
        if(zoomedCardId) {
            setZoomedCardId(null);
            return;
        }

        if(isCoolDown.current) {
            console.log("CoolDown active - ignoring tap");
            return;
        }

        if (navigator.vibrate) navigator.vibrate(50);
        socket.emit("play_card", cardId);

        isCoolDown.current = true;

        setTimeout(() => {
            isCoolDown.current = false;
        }, 500);
    };

    const playToken = (tokenId) => {
        if(zoomedCardId) {
            setZoomedCardId(null);
            return;
        }

        if(isCoolDown.current) {
            console.log("CoolDown active - ignoring tap");
            return;
        }

        if (navigator.vibrate) navigator.vibrate(50);
        socket.emit("play_token", tokenId);

        isCoolDown.current = true;

        setTimeout(() => {
            isCoolDown.current = false;
        }, 500);
    }

    const handleLongPress = (cardId) => {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        setZoomedCardId(cardId);
    }

    return (
        <div
            style={{
                background: "#1a1a1a",
                height: "100vh",
                width: "100vw",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    height: "100%",
                    width: "100%",
                    overflowX: "auto",
                    paddingLeft: '50px',
                    paddingRight: '50px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >

                {   viewMode === 'hand' ? (
                    gameState.hand.map((card, index) =>(
                        <CardItem key={index} card={card} onPlay={playCard} onZoom={handleLongPress} isZoomed={zoomedCardId === card.id} />
                    )))
                : gameState.tokenList.map((token, index) => (
                    <CardItem key={index} card={token} onPlay={playToken} onZoom={handleLongPress} isZoomed={zoomedCardId === token.id} />
                    ))}
                <div style={{minWidth: '150px', height: '1px'}}/>
            </div>
            {zoomedCardId && (
                <div
                    onClick={() => setZoomedCardId(null)}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.8)",
                        zIndex: 998,
                    }}
                />
            )}
            <motion.button
                whileTap={{scale: 0.9}}
                onClick={() => {socket.emit('draw_card')}}
                style={{
                    position: "absolute",
                    bottom: "30px",
                    right: "30px",
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    backgroundColor: "#3498db",
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0,5)',
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "bold",
                    zIndex: 1000,
                    cursor: "pointer",
                }}
            >
                DRAW
                <br/>
                <span style={{ fontSize: '10px', opacity: 0.8}}>
                    ({gameState.library ? gameState.library.length : 0})
                </span>
            </motion.button>
            <motion.button
                whileTap={{scale: 0.9}}
                onClick={() => {setViewMode((prev) => prev === 'hand' ? 'token' : 'hand')}}
                style={{
                    position: "absolute",
                    bottom: "30px",
                    left: "30px",
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    backgroundColor: "#3498db",
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0,5)',
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "bold",
                    zIndex: 1000,
                    cursor: "pointer",
                }}
                >
                {viewMode === 'hand' ? "Tokens" : "Hand"}
            </motion.button>
        </div>
    )
}

function CardItem({ card, index, onPlay, onZoom, isZoomed }) {
    const gestureBind = useLongPress({
       onTap: () => onPlay(card.id),
       onLongPress: () => onZoom(card.id),
       delay: 500
    });

    return (
        <motion.div
            {...gestureBind}

            initial={{y:100, opacity:0}}
            animate={{
                y: isZoomed ? 20 : 0,
                scale: isZoomed ? 2 : 1,
                opacity:1,
                zIndex: isZoomed ? 999 : index,
            }}
            style={{
                minWidth: '200px',
                height: '280px',
                marginRight: "-120px",
                position: "relative",
                borderRadius: '12px',
                boxShadow: '-5px 5px 15px rgba(0, 0, 0, 0.5)',
                transformOrigin: 'bottom center',
                cursor: 'pointer',

                backgroundImage: `url(${card.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: "#333",
                touchAction: 'pan-x'
            }}
        />
    )
}