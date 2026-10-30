# Better Call Discord

**English** | [Русский](./README.ru.md)

A custom local ringtone with gradually increasing volume for BetterDiscord.

Choose an audio file, set the starting and maximum volume, and decide how long the fade-in should take. The plugin is a single `BetterCallDiscord.plugin.js` file. No build step or additional libraries are required to install it.

## Features

- Local MP3, WAV, OGG, M4A or FLAC files up to 20 MB. Codec support depends on the client; MP3 or WAV is recommended.
- Linear volume ramp from your starting level to your maximum over 1–60 seconds.
- Looping playback while the call is ringing; each new call starts the ramp again.
- **Listen** and **Stop** buttons to preview your settings.
- English and Russian settings, descriptions, status messages, file dialog and notifications.
- Automatic language selection from Discord, plus a manual language override.
- Seasonal and rare incoming ringtone variants.
- Default ringtone fallback if your audio file fails to load or play.
- Saved settings and migration from early GentleRing versions.

Defaults: **5% → 70% over 15 seconds**. Other sounds, such as joining/leaving voice channels, mute/deafen and notifications, are passed through to Discord with their original receiver and arguments.

## Installation

1. Install [BetterDiscord](https://betterdiscord.app/) if you do not already use it.
2. Download [`BetterCallDiscord.plugin.js` from the latest release](https://github.com/Shoenixs/better-call-discord/releases/latest/download/BetterCallDiscord.plugin.js).
3. In Discord, open **Settings → BetterDiscord → Plugins → Open Plugins Folder**.
4. Place `BetterCallDiscord.plugin.js` in that folder and enable **Better Call Discord**.
5. Open its settings, click **Choose file**, and select your ringtone.
6. Adjust the volume and duration, then click **Listen**.

On Windows, the plugin folder is usually `%AppData%\BetterDiscord\plugins`. To update, replace the existing plugin file. Remove or disable any old `GentleRing.plugin.js` installation so both versions do not run together.

The [source file](https://raw.githubusercontent.com/Shoenixs/better-call-discord/main/BetterCallDiscord.plugin.js) is also available directly. If the browser displays code, save it as `BetterCallDiscord.plugin.js`; do not save the GitHub HTML page as a plugin.

## Language

Choose **Language → Auto (Discord)**, **English** or **Русский** in the plugin settings.

Auto uses Discord's language when available, then the system/browser language. Russian locales use Russian; all other locales use English. Your manual choice is saved, and switching languages updates the settings immediately without changing the ringtone or volume.

BetterDiscord's own modal title and standard controls follow BetterDiscord's language rather than the plugin's override.

## Settings and behavior

| Setting | Behavior |
| --- | --- |
| Starting volume | 0–100%; applied at the start of each call |
| Maximum volume | 0–100%; cannot be lower than the starting level |
| Fade-in duration | 1–60 seconds |
| Sound to replace | `call_ringing` by default: incoming calls |

Volume changes apply to the next call or preview. The preview stops automatically 5 seconds after reaching maximum volume. In the verified client, the alternative `call_calling` signal is for outgoing calls; select it only if you want to replace that signal.

The plugin replaces playback requested by Discord. It does not force ringing when sounds are disabled or suppressed by the client. Percentages control the audio element; system volume and the application mixer also affect the result. Your custom ringtone uses the application's default audio output. A separate output device selector and integration with Discord's notification volume control are not implemented.

## Local data and privacy

The plugin makes no network requests, downloads no dependencies and does not update automatically. BetterDiscord's configuration stores your audio file path, language, volume settings and a small technical diagnostic record: plugin version, discovered methods, last intercepted sound name and stop event.

Your ringtone is not uploaded or embedded in the plugin. Keep the selected file at its original location. Personal configurations, paths and audio recordings are not included in this repository. Do not attach your full configuration to a public issue: it may contain a personal path.

## Troubleshooting

- **Listen is disabled:** select a supported audio file first.
- **Preview works but calls use Discord's ringtone:** check **Discord connection**, click **Check again**, and use `call_ringing`. Discord updates may change internal sound modules.
- **Two ringtones play:** disable other ringtone replacement plugins and remove or disable GentleRing.
- **Other Discord sounds are missing:** use version 1.0.5 or newer, which preserves the original `this` when passing through native sounds.
- **Restore default behavior:** disable Better Call Discord. It removes its patches and stops its custom audio.

When reporting an issue, include your plugin, Discord and BetterDiscord versions, platform, expected behavior and actual behavior. Remove tokens, messages and personal paths. English and Russian reports are welcome.

## Development and validation

Use Node.js 22 or newer. There are no npm dependencies to install.

```sh
npm run check
npm test
```

Tests cover the ramp, repeated playback requests, stopping and timer cleanup, native fallback, binary audio reading through BetterDiscord's partial `fs` implementation, modern and legacy sound classes, hidden/lazy modules, receiver preservation for other sounds, and language selection. Test audio is generated in memory.

A user confirmed the custom ringtone and fade-in on an actual incoming call in version 1.0.4. The native sound fix in 1.0.5 and localization in 1.1.0 have automated regression coverage; they have not received separate user confirmation in the client. Automated tests do not replace audible checks in your installed client. See [TESTING.md](./TESTING.md) for a manual checklist.

Integration uses BetterDiscord's [Webpack](https://docs.betterdiscord.app/api/Webpack.html), [Patcher](https://docs.betterdiscord.app/api/Patcher.html) and [UI](https://docs.betterdiscord.app/api/UI) APIs. Webpack module IDs are not hardcoded. Both `ensureAudio()` and `_ensureAudio()` sound classes are supported; a Discord update may require a new adapter.

## License

[MIT](./LICENSE). Independently written plugin; no third-party libraries or audio recordings are bundled. This project is not affiliated with Discord, BetterDiscord or the rights holders of Better Call Saul.
