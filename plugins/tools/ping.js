import os from 'os'

function formatUptime(seconds) {
    const day = Math.floor(seconds / 86400)
    const hour = Math.floor((seconds % 86400) / 3600)
    const minute = Math.floor((seconds % 3600) / 60)
    const second = Math.floor(seconds % 60)

    return `${day} Hari ${hour} Jam ${minute} Menit ${second} Detik`
}

let handler = async (m, { conn }) => {
    const start = Date.now()

    const sent = await conn.reply(m.chat, 'Mengukur ping...', m)

    const latency = Date.now() - start

    const cpus = os.cpus()
    const cpu = cpus[0]

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    const toGB = bytes => (bytes / 1024 / 1024 / 1024).toFixed(2)

    await conn.sendMessage(m.chat, {
        text: `\`DATA SERVER\`
• Latency: ${latency} ms
• Hostname : ${os.hostname()}
• Platform : ${os.platform()} ${os.arch()}
• Uptime   : ${formatUptime(os.uptime())}

\`CPU\`
• Model : ${cpu.model}
• Core  : ${cpus.length}
• Clock : ${cpu.speed} MHz
• Load  : ${os.loadavg().map(v => v.toFixed(2)).join(' | ')}

\`RAM\`
• Total      : ${toGB(totalMem)} GB
• Digunakan  : ${toGB(usedMem)} GB
• Tersisa    : ${toGB(freeMem)} GB 

`,
        edit: sent.key
    })
}

handler.command = ['ping', 'speed']

export default handler