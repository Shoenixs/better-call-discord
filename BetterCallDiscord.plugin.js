/**
 * @name Better Call Discord
 * @author Shoenixs
 * @version 1.1.0
 * @description Custom local ringtone with gradually increasing volume. English and Russian settings.
 * @license MIT
 * @website https://github.com/Shoenixs/better-call-discord
 * @source https://github.com/Shoenixs/better-call-discord/blob/main/BetterCallDiscord.plugin.js
 */

const NAME = "Better Call Discord";
const VERSION = "1.1.0";
const DEFAULTS = {file: "", start: 5, end: 70, seconds: 15, sound: "call_ringing", language: "auto"};
const MESSAGES = {
    en: {
        disabled: "The plugin is disabled.",
        connected: "Sound module found. Check an incoming call to confirm playback.",
        waiting: "Waiting for Discord's sound module to load. Default sounds still work.",
        missingModule: "Discord's sound module was not found. The default ringtone is unchanged.",
        language: "Language",
        languageNote: "Auto follows Discord's language, with the system language as a fallback. Other languages use English.",
        auto: "Auto (Discord)",
        ringtone: "Ringtone",
        loading: "Loading…",
        chooseFile: "Choose file",
        ready: "Ready",
        notLoaded: "Not loaded",
        fileNote: "Local MP3, WAV, OGG, M4A or FLAC, up to 20 MB. Your file is never uploaded.",
        chooseTitle: "Choose a ringtone",
        audioFiles: "Audio",
        openFailed: "Could not open the file. {error}",
        startVolume: "Starting volume, %",
        startNote: "Each call starts at this volume.",
        endVolume: "Maximum volume, %",
        endNote: "Volume gradually rises to this level and stays there. Discord and system volume also affect playback.",
        rampTime: "Fade-in duration, seconds",
        rampNote: "1–60 seconds. Changes apply to the next call or preview.",
        preview: "Preview fade-in",
        previewNote: "The preview stops automatically 5 seconds after reaching maximum volume.",
        listen: "Listen",
        stopPreview: "Stop preview",
        stop: "Stop",
        signal: "Sound to replace",
        signalNote: "Use call_ringing for incoming calls. In some clients, call_calling is the outgoing call signal.",
        incomingOption: "call_ringing (default)",
        alternativeOption: "call_calling (alternative)",
        connection: "Discord connection",
        retry: "Check again",
        absolutePath: "Choose a local file using an absolute path.",
        fileSize: "Choose a non-empty audio file up to 20 MB.",
        binaryMode: "BetterDiscord returned text instead of audio data. Binary file reading is required.",
        tooLarge: "The file is larger than 20 MB.",
        fileReady: "Your audio file is ready. You can preview it now.",
        loadFailed: "Could not load the audio file. {error}",
        missingFs: "BetterDiscord does not provide fs.{method}. Update BetterDiscord.",
        timeout: "Loading took more than 10 seconds. Try MP3 or WAV.",
        unsupported: "The audio format is not supported. Try MP3 or WAV.",
        chooseFirst: "Choose an audio file first.",
        playbackFailed: "Could not play the file. Calls will use the default ringtone.",
        previewFailed: "Could not play the preview. Try selecting another audio file."
    },
    ru: {
        disabled: "Плагин выключен.",
        connected: "Звуковой модуль найден. Нужна проверка входящего звонка.",
        waiting: "Ожидаю загрузки звукового модуля Discord. Штатный звук работает.",
        missingModule: "Звуковой модуль Discord не найден. Штатный звук звонка сохранён.",
        language: "Язык",
        languageNote: "Автовыбор использует язык Discord, а если он недоступен — язык системы. Для остальных языков используется английский.",
        auto: "Автоматически (Discord)",
        ringtone: "Звук звонка",
        loading: "Загрузка…",
        chooseFile: "Выбрать файл",
        ready: "Готов",
        notLoaded: "Не загружен",
        fileNote: "Локальный MP3, WAV, OGG, M4A или FLAC, до 20 МБ. Файл никуда не отправляется.",
        chooseTitle: "Выбери звук звонка",
        audioFiles: "Аудио",
        openFailed: "Не удалось открыть файл. {error}",
        startVolume: "Начальная громкость, %",
        startNote: "С этой громкости начинается каждый звонок.",
        endVolume: "Максимальная громкость, %",
        endNote: "Громкость плавно поднимется до этого уровня и останется на нём. Общая громкость Discord и системы тоже влияет на звук.",
        rampTime: "Время нарастания, секунд",
        rampNote: "От 1 до 60 секунд. Изменения применяются со следующего звонка или проверки.",
        preview: "Проверить нарастание",
        previewNote: "Проверка завершится через 5 секунд после достижения максимальной громкости.",
        listen: "Послушать",
        stopPreview: "Остановить проверку",
        stop: "Стоп",
        signal: "Какой сигнал заменять",
        signalNote: "Для входящего звонка используется call_ringing. В некоторых клиентах call_calling относится к исходящему вызову.",
        incomingOption: "call_ringing (по умолчанию)",
        alternativeOption: "call_calling (альтернативный сигнал)",
        connection: "Подключение к Discord",
        retry: "Проверить снова",
        absolutePath: "Выбери локальный файл с абсолютным путём.",
        fileSize: "Нужен непустой аудиофайл размером до 20 МБ.",
        binaryMode: "BetterDiscord вернул текст вместо аудиоданных. Нужен бинарный режим чтения.",
        tooLarge: "Файл больше 20 МБ.",
        fileReady: "Аудиофайл готов. Можно проверить звук.",
        loadFailed: "Не удалось загрузить звук. {error}",
        missingFs: "BetterDiscord не предоставляет fs.{method}. Обнови BetterDiscord.",
        timeout: "Загрузка заняла больше 10 секунд. Попробуй MP3 или WAV.",
        unsupported: "Формат не поддерживается. Попробуй MP3 или WAV.",
        chooseFirst: "Сначала выбери аудиофайл.",
        playbackFailed: "Не удалось воспроизвести файл. Для звонка возвращён штатный звук.",
        previewFailed: "Не удалось воспроизвести проверку. Попробуй выбрать другой аудиофайл."
    }
};
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
        this.statusKey = "disabled";
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.localeStore = BdApi.Webpack.getStore?.("LocaleStore");
        const currentSettings = BdApi.Data.load(NAME, "settings");
        const saved = currentSettings || BdApi.Data.load("GentleRing", "settings") || {};
        this.settings = {
            file: typeof saved.file === "string" ? saved.file : "",
            start: clamp(saved.start, 0, 100, DEFAULTS.start),
            end: clamp(saved.end, 0, 100, DEFAULTS.end),
            seconds: clamp(saved.seconds, 1, 60, DEFAULTS.seconds),
            sound: saved.sound === "call_calling" ? "call_calling" : DEFAULTS.sound,
            language: ["en", "ru"].includes(saved.language) ? saved.language : "auto"
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
                if (!this.unpatches.length) this.notify(this.t("missingModule"), "warning");
            }
        }, 1000);
        if (this.settings.file) void this.loadFile(this.settings.file, false);
    }

    notify(message, type = "info") {
        BdApi.UI.showToast(`${NAME}: ${message}`, {type, timeout: 6000});
    }

    getLanguage() {
        const preference = this.settings?.language;
        if (preference === "en" || preference === "ru") return preference;
        let locale;
        try { locale = this.localeStore?.getLocale?.() || this.localeStore?.locale; }
        catch (_) { /* Use the browser locale when Discord's store is unavailable. */ }
        if (!locale && typeof navigator !== "undefined") locale = navigator.language || navigator.languages?.[0];
        return /^ru(?:[-_]|$)/i.test(String(locale || "")) ? "ru" : "en";
    }

    t(key, values = {}) {
        const template = MESSAGES[this.getLanguage()][key] ?? MESSAGES.en[key] ?? key;
        return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
    }

    get status() {
        return this.t(this.statusKey);
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
                    if (!undo) throw new Error(`Could not patch ${method}`);
                    local.push(undo);
                }
                const undo = BdApi.Patcher.before(NAME, sounds, "stopSound", (_, args) => {
                    if (this.matches(args[0])) this.stopSession("call");
                });
                if (!undo) throw new Error("Could not patch stopSound");
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
                    if (!undo) throw new Error(`Could not patch Sound.${method}`);
                    local.push(undo);
                }
                const undo = BdApi.Patcher.before(NAME, Sound.prototype, "stop", context => {
                    if (this.matches(context?.name ?? context?._name)) {
                        this.stopSession("call");
                        this.recordDiagnostics("stopped");
                    }
                });
                if (!undo) throw new Error("Could not patch Sound.stop");
                local.push(undo);
                this.unpatches.push(...local);
            } catch (error) {
                for (const undo of local.reverse()) undo();
                console.warn(NAME, "Sound class could not be patched", error);
            }
        }
        this.statusKey = this.unpatches.length ? "connected" : "waiting";
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
            if (!path.isAbsolute(file)) throw new Error(this.t("absolutePath"));
            // BetterDiscord's fs polyfill has callbacks/sync methods, no promises.
            const stat = await this.readFs(fs, "stat", file);
            const isFile = typeof stat.isFile === "function" ? stat.isFile() : stat.isFile !== false && stat.isDirectory !== true;
            if (!isFile || stat.size === 0 || stat.size > 20 * 1024 * 1024) {
                throw new Error(this.t("fileSize"));
            }
            const bytes = await this.readFs(fs, "readFile", file);
            if (!this.running || revision !== this.revision) return false;
            if (typeof bytes === "string") throw new Error(this.t("binaryMode"));
            if (bytes.length > 20 * 1024 * 1024) throw new Error(this.t("tooLarge"));
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
            if (save) this.notify(this.t("fileReady"), "success");
            this.refresh();
            return true;
        } catch (error) {
            if (candidate) URL.revokeObjectURL(candidate);
            if (this.running && revision === this.revision) this.notify(this.t("loadFailed", {error: error.message}), "error");
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
        throw new Error(this.t("missingFs", {method}));
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
            const timeout = setTimeout(() => finish(new Error(this.t("timeout"))), 10000);
            audio.oncanplay = () => finish();
            audio.onerror = () => finish(new Error(this.t("unsupported")));
            audio.preload = "auto";
            audio.src = url;
            audio.load();
        });
    }

    play(key, fallback, soundName) {
        if (!this.running || !this.url) {
            if (fallback) this.runFallback(fallback);
            else this.notify(this.t("chooseFirst"), "warning");
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
            this.notify(this.t(key === "call" ? "playbackFailed" : "previewFailed"), "error");
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
        this.statusKey = "disabled";
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
                plugin.localeStore?.addChangeListener?.(render);
                return () => {
                    plugin.listeners.delete(render);
                    plugin.localeStore?.removeChangeListener?.(render);
                    plugin.stopSession("preview");
                };
            }, []);
            const settings = plugin.settings || DEFAULTS;
            const t = (key, values) => plugin.t(key, values);
            const update = (id, value) => {
                if (id === "language") {
                    settings.language = ["en", "ru"].includes(value) ? value : "auto";
                    BdApi.Data.save(NAME, "settings", settings);
                    render();
                    return;
                }
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
                    {type: "dropdown", id: "language", name: t("language"), note: t("languageNote"), value: settings.language,
                        options: [{label: t("auto"), value: "auto"}, {label: "English", value: "en"}, {label: "Русский", value: "ru"}]},
                    {type: "button", id: "file", name: t("ringtone"), children: busy ? t("loading") : t("chooseFile"), disabled: busy || !plugin.running,
                        note: settings.file ? `${t(plugin.url ? "ready" : "notLoaded")}: ${settings.file}` : t("fileNote"),
                        onClick: async () => {
                            setBusy(true);
                            try {
                                const result = await BdApi.UI.openDialog({mode: "open", title: t("chooseTitle"), properties: ["openFile"], filters: [{name: t("audioFiles"), extensions: ["mp3", "wav", "ogg", "m4a", "flac"]}]});
                                if (!result.canceled && !result.cancelled && result.filePaths?.[0]) await plugin.loadFile(result.filePaths[0]);
                            } catch (error) { plugin.notify(t("openFailed", {error: error.message}), "error"); }
                            finally { setBusy(false); render(); }
                        }},
                    {type: "number", id: "start", name: t("startVolume"), note: t("startNote"), min: 0, max: 100, step: 1, value: settings.start},
                    {type: "number", id: "end", name: t("endVolume"), note: t("endNote"), min: 0, max: 100, step: 1, value: settings.end},
                    {type: "number", id: "seconds", name: t("rampTime"), note: t("rampNote"), min: 1, max: 60, step: 1, value: settings.seconds},
                    {type: "button", id: "preview", name: t("preview"), note: t("previewNote"), children: t("listen"), disabled: !plugin.url || !plugin.running,
                        onClick: () => { plugin.stopSession("preview"); plugin.play("preview"); }},
                    {type: "button", id: "stopPreview", name: t("stopPreview"), children: t("stop"), onClick: () => plugin.stopSession("preview")},
                    {type: "dropdown", id: "sound", name: t("signal"), note: t("signalNote"),
                        value: settings.sound, options: [{label: t("incomingOption"), value: "call_ringing"}, {label: t("alternativeOption"), value: "call_calling"}]},
                    {type: "button", id: "connection", name: t("connection"), note: plugin.status, children: t("retry"), disabled: !plugin.running,
                        onClick: () => { plugin.attach(); plugin.notify(plugin.status, plugin.unpatches.length ? "success" : "warning"); }}
                ]
            });
        });
    }
};
