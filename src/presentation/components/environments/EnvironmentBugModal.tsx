import { type FormEvent, useEffect, useMemo, useState } from 'react';

import type { Environment } from '../../../domain/entities/Environment';
import type { EnvironmentBug, EnvironmentBugStatus } from '../../../domain/entities/EnvironmentBug';
import { environmentService } from '../../../main/factories/environmentServiceFactory';
import { useToast } from '../../context/ToastContext';
import { Button } from '../Button';
import { Modal } from '../Modal';

interface EnvironmentBugModalProps {
  environment: Environment;
  isOpen: boolean;
  bug: EnvironmentBug | null;
  onClose: () => void;
  initialScenarioId?: string | null;
}

const STATUS_OPTIONS: { value: EnvironmentBugStatus; label: string }[] = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'resolvido', label: 'Resolvido' },
];

export const EnvironmentBugModal = ({
  environment,
  isOpen,
  bug,
  onClose,
  initialScenarioId,
}: EnvironmentBugModalProps) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scenarioId, setScenarioId] = useState<string>('');
  const [status, setStatus] = useState<EnvironmentBugStatus>('aberto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scenarioOptions = useMemo(() => {
    const options = Object.entries(environment.scenarios ?? {}).map(([id, scenario]) => ({
      id,
      label: scenario.titulo?.trim() || `Cenário ${id}`,
    }));

    options.sort((first, second) =>
      first.label.localeCompare(second.label, 'pt-BR', { sensitivity: 'base' }),
    );

    if (scenarioId && !options.some((option) => option.id === scenarioId)) {
      options.unshift({ id: scenarioId, label: 'Cenário removido' });
    }

    return options;
  }, [environment.scenarios, scenarioId]);

  useEffect(() => {
    if (bug) {
      setTitle(bug.title);
      setDescription(bug.description ?? '');
      setScenarioId(bug.scenarioId ?? '');
      setStatus(bug.status);
      return;
    }

    setTitle('');
    setDescription('');
    setScenarioId(initialScenarioId ?? '');
    setStatus('aberto');
  }, [bug, initialScenarioId, isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!environment.id) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      scenarioId: scenarioId || null,
      status,
    };

    try {
      if (bug) {
        await environmentService.updateBug(environment.id, bug.id, payload);
        showToast({ type: 'success', message: 'Bug atualizado com sucesso.' });
      } else {
        await environmentService.createBug(environment.id, payload);
        showToast({ type: 'success', message: 'Bug registrado com sucesso.' });
      }

      onClose();
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível salvar o bug.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={bug ? 'Editar bug' : 'Registrar bug'} onClose={onClose}>
      <form className="environment-bug-form" onSubmit={handleSubmit}>
        <div className="environment-bug-form__grid">
          <label>
            <span>Cenário relacionado</span>
            <select
              value={scenarioId}
              onChange={(event) => setScenarioId(event.target.value)}
              disabled={isSubmitting || scenarioOptions.length === 0}
            >
              <option value="">Não vincular a um cenário</option>
              {scenarioOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {scenarioOptions.length === 0 && (
              <span className="section-subtitle">
                Este ambiente ainda não possui cenários disponíveis.
              </span>
            )}
          </label>
          <label>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as EnvironmentBugStatus)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>Título</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder="Descreva o problema em poucas palavras"
          />
        </label>
        <label>
          <span>Descrição</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Compartilhe o que foi observado ao executar o cenário"
          />
        </label>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            loadingText="Salvando..."
          >
            {bug ? 'Salvar alterações' : 'Registrar bug'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
