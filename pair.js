const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pino = require('pino');
const logger = pino({ level: 'info' });
const {
    makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

async function GIFTED_MD_PAIR_CODE(id, num, res) {
    const sessionPath = path.join(__dirname, 'temp', id);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();
    
    let sock = null;

    try {
        sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger: logger,
            version: version,
            syncFullHistory: false,
            // වඩාත් ස්ථාවර බ්‍රවුසර් සැකසුම
            browser: ["Ubuntu", "Chrome", "20.0.04"], 
        });

        if (!sock.authState.creds.registered) {
            await delay(3000); // Server එකට සම්බන්ධ වීමට ප්‍රමාණවත් කාලයක් ලබා දීම
            num = num.replace(/[^0-9]/g, '');
            
            try {
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    return res.send({ code });
                }
            } catch (err) {
                logger.error(`Pairing code request failed: ${err.message}`);
                if (!res.headersSent) {
                    return res.status(500).send({ code: "❗ Code Generation Failed" });
                }
            }
        }

        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                await delay(5000);
                const credsFilePath = path.join(sessionPath, 'creds.json');
                try {
                    const credsData = fs.readFileSync(credsFilePath, 'utf-8');
                    const base64Session = Buffer.from(credsData).toString('base64');
                    const md = "ANJU-XPRO~" + base64Session;
                    
                    const codeMessage = await sock.sendMessage(sock.user.id, { text: md });
                    
                    let cap = `🔐 *DO NOT SHARE THIS CODE WITH ANYONE!!*\n\nUse this code to create your own *QUEEN ANJU XPRO* WhatsApp User Bot. 🤖`;
                    
                    await sock.sendMessage(sock.user.id, { text: cap }, { quoted: codeMessage });

                    await delay(2000);
                    sock.ev.removeAllListeners('connection.update');
                    await sock.ws.close();
                    removeFile(sessionPath);
                    logger.info(`✅ Connected successfully. Exiting process...`);
                    process.exit(0);
                } catch (error) {
                    logger.error(`Error sending session: ${error.message}`);
                }
            } else if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                logger.warn(`Connection closed with status: ${statusCode}. Retrying...`);
                
                // 401 Unauthorized හෝ හිතාමතාම සිදුකල Logout එකක් නම් නැවත උත්සාහ නොකරයි
                if (statusCode === 401) {
                    removeFile(sessionPath);
                }
            }
        });
    } catch (error) {
        logger.error(`Error in GIFTED_MD_PAIR_CODE: ${error.message}`);
        removeFile(sessionPath);
        if (!res.headersSent) {
            res.send({ code: "❗ Service Unavailable" });
        }
    }
}

// HTML එකෙන් කෝල් කරන්නේ /code එකට නිසා මෙය වෙනස් කරන ලදී
router.get('/code', async (req, res) => {
    const id = makeid();
    const num = req.query.number;
    if (!num) {
        return res.status(400).send({ error: 'Number is required' });
    }
    await GIFTED_MD_PAIR_CODE(id, num, res);
});

module.exports = router;
