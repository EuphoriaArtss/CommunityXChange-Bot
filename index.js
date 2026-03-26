require('dotenv').config()

const { Client, GatewayIntentBits, Partials } = require('discord.js')
const { registerCoreEvents } = require('./events/registerCoreEvents')

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

client.login(process.env.DISCORD_TOKEN)
