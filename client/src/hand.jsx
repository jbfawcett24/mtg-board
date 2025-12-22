import {AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform} from "framer-motion";
import useLongPress from "./useLongPress.js";
import {useRef, useState} from "react";
import ContextMenu from "./contextMenu.jsx";

export default function Hand({ gameState, socket }) {
    const [zoomedCardId, setZoomedCardId] = useState(null);
    const [viewMode, setViewMode] = useState('hand');
    const [menu, setMenu] = useState(null);

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

    const handleAction = (action, payload) => {
        console.log(action, payload);
        performMove(zoomedCardId, action, payload);
        setMenu(null);
        setZoomedCardId(null);
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

    return (
        <div
            style={{
                background: "url(background.jpg)",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center center",
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
                    overflow: zoomedCardId ? "hidden" : "auto",
                }}
            >
                <AnimatePresence>
                {   viewMode === 'hand' ? (
                    gameState.hand.map((card, index) =>(
                        <CardItem key={index} card={card} onPlay={playCard} onZoom={handleLongPress} isZoomed={zoomedCardId === card.id} />
                    )))
                : gameState.tokenList.map((token, index) => (
                    <CardItem key={index} card={token} onPlay={playToken} onZoom={handleLongPress} isZoomed={zoomedCardId === token.id} />
                    ))}
                <div style={{minWidth: '150px', height: '1px'}}/>
                </AnimatePresence>
            </div>
            {zoomedCardId && (
                <div
                    onClick={() => setZoomedCardId(null)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.8)",
                        zIndex: 998,
                        touchAction: "none",
                    }}
                />
            )}
            {zoomedCardId ?
                <motion.button
                    whileTap={{scale: 0.9}}
                    onClick={() => {setMenu(zoomedCardId)}}
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
                    Action
                </motion.button>
                :
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
            }
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
            <AnimatePresence>
                {menu && (
                    <ContextMenu
                        x={window.innerWidth - 200}
                        y={window.innerHeight - 450}
                        onClose={() => {setMenu(null)}}
                        onAction={handleAction}
                    />
            )}
            </AnimatePresence>
        </div>
    )
}

function CardItem({ card, index, onPlay, onZoom, isZoomed }) {
    // --- 1. Holo Effect Logic ---
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Use springs for weight/physics
    const xSpring = useSpring(x, { stiffness: 300, damping: 30 });
    const ySpring = useSpring(y, { stiffness: 300, damping: 30 });

    // Transform spring values into rotation (Degrees)
    const rotateX = useTransform(ySpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(xSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    // Transform spring values into Glare position (%)
    // We invert the input range ["100%", "0%"] so glare moves opposite to tilt
    const glareX = useTransform(xSpring, [-0.5, 0.5], ["100%", "0%"]);
    const glareY = useTransform(ySpring, [-0.5, 0.5], ["100%", "0%"]);

    const glareBackground = useMotionTemplate`radial-gradient(
        circle at ${glareX} ${glareY},
        rgba(255, 255, 255, 0.7) 0%,
        rgba(255, 255, 255, 0.4) 20%, 
        transparent 100%
    )`;

    // --- 2. Event Handlers ---
    const gestureBind = useLongPress({
        onTap: () => onPlay(card.id),
        onLongPress: () => onZoom(card.id),
        delay: 500
    });

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = (mouseX / width) - 0.5;
        const yPct = (mouseY / height) - 0.5;
        x.set(xPct);
        y.set(yPct);
    }

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            // --- OUTER CONTAINER (Layout & Events) ---
            ref={ref}
            {...gestureBind} // Apply tap/long-press logic here
            onPointerMove={handleMouseMove} // Apply 3D tilt logic here
            onPointerLeave={handleMouseLeave}

            initial={{ y: 100, opacity: 0 }}
            animate={{
                y: isZoomed ? 20 : 0,
                scale: isZoomed ? 1.8 : 1,
                opacity: 1,
                zIndex: isZoomed ? 999 : index,
            }}
            exit={{ y:-100, opacity: 0 }}
            style={{
                minWidth: '200px',
                height: '280px',
                marginRight: "-120px",
                position: isZoomed ? "fixed" : "relative",
                ...(isZoomed ? { top: "25%", left: "25%" } : {}),
                // Perspective is vital for the 3D effect to look real
                perspective: "1000px",
                // We keep pan-x so the user can still scroll the hand horizontally
                touchAction: 'pan-x',
                cursor: 'pointer',
            }}
        >
            <motion.div
                // --- INNER CARD (Visuals & Rotation) ---
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: '12px',
                    boxShadow: '-5px 5px 15px rgba(0, 0, 0, 0.5)',

                    // Apply the background image here on the inner layer
                    backgroundImage: `url(${card.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: "#333",

                    // Apply 3D Rotations
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
            >
                {/* GLARE LAYER */}
                <motion.div
                    style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 10,
                        pointerEvents: "none",
                        borderRadius: "12px",
                        mixBlendMode: "overlay", // "overlay" for subtle, "screen" for shiny
                        background: glareBackground
                    }}
                />

                {/* BORDER LAYER (Optional, adds nice definition) */}
                <div
                    style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 20,
                        pointerEvents: "none",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.1)"
                    }}
                />
            </motion.div>
        </motion.div>
    )
}