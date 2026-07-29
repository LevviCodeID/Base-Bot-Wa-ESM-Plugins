import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rolePath = path.join(__dirname, '../../database/role.json')

let handler = async (m, { args, notifReply }) => {
    const number = (args[0] || '').replace(/\D/g, '')

    if (!number) {
        return notifReply('Contoh:\n.addpremium 628xxxxxxxxxx', 'Add Premium')
    }

    const role = JSON.parse(fs.readFileSync(rolePath, 'utf8'))

    role.premium ??= []

    if (role.premium.includes(number)) {
        return notifReply('Nomor sudah menjadi Premium.', 'Add Premium')
    }

    role.premium.push(number)

    fs.writeFileSync(rolePath, JSON.stringify(role, null, 2))

    await notifReply(`Berhasil menambahkan ${number} sebagai Premium.`, 'Add Premium')
}

handler.command = ['addpremium']
handler.owner = true

export default handler