import readline from 'readline'
import pino from 'pino'
import { Boom } from '@hapi/boom'
import {
    useMultiFileAuthState,
    DisconnectReason,
    Browsers
} from '@whiskeysockets/baileys'
import { smsg, makeWASocket, bind } from './lib/msg.js'
import handleMessage, { initPlugins } from './handler.js'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const question = text => new Promise(resolve => rl.question(text, resolve))

let socket
let reconnectTimer = null
let pluginsLoaded = false
let isConnecting = false

const getStatusCode = lastDisconnect => {
    try {
        if (!lastDisconnect?.error) return 0
        return Boom.isBoom(lastDisconnect.error)
            ? lastDisconnect.error.output.statusCode
            : lastDisconnect.error?.output?.statusCode || 0
    } catch {
        return 0
    }
}

function restartBot(delay = 5000) {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        start()
    }, delay)
}

async function start() {
    if (isConnecting) return
    isConnecting = true

    try {
        if (socket) {
            socket.ev.removeAllListeners()
            socket.ws?.close?.()
        }

        const { state, saveCreds } = await useMultiFileAuthState('./auth')

        socket = makeWASocket({
            auth: state,
            browser: Browsers.ubuntu('Chrome'),
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            markOnlineOnConnect: true,
        })

        bind(socket)

        if (!state.creds.registered) {
            console.log('Masukkan nomor telepon (contoh: 628x)');
            const number = await question('Sending Code to : ');
            try {
                const code = await socket.requestPairingCode(number, 'L3VIC0DE');
                console.log(`KODE PAIRING: ${code}`);
            } catch (err) {
                console.error('Gagal mengirim kode pairing:', err.message);
                process.exit(1);
            } finally {
                rl.close();
            }
        }

        socket.ev.on('creds.update', saveCreds)

        socket.ev.on('messages.upsert', async ({ messages }) => {
            if (messages.length === 0) return
            setImmediate(async () => {
                try {
                    let m = messages[0]
                    if (!m?.message || m.key.remoteJid === 'status@broadcast') return
                    m = await smsg(socket, m)
                    if (m) await handleMessage(socket, m)
                } catch (e) {}
            })
        })

        socket.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
            const statusCode = getStatusCode(lastDisconnect)
            const errorMessage = lastDisconnect?.error?.message || ''

            if (connection === 'open') {
                isConnecting = false
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer)
                    reconnectTimer = null
                }
                if (!pluginsLoaded) {
                    await initPlugins()
                    pluginsLoaded = true
                }
                return
            }

            if (connection === 'close') {
                isConnecting = false
                if (statusCode === DisconnectReason.loggedOut) return
                let delay = 5000
                if (errorMessage.includes('Stream Errored')) {
                    delay = 15000
                } else if (statusCode === DisconnectReason.connectionLost || statusCode === 0) {
                    delay = 8000
                }
                restartBot(delay)
            }
        })
        
        setInterval(() => {
            if (socket?.user && socket?.ws?.readyState === 1) {
                socket.sendPresenceUpdate('available')
            }
        }, 60000)

    } catch (e) {
        isConnecting = false
        if (!reconnectTimer) {
            restartBot(10000)
        }
    }
}

process.on('SIGINT', async () => {
    try {
        if (reconnectTimer) clearTimeout(reconnectTimer)
        socket?.ev.removeAllListeners()
        socket?.ws?.close?.()
    } catch {}
    process.exit(0)
})

start()