async function sendLogMessage(guild, channelId, content) {
  if (!guild || !channelId) return

  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null)
    if (channel && channel.isTextBased()) {
      await channel.send(content)
    }
  } catch (error) {
    console.error(`Failed sending log to channel ${channelId}:`, error)
  }
}

module.exports = { sendLogMessage }
