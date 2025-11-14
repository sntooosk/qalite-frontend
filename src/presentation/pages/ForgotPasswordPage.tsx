import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../application/hooks/useAuth';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { Spinner } from '../components/Spinner';
import { TextInput } from '../components/TextInput';

export const ForgotPasswordPage = () => {
  const { resetPassword, error, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!email) {
      setFeedback('Informe o e-mail cadastrado.');
      return;
    }

    try {
      await resetPassword(email);
      setFeedback('Verifique seu e-mail para redefinir a senha.');
    } catch (err) {
      console.error(err);
    }
  };

  const feedbackType = feedback?.startsWith('Verifique') ? 'success' : 'error';

  return (
    <Layout>
      <div className="mx-auto max-w-md rounded-2xl bg-surface p-10 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">Recuperar acesso</h1>
          <p className="mt-2 text-sm text-muted">Enviaremos um link para redefinir sua senha.</p>
        </div>
        {feedback && <Alert type={feedbackType} message={feedback} />}
        {error && <Alert type="error" message={error} />}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <TextInput
            id="email"
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
        </form>
        {isLoading && <Spinner />}
        <div className="mt-6 text-center text-sm text-muted">
          <Link to="/login" className="text-link">
            Voltar para login
          </Link>
        </div>
      </div>
    </Layout>
  );
};
