const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js')
const { categoryMap } = require('../config/categoryMap')

const verificationSessions = new Map()

function getOrCreateSession(userId) {
  if (!verificationSessions.has(userId)) {
    verificationSessions.set(userId, {
      basic: {
        location: '',
        tiktokHandle: '',
        profileLink: '',
        email: '',
        otherPlatforms: 'Not provided'
      },
      selections: {
        newsletter: '',
        category: ''
      }
    })
  }

  return verificationSessions.get(userId)
}

async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred) {
      return await interaction.editReply(payload)
    }
    if (interaction.replied) {
      return await interaction.followUp({ ...payload, ephemeral: true })
    }
    return await interaction.reply(payload)
  } catch (error) {
    console.error('SAFE REPLY ERROR:', error)
  }
}

async function handleSetupVerify(interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'setupverify') {
    return false
  }

  console.log('STEP: /setupverify')

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await safeReply(interaction, {
      content: 'You do not have permission to use /setupverify.',
      ephemeral: true
    })
    return true
  }

  const verifyButton = new ButtonBuilder()
    .setCustomId('verify_button')
    .setLabel('Verify')
    .setStyle(ButtonStyle.Primary)

  const row = new ActionRowBuilder().addComponents(verifyButton)

  await safeReply(interaction, {
    content: 'Click the button below to begin verification.',
    components: [row]
  })

  return true
}

async function handleVerifyButton(interaction) {
  if (!interaction.isButton() || interaction.customId !== 'verify_button') {
    return false
  }

  console.log('STEP: verify_button clicked by', interaction.user.tag)

  try {
    const modal = new ModalBuilder()
      .setCustomId('verify_form')
      .setTitle('Verification Form')

    const locationInput = new TextInputBuilder()
      .setCustomId('location')
      .setLabel('Location: city and state')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const tiktokHandleInput = new TextInputBuilder()
      .setCustomId('tiktok_handle')
      .setLabel('TikTok Handle')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const profileLinkInput = new TextInputBuilder()
      .setCustomId('profile_link')
      .setLabel('Profile Link')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const emailInput = new TextInputBuilder()
      .setCustomId('email')
      .setLabel('Email')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const otherPlatformsInput = new TextInputBuilder()
      .setCustomId('other_platforms')
      .setLabel('Want to share other platforms?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setPlaceholder('Instagram:\nYouTube:')

    modal.addComponents(
      new ActionRowBuilder().addComponents(locationInput),
      new ActionRowBuilder().addComponents(tiktokHandleInput),
      new ActionRowBuilder().addComponents(profileLinkInput),
      new ActionRowBuilder().addComponents(emailInput),
      new ActionRowBuilder().addComponents(otherPlatformsInput)
    )

    await interaction.showModal(modal)
  } catch (error) {
    console.error('VERIFY BUTTON ERROR:', error)
    await safeReply(interaction, {
      content: 'The verification modal failed to open.',
      ephemeral: true
    })
  }

  return true
}

async function handleVerifyFormSubmit(interaction) {
  if (!interaction.isModalSubmit() || interaction.customId !== 'verify_form') {
    return false
  }

  console.log('STEP: verify_form submitted by', interaction.user.tag)

  try {
    const session = getOrCreateSession(interaction.user.id)

    session.basic = {
      location: interaction.fields.getTextInputValue('location').trim(),
      tiktokHandle: interaction.fields.getTextInputValue('tiktok_handle').trim(),
      profileLink: interaction.fields.getTextInputValue('profile_link').trim(),
      email: interaction.fields.getTextInputValue('email').trim(),
      otherPlatforms: interaction.fields.getTextInputValue('other_platforms').trim() || 'Not provided'
    }

    verificationSessions.set(interaction.user.id, session)

    const newsletterSelect = new StringSelectMenuBuilder()
      .setCustomId('newsletter_select')
      .setPlaceholder('Opt in for newsletter?')
      .addOptions(
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      )

    const categorySelect = new StringSelectMenuBuilder()
      .setCustomId('category_select')
      .setPlaceholder('Select your preferred category')
      .addOptions(
        { label: 'Beauty & Personal Care', value: 'beauty' },
        { label: 'Health & Wellness', value: 'health' },
        { label: 'Fashion & Style', value: 'fashion' },
        { label: 'Sports & Outdoor', value: 'sports' },
        { label: 'Home', value: 'home' },
        { label: 'Auto', value: 'auto' },
        { label: 'Tech, Office & Books', value: 'tech' },
        { label: 'Pet Supplies', value: 'pet' }
      )

    const submitButton = new ButtonBuilder()
      .setCustomId('submit_verification')
      .setLabel('Submit Verification')
      .setStyle(ButtonStyle.Success)

    await safeReply(interaction, {
      content: 'Step 2: make all dropdown selections, then click Submit Verification.',
      components: [
        new ActionRowBuilder().addComponents(newsletterSelect),
        new ActionRowBuilder().addComponents(categorySelect),
        new ActionRowBuilder().addComponents(submitButton)
      ],
      ephemeral: true
    })
  } catch (error) {
    console.error('VERIFY FORM SUBMIT ERROR:', error)
    await safeReply(interaction, {
      content: 'Step 1 failed during submit.',
      ephemeral: true
    })
  }

  return true
}

async function handleSelectMenus(interaction) {
  if (!interaction.isStringSelectMenu()) return false

  console.log('STEP: select menu', interaction.customId, 'by', interaction.user.tag)

  try {
    const session = verificationSessions.get(interaction.user.id)
    if (!session) {
      await safeReply(interaction, {
        content: 'Your verification session expired. Please click Verify and start again.',
        ephemeral: true
      })
      return true
    }

    if (interaction.customId === 'newsletter_select') {
      session.selections.newsletter = interaction.values[0]
    } else if (interaction.customId === 'category_select') {
      session.selections.category = interaction.values[0]
    } else {
      return false
    }

    verificationSessions.set(interaction.user.id, session)
    await interaction.deferUpdate()
  } catch (error) {
    console.error('SELECT MENU ERROR:', error)
    await safeReply(interaction, {
      content: 'A dropdown selection failed.',
      ephemeral: true
    })
  }

  return true
}

async function handleSubmitVerification(interaction) {
  if (!interaction.isButton() || interaction.customId !== 'submit_verification') {
    return false
  }

  console.log('STEP: submit_verification clicked by', interaction.user.tag)

  try {
    await interaction.deferReply({ ephemeral: true })

    const session = verificationSessions.get(interaction.user.id)
    if (!session) {
      await interaction.editReply({
        content: 'Your verification session expired. Please click Verify and start again.'
      })
      return true
    }

    console.log('SESSION DATA:', JSON.stringify(session, null, 2))

    if (!session.selections.newsletter || !session.selections.category) {
      await interaction.editReply({
        content: 'Please complete all dropdown selections before submitting.'
      })
      return true
    }

    const member = await interaction.guild.members.fetch(interaction.user.id)

    const allCategoryRoles = Object.values(categoryMap).filter(Boolean)
    console.log('CATEGORY ROLES TO RESET:', allCategoryRoles)

    if (allCategoryRoles.length > 0) {
      await member.roles.remove(allCategoryRoles, 'Reset category roles before verification')
    }

    if (process.env.ROLE_NEW) {
      console.log('REMOVING ROLE_NEW:', process.env.ROLE_NEW)
      await member.roles.remove(process.env.ROLE_NEW, 'Completed verification')
    }

    const selectedCategoryRole = categoryMap[session.selections.category]
    console.log('SELECTED CATEGORY ROLE:', selectedCategoryRole)

    if (!selectedCategoryRole) {
      await interaction.editReply({
        content: `No role is mapped for category: ${session.selections.category}. Check your category map or .env file.`
      })
      return true
    }

    await member.roles.add(selectedCategoryRole, 'Selected category during verification')

    if (process.env.LOG_CHANNEL_ID) {
      const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null)
      console.log('LOG CHANNEL FOUND:', !!logChannel)

      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send([
          '**New verification submitted**',
          `User: <@${interaction.user.id}>`,
          `Location: ${session.basic.location}`,
          `TikTok Handle: ${session.basic.tiktokHandle}`,
          `Profile Link: ${session.basic.profileLink}`,
          `Email: ${session.basic.email}`,
          `Other Platforms: ${session.basic.otherPlatforms}`,
          `Newsletter: ${session.selections.newsletter}`,
          `Category: ${session.selections.category}`
        ].join('\n'))
      }
    }

    verificationSessions.delete(interaction.user.id)

    await interaction.editReply({
      content: 'Verification complete. Your roles have been assigned.'
    })
  } catch (error) {
    console.error('SUBMIT VERIFICATION ERROR:', error)

    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Verification failed during submit. Check the terminal for the exact error.'
      }).catch(() => null)
    } else {
      await safeReply(interaction, {
        content: 'Verification failed during submit. Check the terminal for the exact error.',
        ephemeral: true
      })
    }
  }

  return true
}

async function handleVerificationInteractions(interaction) {
  return (
    (await handleSetupVerify(interaction)) ||
    (await handleVerifyButton(interaction)) ||
    (await handleVerifyFormSubmit(interaction)) ||
    (await handleSelectMenus(interaction)) ||
    (await handleSubmitVerification(interaction))
  )
}

module.exports = { handleVerificationInteractions }