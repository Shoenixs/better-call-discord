const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createEnvironment(locale = 'en-US', browserLocale = 'en-US') {
    const values = new Map();
    const messages = [];
    const dialogs = [];
    const localeStore = {getLocale: () => locale};
    const context = {
        module: {exports: {}}, console, navigator: {language: browserLocale},
        setInterval: () => 1, clearInterval() {}, clearTimeout() {},
        BdApi: {
            Data: {load: (_, key) => values.get(key), save: (_, key, value) => values.set(key, {...value})},
            Webpack: {getModules: () => [], getStore: () => localeStore},
            UI: {
                buildSettingsPanel: props => props,
                showToast: message => messages.push(message),
                openDialog: async options => {dialogs.push(options); return {canceled: true};}
            },
            React: {
                createElement: component => component(), useEffect() {},
                useReducer: () => [0, () => {}], useState: () => [false, () => {}]
            }
        }
    };
    const source = fs.readFileSync(path.join(__dirname, '../BetterCallDiscord.plugin.js'), 'utf8');
    vm.runInNewContext(source + '\nmodule.exports.testMessages = MESSAGES;', context);
    const Plugin = context.module.exports;
    return {Plugin, values, messages, dialogs, localeStore};
}

test('English and Russian cover the same messages and interpolation parameters', () => {
    const {Plugin} = createEnvironment();
    const {en, ru} = Plugin.testMessages;
    assert.deepEqual(Object.keys(en).sort(), Object.keys(ru).sort());
    for (const key of Object.keys(en)) {
        assert.ok(en[key].trim() && ru[key].trim(), key);
        assert.deepEqual(en[key].match(/\{\w+\}/g), ru[key].match(/\{\w+\}/g), key);
    }
});

test('Automatic language follows Discord and falls back to browser or English', () => {
    for (const [discord, browser, expected] of [
        ['ru', 'en-US', 'ru'], ['ru-RU', 'en-US', 'ru'], ['en-GB', 'ru-RU', 'en'],
        ['de', 'ru-RU', 'en'], [undefined, 'ru-RU', 'ru'], [undefined, 'fr-FR', 'en']
    ]) {
        const {Plugin, localeStore} = createEnvironment(discord, browser);
        localeStore.getLocale = () => discord;
        const plugin = new Plugin(); plugin.start();
        assert.equal(plugin.getLanguage(), expected);
        plugin.stop();
    }
});

test('Manual language updates settings, file dialog and errors without changing audio settings', async () => {
    const {Plugin, values, messages, dialogs} = createEnvironment('ru');
    const plugin = new Plugin(); plugin.start();
    const initial = {...plugin.settings};
    const call = {};
    plugin.sessions.set('call', call);
    const russian = plugin.getSettingsPanel();
    assert.equal(russian.settings.find(item => item.id === 'preview').children, 'Послушать');
    russian.onChange(null, 'language', 'en');
    assert.equal(plugin.getLanguage(), 'en');
    assert.equal(plugin.sessions.get('call'), call, 'switching language does not stop a call');
    for (const key of ['file', 'start', 'end', 'seconds', 'sound']) assert.equal(plugin.settings[key], initial[key]);
    const english = plugin.getSettingsPanel();
    assert.equal(english.settings.find(item => item.id === 'preview').children, 'Listen');
    assert.equal(english.settings.find(item => item.id === 'language').value, 'en');
    assert.match(english.settings.find(item => item.id === 'connection').note, /Waiting/);
    await english.settings.find(item => item.id === 'file').onClick();
    assert.equal(dialogs[0].title, 'Choose a ringtone');
    assert.equal(dialogs[0].filters[0].name, 'Audio');
    plugin.play('preview');
    assert.match(messages.at(-1), /Choose an audio file first/);
    assert.throws(() => plugin.readFs({}, 'stat', ''), /does not provide fs.stat/);
    plugin.sessions.clear(); plugin.stop();
    const restarted = new Plugin(); restarted.start();
    assert.equal(restarted.getLanguage(), 'en', 'manual preference survives restart');
    assert.equal(values.get('settings').language, 'en');
    restarted.getSettingsPanel().onChange(null, 'language', 'ru');
    const panel = restarted.getSettingsPanel();
    await panel.settings.find(item => item.id === 'file').onClick();
    assert.equal(dialogs[1].title, 'Выбери звук звонка');
    restarted.play('preview');
    assert.match(messages.at(-1), /Сначала выбери/);
    restarted.stop();
});

test('Existing configurations gain auto language without losing saved settings', () => {
    const {Plugin, values} = createEnvironment('ru');
    values.set('settings', {file: '', start: 9, end: 80, seconds: 15, sound: 'call_ringing'});
    const plugin = new Plugin(); plugin.start();
    assert.equal(plugin.settings.language, 'auto');
    assert.equal(plugin.settings.start, 9);
    assert.equal(plugin.settings.end, 80);
    assert.equal(plugin.getLanguage(), 'ru');
    plugin.stop();
});
