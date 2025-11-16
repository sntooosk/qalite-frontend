import { FirebaseError } from 'firebase/app';

const firebaseErrorMessages: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido. Revise o endereço informado.',
  'auth/user-disabled': 'Esta conta foi desativada. Entre em contato com o suporte.',
  'auth/user-not-found': 'Não encontramos uma conta para este e-mail.',
  'auth/wrong-password': 'Senha incorreta. Tente novamente.',
  'auth/email-already-in-use': 'Este e-mail já está em uso.',
  'auth/weak-password': 'Sua senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um instante e tente de novo.',
  'auth/network-request-failed': 'Erro de rede. Verifique sua conexão com a internet.',
  'auth/requires-recent-login': 'Faça login novamente para concluir esta ação.',
  'storage/unauthorized': 'Você não tem permissão para enviar este arquivo.',
  'storage/retry-limit-exceeded': 'Não conseguimos finalizar o upload. Tente novamente em breve.',
  'storage/canceled': 'Upload cancelado.',
  'firestore/unavailable': 'Serviço temporariamente indisponível. Tente novamente em instantes.',
};

export const mapFirebaseError = (
  error: unknown,
  fallbackMessage = 'Não foi possível concluir a operação. Tente novamente.',
) => {
  if (error instanceof FirebaseError) {
    return firebaseErrorMessages[error.code] ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};
