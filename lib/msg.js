import path from 'path';
import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';
import * as baileys from '@whiskeysockets/baileys';

let _makeWaSocket = baileys.default;
if (typeof _makeWaSocket !== 'function') {
    _makeWaSocket = baileys.makeWASocket;
}
if (typeof _makeWaSocket !== 'function') {
    _makeWaSocket = baileys.makeSocket;
}
if (typeof _makeWaSocket !== 'function' && baileys.default && typeof baileys.default === 'object') {
    _makeWaSocket = baileys.default.default || baileys.default.makeWASocket || baileys.default.makeSocket;
}
if (typeof _makeWaSocket !== 'function') {
    throw new Error(`makeWASocket not found in Baileys. Available exports: ${Object.keys(baileys).join(', ')}`);
}

const { downloadContentFromMessage, jidDecode, areJidsSameUser } = baileys;

export function makeWASocket(connectionOptions, options = {}) {
    let conn = _makeWaSocket(connectionOptions);

    conn.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
        } else return jid;
    };

    conn.reply = (jid, text, m, options) => {
        return conn.sendMessage(jid, { text: text }, { quoted: m, ...options });
    };

    conn.getFile = async (PATH, saveToFile = false) => {
        let res, filename;
        const data = Buffer.isBuffer(PATH)
            ? PATH
            : PATH instanceof ArrayBuffer
                ? Buffer.from(PATH)
                : /^data:.*?\/.*?;base64,/i.test(PATH)
                    ? Buffer.from(PATH.split`,`[1], 'base64')
                    : /^https?:\/\//.test(PATH)
                        ? (res = await fetch(PATH), Buffer.from(await res.arrayBuffer()))
                        : fs.existsSync(PATH)
                            ? (filename = PATH, fs.readFileSync(PATH))
                            : typeof PATH === 'string'
                                ? Buffer.from(PATH)
                                : Buffer.alloc(0);
        if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer');
        const type = await fileTypeFromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' };
        if (data && saveToFile && !filename) {
            const tmpDir = './tmp';
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
            filename = path.join(tmpDir, `${Date.now()}.${type.ext}`);
            fs.writeFileSync(filename, data);
        }
        return {
            res,
            filename,
            ...type,
            data,
            deleteFile() {
                return filename && fs.unlinkSync(filename);
            }
        };
    };

    conn.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
        let type = await conn.getFile(path, true);
        let { res, data: file, filename: pathFile } = type;
        if (res && res.status !== 200) {
            try {
                const errJson = JSON.parse(file.toString());
                throw { json: errJson };
            } catch (e) {
                throw e;
            }
        }
        const fileSize = fs.statSync(pathFile).size / 1024 / 1024;
        if (fileSize >= 100) throw new Error('File size is too big!');
        let opt = {};
        if (quoted) opt.quoted = quoted;
        if (!type.mime || type.mime === 'application/octet-stream') options.asDocument = true;
        let mtype = '', mimetype = options.mimetype || type.mime;
        if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker';
        else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image';
        else if (/video/.test(type.mime)) mtype = 'video';
        else if (/audio/.test(type.mime)) mtype = 'audio';
        else mtype = 'document';
        if (options.asDocument) mtype = 'document';

        let message = {
            ...options,
            caption,
            ptt,
            [mtype]: { url: pathFile },
            mimetype,
            fileName: filename || pathFile.split('/').pop()
        };
        let m;
        try {
            m = await conn.sendMessage(jid, message, { ...opt, ...options });
        } catch (e) {
            m = null;
        } finally {
            if (!m) m = await conn.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options });
            return m;
        }
    };

    conn.downloadM = async (m, type, saveToFile) => {
        let M = m.msg || m;
        let mtype = M.mtype ? M.mtype.replace(/Message/i, '') : type;
        let message = M.message ? M.message[mtype] : M;
        let stream = await downloadContentFromMessage(message, mtype);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        if (saveToFile) {
            let ran = Math.floor(Math.random() * 100000);
            let ext = message.mimetype.split('/')[1];
            let filename = path.join('./tmp', `${ran}.${ext}`);
            fs.writeFileSync(filename, buffer);
            return filename;
        }
        return buffer;
    };

    conn.resolveLidToJid = conn.resolveLidToJid || (async (lid) => lid);

    return conn;
}

function extractRealMessage(msg) {
    if (!msg) return null;
    if (msg.ephemeralMessage) return extractRealMessage(msg.ephemeralMessage.message);
    if (msg.viewOnceMessage) return extractRealMessage(msg.viewOnceMessage.message);
    if (msg.viewOnceMessageV2) return extractRealMessage(msg.viewOnceMessageV2.message);
    if (msg.documentWithCaptionMessage) return extractRealMessage(msg.documentWithCaptionMessage.message);
    if (msg.editedMessage) return extractRealMessage(msg.editedMessage.message);
    if (msg.botForwardedMessage) return extractRealMessage(msg.botForwardedMessage.message);
    return msg;
}

export async function smsg(conn, m) {
    if (!m) return m;
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '');

        if (m.sender.endsWith('@lid')) {
            const originalSender = m.sender;
            if (m.isGroup) {
                let meta = conn.chats[m.chat]?.metadata || await conn.groupMetadata(m.chat).catch(() => null);
                const p = meta?.participants?.find(u => u.lid === m.sender);
                if (p) {
                    m.sender = p.id;
                }
            } else {
                m.sender = await conn.resolveLidToJid(m.sender);
            }
        }

        if (m.chat.endsWith('@lid') && !m.isGroup) {
            const originalChat = m.chat;
            m.chat = await conn.resolveLidToJid(m.chat);
        }
    }

    if (m.message) {
        m.mtype = Object.keys(m.message)[0];
        m.msg = m.message[m.mtype];
        if (m.mtype === 'viewOnceMessageV2') {
            m.msg = m.message.viewOnceMessageV2.message;
            m.mtype = Object.keys(m.msg)[0];
            m.msg = m.msg[m.mtype];
        }
        let text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || '';
        m.text = typeof m.msg === 'string' ? m.msg : text;
        m.download = (saveToFile = false) => conn.downloadM(m, m.mtype.replace(/Message/i, ''), saveToFile);

        let mentioned = [];
        if (m.msg?.contextInfo?.mentionedJid) {
            mentioned = m.msg.contextInfo.mentionedJid;
        } else if (m.message?.[m.mtype]?.contextInfo?.mentionedJid) {
            mentioned = m.message[m.mtype].contextInfo.mentionedJid;
        }
        m.mentionedJid = mentioned.map(jid => conn.decodeJid(jid));

        let quotedRaw = null;
        if (m.msg?.contextInfo?.quotedMessage) {
            quotedRaw = m.msg.contextInfo.quotedMessage;
        } else if (m.msg?.messageContextInfo?.quotedMessage) {
            quotedRaw = m.msg.messageContextInfo.quotedMessage;
        } else if (m.message?.contextInfo?.quotedMessage) {
            quotedRaw = m.message.contextInfo.quotedMessage;
        } else if (m.message?.messageContextInfo?.quotedMessage) {
            quotedRaw = m.message.messageContextInfo.quotedMessage;
        }

        if (!quotedRaw && m.msg?.botForwardedMessage) {
            const botMsg = m.msg.botForwardedMessage.message;
            if (botMsg?.richResponseMessage?.contextInfo?.quotedMessage) {
                quotedRaw = botMsg.richResponseMessage.contextInfo.quotedMessage;
            }
        }

        if (quotedRaw) {
            let realQuoted = extractRealMessage(quotedRaw);
            if (!realQuoted) {
                m.quoted = null;
            } else {
                let type = Object.keys(realQuoted)[0];
                let quotedContent = realQuoted[type];
                if (!quotedContent) {
                    m.quoted = null;
                } else {
                    let quotedObj = {};
                    if (typeof quotedContent === 'string') {
                        quotedObj = { text: quotedContent };
                    } else if (quotedContent && typeof quotedContent === 'object') {
                        quotedObj = { ...quotedContent };
                    } else {
                        quotedObj = { text: '' };
                    }

                    quotedObj.mtype = type;
                    quotedObj.id = m.msg.contextInfo?.stanzaId || m.message?.contextInfo?.stanzaId || null;
                    quotedObj.chat = m.msg.contextInfo?.remoteJid || m.message?.contextInfo?.remoteJid || m.chat;
                    quotedObj.sender = conn.decodeJid(m.msg.contextInfo?.participant || m.message?.contextInfo?.participant);

                    if (quotedObj.sender && quotedObj.sender.endsWith('@lid')) {
                        const originalQuotedSender = quotedObj.sender;
                        if (m.isGroup) {
                            let meta = conn.chats[m.chat]?.metadata || await conn.groupMetadata(m.chat).catch(() => null);
                            const p = meta?.participants?.find(u => u.lid === quotedObj.sender);
                            if (p) {
                                quotedObj.sender = p.id;
                            }
                        } else {
                            quotedObj.sender = await conn.resolveLidToJid(quotedObj.sender);
                        }
                    }

                    if (quotedObj.chat && quotedObj.chat.endsWith('@lid') && !m.isGroup) {
                        const originalQuotedChat = quotedObj.chat;
                        quotedObj.chat = await conn.resolveLidToJid(quotedObj.chat);
                    }

                    quotedObj.fromMe = areJidsSameUser(quotedObj.sender, conn.decodeJid(conn.user.id));
                    quotedObj.text = quotedObj.text || quotedObj.caption || '';
                    quotedObj.reply = (text, chatId, options) => conn.reply(chatId ? chatId : m.chat, text, m.quoted, options);
                    quotedObj.download = (saveToFile = false) => conn.downloadM(quotedObj, quotedObj.mtype.replace(/Message/i, ''), saveToFile);

                    m.quoted = quotedObj;
                }
            }
        } else {
            m.quoted = null;
        }
    }
    m.reply = (text, chatId, options) => conn.reply(chatId ? chatId : m.chat, text, m, options);
    return m;
}

export function bind(conn) {
    if (!conn.chats) conn.chats = {};
    if (!conn.contacts) conn.contacts = {};

    function updateNameToDb(contacts) {
        if (!contacts) return;
        try {
            contacts = contacts.contacts || contacts;
            for (const contact of contacts) {
                const id = conn.decodeJid(contact.id);
                if (!id || id === 'status@broadcast') continue;

                let chats = conn.chats[id];
                if (!chats) chats = conn.chats[id] = { ...contact, id };
                conn.chats[id] = {
                    ...chats,
                    ...contact,
                    ...(id.endsWith('@g.us') ?
                        { subject: contact.subject || contact.name || chats.subject || '' } :
                        { name: contact.notify || contact.name || chats.name || chats.notify || '' })
                };

                conn.contacts[id] = {
                    ...conn.contacts[id],
                    ...contact
                };
            }
        } catch (e) {}
    }

    conn.ev.on('contacts.upsert', updateNameToDb);
    conn.ev.on('contacts.update', updateNameToDb);
    conn.ev.on('contacts.set', updateNameToDb);
    conn.ev.on('groups.update', updateNameToDb);

    conn.ev.on('messages.reaction', (reactions) => {
        try {
            for (const reaction of reactions) {
                if (reaction.key?.participant) {
                    const jid = conn.decodeJid(reaction.key.participant);
                    if (jid && !conn.contacts[jid]) {
                        conn.contacts[jid] = { id: jid };
                    }
                }
            }
        } catch (e) {}
    });

    conn.ev.on('chats.set', async ({ chats }) => {
        try {
            for (let { id, name, readOnly } of chats) {
                id = conn.decodeJid(id);
                if (!id || id === 'status@broadcast') continue;
                const isGroup = id.endsWith('@g.us');
                let localChats = conn.chats[id];
                if (!localChats) localChats = conn.chats[id] = { id };
                localChats.isChats = !readOnly;
                if (name) localChats[isGroup ? 'subject' : 'name'] = name;
                if (isGroup) {
                    const metadata = await conn.groupMetadata(id).catch(_ => null);
                    if (name || metadata?.subject) localChats.subject = name || metadata.subject;
                    if (!metadata) continue;
                    localChats.metadata = metadata;
                }
            }
        } catch (e) {}
    });

    conn.ev.on('group-participants.update', async function updateParticipantsToDb({ id, participants, action }) {
        if (!id) return;
        id = conn.decodeJid(id);
        if (id === 'status@broadcast') return;
        if (!(id in conn.chats)) conn.chats[id] = { id };
        let localChats = conn.chats[id];
        localChats.isChats = true;
        const groupMetadata = await conn.groupMetadata(id).catch(_ => null);
        if (!groupMetadata) return;
        localChats.subject = groupMetadata.subject;
        localChats.metadata = groupMetadata;
    });

    if (conn.user) {
        conn.contacts[conn.user.id] = {
            id: conn.user.id,
            name: conn.user.name,
            notify: conn.user.name
        };
    }
}