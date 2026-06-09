export const getStopWords = (): Set<string> => new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'una', 'por', 'para',
  'con', 'sin', 'mi', 'tu', 'su', 'yo', 'que', 'es', 'son', 'me', 'tiene',
  'mucho', 'poco', 'hace', 'tengo', 'tener', 'ya', 'mas', 'menos', 'muy'
]);

export const tokenizeText = (text: string): string[] => {
  const stopWords = getStopWords();
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));
};

export const vectorizeDiagnosis = (text: string, vocab: string[], idf: number[], maxVals: number[]): number[] => {
  const tokens = tokenizeText(text);
  const termFreq = new Map<string, number>();
  tokens.forEach(t => termFreq.set(t, (termFreq.get(t) || 0) + 1));
  const raw = vocab.map((v, i) => {
    const tfVal = termFreq.get(v) || 0;
    return tfVal * (idf[i] || 1);
  });
  return raw.map((v, i) => v / (maxVals[i] || 1));
};
