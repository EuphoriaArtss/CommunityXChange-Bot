const { createTicketChannel } = require('../tickets/createticket')
const { closeTicket } = require('../tickets/closeticket')
const { getTicketMenu } = require('../tickets/ticketmenu')

async function handleTicketInteractions(interaction) {
  if (interaction.isButton() && interaction.customId === 'open_ticket_panel') {
    await interaction.reply(getTicketMenu())
    return true
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
    const type = interaction.values[0]
    await createTicketChannel(interaction, type)
    return true
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    await closeTicket(interaction)
    return true
  }

  return false
}

module.exports = { handleTicketInteractions } 