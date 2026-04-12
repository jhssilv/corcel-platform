import { deleteAllNormalizations, toggleNormalizedStatus } from '../../Api';
import type { TextDetailResponse } from '../../types';
import { useSnackbar } from '../../Context/Generic';

interface UseCorrectionActionsResult {
  handleFinishedToggled: () => Promise<void>;
  handleResetCorrections: () => Promise<void>;
}

export function UseCorrectionActions(
  essay: TextDetailResponse | null,
  refreshEssay: () => Promise<void> | void,
): UseCorrectionActionsResult {
  const { addSnackbar } = useSnackbar();

  const handleFinishedToggled = async () => {
    if (!essay) {
      return;
    }

    await toggleNormalizedStatus(essay.id);
    await refreshEssay();
    addSnackbar({ text: 'Status do texto atualizado com sucesso!', type: 'success' });
  };

  const handleResetCorrections = async () => {
    if (!essay) {
      return;
    }

    try {
      await deleteAllNormalizations(essay.id);
      await refreshEssay();
      addSnackbar({ text: 'Normalizações excluídas com sucesso.', type: 'success' });
    } catch (error) {
      console.error('Failed to delete all normalizations:', error);
      addSnackbar({ text: 'Falha ao excluir normalizações.', type: 'error' });
    }
  };

  return {
    handleFinishedToggled,
    handleResetCorrections,
  };
}
