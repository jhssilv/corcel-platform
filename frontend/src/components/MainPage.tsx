import { useCallback, useEffect, useState } from 'react';
import EssayDisplay from './EssayDisplay';
import EssaySelector from './EssaySelector';
import TopBar from './TopBar';
import DownloadDialog from './DownloadDialog';
import downloadTexts from './api/DownloadTexts';
import { getNormalizationsByText, getTextById } from './api/APIFunctions';
import type { Option, TextDetailResponse } from '../types';
import '../styles/main_page.css';

function MainPage() {
  const [selectedEssay, setSelectedEssay] = useState<Option<number> | null>(null);
  const [currentText, setCurrentText] = useState<TextDetailResponse | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchEssay = useCallback(async () => {
    if (!selectedEssay) {
      return;
    }

    const text = await getTextById(selectedEssay.value);
    const normalizations = await getNormalizationsByText(selectedEssay.value);

    setCurrentText({ ...text, corrections: normalizations });
  }, [selectedEssay]);

  const handleEssayUpdate = async () => {
    await fetchEssay();
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (selectedEssay) {
      void fetchEssay();
    }
  }, [selectedEssay, fetchEssay]);

  return (
    <section className="main-page-section">
      <TopBar onDownloadClick={() => setShowDownloadDialog(true)} />

      <h2 className="main-page-header">Busca de Textos</h2>

      <div>
        <EssaySelector
          selectedEssay={selectedEssay}
          setSelectedEssay={setSelectedEssay}
          refreshTrigger={refreshTrigger}
        />
      </div>

      <EssayDisplay essay={currentText} refreshEssay={handleEssayUpdate} />

      <DownloadDialog
        show={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onDownload={(useBrackets: boolean) => downloadTexts(useBrackets)}
      />
    </section>
  );
}

export default MainPage;
