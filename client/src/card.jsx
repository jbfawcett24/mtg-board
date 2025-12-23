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
        setRotation(data.rotation);
    }, [data.rotation, data.zIndex]);

    const handleTap = () => {

        if (isDragging.current) return;

        const newRotation = rotation === 0 ? 90 : 0;
        setRotation(newRotation);

        socket.emit('card_update', {
            id: data.id,
            changes: {
                rotation: newRotation,
            }
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

            // Move all drag/animation props to this wrapper div
            initial={{ x: data.x, y: data.y, rotate: data.rotation }}
            animate={{ rotate: rotation }}

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
                if (onContextMenu) onContextMenu(e, data.id);
            }}

            onTap={handleTap}

            style={{
                position: "absolute",
                width: "150px",
                zIndex: zIndex,
                cursor: "grab",
                // Ensure the div wraps tight around the content
                display: "inline-block"
            }}
        >
            {/* 1. The Card Image */}
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