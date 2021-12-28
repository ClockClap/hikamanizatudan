const http = require('http');
http.createServer(function (req, res) {
    res.write("online");
    res.end();
}).listen(8080);

const fs = require('fs');
const {Client, Intents} = require("discord.js");

const client = new Client({ intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_PRESENCES], partials: ["CHANNEL"] });

const logChannel = '925440946135531520';
const dmLogChannel = '925444594450169986';
const submitChannel = '925441668751171644';
const ignoreChannel = '919567824849088572';
const promotionChannel = '918785158151303169';
const warnLogChannel = '925452751574564934';
const verifyChannel = '919229163242672168';

const verifiedRole = '907966809653784627';
const oldRole = '907962127363489822';
const warnRole = '925448415138181222';
const punishmentRole = '914077123910705173';

const giveOldRole = true;

const commands = {}
// const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
// for (const file of commandFiles) {
//     const command = require(`./commands/${file}`);
//     commands[command.data.name] = command;
// }

client.on('ready', async () => {
    const data = []
    for (const commandName in commands) {
        data.push(commands[commandName].data);
    }
    await client.guilds.cache.forEach(g => {
        client.application.commands.set(data, g.id);
        console.log(g.name);
    })
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setStatus('dnd');
    client.user.setActivity("Let's ルール 読みましょう！", {type: 'WATCHING'});
});

let messages = {};

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.channel.type === 'DM') {
        await message.author.send({ content: '何かありましたか？\n' +
                'このボットに対してのDMは意味がありません。\n' +
                'もし、何かサーバーのシステムについてｱｼﾞｬｽﾄﾞｩｰｲな点がありましたら、当サーバーのお問い合わせフォームまでクレームください。\n\n' +
                '**☆ヒカマニ雑談サーバー☆**\n' +
                'https://discord.gg/qeEhjYVfqb'});
        await client.channels.cache.get(dmLogChannel).send({ content: ' ', embeds: [{
                author: {
                    icon_url: `${message.author.avatarURL()}`,
                    name: `${message.author.tag}`
                },
                title: `${message.content}`,
                color: 0x33DD33
            }] });
    } else {
        if(message.channel.id === verifyChannel) {
            if (message.content.includes('discord.gg') || message.content.includes('discord.com/invite/') ||
                message.content.includes('@everyone') || message.content.includes('@here')) {
                if(!message.member.permissions.has('MANAGE_MESSAGES', true)) {
                    await message.delete();
                    await kickLog(message.author, '認証チャンネル上での宣伝及びメンション');
                    await message.member.kick();
                }
            } else if(!message.member.roles.cache.some(role => role.id === verifiedRole)) {
                await message.delete();
                await message.member.roles.add(await message.guild.roles.fetch(verifiedRole));
                if(giveOldRole) await message.member.roles.add(await message.guild.roles.fetch(oldRole));
                await message.author.send({ content: ' ', embeds: [{
                        title: '認証しました。',
                        description: 'ヒカマニ雑談サーバーの全要素が使用可能になりました。',
                        color: 0x33DD33
                    }] });
                await client.channels.cache.get(logChannel).send({ content: ' ', embeds: [{
                        author: {
                            icon_url: `${message.author.avatarURL()}`,
                            name: `${message.author.tag}`
                        },
                        title: '認証に成功しました。',
                        color: 0x33DD33
                    }] });
            }
        } else {
            if (message.channel.id !== ignoreChannel
                && !message.member.permissions.has('MANAGE_MESSAGES', true)
            ) {
                const d = new Date();
                const authorId = message.author.id;
                const member = message.member;
                const previousMsg = messages[authorId];
                let deleted = false;
                if (previousMsg) {
                    const millis = d.getMilliseconds() - previousMsg.date.getMilliseconds();
                    if (millis <= 10000 &&
                        (message.content.includes('@everyone') || message.content.includes('@here')) &&
                        (previousMsg.content.includes('@everyone') || previousMsg.content.includes('@here'))) {
                        deleted = true;
                        await message.delete();
                        if (!previousMsg.deleted) await previousMsg.message.delete();
                        await warn(member, '@everyone または @here を含むメッセージの連投');
                    }
                }
                messages[authorId] = {
                    date: d,
                    content: message.content,
                    member: message.member,
                    id: message.id,
                    message: message,
                    deleted: deleted
                };
            }
            if (message.channel.id !== ignoreChannel && message.channel.id !== promotionChannel
                && !message.member.permissions.has('MANAGE_MESSAGES', true)
            ) {
                const member = message.member;
                if (message.content.includes('discord.gg') || message.content.includes('discord.com/invite/')) {
                    await message.delete().catch(console.error);
                    await warn(member, '宣伝チャンネル以外での宣伝');
                }
            }
        }
    }
});

client.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
        const command = commands[interaction.toJSON().commandName];
        try {
            await command.execute(client, interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ embeds: [{
                    title: 'エラーが発生しました。',
                    color: 0xDD3333
                }], ephemeral: true})
        }
    }
});

async function warn(member, info) {
    await member.user.send({
        content: ' ', embeds: [{
            title: '警告',
            description: info,
            color: 0xDD3333
        }]
    });
    await client.channels.cache.get(warnLogChannel).send({
        content: ' ', embeds: [{
            author: {
                icon_url: `${member.user.avatarURL()}`,
                name: `${member.user.tag}`
            },
            title: '警告',
            description: info,
            color: 0xDD3333
        }]
    });
}

async function kickLog(author, reason) {
    await client.channels.cache.get(logChannel).send({
        content: ' ', embeds: [{
            author: {
                icon_url: `${author.avatarURL()}`,
                name: `${author.tag}`
            },
            title: 'メンバーをキック',
            description: reason,
            color: 0xDD3333
        }]
    });
}

client.login();