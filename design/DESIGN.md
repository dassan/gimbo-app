# Gimbo Design System — Referência de Design

Este documento consolida as diretrizes visuais e tokens de design do Gimbo, app de finanças pessoais local-first com foco em privacidade.

Use este arquivo como referência principal ao construir telas manualmente ou ao alimentar prompts de IAs geradoras de UI.

---

## 1. Princípios e Estética Geral

A linguagem visual é **acessível e calorosa, com seriedade funcional**. O Gimbo é um app de finanças para pessoas que se importam com privacidade — a interface deve transmitir confiança e clareza sem intimidar. Sombras são sutis, gradientes são proibidos, bordas são finas. Sem glassmorphism ou texturas decorativas.

- **Identidade:** O nome "Gimbo" é gíria brasileira para dinheiro. A identidade visual abraça isso — brasileira por origem, acessível por propósito, sofisticada por execução.
- **Voz da UI:** Direta e humana. Botões dizem "Nova transação", não "Registrar movimento financeiro". Labels são concisos.
- **Dark Mode:** Suportado. Superfícies padrão são claras (light mode). Fundo dark usa `Floresta 900`.
- **Público:** Usuários leigos confortáveis com tecnologia do dia a dia. A interface nunca deve exigir conhecimento técnico.

---

## 2. Tipografia

A família tipográfica principal é **Inter** (amplamente disponível, legível em telas pequenas).

- **Pesos suportados:** Regular (400), Medium (500), SemiBold (600).
- **Uso:**
  - **Títulos (Headlines):** Peso SemiBold (600), letter-spacing `-0.02em`.
  - **Corpo (Body):** Peso Regular (400), line-height `1.6`.
  - **Labels, Botões e Valores monetários:** Peso Medium (500).
  - **Valores de destaque (ex: saldo total):** Peso SemiBold (600), tamanho aumentado.
- **Nota:** Não use itálico. Não use peso 700 (bold) — o SemiBold já é suficientemente assertivo para o tom do app.
- **Case:** Sempre sentence case. Nunca ALL CAPS, exceto em labels de categoria com `letter-spacing: 0.05em` e tamanho ≤ 11px.

---

## 3. Cores e Semântica

O sistema baseia-se em 4 famílias de cores principais. A paleta remete à brasilidade de forma sutil — verde, âmbar dourado e azul são leituras sofisticadas do verde-amarelo-azul sem cair no clichê.

### Famílias de Cores

#### Floresta (Primária — Verde-musgo)
Cor âncora da marca. Transmite confiança, natureza e dinheiro sem ser óbvia.

| Token | Hex | Uso |
| :--- | :--- | :--- |
| Floresta 50 | `#D5F0E8` | Fundos de badges, ícones de conta, highlights suaves |
| Floresta 100 | `#AADFD1` | Hover em superfícies primárias claras |
| Floresta 200 | `#7FCAB8` | Barras de progresso secundárias |
| Floresta 400 | `#3D9E82` | Ícones e elementos de suporte |
| **Floresta 600** | **`#2D6A4F`** | **Cor primária da marca** — botões, nav ativa, FAB, links |
| Floresta 700 | `#1F4D38` | Hover de botão primário |
| Floresta 800 | `#143326` | Active de botão, card de saldo (fundo) |
| Floresta 900 | `#0A1F16` | Fundo dark mode, texto sobre fundos claros primários |

#### Âmbar (Acento)
Acento quente que remete ao ouro e ao calor brasileiro. Usado com moderação — no máximo uma ocorrência por tela de forma destacada.

| Token | Hex | Uso |
| :--- | :--- | :--- |
| Âmbar 50 | `#FEF3DC` | Fundos de badges de aviso, ícones de investimento |
| Âmbar 100 | `#FAE3A8` | Hover em superfícies âmbar |
| **Âmbar 400** | **`#D4A017`** | **Cor de acento** — logo ("bo"), valores de receita, CTAs de destaque |
| Âmbar 600 | `#A87B0C` | Texto sobre fundos âmbar claros, ícones de aviso |
| Âmbar 800 | `#6B4E07` | Texto em badges âmbar |

#### Petróleo (Suporte — Azul-escuro)
Usado como complemento ao verde em elementos que precisam de variação — ícones de conta, segundo tom em gráficos, links informativos.

| Token | Hex | Uso |
| :--- | :--- | :--- |
| Petróleo 50 | `#DDEAF7` | Fundos de ícones de conta bancária |
| Petróleo 200 | `#85B7EB` | Elementos de suporte em gráficos |
| **Petróleo 600** | **`#1B4F72`** | Cor de suporte — segundo tom em gráficos, links info |
| Petróleo 800 | `#0C3250` | Texto sobre fundos petróleo claros |

#### Bambu (Neutro Quente)
Substitui o cinza frio padrão. Dá calor à interface sem chamar atenção.

| Token | Hex | Uso |
| :--- | :--- | :--- |
| Bambu 50 | `#F4F5F0` | **Fundo de página** (substituto do cinza frio) |
| Bambu 100 | `#E8EAE2` | Divisores, bordas suaves |
| Bambu 200 | `#D6D8D0` | Bordas de cards e inputs |
| Bambu 400 | `#A8AA9F` | Texto de placeholder, ícones desabilitados |
| Bambu 600 | `#6B7280` | Texto secundário |
| Bambu 800 | `#374151` | Texto primário (light mode) |
| Bambu 900 | `#1A1F2E` | Texto principal escuro |

### Cores de Feedback

| Semântica | Hex | Uso |
| :--- | :--- | :--- |
| **Receita / Sucesso** | `#2D6A4F` (Floresta 600) | Valores positivos, estados de sucesso |
| **Despesa / Erro** | `#C0392B` | Valores negativos, ações destrutivas, erros |
| **Aviso** | `#D4A017` (Âmbar 400) | Alertas de limite, avisos de fatura próxima |
| **Info** | `#1B4F72` (Petróleo 600) | Tooltips informativos, links neutros |

### Aplicação Semântica

- **Fundo de página:** Bambu 50 (`#F4F5F0`)
- **Superfície de card:** Branco (`#FFFFFF`)
- **Texto principal:** Bambu 900 (`#1A1F2E`)
- **Texto secundário:** Bambu 600 (`#6B7280`)
- **Texto de hint / placeholder:** Bambu 400 (`#A8AA9F`)
- **Bordas padrão:** Bambu 200 (`#D6D8D0`)
- **Bordas de input:** Bambu 300 (`#C4C6BE`)

---

## 4. Logo

O logotipo é tipográfico, em dois tons:

```
Gim  →  Floresta 600  (#2D6A4F)
bo   →  Âmbar 400     (#D4A017)
```

- Peso: SemiBold (600)
- Tamanho mínimo: 14px
- Nunca use o logo sobre fundos que comprometam o contraste de qualquer um dos dois tons
- Em contextos monocromáticos (ex: favicon, ícone de app): usar "G" em Floresta 600

---

## 5. Espaçamento e Layout

Baseado em grid de **8px**.

- **Telas densas (listas, transações):** Padding vertical `12px`, gutters `16px`
- **Cards padrão:** Padding interno `20px`
- **Cards grandes / modais:** Padding `24px`
- **Topbar:** altura `48px`
- **FAB (botão flutuante mobile):** posição `bottom: 16px; right: 16px`
- **Content max-width:** `1200px`
- **Gap entre cards em grid:** `12px`

---

## 6. Formas e Raios (Border Radius)

Formas arredondadas e modulares. Nunca use elementos totalmente quadrados.

| Token | Valor | Uso |
| :--- | :--- | :--- |
| sm | `4px` | Checkboxes, badges pequenos, progress bars |
| md | `8px` | Inputs, cards compactos, ícones de conta |
| lg | `10px` | **Cards padrão** (uso mais comum) |
| xl | `16px` | Modais, cards grandes |
| full | `9999px` | Avatares, pills, tags, FAB |

---

## 7. Sombras e Profundidade

Sombras tintadas em Floresta 900 com opacidade. Sem sombras coloridas ou inner shadows.

| Token | Valor CSS | Uso |
| :--- | :--- | :--- |
| shadow-sm | `0 1px 3px rgba(10, 31, 22, 0.08)` | Cards em repouso |
| shadow-md | `0 4px 12px rgba(10, 31, 22, 0.12)` | Cards em hover (`+ translateY(-1px)`) |
| shadow-xl | `0 8px 32px rgba(10, 31, 22, 0.16)` | Modais e drawers |
| focus-ring | `0 0 0 3px rgba(45, 106, 79, 0.30)` | Focus ring obrigatório em todos os elementos interativos |

---

## 8. Iconografia

Biblioteca **Lucide Icons** — linha fina, minimalista, consistente com o tom do app.

- **Estilo:** Line icons, stroke `1.5px`, round caps/joins
- **Tamanhos:** `16px` (listas densas), `20px` (nav, botões), `24px` (empty states, modais)
- **Cor:** `currentColor` — herda do contexto. Nunca hardcode uma cor de ícone separada do texto circundante
- **Proibido:** Emojis como ícones funcionais

---

## 9. Componentes

### Botões

| Variante | Fundo | Texto | Hover | Active |
| :--- | :--- | :--- | :--- | :--- |
| **Primário** | Floresta 600 | Branco | Floresta 700 | Floresta 800 |
| **Acento (raro)** | Âmbar 400 | Floresta 900 | Âmbar 600 | Âmbar 800 |
| **Ghost / Secundário** | Transparente | Floresta 600 | Bambu 50 | Bambu 100 |
| **Destrutivo** | Transparente | `#C0392B` | `#FDECEA` | `#FAD0CC` |

- Sem efeito `scale` em hover/active — apenas mudança de cor
- Transições: `150ms ease-in-out`
- Border-radius: `10px` (lg)
- Padding: `10px 16px` (padrão), `8px 12px` (compacto)

### Cards

- **Fundo:** Branco (`#FFFFFF`)
- **Borda:** `0.5px` sólida Bambu 200
- **Sombra:** `shadow-sm`; hover eleva para `shadow-md + translateY(-1px)`
- **Arredondamento:** `10px`
- **Padding:** `20px` padrão

**Card de destaque (ex: Saldo):**
- Fundo Floresta 800 (`#143326`)
- Texto branco para label, branco para valor
- Sem borda

### Inputs de Formulário

- **Borda padrão:** `1px` sólida Bambu 200
- **Foco:** borda muda para Floresta 600 + focus ring `shadow-sm` verde
- **Placeholder:** Bambu 400
- **Border-radius:** `8px` (md)
- Labels sempre em sentence case

### Barras de Progresso (limite de crédito)

- **Track:** Bambu 100
- **Fill normal:** Floresta 600
- **Fill de alerta (> 80%):** Âmbar 400
- **Fill crítico (> 95%):** `#C0392B`
- **Altura:** `4px`, border-radius `4px`

### Avatares de Transação

- Círculo `28px`, border-radius `full`
- Cor de fundo: tom 50 da família do ícone (Floresta 50, Âmbar 50, Petróleo 50)
- Letra inicial em tom 600 da mesma família
- Tamanho da letra: `11px`, peso Medium

### FAB (Floating Action Button — mobile)

- Fundo: Floresta 600
- Texto/ícone: branco
- Border-radius: `full` (pill)
- Padding: `10px 20px`
- Sombra: `shadow-md`
- Label: "+ Nova transação"

---

## 10. Paleta de Gráficos

Para gráficos de pizza/donut (despesas por categoria), usar esta sequência de cores em ordem de prioridade:

1. `#2D6A4F` — Floresta 600 (primária)
2. `#1B4F72` — Petróleo 600
3. `#D4A017` — Âmbar 400
4. `#C0392B` — Vermelho (despesa)
5. `#3D9E82` — Floresta 400
6. `#A8AA9F` — Bambu 400 (categorias menores / outros)

Nunca use mais de 6 cores em um gráfico. Categorias excedentes agrupam em "Outros" com Bambu 400.
