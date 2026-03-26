import { deleteAllNormalizations, toggleNormalizedStatus } from '../../Api';
import type { TextDetailResponse } from '../../types';

interface UseCorrectionActionsResult {
  handleFinishedToggled: () => Promise<void>;
  handleResetCorrections: () => Promise<void>;
}

export function UseCorrectionActions(
  essay: TextDetailResponse | null,
  refreshEssay: () => Promise<void> | void,
): UseCorrectionActionsResult {
  const handleFinishedToggled = async () => {
    if (!essay) {
      return;
    }

    await toggleNormalizedStatus(essay.id);
    await refreshEssay();
  };

  const handleResetCorrections = async () => {
    if (!essay) {
      return;
    }

    if (!window.confirm('Tem certeza de que deseja excluir todas as normalizações para este texto?')) {
      return;
    }

    try {
      await deleteAllNormalizations(essay.id);
      await refreshEssay();
    } catch (error) {
      console.error('Failed to delete all normalizations:', error);
      alert('Falha ao excluir normalizações.');
    }
  };

  return {
    handleFinishedToggled,
    handleResetCorrections,
  };
}
