import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rolePath = path.join(__dirname, '../../database/role.json')

let handler = async (m, { args, notifReply }) => {
    const number = (args[0] || '').replace(/\D/g, '')

    if (!number) {
        return notifReply('Contoh:\n.delowner 628xxxxxxxxxx', 'Delete Owner')
    }

    const role = JSON.parse(fs.readFileSync(rolePath, 'utf8'))

    role.owner ??= []

    if (!role.owner.includes(number)) {
        return notifReply('Nomor tidak ditemukan.', 'Delete Owner')
    }

    role.owner = role.owner.filter(v => v !== number)

    fs.writeFileSync(rolePath, JSON.stringify(role, null, 2))

    await notifReply(`Berhasil menghapus ${number} dari Owner.`, 'Delete Owner')
}

handler.command = ['delowner']
handler.creator = true

export default handler