const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 7860;

// සර්වර් එකේ Max Listeners වැඩි කිරීම
require('events').EventEmitter.defaultMaxListeners = 500;

// ⚠️ අනිවාර්යයෙන්ම Router වලට කලින් BodyParser තිබිය යුතුය
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = require('./qr');
const code = require('./pair');

app.use('/server', server);
app.use('/', code); // Pair.js එක කෙලින්ම මූලික ලිපිනයට සම්බන්ධ කලා

app.use('/pair', async (req, res) => {
    res.sendFile(path.join(process.cwd(), 'pair.html'));
});

app.use('/qr', async (req, res) => {
    res.sendFile(path.join(process.cwd(), 'qr.html'));
});

app.use('/main', async (req, res) => {
    res.sendFile(path.join(process.cwd(), 'main.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
