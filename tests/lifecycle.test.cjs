const assert = require('node:assert/strict');
const Plugin = require('../BetterCallDiscord.plugin.js');
let clock = 0, serial = 0;
const timers = new Map();
global.setInterval = (fn, ms) => {timers.set(++serial, {fn, ms}); return serial;};
global.setTimeout = global.setInterval;
global.clearInterval = id => timers.delete(id);
global.clearTimeout = global.clearInterval;
Date.now = () => clock;
let audios = [], native = [], storage = {}, toasts = [];
// BetterDiscord stores each data key separately.
const savedData = new Map();
class AudioMock {
    constructor(url) {this.src = url; audios.push(this);}
    play() {return Promise.resolve();}
    pause() {this.paused = true;}
    removeAttribute() {this.src = '';}
    load() {}
}
global.Audio = AudioMock;
class Sound {
    constructor(name) {this.name = name;}
    _ensureAudio() {}
    play() {native.push('instance.play');}
    loop() {native.push('instance.loop');}
    stop() {native.push('instance.stop');}
}
const sounds = {
    playSound(name) {native.push('play:' + name);},
    loopSound(name) {native.push('loop:' + name);},
    stopSound(name) {native.push('stop:' + name);}
};
const patch = (object, key, callback, before) => {
    const original = object[key];
    object[key] = function(...args) {
        if (before) {callback(this, args); return original.apply(this, args);}
        return callback(this, args, original);
    };
    return () => object[key] = original;
};
global.BdApi = {
    Data: {load: (_, key) => key === 'settings' ? storage : savedData.get(key), save: (_, key, data) => {if (key === 'settings') storage = {...data}; else savedData.set(key, data);}},
    UI: {showToast: (...args) => toasts.push(args)},
    Webpack: {getModules: filter => [sounds, Sound].filter(filter)},
    Patcher: {
        instead: (_, object, key, callback) => patch(object, key, callback, false),
        before: (_, object, key, callback) => patch(object, key, callback, true)
    }
};
const flush = () => new Promise(resolve => queueMicrotask(() => queueMicrotask(resolve)));
const tick = ms => {clock += ms; for (const timer of [...timers.values()]) timer.fn();};
(async () => {
    const p = new Plugin(); p.start();
    sounds.playSound('call_ringing');
    assert.equal(native.pop(), 'play:call_ringing', 'no file preserves native ringing');
    p.url = 'blob:mock';
    sounds.loopSound('call_ringing'); await flush();
    const ring = p.sessions.get('call').audio;
    assert.equal(ring.volume, .05);
    sounds.loopSound('call_ringing'); await flush();
    assert.equal(p.sessions.get('call').audio, ring, 'repeat does not restart');
    tick(7500); assert.ok(Math.abs(ring.volume - .375) < 1e-10);
    tick(7500); assert.equal(ring.volume, .7);
    assert.equal(timers.size, 0, 'ramp timer removed at ceiling');
    sounds.playSound('message1'); assert.equal(native.pop(), 'play:message1');
    sounds.stopSound('message1'); assert.equal(p.sessions.size, 1);
    sounds.stopSound('call_ringing'); assert.equal(p.sessions.size, 0); assert.ok(ring.paused);
    const sound = new Sound('winter_call_ringing_beat');
    sound.loop(); await flush(); assert.equal(p.sessions.size, 1, 'class and seasonal sounds supported');
    sound.stop(); assert.equal(p.sessions.size, 0);
    sounds.loopSound('call_ringing'); await flush();
    const fail = p.sessions.get('call').audio.onerror;
    fail(); assert.equal(p.sessions.size, 0); assert.equal(p.url, null);
    assert.equal(native.pop(), 'loop:call_ringing', 'error resumes original');
    fail(); assert.equal(p.sessions.size, 0, 'late error is ignored');
    p.url = 'blob:mock'; p.play('preview'); await flush();
    tick(20000); assert.equal(p.sessions.size, 0, 'preview stops automatically');
    sounds.loopSound('call_ringing');
    p.stop(); await flush();
    assert.equal(p.sessions.size, 0); assert.equal(timers.size, 0);
    assert.equal(native.pop(), 'loop:call_ringing', 'disable during call restores native ringing');
    sounds.loopSound('call_ringing'); assert.equal(native.pop(), 'loop:call_ringing', 'patches removed');
    assert.equal(p.url, null);
    storage = {start: 90, end: 10, seconds: Infinity, sound: 'message1'};
    p.start(); assert.equal(p.settings.end, 90); assert.equal(p.settings.seconds, 15);
    assert.equal(p.settings.sound, 'call_ringing'); p.stop();
    console.log('PASS: native passthrough, ramp, deduplication, stop isolation, prototype hooks, seasonal names, error fallback, preview limit, disable cleanup, settings validation.');
})().catch(error => {console.error(error); process.exitCode = 1;});
