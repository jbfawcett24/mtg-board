export function drawCard(session) {
    if (session.gameState.library.length === 0) return null;

    const card = session.gameState.library.pop();
    session.gameState.hand.push(card);
    return card;
}