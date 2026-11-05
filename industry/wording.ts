// Palavras que o site não usa nos textos para o leitor: cada item é [o que procurar, como corrigir].
// Depois que a IA escreve título, resumo e "Por que importa", o sistema confere; se achar, pede à IA que corrija só esses trechos.
// Liste só o que se reconhece de imediato; na dúvida, não liste (evita correções erradas).

export const READER_WORDING: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(bomb[áa]stic[oa]s?|chocantes?|imperd[íi]ve(l|is)|explosiv[oa]s?)\b/iu, "sem sensacionalismo: diga o que aconteceu"],
  [/\b(vergonhos[oa]s?|absurd[oa]s?|lament[áa]ve(l|is))\b/iu, "sem juízo de valor: atribua a opinião a quem a deu ou retire"],
  [/\bentenda\b|\bsaiba (tudo|mais)\b/iu, "título direto: diga o fato, sem chamada"],
];
