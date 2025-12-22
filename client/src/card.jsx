import { motion } from 'framer-motion';
import { useState, useEffect, useRef} from 'react';
import useLongPress from "./useLongPress.js";

export default function Card({ data, socket, onContextMenu }) {
    const [rotation, setRotation] = useState(data.rotation || 0);
    const [zIndex, setZIndex] = useState(0);

    const isDragging = useRef(false);

    useEffect(() => {
        console.log(data);
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

    return (
        <motion.img
            src={data.imageUrl}
            alt={data.name}

            {...gestureBind}

            initial={{x: data.x, y: data.y, rotate: data.rotation}}
            animate={{rotate: rotation}}

            drag
            dragMomentum={false}

            whileDrag={{scale: 1.1}}
            whileTap={{scale: 1.1}}

            onDragStart={() => {
                isDragging.current = true;
                setZIndex(100)
            }}
            onDragEnd={(event) => {
                setZIndex(data.zIndex);

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

            style={{position: "absolute", width: "210px", borderRadius: "8px", cursor: "grab", zIndex: zIndex}}

            onTap={handleTap}
        />
    )
}