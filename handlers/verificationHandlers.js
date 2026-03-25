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
        handle: '',
        profileLink: '',
        email: 'Not provided'
      },
      platforms: {
        instagram: 'Not provided',
        amazon: 'Not provided',
        meta: 'Not provided',
        youtube: 'Not provided',
        other: 'Not provided'
      },
      selections: {
        newsletter: '',
        category: '',
        creatorType: ''
      }
    })
  }

  return verificationSessions.get(userId)
}

async function handleSetupVerify(interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'setupverify') {
    return false
  }

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
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

  await interaction.reply({
    content: 'Click the button below to begin verification.',
    components: [row]
  })

  return true
}

async function handleVerifyButton(interaction) {
  if (!interaction.isButton() || interaction.customId !== 'verify_button') {
    return false
  }

  const modal = new ModalBuilder()
    .setCustomId('verify_form')
    .setTitle('Verification Form - Step 1')

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
  return true
}

async function handleVerifyFormSubmit(interaction) {
  if (!interaction.isModalSubmit() || interaction.customId !== 'verify_form') {
    return false
  }

  const session = getOrCreateSession(interaction.user.id)

  session.basic = {
    location: interaction.fields.getTextInputValue('location').trim(),
    handle: interaction.fields.getTextInputValue('handle').trim(),
    profileLink: interaction.fields.getTextInputValue('profile_link').trim(),
    email: interaction.fields.getTextInputValue('email').trim() || 'Not provided'
  }

  verificationSessions.set(interaction.user.id, session)

  const continueButton = new ButtonBuilder()
    .setCustomId('continue_platforms')
    .setLabel('Continue to Platforms')
    .setStyle(ButtonStyle.Primary)

  await interaction.reply({
    content: 'Step 1 saved. Click below to open the second modal.',
    components: [new ActionRowBuilder().addComponents(continueButton)],
    ephemeral: true
  })

  return true
}

async function handleContinuePlatforms(interaction) {
  if (!interaction.isButton() || interaction.customId !== 'continue_platforms') {
    return false
  }

  if (!verificationSessions.has(interaction.user.id)) {
    await interaction.reply({
      content: 'Your verification session expired. Please click Verify and start again.',
      ephemeral: true
    })
    return true
  }

  const modal = new ModalBuilder()
    .setCustomId('platforms_form')
    .setTitle('Platform Details - Step 2')

  const instagramInput = new TextInputBuilder()
    .setCustomId('instagram')
    .setLabel('Instagram')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)

  const amazonInput = new TextInputBuilder()
    .setCustomId('amazon')
    .setLabel('Amazon')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)

  const metaInput = new TextInputBuilder()
    .setCustomId('meta')
    .setLabel('Meta')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)

  const youtubeInput = new TextInputBuilder()
    .setCustomId('youtube')
    .setLabel('YouTube')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)

  const otherInput = new TextInputBuilder()
    .setCustomId('other')
    .setLabel('Other platforms')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)

  modal.addComponents(
    new ActionRowBuilder().addComponents(instagramInput),
    new ActionRowBuilder().addComponents(amazonInput),
    new ActionRowBuilder().addComponents(metaInput),
    new ActionRowBuilder().addComponents(youtubeInput),
    new ActionRowBuilder().addComponents(otherInput)
  )

  await interaction.showModal(modal)
  return true
}

async function handlePlatformsFormSubmit(interaction) {
  if (!interaction.isModalSubmit() || interaction.customId !== 'platforms_form') {
    return false
  }

  const session = verificationSessions.get(interaction.user.id)
  if (!session) {
    await interaction.reply({
      content: 'Your verification session expired. Please click Verify and start again.',
      ephemeral: true
    })
    return true
  }

  session.platforms = {
    instagram: interaction.fields.getTextInputValue('instagram').trim() || 'Not provided',
    amazon: interaction.fields.getTextInputValue('amazon').trim() || 'Not provided',
    meta: interaction.fields.getTextInputValue('meta').trim() || 'Not provided',
    youtube: interaction.fields.getTextInputValue('youtube').trim() || 'Not provided',
    other: interaction.fields.getTextInputValue('other').trim() || 'Not provided'
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

  const creatorTypeSelect = new StringSelectMenuBuilder()
    .setCustomId('creator_type_select')
    .setPlaceholder('Select creator type')
    .addOptions(
      { label: 'UGC', value: 'ugc' },
      { label: 'TTS', value: 'tts' },
      { label: 'Both', value: 'both' }
    )

  const submitButton = new ButtonBuilder()
    .setCustomId('submit_verification')
    .setLabel('Submit Verification')
    .setStyle(ButtonStyle.Success)

  await interaction.reply({
    content: 'Step 3: make all dropdown selections, then click Submit Verification.',
    components: [
      new ActionRowBuilder().addComponents(newsletterSelect),
      new ActionRowBuilder().addComponents(categorySelect),
      new ActionRowBuilder().addComponents(creatorTypeSelect),
      new ActionRowBuilder().addComponents(submitButton)
    ],
    ephemeral: true
  })

  return true
}

async function handleSelectMenus(interaction) {
  if (!interaction.isStringSelectMenu()) return false

  const session = verificationSessions.get(interaction.user.id)
  if (!session) {
    await interaction.reply({
      content: 'Your verification session expired. Please click Verify and start again.',
      ephemeral: true
    })
    return true
  }

  if (interaction.customId === 'newsletter_select') {
    session.selections.newsletter = interaction.values[0]
  } else if (interaction.customId === 'category_select') {
    session.selections.category = interaction.values[0]
  } else if (interaction.customId === 'creator_type_select') {
    session.selections.creatorType = interaction.values[0]
  } else {
    return false
  }

  verificationSessions.set(interaction.user.id, session)
  await interaction.deferUpdate()
  return true
}

async function handleSubmitVerification(interaction) {
  if (!interaction.isButton() || interaction.customId !== 'submit_verification') {
    return false
  }

  await interaction.deferReply({ ephemeral: true })

  const session = verificationSessions.get(interaction.user.id)
  if (!session) {
    await interaction.editReply({
      content: 'Your verification session expired. Please click Verify and start again.'
    })
    return true
  }

  if (!session.selections.newsletter || !session.selections.category || !session.selections.creatorType) {
    await interaction.editReply({
      content: 'Please complete all dropdown selections before submitting.'
    })
    return true
  }

  const member = await interaction.guild.members.fetch(interaction.user.id)

  const allCategoryRoles = Object.values(categoryMap).filter(Boolean)
  if (allCategoryRoles.length > 0) {
    await member.roles.remove(allCategoryRoles, 'Reset category roles before verification')
  }

  const creatorRolesToReset = [process.env.ROLE_UGC, process.env.ROLE_CREATOR].filter(Boolean)
  if (creatorRolesToReset.length > 0) {
    await member.roles.remove(creatorRolesToReset, 'Reset creator roles before verification')
  }

  if (process.env.ROLE_NEW) {
    await member.roles.remove(process.env.ROLE_NEW, 'Completed verification')
  }

  const selectedCategoryRole = categoryMap[session.selections.category]
  if (!selectedCategoryRole) {
    await interaction.editReply({
      content: `No role is mapped for category: ${session.selections.category}. Check your .env file.`
    })
    return true
  }

  await member.roles.add(selectedCategoryRole, 'Selected category during verification')

  const creatorRolesToAdd = []
  if (session.selections.creatorType === 'ugc' && process.env.ROLE_UGC) {
    creatorRolesToAdd.push(process.env.ROLE_UGC)
  }
  if (session.selections.creatorType === 'tts' && process.env.ROLE_CREATOR) {
    creatorRolesToAdd.push(process.env.ROLE_CREATOR)
  }
  if (session.selections.creatorType === 'both') {
    if (process.env.ROLE_UGC) creatorRolesToAdd.push(process.env.ROLE_UGC)
    if (process.env.ROLE_CREATOR) creatorRolesToAdd.push(process.env.ROLE_CREATOR)
  }

  if (creatorRolesToAdd.length > 0) {
    await member.roles.add(creatorRolesToAdd, 'Selected creator type during verification')
  }

  if (process.env.LOG_CHANNEL_ID) {
    const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null)
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send([
        '**New verification submitted**',
        `User: <@${interaction.user.id}>`,
        `Location: ${session.basic.location}`,
        `Handle: ${session.basic.handle}`,
        `Profile Link: ${session.basic.profileLink}`,
        `Email: ${session.basic.email}`,
        `Instagram: ${session.platforms.instagram}`,
        `Amazon: ${session.platforms.amazon}`,
        `Meta: ${session.platforms.meta}`,
        `YouTube: ${session.platforms.youtube}`,
        `Other Platforms: ${session.platforms.other}`,
        `Newsletter: ${session.selections.newsletter}`,
        `Category: ${session.selections.category}`,
        `Creator Type: ${session.selections.creatorType}`
      ].join('\n'))
    }
  }

  verificationSessions.delete(interaction.user.id)

  await interaction.editReply({
    content: 'Verification complete. Your roles have been assigned.'
  })

  return true
}

async function handleVerificationInteractions(interaction) {
  return (
    (await handleSetupVerify(interaction)) ||
    (await handleVerifyButton(interaction)) ||
    (await handleVerifyFormSubmit(interaction)) ||
    (await handleContinuePlatforms(interaction)) ||
    (await handlePlatformsFormSubmit(interaction)) ||
    (await handleSelectMenus(interaction)) ||
    (await handleSubmitVerification(interaction))
  )
}

module.exports = { handleVerificationInteractions }
