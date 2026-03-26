const { ChannelType, PermissionsBitField } = require('discord.js')

async function createTicketChannel(interaction, type) {
  const guild = interaction.guild
  const user = interaction.user

  const categoryId = process.env.TICKET_CATEGORY_ID
  const staffRoleId = process.env.STAFF_ROLE_ID

  const channelName = `${type}-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '')

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      {
        id: staffRoleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ]
  })

  await interaction.reply({
    content: `Your ticket has been created: ${channel}`,
    ephemeral: true
  })

  await channel.send({
    content: `🎫 Ticket opened by ${user}\nType: **${type}**`
  })
}

module.exports = { createTicketChannel }