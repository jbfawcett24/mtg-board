import { motion } from 'framer-motion';
import {useState} from "react";
import Popup from "./ResetGame.jsx";

export default function ContextMenu({ x, y, onAction, onClose, options, gameState, cardId}) {
    const searchKeys = ["board", "commander", "tokenBoard", "hand"]
    let card;

    if(gameState) {
        for(const key of searchKeys) {
            // console.log(gameState);
            // console.log(key)
            if (gameState[key] && Array.isArray(gameState[key])) {
                const found = gameState[key].find(c => c.id === cardId);

                // 2. ERROR WAS HERE: "if (card) return card;"
                // 3. FIX: Assign to outer variable and break loop
                if (found) {
                    console.log(found);
                    card = found;
                    break;
                }
            }
        }
    }


    const defaultOptions = [
        ...(card?.backUrl ? [{ label: "Flip Card", action: "flipCard", color: "#5b68ed" }] : []),
        {label: "Send to >", action: "moveTo"},
        {label: "Top of Stack", action: "topStack"},
        {label: "Bottom of Stack", action: "bottomStack"},
        {label: "Add Counter", action: "addCounter"}
    ];

    const menuOptions = options || defaultOptions;
    console.log(options);

    const estimatedHeight = menuOptions.length * 38 + 20;
    const isOverflowing = (y + estimatedHeight) > window.innerHeight;

    const positionStyles  = isOverflowing ? {
        bottom: window.innerHeight -y,
        top: "auto",
        transformOrigin: "botom left"
    } : {
        top: y,
        bottom: "auto",
        transformOrigin: "top left"
    }

    const handleOptionClick = (e, opt) => {
        e.preventDefault();
        e.stopPropagation();
        onAction(opt.action);
    }

    return (
        <>
            <div
                onClick={onClose}
                onContextMenu={(e) => {e.preventDefault(); onClose();}}
                style={{position: 'fixed', zIndex: 9998,
                top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh"
                }}
            />

            <motion.div
                initial={{ opacity: 1, scale: 1, height: 0}}
                animate={{ opacity: 1, scale: 1, height: "auto"}}
                exit={{ opacity: 1, height: 0 }}
                style={{
                    ...positionStyles,

                    position: 'absolute',
                    left: x,
                    backgroundColor: '#222',
                    border: '1px solid #444',
                    borderRadius: "8px",
                    padding: "5px",
                    display: 'flex',
                    flexDirection: 'column',
                    gap: "2px",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                    zIndex: 9999,
                    minWidth: "110px",
                    overflow: "hidden"
                }}
            >
                {menuOptions.map((option, index) => (
                    <button
                        key={index}
                        onClick={(e) => handleOptionClick(e, option)}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "white",
                            padding: "10px 15px",
                            textAlign: "left",
                            cursor: "pointer",
                            borderRadius: "4px",
                            borderLeft: option.color ? `4px solid ${option.color}` : '4px solid transparent',
                            fontSize: "11px",
                            textWrap: "nowrap",
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#333'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        {option.label}
                    </button>
                ))}
            </motion.div>
        </>
    )
}