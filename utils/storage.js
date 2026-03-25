const fs = require('fs')
const path = require('path')

const notesFilePath = path.join(process.cwd(), 'notes.json')
const warningsFilePath = path.join(process.cwd(), 'warnings.json')

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

module.exports = {
  loadNotes,
  saveNotes,
  loadWarnings,
  saveWarnings
}
