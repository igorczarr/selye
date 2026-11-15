# Selye — Gestão Física Pessoal

**Organizar. Registrar. Acompanhar.**

Plataforma web para prescrição de rotinas, execução de treinos em tempo real, monitoramento da razão de carga aguda:crônica (ACWR) e acompanhamento comunitário baseado em constância.

---

## Diretriz Visual & Design System

O Design System do Selye segue o conceito de **Precisão Calma** e está centralizado em `src/app/globals.css` (Tailwind CSS v4 `@theme inline`):

### 1. Tokens Cromáticos (`:root` e `[data-theme="dark"]`)
| Token | Claro (`:root`) | Escuro (`[data-theme="dark"]`) | Função |
|---|---|---|---|
| `--background` | `#f3f2ec` (Osso) | `#151c1a` (Noite) | Plano de fundo da aplicação |
| `--surface` | `#ffffff` (Branco) | `#202a27` (Grafite) | Superfície elevada de cartões e modais |
| `--foreground` | `#202a27` (Grafite) | `#f3f2ec` (Osso) | Texto primário de alto contraste |
| `--muted` | `#68746d` | `#aab2aa` (Névoa) | Texto secundário e metadados |
| `--accent-text` | `#566e61` (Profundo) | `#71877a` (Mineral) | Rótulos e destaques textuais |
| `--lima` | `#c7d977` | `#c7d977` | Acento único de marca e ação primária |
| `--border` / `line` | `#dde2da` | `#2c3733` | Divisórias e contornos sutis |

### 2. Tipografia
- **Interface (`--font-sans`):** `Inter` (`400`, `500`, `600`) — classes utilitárias `.t-h1`, `.t-h2`, `.t-h3`, `.t-aux`.
- **Dados e Metadados (`--font-mono`):** `IBM Plex Mono` com `tabular-nums` — classes `.t-data` e `.t-label`.

### 3. Primitivos de Interface (`src/app/globals.css`)
- `.card` / `.card-interactive`: contêineres com raio de `14px`, borda semântica e microinteração suave.
- `.btn`, `.btn-primary`, `.btn-dark`, `.btn-ghost`: botões com altura padrão de `40px` (`44px` em fluxos críticos de toque).
- `.input`: campos de formulário com foco acessível em anel Lima.
- `.chip`: etiquetas compactas para metadados e filtros.
- `.skeleton`: carregamento estruturado com animação shimmer.

---

## Comandos de Desenvolvimento

```bash
# Servidor de desenvolvimento
npm run dev

# Verificação de tipos TypeScript
npx tsc --noEmit

# Suíte de testes unitários do domínio (timers, ACWR, streaks, deduplicação)
npm test

# Build de produção
npm run build
```
