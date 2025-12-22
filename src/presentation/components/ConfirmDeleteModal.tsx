import { Modal } from './Modal';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
}

export const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  description,
  confirmText,
  cancelText,
  isConfirming = false,
}: ConfirmDeleteModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('confirmDeleteModal.message')}
      description={description}
    >
      <p>{message ?? t('confirmDeleteModal.message')}</p>

      <div className="modal-actions">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isConfirming}
          data-testid="cancel-delete-button"
        >
          {cancelText ?? t('confirmDeleteModal.cancelText')}
        </Button>

        <Button
          type="button"
          onClick={onConfirm}
          isLoading={isConfirming}
          loadingText={t('confirmDeleteModal.loading')}
          data-testid="confirm-delete-button"
        >
          {confirmText ?? t('confirmDeleteModal.confirmText')}
        </Button>
      </div>
    </Modal>
  );
};
