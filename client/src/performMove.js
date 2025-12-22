export     const performMove= (cardId, action, payload) => {
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