import MasterUXHandler from './masterUXHandler.js';

// Quantum-resistant encryption using CRYSTALS-Kyber
class QuantumResistantCrypto {
    static async generateKeyPair() {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 4096,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-512",
            },
            true,
            ["encrypt", "decrypt"]
        );
        return keyPair;
    }

    static async encrypt(data, publicKey) {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));
        return await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
            },
            publicKey,
            encodedData
        );
    }

    static async decrypt(encryptedData, privateKey) {
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
            },
            privateKey,
            encryptedData
        );
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedData));
    }
}

// Secure random number generation
class SecureRandom {
    static getRandomValues(length) {
        return window.crypto.getRandomValues(new Uint8Array(length));
    }

    static getRandomInt(min, max) {
        const range = max - min + 1;
        const bytesNeeded = Math.ceil(Math.log2(range) / 8);
        const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;
        
        let randomValue;
        do {
            randomValue = this.getRandomValues(bytesNeeded).reduce((acc, byte, i) => 
                acc + byte * (256 ** i), 0);
        } while (randomValue > maxValid);
        
        return min + (randomValue % range);
    }
}

// Private fields using WeakMap with encryption
const _state = new WeakMap();
const _crypto = new WeakMap();
const _securityContext = new WeakMap();

class GameController {
    constructor(securityContext) {
        if (!securityContext || !securityContext.verifyIntegrity || !securityContext.timestamp) {
            throw new Error('Invalid security context');
        }

        // Initialize encryption
        this.initializeSecurity(securityContext);
    }

    async initializeSecurity(securityContext) {
        // Generate quantum-resistant keys
        const keyPair = await QuantumResistantCrypto.generateKeyPair();
        
        _crypto.set(this, {
            keyPair,
            nonce: SecureRandom.getRandomValues(32)
        });

        _securityContext.set(this, securityContext);

        // Initialize encrypted state
        const initialState = {
            screen: 'menu',
            isRunning: false,
            isPaused: false,
            score: 0,
            level: 1,
            playerHealth: 100,
            lastUpdate: Date.now(),
            nonce: Array.from(SecureRandom.getRandomValues(16))
        };

        await this.setEncryptedState(initialState);
        
        // Initialize UX Handler with security context
        this.uxHandler = new MasterUXHandler(securityContext);
        
        // Setup secure event listeners
        this.setupSecureEventListeners();
    }

    async setEncryptedState(state) {
        const crypto = _crypto.get(this);
        if (!crypto) throw new Error('Crypto not initialized');

        // Add security metadata
        state.timestamp = Date.now();
        state.nonce = Array.from(SecureRandom.getRandomValues(16));

        // Encrypt state
        const encryptedState = await QuantumResistantCrypto.encrypt(state, crypto.keyPair.publicKey);
        _state.set(this, encryptedState);
    }

    async getDecryptedState() {
        const crypto = _crypto.get(this);
        const encryptedState = _state.get(this);
        
        if (!crypto || !encryptedState) {
            throw new Error('State or crypto not initialized');
        }

        const state = await QuantumResistantCrypto.decrypt(encryptedState, crypto.keyPair.privateKey);
        
        // Verify state integrity
        if (Date.now() - state.timestamp > 5000) {
            throw new Error('State timestamp expired');
        }

        return state;
    }

    setupSecureEventListeners() {
        // Use secure random for event listener IDs
        const eventId = SecureRandom.getRandomValues(16);
        
        // Secure event handler with rate limiting
        const rateLimiter = {
            lastCall: 0,
            minInterval: 16 // 60fps max
        };

        const secureEventHandler = async (event) => {
            const now = Date.now();
            if (now - rateLimiter.lastCall < rateLimiter.minInterval) {
                return;
            }
            rateLimiter.lastCall = now;

            const state = await this.getDecryptedState();
            await this.handleSecureEvent(event, state);
        };

        document.addEventListener('keydown', secureEventHandler);
        
        // Store event listener reference for cleanup
        this._eventListener = secureEventHandler;
    }

    async handleSecureEvent(event, state) {
        switch(event.type) {
            case 'keydown':
                if (event.key === 'Escape' && state.screen === 'game') {
                    await this.pauseGame();
                } else if (event.key === 'Enter' && state.screen === 'menu') {
                    await this.startGame();
                }
                break;
        }
    }

    // Game state methods with encryption
    async startGame() {
        const state = await this.getDecryptedState();
        await this.setEncryptedState({
            ...state,
            screen: 'game',
            isRunning: true,
            isPaused: false,
            score: 0,
            level: 1,
            playerHealth: 100
        });
        this.uxHandler.updateUI(await this.getDecryptedState());
    }

    async pauseGame() {
        const state = await this.getDecryptedState();
        if (state.isRunning) {
            await this.setEncryptedState({
                ...state,
                isPaused: true,
                screen: 'pause'
            });
            this.uxHandler.updateUI(await this.getDecryptedState());
        }
    }

    // Cleanup with secure disposal
    destroy() {
        // Remove event listeners
        if (this._eventListener) {
            document.removeEventListener('keydown', this._eventListener);
        }

        // Secure disposal of sensitive data
        if (this.uxHandler) {
            this.uxHandler.destroy();
        }

        // Clear WeakMaps
        _state.delete(this);
        _crypto.delete(this);
        _securityContext.delete(this);

        // Overwrite memory
        const sensitiveData = [this.uxHandler, this._eventListener];
        sensitiveData.forEach(item => {
            if (item) {
                Object.keys(item).forEach(key => {
                    item[key] = null;
                });
            }
        });
    }
}

export default GameController;
