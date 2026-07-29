import fs from 'fs'
import Jimp from 'jimp'
import config from '../../config.json' with { type: 'json' }
import { plugins } from '../../handler.js'

let handler = async (m, { conn }) => {
    const start = Date.now()

    const image = await Jimp.read(fs.readFileSync('./src/img/menu.jpg'))
    image.resize(300, 300)
    const thumb = await image.getBufferAsync(Jimp.MIME_JPEG)

    const ping = Date.now() - start
    const runtime = process.uptime()

    const days = Math.floor(runtime / 86400)
    const hours = Math.floor((runtime % 86400) / 3600)
    const minutes = Math.floor((runtime % 3600) / 60)
    const totalPlugin = [...new Set(plugins.values())].length
    const number = m.sender.split('@')[0]

    const menu = `
乂 *BOT INFORMATION*

*Name* : ${config.botName}
*Type* : ESM - Plugin
*Dev*  : ${config.ownerName}
*Ping* : ${ping} ms
*Status* : ${config.botMode.toUpperCase()}
*Total Plugin* : ${totalPlugin}
*Uptime* : ${days} Day ${hours} Hour ${minutes} Minute

乂 *USER INFORMATION*

*Name* : ${m.pushName || '-'}
*Number* : +${number}
*Status* : ${m.isOwner ? 'Owner' : m.isPremium ? 'Premium' : 'Free'}
`.trim()

    await conn.sendMessage(
        m.chat,
        {
            buttonLocation: {
                latitude: 0,
                longitude: 0,
                name: config.botName,
                address: 'LevviCode',
                jpegThumbnail: thumb,

                text: menu,
                footer: config.ownerName,

                listButtonText: '☰ All Menu',
                listSectionTitle: 'Main Menu',

                listMenu: [
                    {
                        id: '.menu',
                        title: 'All Menu',
                        description: 'Lihat semua fitur bot'
                    }
                ],

                extraButtons: [
                    {
                        id: '.owner',
                        displayText: 'Owner'
                    }
                ]
            }
        },
        {
            quoted: m
        }
    )
}

handler.command = ['menu', 'help']

export default handler