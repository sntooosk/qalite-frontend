# QaLite Frontend

Aplicação web construída com **React + Vite + TypeScript** integrada ao **Firebase (Auth + Firestore)** e a um backend auxiliar (Slack/BrowserStack). O foco é oferecer fluxos de autenticação, gestão de organizações/lojas e acompanhamento de ambientes de QA.

## Stack

- React 18 + Vite
- TypeScript
- Firebase Authentication + Firestore
- React Router DOM
- i18next (pt/en)
- ESLint + Prettier + Husky

## Requisitos

- Node.js 18+ (recomendado para Vite 5)
- npm (repositório utiliza `package-lock.json`)

## Instalação

```bash
npm install
npm run prepare
```

## Variáveis de ambiente

Crie um `.env` a partir do `.env.example` com as chaves abaixo:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_QALITE_SERVICE_URL=
```

`VITE_QALITE_SERVICE_URL` é usada para integrações de Slack e BrowserStack via API. Os demais valores são do projeto Firebase.

## Scripts

```bash
npm run dev                # Ambiente de desenvolvimento
npm run build              # Build de produção
npm run preview            # Preview do build
npm run typecheck          # Checagem de tipos
npm run lint               # ESLint
npm run lint:fix           # ESLint com correção
npm run format             # Prettier write
npm run prepare            # Instala hooks do Husky
npm run changelog:generate # Gera CHANGELOG.md a partir do git
```

## Estrutura de pastas

```
src/
├─ application/       # Casos de uso
├─ domain/            # Entidades e contratos
├─ infrastructure/    # Implementações (Firebase, cache, integrações externas)
├─ components/        # Componentes reutilizáveis
├─ pages/             # Páginas/rotas
├─ hooks/             # Hooks React
├─ context/           # Contextos React
├─ providers/         # Providers globais
├─ routes/            # Definição de rotas
├─ styles/            # Estilos globais
├─ constants/         # Constantes de UI
├─ utils/             # Utilidades compartilhadas
├─ shared/            # Utilidades/configs agnósticas de UI
├─ lib/               # Configurações e libs (ex.: i18n)
├─ App.tsx            # Composição das rotas
└─ main.tsx           # Bootstrap do React
```

## Como rodar

```bash
npm run dev
```

Abra `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

## Troubleshooting

- **Erro de Firebase**: valide se todas as variáveis `VITE_FIREBASE_*` estão preenchidas e correspondem ao projeto correto.
- **Integrações Slack/BrowserStack falhando**: configure `VITE_QALITE_SERVICE_URL` apontando para a API e confirme que ela está acessível.
- **Build com warning de chunks grandes**: é esperado em telas pesadas; use `vite build` mesmo assim para validar se o bundle fecha sem erros.
- **Falhas de lint**: rode `npm run lint:fix` para ajustes automáticos quando possível.
