import util from 'util'
import * as baileys from '@whiskeysockets/baileys'

const {
    default: makeWASocket,
    proto,
    generateWAMessageFromContent,
    generateWAMessage,
    generateWAMessageContent,
    prepareWAMessageMedia,
    downloadContentFromMessage,
    downloadAndSaveMediaMessage,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    useSingleFileAuthState,
    makeInMemoryStore,
    DisconnectReason,
    Browsers
} = baileys

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

let handler = async (m, {
    conn,
    args,
    text,
    command,
    prefix,
    notifReply
}) => {
    try {
        const code = m.text.slice(2).trim()

        const fn = new AsyncFunction(
            'conn',
            'm',
            'args',
            'text',
            'command',
            'prefix',
            'notifReply',
            'baileys',
            'makeWASocket',
            'proto',
            'generateWAMessageFromContent',
            'generateWAMessage',
            'generateWAMessageContent',
            'prepareWAMessageMedia',
            'downloadContentFromMessage',
            'downloadAndSaveMediaMessage',
            'jidNormalizedUser',
            'getContentType',
            'fetchLatestBaileysVersion',
            'useSingleFileAuthState',
            'makeInMemoryStore',
            'DisconnectReason',
            'Browsers',
            `
            return (async () => {
                ${code}
            })()
            `
        )

        let result = await fn(
            conn,
            m,
            args,
            text,
            command,
            prefix,
            notifReply,
            baileys,
            makeWASocket,
            proto,
            generateWAMessageFromContent,
            generateWAMessage,
            generateWAMessageContent,
            prepareWAMessageMedia,
            downloadContentFromMessage,
            downloadAndSaveMediaMessage,
            jidNormalizedUser,
            getContentType,
            fetchLatestBaileysVersion,
            useSingleFileAuthState,
            makeInMemoryStore,
            DisconnectReason,
            Browsers
        )

        if (typeof result !== 'string') {
            result = util.inspect(result, {
                depth: null,
                colors: false
            })
        }

        await notifReply(result || 'undefined', 'Eval Result')
    } catch (e) {
        await notifReply(util.inspect(e, {
            depth: null,
            colors: false
        }), 'Eval Error')
    }
}

handler.customPrefix = /^=>/
handler.command = new RegExp()
handler.owner = true

export default handler