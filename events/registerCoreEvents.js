const { Events } = require('discord.js')
const { sendLogMessage } = require('../utils/sendLogMessage')
const { handleModerationCommands } = require('../handlers/moderationHandlers')
const { handleVerificationInteractions } = require('../handlers/verificationHandlers')

function registerCoreEvents(client) {
  client.once(Events.ClientReady, () => {
    console.log(`Bot is online as ${client.user.tag}`)
  })

  client.on(Events.GuildMemberAdd, async member => {
    try {
      if (process.env.ROLE_NEW) {
        await member.roles.add(process.env.ROLE_NEW, 'New member joined server')
      }

      await sendLogMessage(
        member.guild,
        process.env.NEW_JOINERS_CHANNEL_ID,
        `Welcome ${member.user.username} to **Community XChange!** 🎉\n\nPlease complete **Verification** by clicking into <#1485518225495162951> and completing the form process.`
      )
    } catch (error) {
      console.error('Error on member join:', error)
    }
  })

  client.on(Events.GuildMemberRemove, async member => {
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

  client.on(Events.GuildBanAdd, async ban => {
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

  client.on(Events.MessageDelete, async message => {
    try {
      if (!message.guild) return
      if (message.author?.bot) return

      const content = typeof message.content === 'string' && message.content.trim().length > 0
        ? message.content.trim()
        : '[Content unavailable]'

      await sendLogMessage(
        message.guild,
        process.env.DELETE_EDIT_LOG_CHANNEL_ID,
        [
          '**Message Deleted**',
          `User: ${message.author?.tag || 'Unknown user'} (${message.author?.id || 'Unknown ID'})`,
          `Channel: ${message.channelId ? `<#${message.channelId}>` : 'Unknown channel'}`,
          `Message ID: ${message.id}`,
          `Content: ${content}`
        ].join('\n')
      )
    } catch (error) {
      console.error('Message delete log error:', error)
    }
  })

  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    try {
      if (!newMessage.guild) return
      if (newMessage.author?.bot) return

      const oldContent = typeof oldMessage.content === 'string' && oldMessage.content.trim().length > 0
        ? oldMessage.content.trim()
        : '[Old content unavailable]'

      const newContent = typeof newMessage.content === 'string' && newMessage.content.trim().length > 0
        ? newMessage.content.trim()
        : '[New content unavailable]'

      if (oldContent === newContent) return

      await sendLogMessage(
        newMessage.guild,
        process.env.DELETE_EDIT_LOG_CHANNEL_ID,
        [
          '**Message Edited**',
          `User: ${newMessage.author?.tag || 'Unknown user'} (${newMessage.author?.id || 'Unknown ID'})`,
          `Channel: ${newMessage.channelId ? `<#${newMessage.channelId}>` : 'Unknown channel'}`,
          `Before: ${oldContent}`,
          `After: ${newContent}`
        ].join('\n')
      )
    } catch (error) {
      console.error('Message edit log error:', error)
    }
  })

  client.on(Events.InteractionCreate, async interaction => {
    try {
      if (interaction.isChatInputCommand()) {
        await sendLogMessage(
          interaction.guild,
          process.env.BOT_COMMANDS_LOG_CHANNEL_ID,
          `Command used: **/${interaction.commandName}** by <@${interaction.user.id}> in <#${interaction.channelId}>`
        )
      }

      if (await handleVerificationInteractions(interaction)) return
      if (await handleModerationCommands(interaction)) return
    } catch (error) {
      console.error('GENERAL INTERACTION ERROR:', error)

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'Something went wrong.',
          ephemeral: true
        })
      } else if (interaction.isRepliable() && interaction.deferred) {
        await interaction.editReply({
          content: 'Something went wrong while processing that interaction.'
        }).catch(() => null)
      }
    }
  })
}

module.exports = { registerCoreEvents }
