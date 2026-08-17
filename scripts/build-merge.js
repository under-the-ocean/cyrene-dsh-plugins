// Build the merged cyrene plugin client.js from the two existing plugins.
// Combines:
//   - skin CSS (theme token overrides) from dsh-cyrene-skin
//   - pet client (particles, gradient, Live2D, interactions, settings card)
//     from dsh-cyrene-pet
//   - adds petVisible toggle
//   - renames API/asset paths from /cyrene-pet/* to /cyrene/*
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', '..', '..')
const PET_CLIENT = path.join(ROOT, 'plugins', 'dsh-cyrene-pet', 'lib', 'client.js')
const SKIN_CLIENT = path.join(ROOT, 'plugins', 'dsh-cyrene-skin', 'lib', 'client.js')
const OUT = path.join(__dirname, '..', 'packages', 'dsh-cyrene', 'lib', 'client.js')

let pet = fs.readFileSync(PET_CLIENT, 'utf8')
let skin = fs.readFileSync(SKIN_CLIENT, 'utf8')

// 1. Extract the skin CSS array (the `var CSS = [ ... ].join('\n')` block)
const cssStart = skin.indexOf('var CSS = [')
const cssEnd = skin.indexOf("].join('\\n')", cssStart)
if (cssStart < 0 || cssEnd < 0) throw new Error('could not find skin CSS block')
let skinCssBlock = skin.slice(cssStart, cssEnd + "].join('\\n')".length)

// 2. Insert the skin CSS into the pet's CSS array. The pet CSS array starts
//    with `var CSS = [` and ends with `].join('\n')`. We inject the skin
//    token overrides right after the opening bracket.
const petCssStart = pet.indexOf('var CSS = [')
const petCssOpen = pet.indexOf('[', petCssStart)
// The skin CSS block is itself a full `var CSS = [...]` — strip the `var CSS = ` prefix
// and trailing `].join('\n')` so we can splice just the array items.
const skinItems = skinCssBlock
  .replace(/^var CSS = \[/, '')
  .replace(/\].join\('\\n'\)$/, '')

pet = pet.slice(0, petCssOpen + 1) + '\n' + skinItems + '\n' + pet.slice(petCssOpen + 1)

// 3. Rename plugin id
pet = pet.replaceAll('@dsh-local/cyrene-pet', '@dsh-local/cyrene')

// 4. Rename API paths /api/cyrene-pet/* -> /api/cyrene/*
pet = pet.replaceAll('/api/cyrene-pet/', '/api/cyrene/')

// 5. Rename asset paths /cyrene-pet/* -> /cyrene/*
pet = pet.replaceAll('/cyrene-pet/', '/cyrene/')

// 6. Update CSS tag id
pet = pet.replaceAll('@dsh-local/cyrene/pet.css', '@dsh-local/cyrene/pet.css')
pet = pet.replaceAll('cyrene-pet/pet.css', 'cyrene/pet.css')

// 7. Add petVisible to settings state and default
pet = pet.replace(
  'var petSettings = { particles: true, gradient: true, idleAnim: true, phaseMotions: true }',
  'var petSettings = { particles: true, gradient: true, idleAnim: true, phaseMotions: true, petVisible: true }'
)
pet = pet.replace(
  'var settingsState = { particles: true, gradient: true, idleAnim: true, phaseMotions: true }',
  'var settingsState = { particles: true, gradient: true, idleAnim: true, phaseMotions: true, petVisible: true }'
)

// 8. Add petVisible toggle to the settings card body
pet = pet.replace(
  "React.createElement(Toggle, { keyName: 'phaseMotions', label: '阶段动作' }),",
  "React.createElement(Toggle, { keyName: 'phaseMotions', label: '阶段动作' }),\n              React.createElement(Toggle, { keyName: 'petVisible', label: '显示桌宠' }),"
)

// 9. Make the pet root respect petVisible: hide the pet container when off.
//    Add a check in render() to not render the pet root when petVisible is false.
pet = pet.replace(
  "root.render(React.createElement('div', {\n          className: 'cyrene-pet-root',\n          style: { right: petPos.right + 'px', bottom: petPos.bottom + 'px' },\n        }, bubble, canvasWrap))",
  "if (!petSettings.petVisible) {\n          root.render(null)\n        } else {\n          root.render(React.createElement('div', {\n            className: 'cyrene-pet-root',\n            style: { right: petPos.right + 'px', bottom: petPos.bottom + 'px' },\n          }, bubble, canvasWrap))\n        }"
)

// 10. Update the settings card title/description
pet = pet.replace(
  "React.createElement('div', { style: { fontSize: '15px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, '昔涟主题'),",
  "React.createElement('div', { style: { fontSize: '15px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, '昔涟主题'),"
)
pet = pet.replace(
  "React.createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-tertiary)', marginTop: '2px' } }, '粒子、背景与动画开关'),",
  "React.createElement('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-tertiary)', marginTop: '2px' } }, '主题、粒子、桌宠开关'),"
)

fs.writeFileSync(OUT, pet, 'utf8')
console.log('merged client.js written to', OUT)
console.log('size:', pet.length)
