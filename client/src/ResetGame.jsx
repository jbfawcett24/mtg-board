import {motion} from "framer-motion"

export default function Popup({ onClose, content }) {
    return (
        <motion.div
            onClick={() => {onClose()}}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 4999,
                backgroundColor: "rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <motion.div
                initial={{y: -100, opacity: 0}}
                animate={{y: 0, opacity: 1}}
                exit={{y: 100, opacity: 0}}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => {e.stopPropagation()}}
                style={{
                    width: "300px",
                    margin: "auto",
                    backgroundColor: "#222",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                }}
            >
                {content}
            </motion.div>
        </motion.div>
    )
}