// Enhanced Secure Storage Module

class SecureStorage {
    #encryptionKey = null;
    #storageProxy = null;
    #accessLog = new Map();
    #securityMonitor = null;

    constructor() {
        this.initializeStorage();
    }

    async initializeStorage() {
        // Generate encryption key
        this.#encryptionKey = await this.generateEncryptionKey();
        
        // Initialize components
        this.#securityMonitor = new StorageSecurityMonitor();
        
        // Setup storage protection
        this.setupStorageProtection();
    }

    async generateEncryptionKey() {
        return await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
    }

    setupStorageProtection() {
        // Create secure proxies for storage
        this.#storageProxy = {
            local: this.createStorageProxy(localStorage),
            session: this.createStorageProxy(sessionStorage)
        };

        // Replace native storage with secure proxies
        Object.defineProperty(window, 'localStorage', {
            get: () => this.#storageProxy.local,
            configurable: false,
            enumerable: false
        });

        Object.defineProperty(window, 'sessionStorage', {
            get: () => this.#storageProxy.session,
            configurable: false,
            enumerable: false
        });
    }

    createStorageProxy(storage) {
        const handler = {
            get: (target, prop) => {
                // Log access
                this.logAccess('read', prop);

                // Check for suspicious access
                if (this.#securityMonitor.isAccessSuspicious(prop)) {
                    this.handleSuspiciousAccess('read', prop);
                    return null;
                }

                if (typeof target[prop] === 'function') {
                    return (...args) => {
                        // Handle storage methods
                        switch(prop) {
                            case 'getItem':
                                return this.getItem(target, args[0]);
                            case 'setItem':
                                return this.setItem(target, args[0], args[1]);
                            case 'removeItem':
                                return this.removeItem(target, args[0]);
                            case 'clear':
                                return this.clear(target);
                            default:
                                return target[prop].apply(target, args);
                        }
                    };
                }

                // Handle direct property access
                return this.getItem(target, prop);
            },

            set: (target, prop, value) => {
                // Log access
                this.logAccess('write', prop);

                // Check for suspicious access
                if (this.#securityMonitor.isAccessSuspicious(prop)) {
                    this.handleSuspiciousAccess('write', prop);
                    return false;
                }

                // Set item with encryption
                this.setItem(target, prop, value);
                return true;
            },

            deleteProperty: (target, prop) => {
                // Log access
                this.logAccess('delete', prop);

                // Check for suspicious access
                if (this.#securityMonitor.isAccessSuspicious(prop)) {
                    this.handleSuspiciousAccess('delete', prop);
                    return false;
                }

                // Remove item
                this.removeItem(target, prop);
                return true;
            }
        };

        return new Proxy(storage, handler);
    }

    async getItem(storage, key) {
        try {
            const encryptedData = storage.getItem(key);
            if (!encryptedData) return null;

            // Parse encrypted data
            const { iv, data } = JSON.parse(encryptedData);

            // Convert base64 to array buffer
            const ivBuffer = this.base64ToArrayBuffer(iv);
            const dataBuffer = this.base64ToArrayBuffer(data);

            // Decrypt data
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: ivBuffer
                },
                this.#encryptionKey,
                dataBuffer
            );

            // Convert decrypted data to string
            const decoder = new TextDecoder();
            const decryptedString = decoder.decode(decryptedBuffer);

            return JSON.parse(decryptedString);
        } catch (error) {
            console.error('Failed to decrypt storage item:', error);
            return null;
        }
    }

    async setItem(storage, key, value) {
        try {
            // Convert value to string
            const valueString = JSON.stringify(value);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(valueString);

            // Generate IV
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // Encrypt data
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                this.#encryptionKey,
                dataBuffer
            );

            // Convert to base64
            const encryptedBase64 = this.arrayBufferToBase64(encryptedBuffer);
            const ivBase64 = this.arrayBufferToBase64(iv);

            // Store encrypted data
            const encryptedData = JSON.stringify({
                iv: ivBase64,
                data: encryptedBase64
            });

            storage.setItem(key, encryptedData);
        } catch (error) {
            console.error('Failed to encrypt storage item:', error);
            throw error;
        }
    }

    removeItem(storage, key) {
        try {
            storage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove storage item:', error);
            throw error;
        }
    }

    clear(storage) {
        try {
            storage.clear();
        } catch (error) {
            console.error('Failed to clear storage:', error);
            throw error;
        }
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    logAccess(type, key) {
        const access = {
            type,
            timestamp: Date.now(),
            stack: new Error().stack
        };

        if (!this.#accessLog.has(key)) {
            this.#accessLog.set(key, []);
        }

        const logs = this.#accessLog.get(key);
        logs.push(access);

        // Keep only last 100 access logs per key
        if (logs.length > 100) {
            logs.shift();
        }

        // Analyze access pattern
        this.#securityMonitor.analyzeAccess(key, access, logs);
    }

    handleSuspiciousAccess(type, key) {
        console.warn(`Suspicious storage access detected: ${type} on ${key}`);
        
        // Notify security monitor
        this.#securityMonitor.handleSuspiciousAccess(type, key);

        // Dispatch event for external handling
        window.dispatchEvent(new CustomEvent('storageSecurityBreach', {
            detail: { type, key }
        }));
    }
}

class StorageSecurityMonitor {
    #suspiciousPatterns = new Map();
    #accessThresholds = {
        maxAccessPerSecond: 10,
        maxAccessPerMinute: 100,
        suspiciousKeyPatterns: [
            /token/i,
            /key/i,
            /password/i,
            /secret/i,
            /auth/i
        ]
    };

    constructor() {
        this.initializeMonitor();
    }

    initializeMonitor() {
        // Setup monitoring system
        setInterval(() => this.cleanupOldPatterns(), 60000);
    }

    analyzeAccess(key, access, logs) {
        // Check access frequency
        this.checkAccessFrequency(key, logs);

        // Check access patterns
        this.checkAccessPatterns(key, access);

        // Check for suspicious keys
        this.checkSuspiciousKeys(key);
    }

    checkAccessFrequency(key, logs) {
        const now = Date.now();
        
        // Count recent accesses
        const recentAccesses = logs.filter(log => 
            now - log.timestamp < 1000
        ).length;

        const minuteAccesses = logs.filter(log => 
            now - log.timestamp < 60000
        ).length;

        if (recentAccesses > this.#accessThresholds.maxAccessPerSecond ||
            minuteAccesses > this.#accessThresholds.maxAccessPerMinute) {
            this.markSuspiciousPattern(key, 'high_frequency');
        }
    }

    checkAccessPatterns(key, access) {
        // Check for suspicious access patterns
        const pattern = this.#suspiciousPatterns.get(key) || {
            count: 0,
            lastAccess: 0,
            types: new Set()
        };

        const timeSinceLastAccess = access.timestamp - pattern.lastAccess;

        // Check for rapid successive accesses
        if (timeSinceLastAccess < 100) { // Less than 100ms between accesses
            pattern.count++;
        } else {
            pattern.count = 1;
        }

        // Track access types
        pattern.types.add(access.type);
        pattern.lastAccess = access.timestamp;

        // Check for suspicious patterns
        if (pattern.count > 5 || pattern.types.size > 2) {
            this.markSuspiciousPattern(key, 'suspicious_pattern');
        }

        this.#suspiciousPatterns.set(key, pattern);
    }

    checkSuspiciousKeys(key) {
        // Check if key matches suspicious patterns
        if (this.#accessThresholds.suspiciousKeyPatterns.some(pattern => 
            pattern.test(key)
        )) {
            this.markSuspiciousPattern(key, 'suspicious_key');
        }
    }

    markSuspiciousPattern(key, type) {
        const pattern = this.#suspiciousPatterns.get(key) || {
            count: 0,
            lastAccess: 0,
            types: new Set()
        };

        pattern.suspicious = true;
        pattern.suspiciousType = type;
        this.#suspiciousPatterns.set(key, pattern);
    }

    isAccessSuspicious(key) {
        const pattern = this.#suspiciousPatterns.get(key);
        return pattern?.suspicious || false;
    }

    handleSuspiciousAccess(type, key) {
        // Log suspicious access
        console.warn(`Suspicious storage access: ${type} on ${key}`);

        // Clear suspicious pattern after handling
        this.#suspiciousPatterns.delete(key);
    }

    cleanupOldPatterns() {
        const now = Date.now();
        for (const [key, pattern] of this.#suspiciousPatterns) {
            if (now - pattern.lastAccess > 3600000) { // 1 hour
                this.#suspiciousPatterns.delete(key);
            }
        }
    }
}

export default SecureStorage;
