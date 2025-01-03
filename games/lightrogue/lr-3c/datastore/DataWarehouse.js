// DataWarehouse.js - Core data warehouse system with cloud preparation
export class DataWarehouse {
    constructor() {
        this.localStore = new LocalDataStore();
        this.cloudStore = null; // Will be initialized when cloud is ready
        this.isCloudEnabled = false;
    }

    // Initialize the data warehouse
    async initialize() {
        await this.localStore.initialize();
        // Cloud initialization will be added later
        return true;
    }

    // Save high score with metadata
    async saveHighScore(score, metadata) {
        const scoreData = {
            score: score,
            timestamp: new Date().toISOString(),
            userId: metadata.userId || 'anonymous',
            gameVersion: metadata.gameVersion || '1.0',
            sessionId: metadata.sessionId,
            gameMode: metadata.gameMode || 'standard',
            difficulty: metadata.difficulty || 'normal',
            achievements: metadata.achievements || [],
            stats: metadata.stats || {},
            platform: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform
            }
        };

        // Always save locally
        await this.localStore.saveHighScore(scoreData);

        // If cloud is enabled, save there too (future implementation)
        if (this.isCloudEnabled && this.cloudStore) {
            try {
                await this.cloudStore.saveHighScore(scoreData);
            } catch (error) {
                console.error('Cloud save failed:', error);
                // Continue with local save only
            }
        }

        return true;
    }

    // Get high scores with optional filters
    async getHighScores(filters = {}) {
        // Get local scores
        const localScores = await this.localStore.getHighScores(filters);

        // In future: merge with cloud scores if available
        if (this.isCloudEnabled && this.cloudStore) {
            try {
                const cloudScores = await this.cloudStore.getHighScores(filters);
                return this.mergeScores(localScores, cloudScores);
            } catch (error) {
                console.error('Cloud fetch failed:', error);
            }
        }

        return localScores;
    }

    // Get player statistics
    async getPlayerStats(userId) {
        const localStats = await this.localStore.getPlayerStats(userId);

        if (this.isCloudEnabled && this.cloudStore) {
            try {
                const cloudStats = await this.cloudStore.getPlayerStats(userId);
                return this.mergeStats(localStats, cloudStats);
            } catch (error) {
                console.error('Cloud stats fetch failed:', error);
            }
        }

        return localStats;
    }

    // Merge scores from different sources
    mergeScores(localScores, cloudScores = []) {
        const allScores = [...localScores, ...cloudScores];
        return allScores
            .sort((a, b) => b.score - a.score)
            .filter((score, index, self) => 
                index === self.findIndex(s => s.sessionId === score.sessionId)
            );
    }

    // Merge player statistics
    mergeStats(localStats, cloudStats = {}) {
        return {
            ...localStats,
            ...cloudStats,
            totalGames: (localStats.totalGames || 0) + (cloudStats.totalGames || 0),
            totalScore: (localStats.totalScore || 0) + (cloudStats.totalScore || 0),
            achievements: [...new Set([
                ...(localStats.achievements || []),
                ...(cloudStats.achievements || [])
            ])]
        };
    }

    // Prepare for cloud migration (future use)
    async prepareCloudMigration() {
        const allLocalData = await this.localStore.getAllData();
        return {
            scores: allLocalData.scores,
            stats: allLocalData.stats,
            metadata: {
                exportDate: new Date().toISOString(),
                totalRecords: allLocalData.scores.length,
                schemaVersion: '1.0'
            }
        };
    }
}

// Local data store implementation
class LocalDataStore {
    constructor() {
        this.dbName = 'lightRogueDB';
        this.dbVersion = 1;
        this.db = null;
    }

    // Initialize IndexedDB
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create scores store
                if (!db.objectStoreNames.contains('scores')) {
                    const scoresStore = db.createObjectStore('scores', { keyPath: 'sessionId' });
                    scoresStore.createIndex('byScore', 'score');
                    scoresStore.createIndex('byTimestamp', 'timestamp');
                    scoresStore.createIndex('byUserId', 'userId');
                }

                // Create stats store
                if (!db.objectStoreNames.contains('stats')) {
                    const statsStore = db.createObjectStore('stats', { keyPath: 'userId' });
                    statsStore.createIndex('byTotalGames', 'totalGames');
                }
            };
        });
    }

    // Save high score
    async saveHighScore(scoreData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['scores', 'stats'], 'readwrite');
            const scoresStore = transaction.objectStore('scores');
            const statsStore = transaction.objectStore('stats');

            // Save score
            scoresStore.put(scoreData);

            // Update stats
            const statsRequest = statsStore.get(scoreData.userId);
            statsRequest.onsuccess = () => {
                const stats = statsRequest.result || {
                    userId: scoreData.userId,
                    totalGames: 0,
                    totalScore: 0,
                    highestScore: 0,
                    achievements: []
                };

                stats.totalGames++;
                stats.totalScore += scoreData.score;
                stats.highestScore = Math.max(stats.highestScore, scoreData.score);
                stats.achievements = [...new Set([...stats.achievements, ...scoreData.achievements])];

                statsStore.put(stats);
            };

            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Get high scores
    async getHighScores(filters = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['scores'], 'readonly');
            const store = transaction.objectStore('scores');
            const request = store.index('byScore').openCursor(null, 'prev');
            const scores = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const score = cursor.value;
                    if (this.matchesFilters(score, filters)) {
                        scores.push(score);
                    }
                    cursor.continue();
                } else {
                    resolve(scores);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Get player statistics
    async getPlayerStats(userId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['stats'], 'readonly');
            const store = transaction.objectStore('stats');
            const request = store.get(userId);

            request.onsuccess = () => resolve(request.result || {
                userId,
                totalGames: 0,
                totalScore: 0,
                highestScore: 0,
                achievements: []
            });

            request.onerror = () => reject(request.error);
        });
    }

    // Get all data for migration
    async getAllData() {
        const scores = await this.getHighScores();
        const stats = await this.getAllStats();
        return { scores, stats };
    }

    // Get all player statistics
    async getAllStats() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['stats'], 'readonly');
            const store = transaction.objectStore('stats');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Check if score matches filters
    matchesFilters(score, filters) {
        return Object.entries(filters).every(([key, value]) => {
            if (Array.isArray(value)) {
                return value.includes(score[key]);
            }
            return !value || score[key] === value;
        });
    }
}

// Export singleton instance
export const dataWarehouse = new DataWarehouse();
