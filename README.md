# QaLite Frontend

Aplicação web de QA construída com **React + Vite + TypeScript**, integrada ao **Firebase (Auth + Firestore)** e a um backend auxiliar para integrações (Slack/BrowserStack).

## Requisitos

- Node.js 18+
- npm (este repositório usa `package-lock.json`)

## Instalação

```bash
npm install
npm run prepare
```

## Variáveis de ambiente

Crie um `.env` a partir do `.env.example` e preencha:

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

`VITE_QALITE_SERVICE_URL` aponta para a API usada por Slack e BrowserStack.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
npm run lint:fix
npm run format
npm run prepare
```

## Como rodar

```bash
npm run dev
```

Abra `http://localhost:5173`.

## Estrutura (resumo)

```
src/
├─ application/       # Casos de uso
├─ domain/            # Entidades e contratos
├─ infrastructure/    # Firebase, cache e integrações externas
├─ presentation/      # Páginas, componentes, hooks, rotas e providers
├─ shared/            # Utilidades/configs agnósticas de UI
├─ App.tsx
└─ main.tsx
```

## Troubleshooting

- **Erro de Firebase**: confirme todas as variáveis `VITE_FIREBASE_*`.
- **Integrações sem resposta**: valide `VITE_QALITE_SERVICE_URL` e a disponibilidade da API.
- **Warnings de bundle grande**: o build pode emitir alertas de chunk size, mas deve concluir sem erros.
