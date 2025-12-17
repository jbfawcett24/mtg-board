import { useRef } from "react"

export default function useLongPress({ onLongPress, onTap, delay = 500 }) {
    const timerRef = useRef(null);
    const isLongPress = useRef(false);
    const startPos = useRef({x: 0, y: 0});
    const isScrolling = useRef(false);

    const start = (event) => {
        isLongPress.current = false;
        isScrolling.current = false;

        if(event.touches) {
            startPos.current = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        }

        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            onLongPress && onLongPress();
        }, delay);
    };

    const move = (event) => {
        if(isScrolling.current) {
            return;
        }

        if(event.touches) {
            const x = event.touches[0].clientX;
            const y = event.touches[0].clientY;

            const diffX = Math.abs(x - startPos.current.x);
            const diffY = Math.abs(y - startPos.current.y);

            if(diffX > 10 || diffY > 10) {
                isScrolling.current = true;

                if(timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
            }
        }
    }

    const stop = (event) => {
        if(timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if(event.type === "touchend") {
            event.preventDefault();
        }

        if(!isLongPress.current && !isScrolling.current) {
            onTap && onTap();
        }
    }

    return {
        onMouseDown: start,
        onMouseUp: stop,
        onMouseLeave: stop,
        onTouchStart: start,
        onTouchEnd: stop,
        onTouchMove: move,
    }
}