# Light Rogue Data Warehouse System

## Overview
This data warehouse system is designed to handle game data storage with a focus on high scores and player statistics. It's built to work locally now while being prepared for future cloud integration.

## Features
- Local data storage using IndexedDB
- Prepared for cloud integration (February 2025)
- High score tracking with detailed metadata
- Player statistics and achievements
- Filtering and querying capabilities
- Data migration preparation

## Usage

### Initialize the Data Warehouse
```javascript
import { dataWarehouse } from './datastore/DataWarehouse.js';

await dataWarehouse.initialize();
```

### Save High Score
```javascript
await dataWarehouse.saveHighScore(score, {
    userId: 'player123',
    gameVersion: '1.0',
    sessionId: 'unique-session-id',
    gameMode: 'standard',
    difficulty: 'normal',
    achievements: ['firstBlood', 'comboMaster'],
    stats: {
        accuracy: 85,
        timePlayedMs: 300000,
        zombiesKilled: 50
    }
});
```

### Get High Scores
```javascript
// Get all high scores
const allScores = await dataWarehouse.getHighScores();

// Get filtered high scores
const filteredScores = await dataWarehouse.getHighScores({
    gameMode: 'standard',
    difficulty: 'normal'
});
```

### Get Player Stats
```javascript
const stats = await dataWarehouse.getPlayerStats('player123');
```

## Data Schema

### High Score Entry
```javascript
{
    score: number,
    timestamp: string,
    userId: string,
    gameVersion: string,
    sessionId: string,
    gameMode: string,
    difficulty: string,
    achievements: string[],
    stats: {
        accuracy: number,
        timePlayedMs: number,
        zombiesKilled: number,
        // ... other game-specific stats
    },
    platform: {
        userAgent: string,
        language: string,
        platform: string
    }
}
```

### Player Stats
```javascript
{
    userId: string,
    totalGames: number,
    totalScore: number,
    highestScore: number,
    achievements: string[]
}
```

## Future Cloud Integration
The system is designed to be cloud-ready with:
- Data migration utilities
- Cloud/local data merging strategies
- Offline-first capabilities
- Conflict resolution handling

Cloud integration will be implemented in February 2025 with minimal changes to the existing API.
