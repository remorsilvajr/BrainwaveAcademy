const WORDS = ['Maple', 'Tiger', 'River', 'Comet', 'Coral', 'Amber', 'Lunar', 'Sunny', 'Cedar', 'Pixel']

export function generateTempPassword() {
  const w1 = WORDS[Math.floor(Math.random() * WORDS.length)]
  const w2 = WORDS[Math.floor(Math.random() * WORDS.length)]
  const num = Math.floor(100 + Math.random() * 900)
  return `${w1}${w2}${num}`
}
