import { generateWAMessage } from '@whiskeysockets/baileys'

export async function sendNotification(conn, m, title, body) {
    const textMessage = `*${title}*\n\n${body}`
    const quotedMessage = {
        key: {
            remoteJid: 'status@broadcast',
            fromMe: false,
            id: 'LevviCode',
            participant: '13135550002@s.whatsapp.net'
        },
        message: {
            locationMessage: {
                degreesLatitude: -6.200000,
                degreesLongitude: 106.816666,
                name: 'LevviCode Network',
                address: 'LevviCode Official',
                jpegThumbnail: null
            }
        }
    }
    const msg = await generateWAMessage(
        m.chat,
        { text: textMessage },
        {
            userJid: conn.user.id,
            quoted: quotedMessage
        }
    )
    await conn.relayMessage(msg.key.remoteJid, msg.message, {
        messageId: msg.key.id
    })
}