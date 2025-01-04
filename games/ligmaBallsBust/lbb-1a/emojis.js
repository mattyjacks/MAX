const fs = require('fs');

function loadEmojis() {
    const data = fs.readFileSync('emoji-list.csv', 'utf8');
    const lines = data.split('\n');
    const emojis = lines.map(line => line.split(',')[1]).filter(Boolean);
    return emojis;
}

function startGame() {
    const emojis = loadEmojis();
    const usedEmojis = new Set();
    let score = 0;
    const startTime = Date.now();

    // Game logic to collect emojis
    function collectEmoji(emoji) {
        if (!usedEmojis.has(emoji)) {
            usedEmojis.add(emoji);
            score++;
            document.getElementById('score').innerText = `Score: ${score}`;
            if (score === emojis.length) {
                const endTime = Date.now();
                alert(`You collected all emojis in ${(endTime - startTime) / 1000} seconds!`);
            }
        }
    }

    // Example of collecting an emoji
    collectEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
}

startGame();