import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

import { useAuth } from '../../application/hooks/useAuth';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { Spinner } from '../components/Spinner';
import { TextInput } from '../components/TextInput';
import { UserAvatar } from '../components/UserAvatar';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

export const ProfilePage = () => {
  const { user, updateProfile, error, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(user?.photoURL ?? null);
    }
  }, [user?.photoURL, photoFile]);

  useEffect(
    () => () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    },
    [photoPreview]
  );

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(user?.photoURL ?? null);
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setLocalError('Selecione uma imagem de até 5MB.');
      return;
    }

    setLocalError(null);
    setPhotoFile(file);
    setSuccessMessage(null);
    setPhotoPreview((previous) => {
      if (previous && previous.startsWith('blob:')) {
        URL.revokeObjectURL(previous);
      }
      return URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!displayName.trim()) {
      setLocalError('Informe um nome para continuar.');
      return;
    }

    try {
      await updateProfile({ displayName: displayName.trim(), photoFile });
      setSuccessMessage('Perfil atualizado com sucesso!');
      setPhotoFile(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      <section className="card">
        <span className="badge">Seu perfil</span>
        <h1 className="section-title">Atualize suas informações pessoais</h1>
        <p className="section-subtitle">
          Personalize seu nome e imagem. Todas as alterações são sincronizadas com o Firebase em tempo real.
        </p>

        {localError && <Alert type="error" message={localError} />}
        {error && <Alert type="error" message={error} />}
        {successMessage && <Alert type="success" message={successMessage} />}

        <form className="profile-editor" onSubmit={handleSubmit}>
          <div className="profile-header">
            <UserAvatar name={displayName || user?.email || ''} photoURL={photoPreview || undefined} />
            <label className="upload-label">
              <span>Foto de perfil</span>
              <span className="upload-trigger">Selecionar nova foto</span>
              <input className="upload-input" type="file" accept="image/*" onChange={handlePhotoChange} />
              <span className="upload-hint">Formatos suportados: JPG, PNG ou WEBP (até 5MB).</span>
            </label>
          </div>

          <TextInput
            id="displayName"
            label="Nome"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />

          <TextInput
            id="email"
            label="E-mail"
            type="email"
            value={user?.email ?? ''}
            onChange={() => {}}
            readOnly
            disabled
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </form>
        {isLoading && <Spinner />}
      </section>
    </Layout>
  );
};
