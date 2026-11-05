# Site

Tudo o que é próprio deste site: nome, textos, marca, páginas e quais módulos ficam ativos. Os passos estão em [Adaptar para o seu setor](../docs/customize.md).

| Arquivo | Conteúdo |
|---|---|
| `site.ts` | Nome do site, termos do setor, horário de publicação, textos da página inicial e da página Sobre, texto das imagens de compartilhamento, expressões usadas em itens e nos resumos diário, semanal e mensal, categorias da API pública, número de registro |
| `models.ts` | Modelos nomeados e qual deles cada etapa usa por padrão (etapas não listadas usam o configurado no `.env`) |
| `brand/` | Ícones, logo (`Logo.tsx`), marca tipográfica das imagens de compartilhamento e pôsteres (`wordmark.svg`, `wordmark-dark.svg`, opcionais), títulos de cabeçalho dos resumos diário, semanal e mensal (`nameplates/`), QR code da página Sobre (`contact/`, opcional) |
| `pages/` | Termos de uso e aviso de privacidade (modelos; reescreva conforme a realidade do site antes de publicar) |
| `public/` | Arquivos fixos publicados na raiz do site (depois de trocar os marcadores de nome e endereço): `robots.txt`, `manifest.webmanifest`, `openapi-v1.json` e, opcionalmente, `.well-known/security.txt` |
| `changelog.json` | Histórico de atualizações |
| `modules/` | Quais módulos ficam ativos: três listas, `index.ts`, `server.ts` e `web.ts`, com os módulos de `modules/<nome>/` na raiz do repositório que serão usados; todas vazias por padrão; veja “Módulos” em [Arquitetura](../docs/architecture.md#módulos) |
