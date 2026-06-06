const { makeid } = require('./gen-id');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pino = require("pino");
const logger = pino({ level: "silent" });
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    const sessionPath = path.join(__dirname, 'temp', id);
    
    async function GIFTED_MD_QR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        
        try {
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                printQRInTerminal: false,
                logger: logger,
                version: version,
                browser: ["Ubuntu", "Chrome", "20.0.04"],
            });
            
            sock.ev.on('creds.update', saveCreds);
            
            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;
                
                if (qr && !res.headersSent) {
                    const qrBuffer = await QRCode.toBuffer(qr);
                    res.type('image/png');
                    return res.send(qrBuffer);
                }
                
                if (connection == "open") {
                    await delay(5000);
                    let credsFilePath = path.join(sessionPath, 'creds.json');
                    
                    try {
                        let data = fs.readFileSync(credsFilePath);
                        const base64Session = Buffer.from(data.toString()).toString('base64');
                        let md = "ANJU-XPRO~" + base64Session;
                        
                        let code = await sock.sendMessage(sock.user.id, { text: md });
                        
                        let cap = `🔐 *DO NOT SHARE THIS CODE WITH ANYONE!!*\n\nUse this code to create your own *QUEEN ANJU XPRO* WhatsApp User Bot. 🤖`;
                        
                        await sock.sendMessage(sock.user.id, { text: cap }, { quoted: code });
                    } catch (e) {
                        console.error("Error sending QR Session:", e);
                    }
                    
                    await delay(2000);
                    sock.ev.removeAllListeners('connection.update');
                    await sock.ws.close();
                    removeFile(sessionPath);
                    console.log(`👤 Connected successfully.`);
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(5000);
                    GIFTED_MD_QR_CODE();
                }
            });
        } catch (err) {
            console.log("QR Service error", err);
            removeFile(sessionPath);
            if (!res.headersSent) {
                res.send({ error: "❗ Service Unavailable" });
            }
        }
    }
    await GIFTED_MD_QR_CODE();
});

// මුළු සර්වර් එකම ක්‍රෑෂ් කරවන process.exit() සහිත setInterval එක ඉවත් කරන ලදී.

module.exports = router;
