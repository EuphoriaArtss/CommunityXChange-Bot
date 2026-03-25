const { PermissionFlagsBits } = require('discord.js')
const {
  loadNotes,
  saveNotes,
  loadWarnings,
  saveWarnings
} = require('../utils/storage')
const { sendLogMessage } = require('../utils/sendLogMessage')

async function handleBan(interaction) {
  await interaction.deferReply({ ephemeral: true })

  if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
    await interaction.editReply({ content: 'You do not have permission to use /ban.' })
    return true
  }

  const user = interaction.options.getUser('user')
  const reason = interaction.options.getString('reason') || 'No reason provided'
  const member = await interaction.guild.members.fetch(user.id).catch(() => null)

  if (!member) {
    await interaction.editReply({ content: 'That user is not in the server.' })
    return true
  }

  if (!member.bannable) {
    await interaction.editReply({ content: 'I cannot ban that user. Check role hierarchy and permissions.' })
    return true
  }

  let dmStatus = 'User could not be DM’d.'
  try {
    await user.send(`You have been banned from **${interaction.guild.name}**.\n\nReason: ${reason}`)
    dmStatus = 'User was notified by DM.'
  } catch (error) {
    console.error('Failed to DM banned user:', error)
  }

  await member.ban({ reason })

  await sendLogMessage(
    interaction.guild,
    process.env.LEAVE_BAN_LOG_CHANNEL_ID,
    `**Ban**\nUser: ${user.tag} (${user.id})\nBy: <@${interaction.user.id}>\nReason: ${reason}\nDM Status: ${dmStatus}`
  )

  await interaction.editReply({
    content: `Banned **${user.tag}**.\n${dmStatus}`
  })

  return true
}

async function handleKick(interaction) {
  await interaction.deferReply({ ephemeral: true })

  if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
    await interaction.editReply({ content: 'You do not have permission to use /kick.' })
    return true
  }

  const user = interaction.options.getUser('user')
  const reason = interaction.options.getString('reason') || 'No reason provided'
  const member = await interaction.guild.members.fetch(user.id).catch(() => null)

  if (!member) {
    await interaction.editReply({ content: 'That user is not in the server.' })
    return true
  }

  if (!member.kickable) {
    await interaction.editReply({ content: 'I cannot kick that user. Check role hierarchy and permissions.' })
    return true
  }

  let dmStatus = 'User could not be DM’d.'
  try {
    await user.send(`You have been kicked from **${interaction.guild.name}**.\n\nReason: ${reason}`)
    dmStatus = 'User was notified by DM.'
  } catch (error) {
    console.error('Failed to DM kicked user:', error)
  }

  await member.kick(reason)

  await sendLogMessage(
    interaction.guild,
    process.env.LEAVE_BAN_LOG_CHANNEL_ID,
    `**Kick**\nUser: ${user.tag} (${user.id})\nBy: <@${interaction.user.id}>\nReason: ${reason}\nDM Status: ${dmStatus}`
  )

  await interaction.editReply({
    content: `Kicked **${user.tag}**.\n${dmStatus}`
  })

  return true
}

async function handleMute(interaction) {
  await interaction.deferReply({ ephemeral: true })

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.editReply({ content: 'You do not have permission to use /mute.' })
    return true
  }

  const user = interaction.options.getUser('user')
  const minutes = interaction.options.getInteger('minutes')
  const reason = interaction.options.getString('reason') || 'No reason provided'
  const member = await interaction.guild.members.fetch(user.id).catch(() => null)

  if (!member) {
    await interaction.editReply({ content: 'That user is not in the server.' })
    return true
  }

  if (!member.moderatable) {
    await interaction.editReply({ content: 'I cannot timeout that user. Check role hierarchy and permissions.' })
    return true
  }

  const durationMs = minutes * 60 * 1000
  const maxTimeoutMs = 28 * 24 * 60 * 60 * 1000

  if (durationMs <= 0 || durationMs > maxTimeoutMs) {
    await interaction.editReply({
      content: 'Timeout must be between 1 minute and 40320 minutes (28 days).'
    })
    return true
  }

  let dmStatus = 'User could not be DM’d.'
  try {
    await user.send(
      `You have been timed out in **${interaction.guild.name}** for **${minutes}** minute(s).\n\nReason: ${reason}`
    )
    dmStatus = 'User was notified by DM.'
  } catch (error) {
    console.error('Failed to DM timed out user:', error)
  }

  await member.timeout(durationMs, reason)

  await sendLogMessage(
    interaction.guild,
    process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
    `**Mute/Timeout**\nUser: ${user.tag} (${user.id})\nBy: <@${interaction.user.id}>\nMinutes: ${minutes}\nReason: ${reason}\nDM Status: ${dmStatus}`
  )

  await interaction.editReply({
    content: `Timed out **${user.tag}** for **${minutes}** minute(s).\n${dmStatus}`
  })

  return true
}

async function handleUnmute(interaction) {
  await interaction.deferReply({ ephemeral: true })

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.editReply({ content: 'You do not have permission to use /unmute.' })
    return true
  }

  const user = interaction.options.getUser('user')
  const reason = interaction.options.getString('reason') || 'No reason provided'
  const member = await interaction.guild.members.fetch(user.id).catch(() => null)

  if (!member) {
    await interaction.editReply({ content: 'That user is not in the server.' })
    return true
  }

  if (!member.moderatable) {
    await interaction.editReply({ content: 'I cannot remove timeout from that user.' })
    return true
  }

  let dmStatus = 'User could not be DM’d.'
  try {
    await user.send(
      `Your timeout in **${interaction.guild.name}** has been removed.\n\nReason: ${reason}`
    )
    dmStatus = 'User was notified by DM.'
  } catch (error) {
    console.error('Failed to DM unmuted user:', error)
  }

  await member.timeout(null, reason)

  await sendLogMessage(
    interaction.guild,
    process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
    `**Unmute/Remove Timeout**\nUser: ${user.tag} (${user.id})\nBy: <@${interaction.user.id}>\nReason: ${reason}\nDM Status: ${dmStatus}`
  )

  await interaction.editReply({
    content: `Removed timeout from **${user.tag}**.\n${dmStatus}`
  })

  return true
}

async function handleAddNote(interaction) {
  await interaction.deferReply({ ephemeral: true })

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.editReply({ content: 'You do not have permission to use /addnote.' })
    return true
  }

  const user = interaction.options.getUser('user')
  const note = interaction.options.getString('note')
  const notes = loadNotes()

  if (!notes[user.id]) notes[user.id] = []

  notes[user.id].push({
    note,
    addedBy: interaction.user.tag,
    addedById: interaction.user.id,
    createdAt: new Date().toISOString()
  })

  saveNotes(notes)

  await sendLogMessage(
    interaction.guild,
    process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
    `**User Note Added**\nUser: ${user.tag} (${user.id})\nBy: <@${interaction.user.id}>\nNote: ${note}`
  )

  await interaction.editReply({ content: `Added note for **${user.tag}**.` })
  return true
}

async function handleNotes(interaction) {
  await interaction.deferReply({ ephemeral: true })

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.editReply({ content: 'You do not have permission to use /notes.' })
    return true
  }

  const user = interaction.options.getUser('user')
  const notes = loadNotes()
  const userNotes = notes[user.id] || []

  if (userNotes.length === 0) {
    await interaction.editReply({ content: `No notes found for **${user.tag}**.` })
    return true
  }

  const formatted = userNotes
    .map((entry, index) => `${index + 1}. ${entry.note}\nAdded by: ${entry.addedBy}\nDate: ${entry.createdAt}`)
    .join('\n\n')

  await interaction.editReply({
    content: `**Notes for ${user.tag}:**\n\n${formatted}`
  })

  return true
}

async function handleWarn(interaction) {
  await interaction.deferReply({ ephemeral: true })

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.editReply({ content: 'You do not have permission to use /warn.' })
    return true
  }

  const user = interaction.options.getUser('user')
  const reason = interaction.options.getString('reason')
  const warnings = loadWarnings()

  if (!warnings[user.id]) warnings[user.id] = []

  warnings[user.id].push({
    reason,
    addedBy: interaction.user.tag,
    addedById: interaction.user.id,
    createdAt: new Date().toISOString()
  })

  saveWarnings(warnings)

  let dmStatus = 'User could not be DM’d.'
  try {
    await user.send(`You have received a warning in **${interaction.guild.name}**.\n\nReason: ${reason}`)
    dmStatus = 'User was notified by DM.'
  } catch (error) {
    console.error('Failed to DM warned user:', error)
  }

  await sendLogMessage(
    interaction.guild,
    process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
    `**User Warned**\nUser: ${user.tag} (${user.id})\nBy: <@${interaction.user.id}>\nReason: ${reason}\nDM Status: ${dmStatus}`
  )

  await interaction.editReply({
    content: `Warned **${user.tag}**.\n${dmStatus}`
  })

  return true
}

async function handleWarnings(interaction) {
  await interaction.deferReply({ ephemeral: true })

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.editReply({ content: 'You do not have permission to use /warnings.' })
    return true
  }

  const user = interaction.options.getUser('user')
  const warnings = loadWarnings()
  const userWarnings = warnings[user.id] || []

  if (userWarnings.length === 0) {
    await interaction.editReply({ content: `No warnings found for **${user.tag}**.` })
    return true
  }

  const formatted = userWarnings
    .map((entry, index) => `${index + 1}. ${entry.reason}\nAdded by: ${entry.addedBy}\nDate: ${entry.createdAt}`)
    .join('\n\n')

  await interaction.editReply({
    content: `**Warnings for ${user.tag}:**\n\n${formatted}`
  })

  return true
}

async function handleClearWarnings(interaction) {
  await interaction.deferReply({ ephemeral: true })

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.editReply({ content: 'You do not have permission to use /clearwarnings.' })
    return true
  }

  const user = interaction.options.getUser('user')
  const warnings = loadWarnings()

  delete warnings[user.id]
  saveWarnings(warnings)

  await sendLogMessage(
    interaction.guild,
    process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
    `**Warnings Cleared**\nUser: ${user.tag} (${user.id})\nBy: <@${interaction.user.id}>`
  )

  await interaction.editReply({
    content: `Cleared all warnings for **${user.tag}**.`
  })

  return true
}

async function handleModerationCommands(interaction) {
  if (!interaction.isChatInputCommand()) return false

  const map = {
    ban: handleBan,
    kick: handleKick,
    mute: handleMute,
    unmute: handleUnmute,
    addnote: handleAddNote,
    notes: handleNotes,
    warn: handleWarn,
    warnings: handleWarnings,
    clearwarnings: handleClearWarnings
  }

  const handler = map[interaction.commandName]
  if (!handler) return false

  await handler(interaction)
  return true
}

module.exports = { handleModerationCommands }
