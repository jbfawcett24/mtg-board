import {motion, AnimatePresence} from "framer-motion";
import {useState} from "react";

export default function CounterSelector({onClose, onSubmit}) {
    const [power, setPower] = useState(1);
    const [toughness, setToughness] = useState(1);


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

            }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-evenly",
                        color: "white"
                    }}
                >
                    <StatController
                        label={"Power"}
                        value={power}
                        setValue={setPower}
                    />
                    <StatController
                        label={"Toughness"}
                        value={toughness}
                        setValue={setToughness}
                    />
                </div>
                {/*Two numbers, power and toughness, with plus and minus buttons*/}
                <motion.button
                    whileTap={{scale: 0.9, backgroundColor: "#222",}}
                    onClick={() => {onSubmit(power, toughness)}}
                    style={{
                        backgroundColor: "#333",
                        color: "white",
                        margin: "5px"
                    }}
                >Add Counters</motion.button>
            </motion.div>
        </motion.div>
    )
}

const StatController = ({label, value, setValue}) => {
    return (
        <div
            style={{
                minWidth: "110px",
                margin: "10px"
            }}
        >
            <h3
                style={{margin:"auto"}}
            >{label}</h3>
            <div
                style={{
                    display: "flex",
                    alignItems: "center"
                }}
            >
            <motion.button
                whileTap={{scale: 0.9}}
                onClick={() => {setValue((prev) => prev - 1)}}
                style={{
                    backgroundColor: "#333",
                    color: "white",
                    width: "40px",
                    height: "40px",
                    textAlign: "center",
                    padding: 0
                }}
            >-</motion.button>
            <p
                style={{
                    minWidth: "20px",
                    textAlign: "center"
                }}
            >{value}</p>
            <motion.button
                whileTap={{scale: 0.9, backgroundColor: "#222", color: "white"}}
                onClick={() => {setValue((prev) => prev + 1)}}
                style={{
                    backgroundColor: "#333",
                    color: "white",
                    width: "40px",
                    height: "40px",
                    textAlign: "center",
                    padding: 0
                }}
            >+</motion.button>
            </div>
        </div>
    )
}