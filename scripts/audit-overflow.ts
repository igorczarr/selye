/**
 * SELYE — Auditoria Automatizada de Overflow Horizontal (Fase 0)
 * Percorre todas as rotas do sistema nos breakpoints 360, 390, 768, 1024 e 1440 px
 * e falha (exit 1) se document.documentElement.scrollWidth > window.innerWidth.
 *
 * Uso:
 *   npm run audit:overflow
 *   (Inicie o servidor com `npm run dev` ou defina AUDIT_BASE_URL=http://localhost:3000)
 */

const VIEWPORTS = [
  { width: 360, height: 800, label: "mobile-sm (360px)" },
  { width: 390, height: 844, label: "mobile-md (390px)" },
  { width: 768, height: 1024, label: "tablet (768px)" },
  { width: 1024, height: 768, label: "laptop (1024px)" },
  { width: 1440, height: 900, label: "desktop (1440px)" },
] as const;

const ROUTES = [
  "/",
  "/onboarding",
  "/treinos",
  "/treinos/novo",
  "/calendario",
  "/evolucao",
  "/comunidade",
  "/comunidade/tag/treino",
  "/comunidade/atletas",
  "/comunidade/desafios",
  "/equipes",
  "/perfil",
  "/integracoes",
  "/coach",
  "/admin",
  "/login",
  "/sign-up",
] as const;

interface OverflowOffender {
  tag: string;
  className: string;
  right: number;
  width: number;
}

async function runPlaywrightAudit(baseUrl: string) {
  let playwrightModule: any;
  try {
    const pkgName = "playwright";
    playwrightModule = await import(pkgName);
  } catch {
    console.error(
      "Playwright não encontrado em node_modules. Instale com `npm i -D playwright` para executar a auditoria headless completa."
    );
    process.exit(1);
  }

  const browser = await playwrightModule.chromium.launch({ headless: true });
  const failures: string[] = [];

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of ROUTES) {
        const url = `${baseUrl}${route}`;
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

        const result = await page.evaluate(() => {
          const innerWidth = window.innerWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const bodyScrollWidth = document.body?.scrollWidth ?? innerWidth;
          const maxScroll = Math.max(scrollWidth, bodyScrollWidth);

          const offenders: OverflowOffender[] = [];
          if (maxScroll > innerWidth) {
            const all = Array.from(document.querySelectorAll("*"));
            for (const el of all) {
              const rect = el.getBoundingClientRect();
              if (rect.right > innerWidth + 0.5) {
                offenders.push({
                  tag: el.tagName.toLowerCase(),
                  className: (el as HTMLElement).className?.toString() || "",
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                });
              }
            }
          }

          return {
            innerWidth,
            scrollWidth: maxScroll,
            overflowPx: Math.max(0, maxScroll - innerWidth),
            offenders: offenders.slice(0, 5),
          };
        });

        if (result.overflowPx > 0) {
          const msg = `[FALHA] ${route} @ ${vp.label}: scrollWidth=${result.scrollWidth}px > innerWidth=${result.innerWidth}px (+${result.overflowPx}px) | Elementos: ${JSON.stringify(result.offenders)}`;
          console.error(msg);
          failures.push(msg);
        } else {
          console.log(`✓ ${route.padEnd(22)} @ ${vp.label.padEnd(20)} -> 0px overflow`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error(
      `\nAuditoria reprovada: ${failures.length} combinação(ões) rota/viewport com scroll horizontal.`
    );
    process.exit(1);
  }

  console.log(
    `\n✓ Auditoria aprovada: ${ROUTES.length} rotas × ${VIEWPORTS.length} viewports com 0px de overflow horizontal.`
  );
}

const baseUrl = process.env.AUDIT_BASE_URL || "http://localhost:3000";
runPlaywrightAudit(baseUrl).catch((err) => {
  console.error("Erro na auditoria de overflow:", err);
  process.exit(1);
});
