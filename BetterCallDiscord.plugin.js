/**
 * @name Better Call Discord
 * @author Shoenixs
 * @version 1.0.5
 * @description Свой локальный звук входящего звонка с плавно возрастающей громкостью.
 * @license MIT
 * @website https://github.com/Shoenixs/better-call-discord
 * @source https://github.com/Shoenixs/better-call-discord/blob/main/BetterCallDiscord.plugin.js
 */

const NAME = "Better Call Discord";
const VERSION = "1.0.5";
const DEFAULTS = {file: "", start: 5, end: 70, seconds: 15, sound: "call_ringing"};
const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

module.exports = class BetterCallDiscord {
    constructor() {
        this.running = false;
        this.revision = 0;
        this.sessions = new Map();
        this.unpatches = [];
        this.listeners = new Set();
        this.status = "Плагин выключен.";
    }

    start() {
        if (this.running) return;
        this.running = true;
        const currentSettings = BdApi.Data.load(NAME, "settings");
        const saved = currentSettings || BdApi.Data.load("GentleRing", "settings") || {};
        this.settings = {
            file: typeof saved.file === "string" ? saved.file : "",
            start: clamp(saved.start, 0, 100, DEFAULTS.start),
            end: clamp(saved.end, 0, 100, DEFAULTS.end),
            seconds: clamp(saved.seconds, 1, 60, DEFAULTS.seconds),
            sound: saved.sound === "call_calling" ? "call_calling" : DEFAULTS.sound
        };
        this.settings.end = Math.max(this.settings.start, this.settings.end);
        if (!currentSettings) BdApi.Data.save(NAME, "settings", this.settings);
        this.attach();
        this.watchForSound();
        let attempts = 0;
        if (!this.unpatches.length) this.discovery = setInterval(() => {
            this.attach();
            if (this.unpatches.length || ++attempts >= 15) {
                clearInterval(this.discovery);
                this.discovery = null;
                if (!this.unpatches.length) this.notify("Звуковой модуль Discord не найден. Замена звонка недоступна; штатные звуки сохранены.", "warning");
            }
        }, 1000);
        if (this.settings.file) void this.loadFile(this.settings.file, false);
    }

    notify(message, type = "info") {
        BdApi.UI.showToast(`${NAME}: ${message}`, {type, timeout: 6000});
    }

    refresh() {
        for (const listener of this.listeners) listener();
    }

    isSoundClass(value) {
        return typeof value === "function" &&
            ["play", "loop", "stop"].every(key => typeof value.prototype?.[key] === "function") &&
            ["ensureAudio", "_ensureAudio"].some(key => typeof value.prototype?.[key] === "function");
    }

    recordDiagnostics(event, detail = {}) {
        // Local technical state only: no call IDs, contacts or message content.
        this.diagnostics = {...this.diagnostics, version: VERSION, event, ...detail};
        BdApi.Data.save(NAME, "diagnostics", this.diagnostics);
    }

    watchForSound() {
        if (this.unpatches.length || !BdApi.Webpack.waitForModule || !BdApi.Webpack.Filters?.bySource) return;
        this.soundAbort = new AbortController();
        const signal = this.soundAbort.signal;
        // A sound module can load only when Discord first needs an audio cue.
        const filters = ["WebAudioSound", "ensureAudio"].map(text => BdApi.Webpack.Filters.bySource(text));
        Promise.resolve(BdApi.Webpack.waitForModule((...args) => filters.some(filter => filter(...args)), {
            signal, declarationFilter: value => this.isSoundClass(value)
        })).then(() => {
            if (this.running && !signal.aborted) this.attach();
        }).catch(error => {
            if (!signal.aborted) console.warn(NAME, "Lazy sound discovery failed", error);
        });
    }

    attach() {
        if (!this.running || this.unpatches.length) return;
        // Discover public-shaped sound facades; do not use fixed webpack IDs.
        const modules = BdApi.Webpack.getModules(m => m &&
            typeof m.playSound === "function" && typeof m.stopSound === "function",
        {searchExports: true}) || [];
        const unique = [...new Set(modules)];
        for (const sounds of unique) {
            const local = [];
            try {
                for (const method of ["playSound", "loopSound"]) {
                    if (typeof sounds[method] !== "function") continue;
                    const undo = BdApi.Patcher.instead(NAME, sounds, method, (context, args, original) => {
                        if (this.nativeDepth || !this.running || !this.url || !this.matches(args[0])) return original.apply(context, args);
                        const fallback = () => original.apply(context, args);
                        this.play("call", fallback, String(args[0]));
                        return Promise.resolve();
                    });
                    if (!undo) throw new Error(`Не удалось перехватить ${method}`);
                    local.push(undo);
                }
                const undo = BdApi.Patcher.before(NAME, sounds, "stopSound", (_, args) => {
                    if (this.matches(args[0])) this.stopSession("call");
                });
                if (!undo) throw new Error("Не удалось перехватить stopSound");
                local.push(undo);
                this.unpatches.push(...local);
            } catch (error) {
                for (const undo of local.reverse()) undo();
                console.warn(NAME, "Sound facade could not be patched", error);
            }
        }
        // Some builds expose sound instances rather than a named facade.
        const classes = BdApi.Webpack.getModules(m => this.isSoundClass(m),
        {searchExports: true}) || [];
        // Current BetterDiscord can expose non-exported module declarations.
        // Searching exports alone misses a private Sound class.
        if (BdApi.Webpack.getAllBySource) {
            if (!classes.length) for (const marker of ["WebAudioSound", "ensureAudio"]) {
                const declarations = BdApi.Webpack.getAllBySource(marker, {
                    declarationFilter: value => this.isSoundClass(value)
                }) || [];
                for (const value of declarations) if (this.isSoundClass(value)) classes.push(value);
            }
        }
        for (const Sound of new Set(classes)) {
            const local = [];
            try {
                for (const method of ["play", "loop"]) {
                    const undo = BdApi.Patcher.instead(NAME, Sound.prototype, method, (context, args, original) => {
                        const name = context?.name ?? context?._name;
                        if (this.nativeDepth || !this.running || !this.url || !this.matches(name)) return original.apply(context, args);
                        this.recordDiagnostics("intercepted", {sound: name, method});
                        this.play("call", () => original.apply(context, args), name);
                        return Promise.resolve();
                    });
                    if (!undo) throw new Error(`Не удалось перехватить Sound.${method}`);
                    local.push(undo);
                }
                const undo = BdApi.Patcher.before(NAME, Sound.prototype, "stop", context => {
                    if (this.matches(context?.name ?? context?._name)) {
                        this.stopSession("call");
                        this.recordDiagnostics("stopped");
                    }
                });
                if (!undo) throw new Error("Не удалось перехватить Sound.stop");
                local.push(undo);
                this.unpatches.push(...local);
            } catch (error) {
                for (const undo of local.reverse()) undo();
                console.warn(NAME, "Sound class could not be patched", error);
            }
        }
        this.status = this.unpatches.length ? "Звуковой модуль найден. Нужна проверка входящего звонка." :
            "Звуковой модуль пока не найден. Ожидаю его загрузки; штатный звук работает.";
        this.recordDiagnostics("discovery", {
            patchedMethods: this.unpatches.length,
            soundClasses: [...new Set(classes)].map(value => typeof value.prototype.ensureAudio === "function" ? "ensureAudio" : "_ensureAudio")
        });
        this.refresh();
    }

    matches(name) {
        if (typeof name !== "string") return false;
        // Includes seasonal packs and rare variants, but no other notifications.
        const base = this.settings.sound;
        return name === base || name.startsWith(`${base}_`) ||
            name.endsWith(`_${base}`) || name.includes(`_${base}_`);
    }

    async loadFile(file, save = true) {
        const revision = ++this.revision;
        let candidate;
        try {
            const fs = require("fs");
            const path = require("path");
            if (!path.isAbsolute(file)) throw new Error("Выбери локальный файл с абсолютным путём.");
            // BetterDiscord's fs polyfill has callbacks/sync methods, no promises.
            const stat = await this.readFs(fs, "stat", file);
            const isFile = typeof stat.isFile === "function" ? stat.isFile() : stat.isFile !== false && stat.isDirectory !== true;
            if (!isFile || stat.size === 0 || stat.size > 20 * 1024 * 1024) {
                throw new Error("Нужен непустой аудиофайл размером до 20 МБ.");
            }
            const bytes = await this.readFs(fs, "readFile", file);
            if (!this.running || revision !== this.revision) return false;
            if (typeof bytes === "string") throw new Error("BetterDiscord вернул текст вместо аудиоданных. Нужен бинарный режим чтения.");
            if (bytes.length > 20 * 1024 * 1024) throw new Error("Файл больше 20 МБ.");
            const types = {".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".flac": "audio/flac"};
            candidate = URL.createObjectURL(new Blob([bytes], {type: types[path.extname(file).toLowerCase()] || "application/octet-stream"}));
            await this.validateAudio(candidate);
            if (!this.running || revision !== this.revision) {
                URL.revokeObjectURL(candidate);
                return false;
            }
            this.stopSession("call", true);
            this.stopSession("preview");
            if (this.url) URL.revokeObjectURL(this.url);
            this.url = candidate;
            this.settings.file = file;
            if (save) BdApi.Data.save(NAME, "settings", this.settings);
            if (save) this.notify("Аудиофайл готов. Можно проверить звук.", "success");
            this.refresh();
            return true;
        } catch (error) {
            if (candidate) URL.revokeObjectURL(candidate);
            if (this.running && revision === this.revision) this.notify(`Не удалось загрузить звук. ${error.message}`, "error");
            return false;
        }
    }

    readFs(fs, method, file) {
        // The installed preload defaults readFile to UTF-8, unlike Node's fs.
        // Explicit null is essential: never decode audio as text.
        const args = method === "readFile" ? [file, null] : [file];
        if (typeof fs[method] === "function") return new Promise((resolve, reject) => {
            fs[method](...args, (error, value) => error ? reject(error) : resolve(value));
        });
        if (typeof fs[`${method}Sync`] === "function") return Promise.resolve(fs[`${method}Sync`](...args));
        throw new Error(`BetterDiscord не предоставляет fs.${method}. Обнови BetterDiscord.`);
    }

    validateAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            const finish = error => {
                clearTimeout(timeout);
                audio.oncanplay = audio.onerror = null;
                audio.removeAttribute("src");
                audio.load();
                error ? reject(error) : resolve();
            };
            const timeout = setTimeout(() => finish(new Error("Загрузка заняла больше 10 секунд. Попробуй MP3 или WAV.")), 10000);
            audio.oncanplay = () => finish();
            audio.onerror = () => finish(new Error("Формат не поддерживается. Попробуй MP3 или WAV."));
            audio.preload = "auto";
            audio.src = url;
            audio.load();
        });
    }

    play(key, fallback, soundName) {
        if (!this.running || !this.url) {
            if (fallback) this.runFallback(fallback);
            else this.notify("Сначала выбери аудиофайл.", "warning");
            return;
        }
        const existing = this.sessions.get(key);
        // Repeated loop requests must not reset the ramp or overlap the audio.
        if (existing) return;
        const audio = new Audio(this.url);
        const settings = {...this.settings};
        const session = {audio, fallback, soundName};
        this.sessions.set(key, session);
        audio.loop = true;
        audio.volume = settings.start / 100;
        const failed = () => {
            if (this.sessions.get(key) !== session) return;
            this.stopSession(key);
            // Leave subsequent requests to Discord until the file is selected again.
            if (key === "call" && this.url) {
                URL.revokeObjectURL(this.url);
                this.url = null;
            }
            this.notify("Не удалось воспроизвести файл. Для звонка возвращён штатный звук.", "error");
            if (fallback && this.running) this.runFallback(fallback);
        };
        audio.onerror = failed;
        try {
            Promise.resolve(audio.play()).then(() => {
                if (this.sessions.get(key) !== session) return;
                const began = Date.now();
                session.ramp = setInterval(() => {
                    const progress = Math.min(1, (Date.now() - began) / (settings.seconds * 1000));
                    audio.volume = (settings.start + (settings.end - settings.start) * progress) / 100;
                    if (progress === 1) clearInterval(session.ramp);
                }, 50);
                if (key === "preview") session.timeout = setTimeout(() => this.stopSession(key), (settings.seconds + 5) * 1000);
            }).catch(failed);
        } catch (_) { failed(); }
    }

    runFallback(fallback) {
        this.nativeDepth = (this.nativeDepth || 0) + 1;
        try { Promise.resolve(fallback()).catch(error => console.warn(NAME, "Native sound failed", error)); }
        catch (error) { console.warn(NAME, "Native sound failed", error); }
        finally { --this.nativeDepth; }
    }

    stopSession(key, resumeNative = false) {
        const session = this.sessions.get(key);
        if (!session) return;
        this.sessions.delete(key);
        clearInterval(session.ramp);
        clearTimeout(session.timeout);
        session.audio.onerror = null;
        session.audio.pause();
        session.audio.removeAttribute("src");
        session.audio.load();
        if (resumeNative && session.fallback) this.runFallback(session.fallback);
    }

    stop() {
        this.running = false;
        ++this.revision;
        clearInterval(this.discovery);
        this.discovery = null;
        this.soundAbort?.abort();
        this.soundAbort = null;
        for (const undo of this.unpatches.splice(0).reverse()) undo();
        this.stopSession("preview");
        this.stopSession("call", true);
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = null;
        this.status = "Плагин выключен.";
        this.refresh();
    }

    getSettingsPanel() {
        const plugin = this;
        const React = BdApi.React;
        return React.createElement(function Settings() {
            const [, render] = React.useReducer(n => n + 1, 0);
            const [busy, setBusy] = React.useState(false);
            React.useEffect(() => {
                plugin.listeners.add(render);
                return () => {
                    plugin.listeners.delete(render);
                    plugin.stopSession("preview");
                };
            }, []);
            const settings = plugin.settings || DEFAULTS;
            const update = (id, value) => {
                if (!["start", "end", "seconds", "sound"].includes(id)) return;
                plugin.stopSession("preview");
                if (id === "sound") {
                    plugin.stopSession("call", true);
                    settings.sound = value === "call_calling" ? value : "call_ringing";
                } else {
                    if (value === "" || value === null) return;
                    settings[id] = clamp(value, id === "seconds" ? 1 : 0, id === "seconds" ? 60 : 100, DEFAULTS[id]);
                    if (id === "start") settings.end = Math.max(settings.start, settings.end);
                    if (id === "end") settings.start = Math.min(settings.start, settings.end);
                }
                BdApi.Data.save(NAME, "settings", settings);
                render();
            };
            return BdApi.UI.buildSettingsPanel({
                onChange: (_, id, value) => update(id, value),
                settings: [
                    {type: "button", id: "file", name: "Звук звонка", children: busy ? "Загрузка…" : "Выбрать файл", disabled: busy || !plugin.running,
                        note: settings.file ? `${plugin.url ? "Готов" : "Не загружен"}: ${settings.file}` : "Локальный MP3, WAV, OGG, M4A или FLAC, до 20 МБ. Файл никуда не отправляется.",
                        onClick: async () => {
                            setBusy(true);
                            try {
                                const result = await BdApi.UI.openDialog({mode: "open", title: "Выбери звук звонка", properties: ["openFile"], filters: [{name: "Аудио", extensions: ["mp3", "wav", "ogg", "m4a", "flac"]}]});
                                if (!result.canceled && !result.cancelled && result.filePaths?.[0]) await plugin.loadFile(result.filePaths[0]);
                            } catch (error) { plugin.notify(`Не удалось открыть файл. ${error.message}`, "error"); }
                            finally { setBusy(false); render(); }
                        }},
                    {type: "number", id: "start", name: "Начальная громкость, %", note: "С этой громкости начинается каждый звонок.", min: 0, max: 100, step: 1, value: settings.start},
                    {type: "number", id: "end", name: "Максимальная громкость, %", note: "Громкость плавно поднимется до этого уровня и останется на нём. Общая громкость Discord и Windows тоже влияет на звук.", min: 0, max: 100, step: 1, value: settings.end},
                    {type: "number", id: "seconds", name: "Время нарастания, секунд", note: "От 1 до 60 секунд. Изменения применяются со следующего звонка или проверки.", min: 1, max: 60, step: 1, value: settings.seconds},
                    {type: "button", id: "preview", name: "Проверить нарастание", note: "Проверка завершится через 5 секунд после достижения максимальной громкости.", children: "Послушать", disabled: !plugin.url || !plugin.running,
                        onClick: () => { plugin.stopSession("preview"); plugin.play("preview"); }},
                    {type: "button", id: "stopPreview", name: "Остановить проверку", children: "Стоп", onClick: () => plugin.stopSession("preview")},
                    {type: "dropdown", id: "sound", name: "Какой сигнал заменять", note: "По умолчанию — call_ringing. Альтернативный call_calling в некоторых версиях относится к исходящему вызову.",
                        value: settings.sound, options: [{label: "call_ringing (по умолчанию)", value: "call_ringing"}, {label: "call_calling (альтернативный сигнал)", value: "call_calling"}]},
                    {type: "button", id: "connection", name: "Подключение к Discord", note: plugin.status, children: "Проверить снова", disabled: !plugin.running,
                        onClick: () => { plugin.attach(); plugin.notify(plugin.status, plugin.unpatches.length ? "success" : "warning"); }}
                ]
            });
        });
    }
};
