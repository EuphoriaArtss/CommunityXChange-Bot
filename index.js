require('dotenv').config()

const { Client, GatewayIntentBits, Partials } = require('discord.js')
const { registerCoreEvents } = require('./events/registerCoreEvents')
const { getTicketPanel } = require('./tickets/ticketpanel')
 
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User]
})

registerCoreEvents(client)

client.once('ready', async () => {
  console.log(`Bot is online as ${client.user.tag}`)

  const channel = await client.channels.fetch('1486435994512392233')
  await channel.send(getTicketPanel())
})

client.login(process.env.DISCORD_TOKEN)
