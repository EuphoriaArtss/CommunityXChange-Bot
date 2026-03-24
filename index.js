require('dotenv').config()

const fs = require('fs')
const path = require('path')

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require('discord.js')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User]
})

const verificationData = new Map()
const notesFilePath = path.join(__dirname, 'notes.json')
const warningsFilePath = path.join(__dirname, 'warnings.json')

const categoryMap = {
  beauty: process.env.ROLE_BEAUTY,
  health: process.env.ROLE_HEALTH,
  fashion: process.env.ROLE_FASHION,
  sports: process.env.ROLE_SPORTS,
  home: process.env.ROLE_HOME,
  auto: process.env.ROLE_AUTO,
  tech: process.env.ROLE_TECH,
  pet: process.env.ROLE_PET
}

function loadJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {}
    const raw = fs.readFileSync(filePath, 'utf8')
    return raw ? JSON.parse(raw) : {}
  } catch (error) {
    console.error(`Failed to load ${filePath}:`, error)
    return {}
  }
}

function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  } catch (error) {
    console.error(`Failed to save ${filePath}:`, error)
  }
}

function loadNotes() {
  return loadJsonFile(notesFilePath)
}

function saveNotes(notes) {
  saveJsonFile(notesFilePath, notes)
}

function loadWarnings() {
  return loadJsonFile(warningsFilePath)
}

function saveWarnings(warnings) {
  saveJsonFile(warningsFilePath, warnings)
}

async function sendLogMessage(guild, channelId, content) {
  if (!channelId || !guild) return

  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null)
    if (channel && channel.isTextBased()) {
      await channel.send(content)
    }
  } catch (error) {
    console.error(`Failed sending log to channel ${channelId}:`, error)
  }
}

client.once(Events.ClientReady, () => {
  console.log(`Bot is online as ${client.user.tag}`)
})

// New member joins
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    if (process.env.ROLE_NEW) {
      await member.roles.add(process.env.ROLE_NEW, 'New member joined server')
    }

    await sendLogMessage(
      member.guild,
      process.env.NEW_JOINERS_CHANNEL_ID,
      `Welcome ${member.user.username} to **Community XChange!** 🎉

Please complete **Verification** by clicking into <#1485518225495162951> and completing the form process.`
    )
  } catch (error) {
    console.error('Error on member join:', error)
  }
})

// Member leaves
client.on(Events.GuildMemberRemove, async (member) => {
  try {
    await sendLogMessage(
      member.guild,
      process.env.LEAVE_BAN_LOG_CHANNEL_ID,
      `Member left the server: **${member.user.tag}** (${member.user.id})`
    )
  } catch (error) {
    console.error('GuildMemberRemove error:', error)
  }
})

// Member banned
client.on(Events.GuildBanAdd, async (ban) => {
  try {
    await sendLogMessage(
      ban.guild,
      process.env.LEAVE_BAN_LOG_CHANNEL_ID,
      `Member banned: **${ban.user.tag}** (${ban.user.id})`
    )
  } catch (error) {
    console.error('GuildBanAdd error:', error)
  }
})

// Message deleted
client.on(Events.MessageDelete, async (message) => {
  try {
    if (!message.guild) return
    if (message.author?.bot) return

    const channelMention = message.channelId
      ? `<#${message.channelId}>`
      : 'Unknown channel'

    const authorTag = message.author?.tag || 'Unknown user'
    const authorId = message.author?.id || 'Unknown ID'

    const content =
      typeof message.content === 'string' && message.content.trim().length > 0
        ? message.content.trim()
        : '[Content unavailable]'

    await sendLogMessage(
      message.guild,
      process.env.DELETE_EDIT_LOG_CHANNEL_ID,
      [
        `**Message Deleted**`,
        `User: ${authorTag} (${authorId})`,
        `Channel: ${channelMention}`,
        `Message ID: ${message.id}`,
        `Content: ${content}`
      ].join('\n')
    )
  } catch (error) {
    console.error('Message delete log error:', error)
  }
})

// Message edited
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  try {
    if (!newMessage.guild) return
    if (newMessage.author?.bot) return

    const oldContent =
      typeof oldMessage.content === 'string' && oldMessage.content.trim().length > 0
        ? oldMessage.content.trim()
        : '[Old content unavailable]'

    const newContent =
      typeof newMessage.content === 'string' && newMessage.content.trim().length > 0
        ? newMessage.content.trim()
        : '[New content unavailable]'

    if (oldContent === newContent) return

    const channelMention = newMessage.channelId
      ? `<#${newMessage.channelId}>`
      : 'Unknown channel'

    const authorTag = newMessage.author?.tag || 'Unknown user'
    const authorId = newMessage.author?.id || 'Unknown ID'

    await sendLogMessage(
      newMessage.guild,
      process.env.DELETE_EDIT_LOG_CHANNEL_ID,
      [
        `**Message Edited**`,
        `User: ${authorTag} (${authorId})`,
        `Channel: ${channelMention}`,
        `Before: ${oldContent}`,
        `After: ${newContent}`
      ].join('\n')
    )
  } catch (error) {
    console.error('Message edit log error:', error)
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Log slash commands
    if (interaction.isChatInputCommand()) {
      await sendLogMessage(
        interaction.guild,
        process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
        `Command used: **/${interaction.commandName}** by <@${interaction.user.id}> in <#${interaction.channelId}>`
      )
    }

    // /setupverify
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === 'setupverify'
    ) {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: 'You do not have permission to use /setupverify.',
          ephemeral: true
        })
        return
      }

      const verifyButton = new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Primary)

      const row = new ActionRowBuilder().addComponents(verifyButton)

      await interaction.reply({
        content: 'Click the button below to begin verification.',
        components: [row]
      })
      return
    }

   // /ban
if (
  interaction.isChatInputCommand() &&
  interaction.commandName === 'ban'
) {
  await interaction.deferReply({ ephemeral: true })

  try {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.editReply({
        content: 'You do not have permission to use /ban.'
      })
      return
    }

    const user = interaction.options.getUser('user')
    const reason = interaction.options.getString('reason') || 'No reason provided'
    const member = await interaction.guild.members.fetch(user.id).catch(() => null)

    if (!member) {
      await interaction.editReply({
        content: 'That user is not in the server.'
      })
      return
    }

    if (!member.bannable) {
      await interaction.editReply({
        content: 'I cannot ban that user. Check role hierarchy and permissions.'
      })
      return
    }

    let dmStatus = 'User could not be DM’d.'

    try {
      await user.send(
        `You have been banned from **${interaction.guild.name}**.\n\nReason: ${reason}`
      )
      dmStatus = 'User was notified by DM.'
    } catch (error) {
      console.error('Failed to DM banned user:', error)
    }

    await member.ban({ reason })

    try {
      await sendLogMessage(
        interaction.guild,
        process.env.LEAVE_BAN_LOG_CHANNEL_ID,
        `**Ban**
User: ${user.tag} (${user.id})
By: <@${interaction.user.id}>
Reason: ${reason}
DM Status: ${dmStatus}`
      )
    } catch (error) {
      console.error('Failed to send ban log:', error)
    }

    await interaction.editReply({
      content: `Banned **${user.tag}**.\n${dmStatus}`
    })
    return
  } catch (error) {
    console.error('BAN COMMAND ERROR:', error)

    await interaction.editReply({
      content: 'Something went wrong while processing /ban.'
    })
    return
  }
}
    // /kick
if (
  interaction.isChatInputCommand() &&
  interaction.commandName === 'kick'
) {
  await interaction.deferReply({ ephemeral: true })

  try {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.editReply({
        content: 'You do not have permission to use /kick.'
      })
      return
    }

    const user = interaction.options.getUser('user')
    const reason = interaction.options.getString('reason') || 'No reason provided'
    const member = await interaction.guild.members.fetch(user.id).catch(() => null)

    if (!member) {
      await interaction.editReply({
        content: 'That user is not in the server.'
      })
      return
    }

    if (!member.kickable) {
      await interaction.editReply({
        content: 'I cannot kick that user. Check role hierarchy and permissions.'
      })
      return
    }

    let dmStatus = 'User could not be DM’d.'

    try {
      await user.send(
        `You have been kicked from **${interaction.guild.name}**.\n\nReason: ${reason}`
      )
      dmStatus = 'User was notified by DM.'
    } catch (error) {
      console.error('Failed to DM kicked user:', error)
    }

    await member.kick(reason)

    try {
      await sendLogMessage(
        interaction.guild,
        process.env.LEAVE_BAN_LOG_CHANNEL_ID,
        `**Kick**
User: ${user.tag} (${user.id})
By: <@${interaction.user.id}>
Reason: ${reason}
DM Status: ${dmStatus}`
      )
    } catch (error) {
      console.error('Failed to send kick log:', error)
    }

    await interaction.editReply({
      content: `Kicked **${user.tag}**.\n${dmStatus}`
    })
    return
  } catch (error) {
    console.error('KICK COMMAND ERROR:', error)

    await interaction.editReply({
      content: 'Something went wrong while processing /kick.'
    })
    return
  }
}
    // /mute = timeout
if (
  interaction.isChatInputCommand() &&
  interaction.commandName === 'mute'
) {
  await interaction.deferReply({ ephemeral: true })

  try {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply({
        content: 'You do not have permission to use /mute.'
      })
      return
    }

    const user = interaction.options.getUser('user')
    const minutes = interaction.options.getInteger('minutes')
    const reason = interaction.options.getString('reason') || 'No reason provided'
    const member = await interaction.guild.members.fetch(user.id).catch(() => null)

    if (!member) {
      await interaction.editReply({
        content: 'That user is not in the server.'
      })
      return
    }

    if (!member.moderatable) {
      await interaction.editReply({
        content: 'I cannot timeout that user. Check role hierarchy and permissions.'
      })
      return
    }

    const durationMs = minutes * 60 * 1000
    const maxTimeoutMs = 28 * 24 * 60 * 60 * 1000

    if (durationMs <= 0 || durationMs > maxTimeoutMs) {
      await interaction.editReply({
        content: 'Timeout must be between 1 minute and 40320 minutes (28 days).'
      })
      return
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

    try {
      await sendLogMessage(
        interaction.guild,
        process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
        `**Mute/Timeout**
User: ${user.tag} (${user.id})
By: <@${interaction.user.id}>
Minutes: ${minutes}
Reason: ${reason}
DM Status: ${dmStatus}`
      )
    } catch (error) {
      console.error('Failed to send mute log:', error)
    }

    await interaction.editReply({
      content: `Timed out **${user.tag}** for **${minutes}** minute(s).\n${dmStatus}`
    })
    return
  } catch (error) {
    console.error('MUTE COMMAND ERROR:', error)

    await interaction.editReply({
      content: 'Something went wrong while processing /mute.'
    })
    return
  }
}

    // /unmute
if (
  interaction.isChatInputCommand() &&
  interaction.commandName === 'unmute'
) {
  await interaction.deferReply({ ephemeral: true })

  try {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply({
        content: 'You do not have permission to use /unmute.'
      })
      return
    }

    const user = interaction.options.getUser('user')
    const reason = interaction.options.getString('reason') || 'No reason provided'
    const member = await interaction.guild.members.fetch(user.id).catch(() => null)

    if (!member) {
      await interaction.editReply({
        content: 'That user is not in the server.'
      })
      return
    }

    if (!member.moderatable) {
      await interaction.editReply({
        content: 'I cannot remove timeout from that user.'
      })
      return
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

    try {
      await sendLogMessage(
        interaction.guild,
        process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
        `**Unmute/Remove Timeout**
User: ${user.tag} (${user.id})
By: <@${interaction.user.id}>
Reason: ${reason}
DM Status: ${dmStatus}`
      )
    } catch (error) {
      console.error('Failed to send unmute log:', error)
    }

    await interaction.editReply({
      content: `Removed timeout from **${user.tag}**.\n${dmStatus}`
    })
    return
  } catch (error) {
    console.error('UNMUTE COMMAND ERROR:', error)

    await interaction.editReply({
      content: 'Something went wrong while processing /unmute.'
    })
    return
  }
}
    // /addnote
if (
  interaction.isChatInputCommand() &&
  interaction.commandName === 'addnote'
) {
  await interaction.deferReply({ ephemeral: true })

  try {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply({
        content: 'You do not have permission to use /addnote.'
      })
      return
    }

    const user = interaction.options.getUser('user')
    const note = interaction.options.getString('note')

    const notes = loadNotes()

    if (!notes[user.id]) {
      notes[user.id] = []
    }

    notes[user.id].push({
      note,
      addedBy: interaction.user.tag,
      addedById: interaction.user.id,
      createdAt: new Date().toISOString()
    })

    saveNotes(notes)

    try {
      await sendLogMessage(
        interaction.guild,
        process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
        `**User Note Added**
User: ${user.tag} (${user.id})
By: <@${interaction.user.id}>
Note: ${note}`
      )
    } catch (error) {
      console.error('Failed to send addnote log:', error)
    }

    await interaction.editReply({
      content: `Added note for **${user.tag}**.`
    })
    return
  } catch (error) {
    console.error('ADDNOTE COMMAND ERROR:', error)

    await interaction.editReply({
      content: 'Something went wrong while processing /addnote.'
    })
    return
  }
}
// /notes
if (
  interaction.isChatInputCommand() &&
  interaction.commandName === 'notes'
) {
  await interaction.deferReply({ ephemeral: true })

  try {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply({
        content: 'You do not have permission to use /notes.'
      })
      return
    }

    const user = interaction.options.getUser('user')
    const notes = loadNotes()
    const userNotes = notes[user.id] || []

    if (userNotes.length === 0) {
      await interaction.editReply({
        content: `No notes found for **${user.tag}**.`
      })
      return
    }

    const formatted = userNotes
      .map((entry, index) => {
        return `${index + 1}. ${entry.note}
Added by: ${entry.addedBy}
Date: ${entry.createdAt}`
      })
      .join('\n\n')

    await interaction.editReply({
      content: `**Notes for ${user.tag}:**

${formatted}`
    })
    return
  } catch (error) {
    console.error('NOTES COMMAND ERROR:', error)

    await interaction.editReply({
      content: 'Something went wrong while processing /notes.'
    })
    return
  }
}

  // /warn
if (
  interaction.isChatInputCommand() &&
  interaction.commandName === 'warn'
) {
  await interaction.deferReply({ ephemeral: true })

  try {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply({
        content: 'You do not have permission to use /warn.'
      })
      return
    }

    const user = interaction.options.getUser('user')
    const reason = interaction.options.getString('reason')

    const warnings = loadWarnings()

    if (!warnings[user.id]) {
      warnings[user.id] = []
    }

    warnings[user.id].push({
      reason,
      addedBy: interaction.user.tag,
      addedById: interaction.user.id,
      createdAt: new Date().toISOString()
    })

    saveWarnings(warnings)

    let dmStatus = 'User could not be DM’d.'

    try {
      await user.send(
        `You have received a warning in **${interaction.guild.name}**.\n\nReason: ${reason}`
      )
      dmStatus = 'User was notified by DM.'
    } catch (error) {
      console.error('Failed to DM warned user:', error)
    }

    try {
      await sendLogMessage(
        interaction.guild,
        process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
        `**User Warned**
User: ${user.tag} (${user.id})
By: <@${interaction.user.id}>
Reason: ${reason}
DM Status: ${dmStatus}`
      )
    } catch (error) {
      console.error('Failed to send warn log:', error)
    }

    await interaction.editReply({
      content: `Warned **${user.tag}**.
${dmStatus}`
    })
    return
  } catch (error) {
    console.error('WARN COMMAND ERROR:', error)

    await interaction.editReply({
      content: 'Something went wrong while processing /warn.'
    })
    return
  }
}

    // /warnings
if (
  interaction.isChatInputCommand() &&
  interaction.commandName === 'warnings'
) {
  await interaction.deferReply({ ephemeral: true })

  try {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply({
        content: 'You do not have permission to use /warnings.'
      })
      return
    }

    const user = interaction.options.getUser('user')
    const warnings = loadWarnings()
    const userWarnings = warnings[user.id] || []

    if (userWarnings.length === 0) {
      await interaction.editReply({
        content: `No warnings found for **${user.tag}**.`
      })
      return
    }

    const formatted = userWarnings
      .map((entry, index) => {
        return `${index + 1}. ${entry.reason}
Added by: ${entry.addedBy}
Date: ${entry.createdAt}`
      })
      .join('\n\n')

    await interaction.editReply({
      content: `**Warnings for ${user.tag}:**

${formatted}`
    })
    return
  } catch (error) {
    console.error('WARNINGS COMMAND ERROR:', error)

    await interaction.editReply({
      content: 'Something went wrong while processing /warnings.'
    })
    return
  }
}

// /clearwarnings
if (
  interaction.isChatInputCommand() &&
  interaction.commandName === 'clearwarnings'
) {
  await interaction.deferReply({ ephemeral: true })

  try {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply({
        content: 'You do not have permission to use /clearwarnings.'
      })
      return
    }

    const user = interaction.options.getUser('user')
    const warnings = loadWarnings()

    delete warnings[user.id]
    saveWarnings(warnings)

    try {
      await sendLogMessage(
        interaction.guild,
        process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
        `**Warnings Cleared**
User: ${user.tag} (${user.id})
By: <@${interaction.user.id}>`
      )
    } catch (error) {
      console.error('Failed to send clearwarnings log:', error)
    }

    await interaction.editReply({
      content: `Cleared all warnings for **${user.tag}**.`
    })
    return
  } catch (error) {
    console.error('CLEARWARNINGS COMMAND ERROR:', error)

    await interaction.editReply({
      content: 'Something went wrong while processing /clearwarnings.'
    })
    return
  }
}

    // Verify button -> modal
    if (interaction.isButton() && interaction.customId === 'verify_button') {
      const modal = new ModalBuilder()
        .setCustomId('verify_form')
        .setTitle('Verification Form')

      const locationInput = new TextInputBuilder()
        .setCustomId('location')
        .setLabel('Location: city and state')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)

      const handleInput = new TextInputBuilder()
        .setCustomId('handle')
        .setLabel('Handle')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)

      const profileLinkInput = new TextInputBuilder()
        .setCustomId('profile_link')
        .setLabel('Profile link')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)

      const emailInput = new TextInputBuilder()
        .setCustomId('email')
        .setLabel('Email (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)

      modal.addComponents(
        new ActionRowBuilder().addComponents(locationInput),
        new ActionRowBuilder().addComponents(handleInput),
        new ActionRowBuilder().addComponents(profileLinkInput),
        new ActionRowBuilder().addComponents(emailInput)
      )

      await interaction.showModal(modal)
      return
    }

    // Modal submit -> show selects
    if (interaction.isModalSubmit() && interaction.customId === 'verify_form') {
      const location = interaction.fields.getTextInputValue('location').trim()
      const handle = interaction.fields.getTextInputValue('handle').trim()
      const profileLink = interaction.fields.getTextInputValue('profile_link').trim()
      const email = interaction.fields.getTextInputValue('email').trim() || 'Not provided'

      verificationData.set(interaction.user.id, {
        location,
        handle,
        profileLink,
        email
      })

      const newsletterSelect = new StringSelectMenuBuilder()
        .setCustomId('newsletter_select')
        .setPlaceholder('Opt in for newsletter?')
        .addOptions([
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' }
        ])

      const categorySelect = new StringSelectMenuBuilder()
        .setCustomId('category_select')
        .setPlaceholder('Select your preferred category')
        .addOptions([
          { label: 'Beauty & Personal Care', value: 'beauty' },
          { label: 'Health & Wellness', value: 'health' },
          { label: 'Fashion & Style', value: 'fashion' },
          { label: 'Sports & Outdoor', value: 'sports' },
          { label: 'Home', value: 'home' },
          { label: 'Auto', value: 'auto' },
          { label: 'Tech, Office & Books', value: 'tech' },
          { label: 'Pet Supplies', value: 'pet' }
        ])

      const creatorTypeSelect = new StringSelectMenuBuilder()
        .setCustomId('creator_type_select')
        .setPlaceholder('Select creator type')
        .addOptions([
          { label: 'UGC', value: 'ugc' },
          { label: 'TTS', value: 'tts' },
          { label: 'Both', value: 'both' }
        ])

      const submitButton = new ButtonBuilder()
        .setCustomId('submit_verification')
        .setLabel('Submit Verification')
        .setStyle(ButtonStyle.Success)

      await interaction.reply({
        content: 'Step 2: complete all selections below, then click Submit Verification.',
        components: [
          new ActionRowBuilder().addComponents(newsletterSelect),
          new ActionRowBuilder().addComponents(categorySelect),
          new ActionRowBuilder().addComponents(creatorTypeSelect),
          new ActionRowBuilder().addComponents(submitButton)
        ],
        ephemeral: true
      })

      return
    }

    // Save newsletter choice
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'newsletter_select'
    ) {
      const data = verificationData.get(interaction.user.id) || {}
      data.newsletter = interaction.values[0]
      verificationData.set(interaction.user.id, data)

      await interaction.deferUpdate()
      return
    }

    // Save category choice
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'category_select'
    ) {
      const data = verificationData.get(interaction.user.id) || {}
      data.category = interaction.values[0]
      verificationData.set(interaction.user.id, data)

      await interaction.deferUpdate()
      return
    }

    // Save creator type choice
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'creator_type_select'
    ) {
      const data = verificationData.get(interaction.user.id) || {}
      data.creatorType = interaction.values[0]
      verificationData.set(interaction.user.id, data)

      await interaction.deferUpdate()
      return
    }

    // Final verification submit
    if (interaction.isButton() && interaction.customId === 'submit_verification') {
      await interaction.deferReply({ ephemeral: true })

      try {
        const data = verificationData.get(interaction.user.id)

        if (!data) {
          await interaction.editReply({
            content: 'Your verification session expired. Please click Verify and start again.'
          })
          return
        }

        if (!data.newsletter || !data.category || !data.creatorType) {
          await interaction.editReply({
            content: 'Please complete all dropdown selections before submitting.'
          })
          return
        }

        const member = await interaction.guild.members.fetch(interaction.user.id)

        const allCategoryRoles = Object.values(categoryMap).filter(Boolean)
        if (allCategoryRoles.length > 0) {
          await member.roles.remove(allCategoryRoles, 'Reset category roles before verification')
        }

        const creatorRoles = [
          process.env.ROLE_UGC,
          process.env.ROLE_CREATOR
        ].filter(Boolean)

        if (creatorRoles.length > 0) {
          await member.roles.remove(creatorRoles, 'Reset creator roles before verification')
        }

        if (process.env.ROLE_NEW) {
          await member.roles.remove(process.env.ROLE_NEW, 'Completed verification')
        }

        const selectedCategoryRole = categoryMap[data.category]

        if (!selectedCategoryRole) {
          await interaction.editReply({
            content: `No role is associated with selected category: ${data.category}`
          })
          return
        }

        await member.roles.add(selectedCategoryRole, 'Selected category during verification')

        if (data.creatorType === 'ugc') {
          await member.roles.add(process.env.ROLE_UGC, 'Selected UGC creator type')
        } else if (data.creatorType === 'tts') {
          await member.roles.add(process.env.ROLE_CREATOR, 'Selected TTS creator type')
        } else if (data.creatorType === 'both') {
          const bothRoles = [process.env.ROLE_UGC, process.env.ROLE_CREATOR].filter(Boolean)
          await member.roles.add(bothRoles, 'Selected Both creator type')
        }

        if (process.env.LOG_CHANNEL_ID) {
          const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null)

          if (logChannel && logChannel.isTextBased()) {
            await logChannel.send([
              '**New verification submitted**',
              `User: <@${interaction.user.id}>`,
              `Location: ${data.location}`,
              `Handle: ${data.handle}`,
              `Profile Link: ${data.profileLink}`,
              `Email: ${data.email}`,
              `Newsletter: ${data.newsletter}`,
              `Category: ${data.category}`,
              `Creator Type: ${data.creatorType}`
            ].join('\n'))
          }
        }

        verificationData.delete(interaction.user.id)

        await interaction.editReply({
          content: 'Verification complete. Your roles have been assigned.'
        })
      } catch (error) {
        console.error('SUBMIT VERIFICATION ERROR:', error)

        await interaction.editReply({
          content: 'Verification failed during submit. Check the terminal for the exact error.'
        })
      }

      return
    }
  } catch (error) {
    console.error('GENERAL INTERACTION ERROR:', error)

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Something went wrong.',
        ephemeral: true
      })
    }
  }
})

client.login(process.env.DISCORD_TOKEN)