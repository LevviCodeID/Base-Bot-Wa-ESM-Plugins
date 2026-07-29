import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

let handler = async (m, { conn, args }) => {
    if (!args[0]) return conn.reply(m.chat, 'Contoh:\n.idch https://whatsapp.com/channel/xxxxxxxx', m)

    try {
        const code = args[0].split('/channel/')[1]
        if (!code) return conn.reply(m.chat, 'Link channel tidak valid', m)

        const res = await conn.newsletterMetadata('invite', code).catch(() => null)
        if (!res) return conn.reply(m.chat, 'Channel tidak ditemukan', m)

        const meta = res.thread_metadata || {}

        const teks = `*CHANNEL INFORMATION*

• Nama : ${meta.name?.text || '-'}
• ID Channel : ${res.id || '-'}
• Pengikut : ${meta.subscribers_count || 0}
• Status : ${res.state?.type || '-'}
• Verified : ${meta.verification === 'VERIFIED' ? 'Ya' : 'Tidak'}`

        const msg = generateWAMessageFromContent(
            m.chat,
            {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: {
                                text: teks
                            },
                            footer: {
                                text: 'LevviCode'
                            },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: 'cta_copy',
                                        buttonParamsJson: JSON.stringify({
                                            display_text: 'Copy ID Channel',
                                            copy_code: res.id
                                        })
                                    }
                                ]
                            }
                        })
                    }
                }
            },
            { userJid: conn.user.id, quoted: m }
        )

        await conn.relayMessage(m.chat, msg.message, {
            messageId: msg.key.id
        })
    } catch (e) {
        console.error(e)
        conn.reply(m.chat, 'Gagal mengambil data channel', m)
    }
}

handler.command = ['idch', 'cekidch']

export default handler