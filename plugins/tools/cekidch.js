import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

let handler = async (m, { conn, args }) => {
    if (!args[0]) {
        return conn.reply(
            m.chat,
            'Contoh:\n.idch https://whatsapp.com/channel/xxxxxxxx',
            m
        )
    }

    try {
        const code = args[0]
            .split('/channel/')[1]
            ?.split('?')[0]
            ?.split('/')[0]

        if (!code) {
            return conn.reply(
                m.chat,
                'Link channel tidak valid',
                m
            )
        }

        const res = await conn.newsletterMetadata(
            'invite',
            code
        ).catch(() => null)

        if (!res) {
            return conn.reply(
                m.chat,
                'Channel tidak ditemukan',
                m
            )
        }

        const teks = `*CHANNEL INFORMATION*

• Nama : ${res.name || '-'}
• ID Channel : ${res.id || '-'}
• Pengikut : ${res.subscribers || 0}
• Status : ${res.state || '-'}
• Verified : ${res.verification === 'VERIFIED' ? 'Ya' : 'Tidak'}

LevviCode`

        const msg = generateWAMessageFromContent(
            m.chat,
            {
                viewOnceMessage: {
                    message: {
                        interactiveMessage:
                            proto.Message.InteractiveMessage.create({
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

                                            buttonParamsJson:
                                                JSON.stringify({
                                                    display_text:
                                                        'Copy ID Channel',

                                                    copy_code:
                                                        res.id || ''
                                                })
                                        }
                                    ]
                                }
                            })
                    }
                }
            },
            {
                userJid: conn.user.id,
                quoted: m
            }
        )

        await conn.relayMessage(
            m.chat,
            msg.message,
            {
                messageId: msg.key.id
            }
        )

    } catch (e) {
        console.error(e)

        await conn.reply(
            m.chat,
            `Gagal mengambil data channel\n\n${e.message}`,
            m
        )
    }
}

handler.command = [
    'idch',
    'cekidch'
]

export default handler