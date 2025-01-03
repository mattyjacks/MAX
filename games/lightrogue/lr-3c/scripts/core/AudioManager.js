// Audio system for managing sound effects and music
export class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.initialized = false;
        this.masterVolume = 1.0;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
        this.currentMusic = null;
        this.soundEnabled = true;
        this.musicEnabled = true;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Load sound effects
            await Promise.all([
                this.loadSound('jump', '../assets/sound/jump.mp3'),
                this.loadSound('shoot', '../assets/sound/shoot.mp3'),
                this.loadSound('hit', '../assets/sound/hit.mp3'),
                this.loadSound('death', '../assets/sound/death.mp3'),
                this.loadSound('powerup', '../assets/sound/powerup.mp3'),
                this.loadSound('levelup', '../assets/sound/levelup.mp3')
            ]);
            
            // Load music tracks
            await Promise.all([
                this.loadMusic('menu', '../assets/music/menu.mp3'),
                this.loadMusic('game', '../assets/music/game.mp3'),
                this.loadMusic('boss', '../assets/music/boss.mp3')
            ]);
            
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            throw error;
        }
    }
    
    async loadSound(name, path) {
        try {
            const audio = new Audio(path);
            audio.volume = this.sfxVolume * this.masterVolume;
            this.sounds[name] = audio;
            await audio.load();
        } catch (error) {
            console.error(`Failed to load sound ${name}:`, error);
        }
    }
    
    async loadMusic(name, path) {
        try {
            const audio = new Audio(path);
            audio.volume = this.musicVolume * this.masterVolume;
            audio.loop = true;
            this.music[name] = audio;
            await audio.load();
        } catch (error) {
            console.error(`Failed to load music ${name}:`, error);
        }
    }
    
    playSound(name) {
        if (!this.soundEnabled || !this.sounds[name]) return;
        
        try {
            const sound = this.sounds[name].cloneNode();
            sound.volume = this.sfxVolume * this.masterVolume;
            sound.play();
        } catch (error) {
            console.error(`Failed to play sound ${name}:`, error);
        }
    }
    
    playMusic(name) {
        if (!this.musicEnabled || !this.music[name]) return;
        
        try {
            if (this.currentMusic) {
                this.fadeOut(this.currentMusic, () => {
                    this.currentMusic.pause();
                    this.currentMusic = this.music[name];
                    this.fadeIn(this.currentMusic);
                });
            } else {
                this.currentMusic = this.music[name];
                this.fadeIn(this.currentMusic);
            }
        } catch (error) {
            console.error(`Failed to play music ${name}:`, error);
        }
    }
    
    stopMusic() {
        if (this.currentMusic) {
            this.fadeOut(this.currentMusic, () => {
                this.currentMusic.pause();
                this.currentMusic.currentTime = 0;
            });
        }
    }
    
    fadeIn(audio, duration = 1000) {
        audio.volume = 0;
        audio.play();
        
        const startTime = Date.now();
        const targetVolume = this.musicVolume * this.masterVolume;
        
        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                audio.volume = targetVolume;
                clearInterval(fadeInterval);
            } else {
                audio.volume = progress * targetVolume;
            }
        }, 16);
    }
    
    fadeOut(audio, callback, duration = 1000) {
        const startTime = Date.now();
        const startVolume = audio.volume;
        
        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                audio.volume = 0;
                clearInterval(fadeInterval);
                if (callback) callback();
            } else {
                audio.volume = (1 - progress) * startVolume;
            }
        }, 16);
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    updateVolumes() {
        // Update sound effects
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.sfxVolume * this.masterVolume;
        });
        
        // Update music
        Object.values(this.music).forEach(music => {
            if (music === this.currentMusic) {
                music.volume = this.musicVolume * this.masterVolume;
            }
        });
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }
    
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled && this.currentMusic) {
            this.stopMusic();
        } else if (this.musicEnabled && this.currentMusic) {
            this.currentMusic.play();
        }
        return this.musicEnabled;
    }
}

// Export singleton instance
export const audioManager = new AudioManager();
