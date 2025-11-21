# QaLite Auth Starter

Base de autenticação enxuta construída com **React + Vite** e **Firebase Authentication** seguindo princípios de clean architecture e SOLID. A estrutura em camadas foi mantida, mas o código foi reduzido para o essencial: login, cadastro, recuperação de senha e edição de perfil.

## 🚀 Stack

- React 18 com Vite + TypeScript
- Firebase Authentication e Firestore
- React Router DOM para roteamento
- ESLint + Prettier

## 📁 Arquitetura

```
src/
 ├─ domain/            # Entidades e contratos de repositório
 ├─ application/       # Casos de uso (serviços) consumidos pela UI
 ├─ infrastructure/    # Firebase e integrações concretas
 ├─ presentation/      # Páginas, componentes, hooks e rotas React
 ├─ shared/            # Configurações e utilidades agnósticas
 ├─ App.tsx            # Composição de rotas
 └─ main.tsx           # Bootstrap do React
```

A camada de aplicação expõe apenas os casos de uso de autenticação, consumindo o contrato `AuthRepository` definido no domínio e implementado via Firebase na infraestrutura. A apresentação fica livre para evoluir sem dependências diretas do Firebase.

## 🔐 Funcionalidades

- Cadastro, login, logout e redefinição de senha.
- Edição de perfil (nome e avatar) sincronizada com Firebase.
- Proteção de rotas autenticadas.

## ⚙️ Configuração

Crie um `.env` a partir de `.env.example` com suas credenciais Firebase:

```
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
```

## 🧩 Scripts

```
npm run dev          # Ambiente de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run typecheck    # Checagem de tipos
npm run lint         # ESLint
npm run lint:fix     # ESLint com correção
npm run format       # Prettier write
npm run prepare      # Instala hooks do Husky
```

## ▶️ Uso rápido

```
npm install
npm run prepare
npm run dev
```

Abra `http://localhost:5173` e navegue pelos fluxos de autenticação.
