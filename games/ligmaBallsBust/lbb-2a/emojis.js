import { emojiList } from './emojiList.js';

export function getRandomEmoji() {
    return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function startGame() {
    const usedEmojiIds = new Set();
    let score = 0;
    const startTime = Date.now();

    // Game logic to collect emojis
    function collectEmoji(emojiObj) {
        if (!usedEmojiIds.has(emojiObj.id)) {
            usedEmojiIds.add(emojiObj.id);
            score++;
            document.getElementById('score').innerText = `Score: ${score}`;
            if (score === emojiList.length) {
                const endTime = Date.now();
                alert(`You collected all emojis in ${(endTime - startTime) / 1000} seconds!`);
            }
        }
    }

    return {
        collectEmoji,
        getCollectedCount: () => usedEmojiIds.size,
        getTotalCount: () => emojiList.length
    };
}