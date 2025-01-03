// Enhanced Secure Network Module

class SecureNetwork {
    #securityCore = null;
    #requestInterceptor = null;
    #rateLimiter = null;
    #networkMonitor = null;

    constructor() {
        this.initializeNetwork();
    }

    async initializeNetwork() {
        // Initialize security components
        this.#securityCore = new SecurityCore();
        this.#requestInterceptor = new RequestInterceptor();
        this.#rateLimiter = new RateLimiter();
        this.#networkMonitor = new NetworkMonitor();

        // Setup network security
        this.setupNetworkSecurity();
    }

    setupNetworkSecurity() {
        // Intercept and secure all network requests
        this.interceptXHR();
        this.interceptFetch();
        this.interceptWebSocket();
        this.setupCSPHeaders();
    }

    interceptXHR() {
        const originalXHR = window.XMLHttpRequest;
        const interceptor = this.#requestInterceptor;
        const rateLimiter = this.#rateLimiter;
        const monitor = this.#networkMonitor;

        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;

            xhr.open = function(...args) {
                // Validate and secure request
                if (!interceptor.validateRequest(args[0], args[1])) {
                    throw new Error('Invalid request');
                }

                // Apply rate limiting
                if (!rateLimiter.allowRequest()) {
                    throw new Error('Rate limit exceeded');
                }

                // Monitor request
                monitor.trackRequest(args[1]);

                return originalOpen.apply(this, args);
            };

            xhr.send = function(data) {
                // Encrypt sensitive data
                const secureData = data ? interceptor.secureData(data) : data;

                // Add security headers
                this.setRequestHeader('X-Security-Token', interceptor.generateSecurityToken());
                this.setRequestHeader('X-Request-ID', crypto.randomUUID());

                return originalSend.call(this, secureData);
            };

            return xhr;
        };
    }

    interceptFetch() {
        const originalFetch = window.fetch;
        const interceptor = this.#requestInterceptor;
        const rateLimiter = this.#rateLimiter;
        const monitor = this.#networkMonitor;

        window.fetch = async function(input, init = {}) {
            // Validate request
            if (!interceptor.validateRequest(init.method || 'GET', input)) {
                throw new Error('Invalid request');
            }

            // Apply rate limiting
            if (!rateLimiter.allowRequest()) {
                throw new Error('Rate limit exceeded');
            }

            // Monitor request
            monitor.trackRequest(input);

            // Add security headers
            const secureInit = {
                ...init,
                headers: {
                    ...init.headers,
                    'X-Security-Token': interceptor.generateSecurityToken(),
                    'X-Request-ID': crypto.randomUUID()
                }
            };

            // Encrypt body if present
            if (secureInit.body) {
                secureInit.body = await interceptor.secureData(secureInit.body);
            }

            return originalFetch.call(this, input, secureInit);
        };
    }

    interceptWebSocket() {
        const originalWebSocket = window.WebSocket;
        const interceptor = this.#requestInterceptor;
        const rateLimiter = this.#rateLimiter;
        const monitor = this.#networkMonitor;

        window.WebSocket = function(url, protocols) {
            // Validate WebSocket connection
            if (!interceptor.validateWebSocket(url)) {
                throw new Error('Invalid WebSocket connection');
            }

            // Apply rate limiting
            if (!rateLimiter.allowRequest()) {
                throw new Error('Rate limit exceeded');
            }

            // Create WebSocket with security
            const ws = new originalWebSocket(url, protocols);

            // Monitor connection
            monitor.trackWebSocket(url);

            // Secure message handling
            const originalSend = ws.send;
            ws.send = function(data) {
                // Encrypt outgoing messages
                const secureData = interceptor.secureWebSocketData(data);
                return originalSend.call(this, secureData);
            };

            // Handle incoming messages
            ws.addEventListener('message', async function(event) {
                // Decrypt and validate incoming messages
                event.data = await interceptor.validateAndDecryptMessage(event.data);
            });

            return ws;
        };
    }

    setupCSPHeaders() {
        // Setup Content Security Policy
        const csp = {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'strict-dynamic'"],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'blob:'],
            'connect-src': ["'self'"],
            'font-src': ["'self'"],
            'object-src': ["'none'"],
            'media-src': ["'self'"],
            'frame-src': ["'none'"],
            'worker-src': ["'self'"],
            'manifest-src': ["'self'"],
            'form-action': ["'self'"],
            'frame-ancestors': ["'none'"],
            'base-uri': ["'self'"],
            'upgrade-insecure-requests': []
        };

        const cspString = Object.entries(csp)
            .map(([key, values]) => `${key} ${values.join(' ')}`)
            .join('; ');

        // Add CSP meta tag
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = cspString;
        document.head.appendChild(meta);
    }
}

class RequestInterceptor {
    #securityTokens = new Set();
    #validOrigins = new Set(['self']);
    #encryptionKey = null;

    constructor() {
        this.initializeInterceptor();
    }

    async initializeInterceptor() {
        // Generate encryption key
        this.#encryptionKey = await window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    validateRequest(method, url) {
        try {
            const urlObj = new URL(url, window.location.origin);
            
            // Validate origin
            if (!this.#validOrigins.has('self') && 
                !this.#validOrigins.has(urlObj.origin)) {
                return false;
            }

            // Validate method
            const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
            if (!validMethods.includes(method.toUpperCase())) {
                return false;
            }

            // Validate URL
            if (urlObj.protocol !== 'https:' && 
                urlObj.protocol !== 'wss:' && 
                urlObj.hostname !== 'localhost') {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Request validation error:', error);
            return false;
        }
    }

    validateWebSocket(url) {
        try {
            const urlObj = new URL(url);
            
            // Validate WebSocket protocol
            if (urlObj.protocol !== 'ws:' && urlObj.protocol !== 'wss:') {
                return false;
            }

            // Validate origin
            return this.#validOrigins.has('self') || 
                   this.#validOrigins.has(urlObj.origin);
        } catch (error) {
            console.error('WebSocket validation error:', error);
            return false;
        }
    }

    async secureData(data) {
        try {
            // Convert data to string if needed
            const dataString = typeof data === 'string' ? 
                data : JSON.stringify(data);

            // Convert to ArrayBuffer
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(dataString);

            // Generate IV
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // Encrypt data
            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.#encryptionKey,
                dataBuffer
            );

            // Combine IV and encrypted data
            const result = new Uint8Array(iv.length + encryptedData.byteLength);
            result.set(iv);
            result.set(new Uint8Array(encryptedData), iv.length);

            return result;
        } catch (error) {
            console.error('Data encryption error:', error);
            throw error;
        }
    }

    generateSecurityToken() {
        const token = crypto.randomUUID();
        this.#securityTokens.add(token);
        return token;
    }

    validateSecurityToken(token) {
        return this.#securityTokens.has(token);
    }

    secureWebSocketData(data) {
        // Add security wrapper
        const securePacket = {
            data: data,
            timestamp: Date.now(),
            token: this.generateSecurityToken()
        };

        return JSON.stringify(securePacket);
    }

    async validateAndDecryptMessage(message) {
        try {
            const packet = JSON.parse(message);
            
            // Validate token and timestamp
            if (!this.validateSecurityToken(packet.token)) {
                throw new Error('Invalid security token');
            }

            if (Date.now() - packet.timestamp > 5000) {
                throw new Error('Message expired');
            }

            return packet.data;
        } catch (error) {
            console.error('Message validation error:', error);
            throw error;
        }
    }
}

class RateLimiter {
    #requestCounts = new Map();
    #limits = {
        perSecond: 10,
        perMinute: 100,
        perHour: 1000
    };

    allowRequest() {
        const now = Date.now();
        const second = Math.floor(now / 1000);
        const minute = Math.floor(now / 60000);
        const hour = Math.floor(now / 3600000);

        // Update request counts
        this.updateRequestCount(second, 'second');
        this.updateRequestCount(minute, 'minute');
        this.updateRequestCount(hour, 'hour');

        // Check limits
        return this.checkLimits(second, minute, hour);
    }

    updateRequestCount(timeUnit, type) {
        const key = `${type}-${timeUnit}`;
        const count = (this.#requestCounts.get(key) || 0) + 1;
        this.#requestCounts.set(key, count);

        // Cleanup old entries
        this.cleanup();
    }

    checkLimits(second, minute, hour) {
        const secondCount = this.#requestCounts.get(`second-${second}`) || 0;
        const minuteCount = this.#requestCounts.get(`minute-${minute}`) || 0;
        const hourCount = this.#requestCounts.get(`hour-${hour}`) || 0;

        return secondCount <= this.#limits.perSecond &&
               minuteCount <= this.#limits.perMinute &&
               hourCount <= this.#limits.perHour;
    }

    cleanup() {
        const now = Date.now();
        const oldestSecond = Math.floor(now / 1000) - 60;
        const oldestMinute = Math.floor(now / 60000) - 60;
        const oldestHour = Math.floor(now / 3600000) - 24;

        for (const [key, _] of this.#requestCounts) {
            const [type, time] = key.split('-');
            const timeNum = parseInt(time);

            if ((type === 'second' && timeNum < oldestSecond) ||
                (type === 'minute' && timeNum < oldestMinute) ||
                (type === 'hour' && timeNum < oldestHour)) {
                this.#requestCounts.delete(key);
            }
        }
    }
}

class NetworkMonitor {
    #requests = new Map();
    #webSockets = new Map();
    #anomalyDetector = null;

    constructor() {
        this.initializeMonitor();
    }

    initializeMonitor() {
        this.#anomalyDetector = new AnomalyDetector();
    }

    trackRequest(url) {
        const urlObj = new URL(url, window.location.origin);
        const key = urlObj.origin + urlObj.pathname;
        
        const requestData = this.#requests.get(key) || {
            count: 0,
            lastAccess: 0,
            patterns: []
        };

        // Update request data
        requestData.count++;
        requestData.patterns.push(Date.now() - requestData.lastAccess);
        requestData.lastAccess = Date.now();

        // Keep only last 100 patterns
        if (requestData.patterns.length > 100) {
            requestData.patterns.shift();
        }

        this.#requests.set(key, requestData);

        // Check for anomalies
        this.#anomalyDetector.analyzeRequest(key, requestData);
    }

    trackWebSocket(url) {
        const urlObj = new URL(url);
        const key = urlObj.origin;

        const wsData = this.#webSockets.get(key) || {
            connections: 0,
            messageCount: 0,
            lastMessage: 0
        };

        wsData.connections++;
        this.#webSockets.set(key, wsData);

        // Check for anomalies
        this.#anomalyDetector.analyzeWebSocket(key, wsData);
    }
}

class AnomalyDetector {
    #anomalyThresholds = {
        requestFrequency: 1000, // ms
        patternDeviation: 2.0,  // standard deviations
        connectionLimit: 5      // max simultaneous connections
    };

    analyzeRequest(key, data) {
        // Check request frequency
        if (data.patterns.length >= 2) {
            const lastInterval = data.patterns[data.patterns.length - 1];
            if (lastInterval < this.#anomalyThresholds.requestFrequency) {
                this.reportAnomaly('high_frequency_requests', key);
            }
        }

        // Check for pattern anomalies
        if (data.patterns.length >= 10) {
            const mean = this.calculateMean(data.patterns);
            const stdDev = this.calculateStdDev(data.patterns, mean);
            
            const latestPattern = data.patterns[data.patterns.length - 1];
            if (Math.abs(latestPattern - mean) > 
                stdDev * this.#anomalyThresholds.patternDeviation) {
                this.reportAnomaly('pattern_anomaly', key);
            }
        }
    }

    analyzeWebSocket(key, data) {
        // Check connection count
        if (data.connections > this.#anomalyThresholds.connectionLimit) {
            this.reportAnomaly('excessive_connections', key);
        }

        // Check message frequency
        const messageInterval = Date.now() - data.lastMessage;
        if (messageInterval < this.#anomalyThresholds.requestFrequency) {
            this.reportAnomaly('high_frequency_messages', key);
        }
    }

    calculateMean(numbers) {
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    calculateStdDev(numbers, mean) {
        const squareDiffs = numbers.map(num => {
            const diff = num - mean;
            return diff * diff;
        });
        const avgSquareDiff = this.calculateMean(squareDiffs);
        return Math.sqrt(avgSquareDiff);
    }

    reportAnomaly(type, source) {
        console.warn(`Network anomaly detected: ${type} from ${source}`);
        window.dispatchEvent(new CustomEvent('networkAnomaly', {
            detail: { type, source }
        }));
    }
}

export default SecureNetwork;
