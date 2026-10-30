const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const ringtonePath = path.resolve('ring.wav');
const missingPath = path.resolve('missing.wav');
const source = fs.readFileSync(require('node:path').join(__dirname, '../BetterCallDiscord.plugin.js'), 'utf8');
const bytes = require('./helpers/audio-fixture.cjs')();
let modules = [], hidden = [], pending, toast = [];
class Sound {
    constructor(name) { this.name = name; }
    ensureAudio() {}
    play() {this.nativePlayed = true;}
    loop() {this.play();}
    stop() {}
}
const fakeFs = {
    stat: (_, cb) => cb(null, {size: bytes.length, isFile: true, isDirectory: false}),
    readFile: (_, encoding, cb) => {
        if (typeof encoding === 'function') { cb = encoding; encoding = 'utf-8'; }
        cb(null, encoding === null ? bytes : bytes.toString(encoding));
    }
};
const patch = (obj, key, fn, before) => {
    const original = obj[key];
    obj[key] = function(...args) {
        if (before) {fn(this, args); return original.apply(this, args);}
        return fn(this, args, original);
    };
    return () => obj[key] = original;
};
class Audio {
    constructor(url) {this.src = url;}
    load() {if (this.src) queueMicrotask(() => this.oncanplay?.());}
    play() {return Promise.resolve();}
    pause() {this.paused = true;}
    removeAttribute() {this.src = '';}
}
const sandbox = {
    module: {exports: {}}, require: name => name === 'fs' ? fakeFs : require(name),
    BdApi: {
        Data: {load: () => ({}), save() {}},
        UI: {showToast: message => toast.push(message), buildSettingsPanel: props => props},
        React: {
            createElement: fn => fn(), useReducer: () => [0, () => {}],
            useState: () => [false, () => {}], useEffect() {}
        },
        Webpack: {
            Filters: {bySource: source => source},
            getModules: predicate => modules.filter(predicate),
            getAllBySource: (source, options) => hidden.filter(options.declarationFilter),
            waitForModule: (_, options) => new Promise(resolve => {
                pending = () => resolve(Sound);
                options.signal.addEventListener('abort', () => resolve(undefined));
            })
        },
        Patcher: {
            instead: (_, obj, key, fn) => patch(obj, key, fn, false),
            before: (_, obj, key, fn) => patch(obj, key, fn, true)
        }
    },
    Audio, Blob, URL, AbortController, console, setTimeout, clearTimeout, setInterval, clearInterval
};
vm.runInNewContext(source, sandbox);
const Plugin = sandbox.module.exports;
(async () => {
    const plugin = new Plugin(); plugin.start();
    assert.equal(plugin.unpatches.length, 0, 'no exported sound module');
    assert.equal(fakeFs.promises, undefined, 'reproduce BetterDiscord fs surface');
    let refreshes = 0; plugin.listeners.add(() => ++refreshes);
    assert.equal(await plugin.loadFile(ringtonePath), true);
    assert.ok(plugin.url.startsWith('blob:'));
    assert.deepEqual(Buffer.from(await (await fetch(plugin.url)).arrayBuffer()), bytes, 'Audio blob preserves every original byte');
    assert.equal(plugin.settings.file, ringtonePath);
    assert.ok(refreshes > 0, 'load refreshes settings');
    const previous = plugin.url;
    const stat = fakeFs.stat;
    fakeFs.stat = (_, cb) => cb(new Error('ENOENT'));
    assert.equal(await plugin.loadFile(missingPath), false);
    assert.equal(plugin.url, previous, 'invalid replacement preserves current file');
    fakeFs.stat = stat;
    hidden = [Sound]; pending();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(plugin.unpatches.length, 3, 'lazy private declaration discovered');
    const ring = new Sound('call_ringing');
    ring.loop();
    await Promise.resolve();
    assert.equal(plugin.sessions.size, 1);
    assert.ok(!ring.nativePlayed, 'native audio suppressed');
    ring.stop(); assert.equal(plugin.sessions.size, 0);
    const panel = plugin.getSettingsPanel();
    assert.ok(panel.settings.find(setting => setting.id === 'connection').note.includes('Sound module found.'));
    assert.equal(panel.settings.find(setting => setting.id === 'preview').disabled, false);
    plugin.stop();
    assert.equal(plugin.soundAbort, null);
    // Also find a modern WebAudioSound through the exports on startup.
    hidden = []; modules = [Sound];
    const modern = new Plugin(); modern.start(); modern.url = 'blob:mock';
    assert.equal(modern.unpatches.length, 3, 'modern ensureAudio class discovered through exports');
    for (const name of ['call_ringing', 'call_ringing_beat', 'halloween_call_ringing']) {
        const incoming = new Sound(name);
        incoming.loop(); await Promise.resolve();
        assert.equal(modern.sessions.size, 1, 'incoming ringtone replaced');
        assert.ok(!incoming.nativePlayed, 'default ringtone not started');
        const audio = modern.sessions.get('call').audio;
        incoming.stop();
        assert.equal(modern.sessions.size, 0, 'answer or hangup stops custom ringtone');
        assert.ok(audio.paused);
    }
    const outgoing = new Sound('call_calling'); outgoing.loop();
    assert.ok(outgoing.nativePlayed, 'outgoing call unchanged');
    const notification = new Sound('message1'); notification.play();
    assert.ok(notification.nativePlayed, 'message notification unchanged');
    for (const name of ['user_join', 'user_leave', 'user_moved', 'disconnect', 'mute', 'unmute', 'deafen', 'undeafen', 'ptt_start', 'ptt_stop', 'stream_started', 'stream_ended', 'halloween_user_join', 'halloween_user_leave']) {
        const cue = new Sound(name);
        cue.play();
        assert.ok(cue.nativePlayed, `${name}: original receiver preserved`);
        assert.equal(modern.sessions.size, 0, `${name}: not replaced with ringtone`);
    }
    const fallbackRing = new Sound('call_ringing');
    fallbackRing.loop(); await Promise.resolve();
    modern.sessions.get('call').audio.onerror();
    assert.ok(fallbackRing.nativePlayed, 'ringtone error resumes native sound with original receiver');
    assert.equal(modern.sessions.size, 0);
    modern.stop();
    // fs shims exposing only sync methods still work, without fs.promises.
    const sync = {statSync: () => ({size: 44}), readFileSync: (_, encoding) => {
        assert.equal(encoding, null, 'sync API also requests binary mode'); return bytes;
    }};
    assert.equal((await plugin.readFs(sync, 'stat', ringtonePath)).size, 44);
    assert.equal(await plugin.readFs(sync, 'readFile', ringtonePath), bytes);
    console.log('PASS: fs without promises, callback and sync APIs, plain stats, validated file loading, failed replacement, settings refresh, lazy private Sound discovery, call stop, enabled preview and watcher cleanup.');
})().catch(error => {console.error(error); process.exitCode = 1;});
