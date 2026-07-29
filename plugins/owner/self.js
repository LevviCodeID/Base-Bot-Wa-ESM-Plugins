import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.join(__dirname, '../../config.json')

let handler = async (m, { notifReply }) => {
    const config = JSON.parse(fs.readFileSync(configPath))
    config.botMode = 'self'
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    await notifReply('Bot mode berhasil diubah ke Self.', 'Mode Self')
}

handler.command = ['self']
handler.owner = true

export default handler