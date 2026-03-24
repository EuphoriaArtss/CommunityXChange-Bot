require('dotenv').config()

const { REST, Routes, SlashCommandBuilder } = require('discord.js')

const commands = [
  new SlashCommandBuilder()
    .setName('setupverify')
    .setDescription('Post the verification button'),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')
    .addUserOption(option =>
      option.setName('user').setDescription('User to ban').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for ban').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption(option =>
      option.setName('user').setDescription('User to kick').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for kick').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member')
    .addUserOption(option =>
      option.setName('user').setDescription('User to timeout').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('minutes').setDescription('Timeout length in minutes').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for timeout').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a member')
    .addUserOption(option =>
      option.setName('user').setDescription('User to unmute').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for unmute').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('addnote')
    .setDescription('Add a staff note to a user')
    .addUserOption(option =>
      option.setName('user').setDescription('User to note').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('note').setDescription('Note text').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('notes')
    .setDescription('View notes for a user')
    .addUserOption(option =>
      option.setName('user').setDescription('User to view notes for').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Add a warning to a user')
    .addUserOption(option =>
      option.setName('user').setDescription('User to warn').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Warning reason').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option =>
      option.setName('user').setDescription('User to view warnings for').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear all warnings for a user')
    .addUserOption(option =>
      option.setName('user').setDescription('User to clear warnings for').setRequired(true)
    )
].map(command => command.toJSON())

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)

;(async () => {
  try {
    console.log('Registering slash commands...')

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    )

    console.log('Slash commands registered.')
  } catch (error) {
    console.error(error)
  }
})()