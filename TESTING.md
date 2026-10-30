# Release validation

## Automated checks

Run `npm run check` and `npm test` on Node.js 22+. Tests are self-contained: they do not require Discord, an account, an audio device or personal files. They use API mocks and do not play audio on the system.

## In-client checks

Temporarily disable other ringtone replacement plugins. Do not publish personal configuration data.

1. Select a small MP3 or WAV. Confirm that **Listen** plays it with increasing volume and **Stop** stops the preview.
2. Receive an actual incoming call. Only the custom ringtone should play, with the configured fade-in.
3. Check that answering, declining and cancellation by the caller stop playback.
4. Receive another call: the starting volume must reset. Repeat with a seasonal sound pack if available.
5. With `call_ringing` selected, make an outgoing call: its signal should remain unchanged.
6. Check native voice join/leave, mute/unmute and deafen/undeafen sounds, plus other notifications.
7. Disable the plugin and confirm default behavior. Re-enable it and confirm settings are restored.
8. Select an invalid audio file: an actionable error should appear and the previous successfully loaded file should remain available.
9. Switch **Language** between English and Russian. Labels, hints, file dialog, connection status and plugin notifications should follow the selection. The choice must survive re-enabling the plugin.
10. Select **Auto (Discord)**. Verify Russian for Russian Discord and English for English or unsupported locales. Changing the language must not interrupt an active ringtone.

Record Discord, BetterDiscord and plugin versions, platform and outcomes. Discovering a class and installing patches confirms the connection to the client; it does not by itself confirm audible playback.
