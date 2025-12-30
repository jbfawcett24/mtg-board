import { motion } from "framer-motion";
import {useRef} from "react";
import {useMotionTemplate, useMotionValue, useSpring, useTransform} from "framer-motion";

export default function DeckSelect({onDeckSelect, deckList, onClose}) {
    const handleClick = (deckName) => {
        console.log(deckName);

        onDeckSelect(deckName);
        onClose();
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
            padding: "20px",
        }}
        onClick={() => {onClose()}}
        >
            <ul
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                }}
            >
                {deckList.map((deck, index) => (
                    <HoloCard key={index} name={deck.name} imgPath={deck.imageUrl} onDeckSelect={handleClick} />
                ))}
            </ul>
        </div>
    )
}

function HoloCard({imgPath, name, onDeckSelect}) {
    const ref = useRef(null);

    const dragOrigin = useRef({x: 0, y: 0});

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const xSpring = useSpring(x, { stiffness: 300, damping: 30});
    const ySpring = useSpring(y, { stiffness: 300, damping: 30});

    const rotateX = useTransform(ySpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(xSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    const glareX = useTransform(xSpring, [-0.5, 0.5], ["100%", "0%"]);
    const glareY = useTransform(ySpring, [-0.5, 0.5], ["100%", "0%"]);

    const glareBackground = useMotionTemplate`radial-gradient(
        circle at ${glareX} ${glareY},
        rgba(255, 255, 255, 0.7) 0%,
        rgba(255, 255, 255, 0.4) 20%, 
        transparent 100%
    )`;

    const handlePointerDown = (e) => {
        dragOrigin.current = {x: e.clientX, y: e.clientY};
    }

    const handleClick = (e) => {
        const distanceX = Math.abs(e.clientX - dragOrigin.current.x);
        const distanceY = Math.abs(e.clientY - dragOrigin.current.y);
        const threshold = 15;

        if (distanceX < threshold && distanceY < threshold) {
            if (onDeckSelect) onDeckSelect(name);
        }
    }

    const handleMouseMove = (e) => {
        if(!ref.current) return;

        const rect = ref.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPercent = (mouseX / width) - 0.5;
        const yPercent = (mouseY / height) - 0.5;

        x.set(xPercent);
        y.set(yPercent);
    }

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            ref={ref}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
            onPointerMove={handleMouseMove}
            onPointerLeave={handleMouseLeave}
            style={styles.cardContainer}
        >
            <motion.div
                style={{...styles.cardInner,
                rotateX,
                rotateY,}}
            >
                 <img
                    src={imgPath}
                    alt={name}
                    style={styles.cardImage}
                 />
                <motion.div
                style={{...styles.glareLayer,
                background: glareBackground}}/>
                <div style={styles.borderLayer}/>
            </motion.div>
        </motion.div>
    )
}

const styles = {
    cardContainer: {
        width: "210px",
        height: "294px",
        position: "relative",
        borderRadius: "12px", // rounded-xl
        backgroundColor: "transparent", // bg-gray-900
        perspective: "1000px",
        touchAction: "none",
        cursor: "pointer",
        margin: "10px"
    },
    cardInner: {
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: "12px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", // shadow-xl
        overflow: "hidden",
        transformStyle: "preserve-3d",
    },
    cardImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        pointerEvents: "none",
        display: "block",
        position: "relative",
        zIndex: 2001,
    },
    glareLayer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: "none",
        borderRadius: "12px",
        opacity: 1,
        mixBlendMode: "overlay",
    },
    borderLayer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        border: "2px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        pointerEvents: "none",
    }
};