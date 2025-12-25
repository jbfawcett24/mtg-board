import { motion } from 'framer-motion';
import { useState, useEffect, useRef} from 'react';
import useLongPress from "./useLongPress.js";

export default function Card({ data, socket, onContextMenu }) {
    const [rotation, setRotation] = useState(data.rotation || 0);
    const [zIndex, setZIndex] = useState(0);

    const isDragging = useRef(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setZIndex(data.zIndex);

    }, [data.zIndex]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRotation(data.rotation);
    }, [data.rotation])

    const handleTap = (event) => {
        if (event) {
            if (event.preventDefault) event.preventDefault();
            if (event.stopPropagation) event.stopPropagation();
            if (event.nativeEvent) event.nativeEvent.stopImmediatePropagation();
        }

        console.log(event)

        if (isDragging.current) return;

        setRotation(prev => {
            const newRotation = prev === 0 ? 90 : 0;

            socket.emit('card_update', {
                id: data.id,
                changes: { rotation: newRotation }
            });

            return newRotation;
        });
    };

    const gestureBind = useLongPress({
        onTap: handleTap,
        onLongPress: (coords) => {
            if (onContextMenu) onContextMenu(coords, data.id);
        },
        delay: 500
    })

    const hasStats = data.power !== undefined || data.toughness !== undefined;

    return (
        <motion.div
            {...gestureBind}

            initial={{ x: data.x + 100, y: data.y + 100, rotate: data.rotation, opacity: 0 }}
            animate={{ rotate: rotation, opacity: 1 }}
            exit={{y: data.y - 100, rotate: 0, opacity: 0}}

            drag
            dragMomentum={false}

            whileDrag={{ scale: 1.1 }}
            whileTap={{ scale: 1.1 }}

            onDragStart={() => {
                isDragging.current = true;
                setZIndex(100)
            }}

            onDragEnd={(event) => {
                setZIndex(data.zIndex);

                // Because the Image has pointerEvents: none, event.target is this wrapper div.
                const rect = event.target.getBoundingClientRect();

                socket.emit('card_update', {
                    id: data.id,
                    changes: {
                        x: rect.x,
                        y: rect.y,
                    }
                })

                setTimeout(() => {
                    isDragging.current = false;
                }, 150);
            }}

            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onContextMenu) onContextMenu(e, data.id);
            }}

            style={{
                position: "absolute",
                width: "150px",
                zIndex: zIndex,
                cursor: "grab",
                // Ensure the div wraps tight around the content
                display: "inline-block",
                touchAction: "none",
                WebkitTapHighlightColor: "transparent",
                userSelect: "none",
                outline: "none",
            }}
        >
            {/* 1. The Card Image */}
            {data.backUrl ? <FlipCard data={data}/> :
                <img
                    src={data.imageUrl}
                    alt={data.name}
                    style={{
                        width: "100%",
                        borderRadius: "8px",
                        display: "block", // Removes tiny gap at bottom of images
                        // Prevent the browser's native ghost-image drag behavior
                        pointerEvents: "none",
                        userSelect: "none"
                    }}
                />
            }

            {/* 2. The Stats Overlay (Top Left) */}
            {hasStats && (
                <div style={{
                    position: "absolute",
                    top: "6px",
                    left: "6px",
                    backgroundColor: "rgba(0, 0, 0, 0.85)", // Dark semi-transparent background
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    border: "1px solid #666",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                    pointerEvents: "none" // Let clicks pass through to the card
                }}>
                    {data.power || 0}/{data.toughness || 0}
                </div>
            )}
        </motion.div>
    )
}

function FlipCard({ data }) {
    // Get isFlipped from the card data (sent from server)
    const isFlipped = data.isFlipped || false;

    return (
        <div style={{ width: '100%', height: '100%', perspective: '1000px',aspectRatio: '2.5 / 3.5', }}>
            <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                }}
            >
                {/* FRONT FACE */}
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    backgroundImage: `url(${data.imageUrl})`,
                    backgroundSize: 'cover',
                    borderRadius: '8px',
                }} />

                {/* BACK FACE */}
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    backgroundImage: `url(${data.backUrl})`,
                    backgroundSize: 'cover',
                    borderRadius: '8px',
                }} />
            </motion.div>
        </div>
    );
}