// Generate a short PCM WAV in memory; no third-party audio or personal files.
module.exports = function createWav() {
    const sampleRate = 8000;
    const samples = 800;
    const dataSize = samples * 2;
    const wav = Buffer.alloc(44 + dataSize);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(dataSize, 40);
    for (let i = 0; i < samples; ++i) {
        wav.writeInt16LE(Math.round(1000 * Math.sin(2 * Math.PI * 440 * i / sampleRate)), 44 + 2 * i);
    }
    return wav;
};
