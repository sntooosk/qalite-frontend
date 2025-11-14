import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../application/hooks/useAuth';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { Spinner } from '../components/Spinner';
import { TextInput } from '../components/TextInput';

const MIN_PASSWORD_LENGTH = 8;

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, error, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isPasswordStrong = useMemo(() => password.length >= MIN_PASSWORD_LENGTH, [password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!displayName || !email || !password || !confirmPassword) {
      setFormError('Todos os campos são obrigatórios.');
      return;
    }

    const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    if (!emailRegex.test(email)) {
      setFormError('Informe um e-mail válido.');
      return;
    }

    if (!isPasswordStrong) {
      setFormError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('As senhas não conferem.');
      return;
    }

    try {
      await register({ email, password, displayName });
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-lg rounded-2xl bg-surface p-10 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">Crie sua conta</h1>
          <p className="mt-2 text-sm text-muted">
            Informe seus dados para começar a usar a plataforma.
          </p>
        </div>
        {formError && <Alert type="error" message={formError} />}
        {error && <Alert type="error" message={error} />}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <TextInput
            id="displayName"
            label="Nome completo"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
          <TextInput
            id="email"
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <TextInput
            id="password"
            label="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <TextInput
            id="confirmPassword"
            label="Confirme a senha"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <p className={`text-xs ${isPasswordStrong ? 'text-success' : 'text-danger'}`}>
            Senha com no mínimo {MIN_PASSWORD_LENGTH} caracteres.
          </p>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Criando conta...' : 'Cadastrar'}
          </Button>
        </form>
        {isLoading && <Spinner />}
        <div className="mt-6 text-center text-sm text-muted">
          Já tem conta?{' '}
          <Link to="/login" className="text-link">
            Entrar
          </Link>
        </div>
      </div>
    </Layout>
  );
};
