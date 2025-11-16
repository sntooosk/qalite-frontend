import { useState } from 'react';

import type { Environment } from '../../../domain/entities/Environment';
import { environmentService } from '../../../main/factories/environmentServiceFactory';
import { Button } from '../Button';
import { Modal } from '../Modal';

interface DeleteEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment | null;
  onDeleted?: () => void;
}

export const DeleteEnvironmentModal = ({
  isOpen,
  onClose,
  environment,
  onDeleted,
}: DeleteEnvironmentModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!environment) {
      return;
    }

    setError(null);
    setIsDeleting(true);
    try {
      await environmentService.delete(environment.id);
      onDeleted?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Unable to delete this environment.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete environment">
      {error && <p className="form-message form-message--error">{error}</p>}
      <p>
        This action cannot be undone. Do you want to delete environment{' '}
        <strong>{environment?.identifier ?? 'without identifier'}</strong>?
      </p>
      <div className="modal-actions">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleDelete}
          isLoading={isDeleting}
          loadingText="Deleting..."
        >
          Confirm delete
        </Button>
      </div>
    </Modal>
  );
};
