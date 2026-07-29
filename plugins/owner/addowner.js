import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rolePath = path.join(__dirname, '../../database/role.json')

let handler = async (m, { args, notifReply }) => {
    const number = (args[0] || '').replace(/\D/g, '')

    if (!number) {
        return notifReply('Contoh:\n.addowner 628xxxxxxxxxx', 'Add Owner')
    }

    const role = JSON.parse(fs.readFileSync(rolePath, 'utf8'))

    role.owner ??= []

    if (role.owner.includes(number)) {
        return notifReply('Nomor sudah menjadi Owner.', 'Add Owner')
    }

    role.owner.push(number)

    fs.writeFileSync(rolePath, JSON.stringify(role, null, 2))

    await notifReply(`Berhasil menambahkan ${number} sebagai Owner.`, 'Add Owner')
}

handler.command = ['addowner']
handler.creator = true

export default handler