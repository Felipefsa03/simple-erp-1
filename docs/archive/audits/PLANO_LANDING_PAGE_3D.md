# PLANO DETALHADO: Landing Page 3D - LuminaFlow ERP
## Estilo Apple/AirPods com Animações Imersivas

---

## 1. VISÃO GERAL

A página inicial será uma experiência visual imersiva com:
- Animações 3D no scroll (efeito parallax profundo)
- Transições suaves entre seções
- Elementos que "flutuam" e se movem com o mouse
- Texto que aparece com efeito de digitação
- Produtos/serviços que giram e se aproximam

---

## 2. TECNOLOGIAS NECESSÁRIAS

### Bibliotecas a Instalar

```bash
npm install three @react-three/fiber @react-three/drei gsap lenis
```

| Biblioteca | Função |
|---|---|
| **Three.js** | Motor 3D para WebGL |
| **@react-three/fiber** | React + Three.js |
| **@react-three/drei** | Helpers para Three.js |
| **GSAP** | Animações avançadas |
| **Lenis** | Scroll suave |

### Tecnologias Atuais (já temos)

| Tecnologia | Função |
|---|---|
| **Motion (Framer Motion)** | Animações React |
| **Tailwind CSS** | Estilização |
| **TypeScript** | Tipagem |

---

## 3. ESTRUTURA DA PÁGINA (10 Seções)

### Seção 1: Hero (Tela Inicial)
```
┌─────────────────────────────────────────┐
│  [Logo]                    [Entrar] [CTA] │
├─────────────────────────────────────────┤
│                                         │
│     "A inteligência que sua             │
│      clínica precisa"                   │
│                                         │
│     [Objeto 3D flutuando]               │
│     (Dashboard holográfico)             │
│                                         │
│     [Botão "Começar Agora"]             │
│                                         │
│     ↓ Scroll para baixo                 │
└─────────────────────────────────────────┘
```

**Animações:**
- Logo com efeito de brilho pulsante
- Título com efeito de digitação (typewriter)
- Dashboard 3D girando lentamente
- Partículas flutuando ao redor
- Scroll indicator com bounce

---

### Seção 2: Problema (Pain Points)
```
┌─────────────────────────────────────────┐
│                                         │
│  "Você perde tempo com..."              │
│                                         │
│  ❌ Planilhas confusas                  │
│  ❌ WhatsApp manual                     │
│  ❌ Controle financeiro perdido         │
│                                         │
│  [Animação: ícones quebrando/desaparecendo] │
│                                         │
└─────────────────────────────────────────┘
```

**Animações:**
- Ícones aparecem com shake (tremor)
- Texto com efeito de riscado
- Fundo com gradiente que escurece

---

### Seção 3: Solução (Hero Principal - Estilo AirPods)
```
┌─────────────────────────────────────────┐
│                                         │
│     [OBJETO 3D GRANDE]                  │
│     Dashboard/Sistema flutuando         │
│     com profundidade real               │
│                                         │
│     "LuminaFlow ERP"                    │
│     "Tudo em um lugar só"               │
│                                         │
│     [Scroll para ver features]          │
│                                         │
└─────────────────────────────────────────┘
```

**Animações (INSPIRAÇÃO AIRPODS):**
- Objeto 3D que se move com scroll (parallax profundo)
- Luz que muda de cor conforme scroll
- Texto que se aproxima ao scrollar
- Efeito de profundidade (z-axis)
- Rotação suave com mouse

---

### Seção 4: Features (Scroll 3D)
```
┌─────────────────────────────────────────┐
│                                         │
│  [Feature 1]  ←  [3D Object]           │
│  Agenda           Dashboard             │
│  Inteligente      rotacionando          │
│                                         │
│  ↓ Scroll                               │
│                                         │
│  [3D Object]  →  [Feature 2]            │
│  Prontuário       Eletrônico            │
│                   girando               │
│                                         │
└─────────────────────────────────────────┘
```

**Animações:**
- Cada feature aparece com fade + slide
- Objetos 3D rotacionam 360°
- Texto com stagger (aparece palavra por palavra)
- Transição suave entre features

---

### Seção 5: Serviços (Cards 3D)
```
┌─────────────────────────────────────────┐
│                                         │
│  [Card 3D] [Card 3D] [Card 3D]         │
│  Agenda    Prontuário Financeiro       │
│  ✨         ✨         ✨               │
│                                         │
│  [Card 3D] [Card 3D] [Card 3D]         │
│  Estoque   Marketing  WhatsApp         │
│  ✨         ✨         ✨               │
│                                         │
└─────────────────────────────────────────┘
```

**Animações:**
- Cards com efeito 3D tilt (inclinação com mouse)
- Hover: card se eleva e gira levemente
- Ícone com efeito de brilho
- Borda com gradiente animado

---

### Seção 6: Dashboard Preview (Scroll Pin)
```
┌─────────────────────────────────────────┐
│                                         │
│  "Veja como é simples"                  │
│                                         │
│  [Tela do sistema]                      │
│  Fixa na tela enquanto                  │
│  você scrolla                           │
│                                         │
│  → Seções de conteúdo                   │
│  aparecem ao lado                       │
│                                         │
└─────────────────────────────────────────┘
```

**Animações:**
- Tela fixa (pin) enquanto scrolla
- Texto aparece ao lado com fade
- Elementos do dashboard animam
- Transição entre telas do sistema

---

### Seção 7: Depoimentos (Carrossel 3D)
```
┌─────────────────────────────────────────┐
│                                         │
│  "O que dizem nossos clientes"          │
│                                         │
│  [Card] [Card] [Card] [Card]            │
│    ↑      ★      ★      ↑              │
│  menor  central central menor          │
│                                         │
│  ← Auto-play com transição suave →     │
│                                         │
└─────────────────────────────────────────┘
```

**Animações:**
- Carrossel com efeito 3D (perspectiva)
- Card central maior e mais brilhante
- Transição suave entre cards
- Auto-play com pause on hover

---

### Seção 8: Estatísticas (Contadores Animados)
```
┌─────────────────────────────────────────┐
│                                         │
│  [0 → 500+]     [0 → 50k+]            │
│   Clínicas        Pacientes             │
│                                         │
│  [0 → 98%]      [0 → 40%]              │
│   Satisfação      Menos faltas          │
│                                         │
└─────────────────────────────────────────┘
```

**Animações:**
- Números contam de 0 até o valor final
- Barras de progresso animadas
- Efeito de escala ao aparecer
- Ícones com bounce

---

### Seção 9: Planos (Cards com Efeito Glass)
```
┌─────────────────────────────────────────┐
│                                         │
│  [Básico]    [Pro ★]    [Enterprise]  │
│  R$97/mês    R$197/mês   Sob consulta │
│  ░░░░░░░░    █████████   ████████████ │
│                                         │
│  [Escolher]  [Escolher]  [Falar com   │
│                          consultor]   │
└─────────────────────────────────────────┘
```

**Animações:**
- Cards com efeito glassmorphism
- Plano "Pro" com brilho pulsante
- Hover: card se eleva com sombra
- Preço com efeito de counter

---

### Seção 10: CTA Final
```
┌─────────────────────────────────────────┐
│                                         │
│  "Pronto para transformar               │
│   sua clínica?"                         │
│                                         │
│  [Botão Grande]                         │
│  "Começar Teste Grátis de 7 Dias"       │
│                                         │
│  [Objeto 3D flutuando atrás]            │
│                                         │
└─────────────────────────────────────────┘
```

**Animações:**
- Botão com efeito de hover 3D
- Objeto 3D flutuando com parallax
- Confetes ao clicar no botão
- Texto com fade in

---

## 4. EFEITOS 3D ESPECÍFICOS

### Efeito 1: Scroll Parallax Profundo
```typescript
// Elementos se movem em diferentes velocidades
const parallaxLayers = [
  { speed: 0.2, z: -100 }, // Fundo
  { speed: 0.5, z: -50 },  // Meio
  { speed: 1.0, z: 0 },    // Frente
  { speed: 1.5, z: 50 },   // Primeiro plano
];
```

### Efeito 2: Mouse Tracking 3D
```typescript
// Objetos rotacionam com movimento do mouse
const rotation = {
  x: (mouseY / window.innerHeight - 0.5) * 10,
  y: (mouseX / window.innerWidth - 0.5) * 10,
};
```

### Efeito 3: Scroll Trigger
```typescript
// Elementos aparecem ao scrollar
gsap.to(element, {
  scrollTrigger: {
    trigger: element,
    start: "top center",
    end: "bottom center",
    scrub: true,
  },
  opacity: 1,
  y: 0,
  rotation: 0,
});
```

### Efeito 4: Texto com Stagger
```typescript
// Palavras aparecem uma por uma
gsap.from(".word", {
  stagger: 0.1,
  opacity: 0,
  y: 50,
  duration: 0.8,
});
```

### Efeito 5: Card 3D Tilt
```typescript
// Card inclina com mouse
const handleMouseMove = (e) => {
  const rect = card.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  setRotation({ x: y * 20, y: x * -20 });
};
```

---

## 5. PALETA DE CORES

```
Primário:     #06B6D4 (Cyan)
Secundário:   #3B82F6 (Blue)
Destaque:     #8B5CF6 (Purple)
Fundo:        #0F172A (Slate 900)
Claro:        #F8FAFC (Slate 50)
Gradiente:    linear-gradient(135deg, #06B6D4, #3B82F6, #8B5CF6)
```

---

## 6. TIPOGRAFIA

```
Títulos:      Inter (900 weight)
Subtítulos:   Inter (700 weight)
Corpo:        Inter (400 weight)
Destaque:     JetBrains Mono (código/números)
```

---

## 7. TIMELINE DE IMPLEMENTAÇÃO

| Fase | Dias | Entregável |
|---|---|---|
| **Fase 1** | 2 dias | Hero + Solução (Seções 1-3) |
| **Fase 2** | 2 dias | Features + Serviços (Seções 4-5) |
| **Fase 3** | 2 dias | Dashboard Preview + Depoimentos (Seções 6-7) |
| **Fase 4** | 2 dias | Estatísticas + Planos + CTA (Seções 8-10) |
| **Fase 5** | 2 dias | Animações 3D + Otimização |
| **Total** | **10 dias** | Landing Page completa |

---

## 8. PERFORMANCE

| Métrica | Meta |
|---|---|
| **First Contentful Paint** | < 1.5s |
| **Largest Contentful Paint** | < 2.5s |
| **Cumulative Layout Shift** | < 0.1 |
| **Time to Interactive** | < 3.5s |

---

## 9. RESPONSIVIDADE

| Breakpoint | Layout |
|---|---|
| **Mobile** (< 768px) | Stack vertical, simplificado |
| **Tablet** (768-1024px) | 2 colunas, 3D reduzido |
| **Desktop** (> 1024px) | Full 3D, parallax completo |

---

## 10. ACESSIBILIDADE

- Respeitar `prefers-reduced-motion`
- Texto alternativo para objetos 3D
- Navegação por teclado
- Contraste mínimo 4.5:1
- Focus visible em todos os elementos
