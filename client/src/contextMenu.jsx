import { motion } from 'framer-motion';

export default function ContextMenu({ x, y, onAction, onClose, options}) {
    const defaultOptions = [
        {label: "Tap/ Untap", action: "tap"},
        {label: "Return to Hand", action: "hand"},
        {label: "Send to Graveyard", action: "graveyard"},
        {label: "Exile", action: "exile"},
        {label: "Play to Board", action: "board"},
        {label: "Top of library", action: "top"},
        {label: "X from Top of library", action: "position"},
        {label: "Bottom of library", action: "bottom"},
    ];

    const menuOptions = options || defaultOptions;

    const handleOptionClick = (opt) => {
        let finalAction = opt.action;
        let payload = null

        if (opt.action === "position") {
            const input = window.prompt("Enter position from the top");
            if (input === null) return;
            payload = parseInt(input);
            console.log(payload);
            if(isNaN(payload)) return;
        }

        onAction(finalAction, payload);
    }

    return (
        <>
            <div
                onClick={onClose}
                onContextMenu={(e) => {e.preventDefault(); onClose();}}
                style={{position: 'fixed', zIndex: 9998}}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9}}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'absolute',
                    top: y,
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
                    minWidth: "160px"
                }}
            >
                {menuOptions.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleOptionClick(option)}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "white",
                            padding: "10px 15px",
                            textAlign: "left",
                            cursor: "pointer",
                            borderRadius: "4px",
                            borderLeft: option.color ? `4px solid ${option.color}` : '4px solid transparent',
                            fontSize: "14px",
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