import { promisify, inspect } from 'util'
import { exec } from 'child_process'

const shell = promisify(exec)

let handler = async (m, { conn, text, notifReply }) => {
    if (!text) {
        return notifReply('Contoh:\n$ ls', 'Shell Command')
    }

    try {
        const { stdout, stderr } = await shell(text, {
            shell: '/bin/bash',
            maxBuffer: 1024 * 1024 * 20
        })

        await notifReply(stderr || stdout || 'Done.', 'Shell Result')
    } catch (e) {
        await notifReply(e.stderr || e.stdout || inspect(e), 'Shell Error')
    }
}

handler.customPrefix = /^\$/
handler.owner = true

export default handler