import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { TextArea } from '../components/TextArea';
import { TextInput } from '../components/TextInput';
import { useAuth } from '../hooks/useAuth';
import { usePrivateWorkspace } from '../hooks/usePrivateWorkspace';
import type { DataEntry } from '../../domain/entities/privateWorkspace';
import { Alert } from '../components/Alert';

const DATA_TYPES: DataEntry['type'][] = ['CPF', 'E-mail', 'ID', 'Token', 'URL', 'Outro'];

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const readFilePreview = (file: File) =>
  new Promise<string | undefined>((resolve) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      resolve(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });

export const PrivateAreaPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    workspace,
    search,
    updateNotes,
    addChecklist,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    addDataEntry,
    removeDataEntry,
    addFiles,
    removeFile,
    storageInfo,
  } = usePrivateWorkspace(user?.uid);

  const [searchTerm, setSearchTerm] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistItems, setNewChecklistItems] = useState<Record<string, string>>({});
  const [newDataEntry, setNewDataEntry] = useState({ label: '', value: '', type: DATA_TYPES[0] });
  const [folder, setFolder] = useState('Raiz');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const searchResults = useMemo(() => search(searchTerm), [search, searchTerm]);

  const handleAddChecklist = (event: FormEvent) => {
    event.preventDefault();
    const title = newChecklistTitle.trim();
    if (!title) return;
    addChecklist(title);
    setNewChecklistTitle('');
  };

  const handleAddChecklistItem = (checklistId: string) => {
    const text = (newChecklistItems[checklistId] ?? '').trim();
    if (!text) return;
    addChecklistItem(checklistId, text);
    setNewChecklistItems((prev) => ({ ...prev, [checklistId]: '' }));
  };

  const handleAddDataEntry = (event: FormEvent) => {
    event.preventDefault();
    const label = newDataEntry.label.trim();
    const value = newDataEntry.value.trim();
    if (!label || !value) return;
    addDataEntry({ label, value, type: newDataEntry.type });
    setNewDataEntry({ label: '', value: '', type: DATA_TYPES[0] });
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    const chosenFolder = folder.trim() || 'Raiz';

    try {
      const fileEntries = await Promise.all(
        Array.from(files).map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || 'arquivo',
          folder: chosenFolder,
          uploadedAt: new Date().toISOString(),
          previewUrl: await readFilePreview(file),
        })),
      );

      addFiles(fileEntries);
      event.target.value = '';
    } catch (error) {
      console.error(error);
      setUploadError('Não foi possível salvar os arquivos. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <BackButton label="Voltar para o perfil" onClick={() => navigate('/profile')} />
          <span className="badge">Espaço pessoal</span>
          <h1 className="section-title">Área privada do QA</h1>
          <p className="section-subtitle">
            Guarde notas, massa de dados e arquivos pessoais em um espaço totalmente privado.
          </p>
        </div>
        <div className="private-stats">
          <div className="stat-pill">
            <strong>{storageInfo.checklistCount}</strong>
            <span>checklists</span>
          </div>
          <div className="stat-pill">
            <strong>{storageInfo.dataEntriesCount}</strong>
            <span>linhas de massa</span>
          </div>
          <div className="stat-pill">
            <strong>{storageInfo.fileCount}</strong>
            <span>arquivos</span>
          </div>
        </div>
      </div>

      <section className="card private-search">
        <div>
          <span className="badge">Busca privada</span>
          <h2 className="text-lg font-semibold">Localize qualquer nota, dado ou arquivo</h2>
        </div>
        <div className="private-search__form">
          <TextInput
            id="private-search"
            label=""
            placeholder="Buscar por título, valor ou pasta"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <div className="private-search__results">
            {searchTerm.trim().length === 0 ? (
              <p className="section-subtitle">Digite para filtrar no seu espaço pessoal.</p>
            ) : searchResults.length === 0 ? (
              <p className="section-subtitle">Nenhum item encontrado.</p>
            ) : (
              <ul>
                {searchResults.map((result) => (
                  <li key={result.id} className="private-result">
                    <span className="private-result__type">{result.type}</span>
                    <span className="private-result__label">{result.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="list-grid">
        <div className="card">
          <span className="badge">Bloco de notas</span>
          <h3>Rascunhos rápidos</h3>
          <TextArea
            id="private-notes"
            label=""
            value={workspace.notes}
            onChange={(event) => updateNotes(event.target.value)}
            placeholder="Cole aqui hipóteses, comandos ou textos temporários."
            rows={8}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <span className="badge">Checklists</span>
              <h3>Execuções rápidas</h3>
            </div>
            <form className="inline-form" onSubmit={handleAddChecklist}>
              <TextInput
                id="new-checklist"
                label=""
                placeholder="Novo checklist"
                value={newChecklistTitle}
                onChange={(event) => setNewChecklistTitle(event.target.value)}
              />
              <Button type="submit">Adicionar</Button>
            </form>
          </div>

          <div className="checklist-grid">
            {workspace.checklists.map((checklist) => (
              <div key={checklist.id} className="checklist-card">
                <div className="checklist-card__header">
                  <h4>{checklist.title}</h4>
                  <span className="badge neutral">{checklist.items.length} itens</span>
                </div>
                <ul className="checklist-items">
                  {checklist.items.map((item) => (
                    <li key={item.id}>
                      <label className="checklist-item">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleChecklistItem(checklist.id, item.id)}
                        />
                        <span className={item.checked ? 'checked' : ''}>{item.text}</span>
                      </label>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => removeChecklistItem(checklist.id, item.id)}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="inline-form">
                  <TextInput
                    id={`item-${checklist.id}`}
                    label=""
                    placeholder="Novo item"
                    value={newChecklistItems[checklist.id] ?? ''}
                    onChange={(event) =>
                      setNewChecklistItems((prev) => ({
                        ...prev,
                        [checklist.id]: event.target.value,
                      }))
                    }
                  />
                  <Button type="button" onClick={() => handleAddChecklistItem(checklist.id)}>
                    Incluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="list-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <span className="badge">Massa de dados</span>
              <h3>Mini tabela</h3>
            </div>
            <form className="inline-form" onSubmit={handleAddDataEntry}>
              <TextInput
                id="data-label"
                label=""
                placeholder="Descrição"
                value={newDataEntry.label}
                onChange={(event) =>
                  setNewDataEntry((prev) => ({ ...prev, label: event.target.value }))
                }
              />
              <TextInput
                id="data-value"
                label=""
                placeholder="Valor"
                value={newDataEntry.value}
                onChange={(event) =>
                  setNewDataEntry((prev) => ({ ...prev, value: event.target.value }))
                }
              />
              <select
                className="input"
                value={newDataEntry.type}
                onChange={(event) =>
                  setNewDataEntry((prev) => ({
                    ...prev,
                    type: event.target.value as DataEntry['type'],
                  }))
                }
              >
                {DATA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <Button type="submit">Salvar</Button>
            </form>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Tipo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {workspace.dataEntries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="section-subtitle">
                      Nenhuma massa cadastrada ainda.
                    </td>
                  </tr>
                ) : (
                  workspace.dataEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.label}</td>
                      <td>
                        <code>{entry.value}</code>
                      </td>
                      <td>
                        <span className="badge neutral">{entry.type}</span>
                      </td>
                      <td>
                        <button
                          className="link-button"
                          type="button"
                          onClick={() => removeDataEntry(entry.id)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <span className="badge">Arquivos pessoais</span>
              <h3>Central de evidências</h3>
              <p className="section-subtitle">
                Organize imagens, PDFs, logs e documentos em pastas básicas. Somente você tem
                acesso.
              </p>
            </div>
            <div className="inline-form">
              <TextInput
                id="folder-input"
                label=""
                placeholder="Nome da pasta"
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
              />
              <label className="upload-label">
                <span className="upload-trigger">Selecionar arquivos</span>
                <input
                  className="upload-input"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {uploadError && <Alert type="error" message={uploadError} />}

          <div className="file-grid">
            {workspace.files.length === 0 ? (
              <p className="section-subtitle">Nenhum arquivo enviado ainda.</p>
            ) : (
              workspace.files.map((file) => (
                <div key={file.id} className="file-card">
                  <div className="file-card__header">
                    <div>
                      <p className="file-name">{file.name}</p>
                      <span className="badge neutral">{file.folder}</span>
                    </div>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => removeFile(file.id)}
                    >
                      Remover
                    </button>
                  </div>
                  <p className="section-subtitle">{formatBytes(file.size)}</p>
                  <p className="file-meta">
                    Enviado em {new Date(file.uploadedAt).toLocaleString()}
                  </p>
                  {file.previewUrl && (
                    <div className="file-preview">
                      {file.type.startsWith('image/') ? (
                        <img src={file.previewUrl} alt={file.name} />
                      ) : (
                        <video src={file.previewUrl} controls muted />
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <span className="badge">Atalhos</span>
            <h3>Voltar para o workspace colaborativo</h3>
          </div>
          <Link to="/dashboard" className="text-link">
            Ir para dashboard
          </Link>
        </div>
        <p className="section-subtitle">
          Sua área privada é 100% isolada. Nada aqui é compartilhado com a organização.
        </p>
      </section>
    </Layout>
  );
};
