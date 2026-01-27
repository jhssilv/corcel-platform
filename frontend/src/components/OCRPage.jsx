"use client"

import { useState, useEffect, useCallback } from "react"
import "../styles/main_page.css"
import "../styles/ocr_toolbar.css"

import EssaySelector from "./EssaySelector.jsx"
import TopBar from "./TopBar.jsx"
import OCREditModal from "./OCREditModal.jsx"
import OCRUploadSection from "./OCRUploadSection.jsx"
import { getRawTextById } from "./api/APIFunctions.jsx"

function OCRPage() {
  const [selectedEssay, setSelectedEssay] = useState(null)
  const [currentText, setCurrentText] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchEssay = useCallback(async () => {
    if (!selectedEssay) return
    try {
      const rawText = await getRawTextById(selectedEssay.value)
      setCurrentText(rawText)
      setIsEditModalOpen(true); // Open modal when text is loaded
    } catch (e) {
      console.error("Failed to fetch raw text", e);
    }
  }, [selectedEssay])

  useEffect(() => {
    if (selectedEssay) fetchEssay()
  }, [selectedEssay, fetchEssay])

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentText(null);
    setSelectedEssay(null);
  };

  const handleFinishOCR = () => {
    // Close modal and refresh list
    handleCloseEditModal();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <section className="ocr-page-section">
      <TopBar showSidePanel={true} />

      {/* Selection Header */}
      <div className="ocr-controls-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              className="ocr-back-button"
              onClick={() => window.location.href = '/main'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Buscar Textos Transcritos Com OCR</h2>
          </div>
        </div>

        <EssaySelector
          selectedEssay={selectedEssay}
          setSelectedEssay={setSelectedEssay}
          refreshTrigger={refreshTrigger}
          onlyRaw={true}
        />
      </div>

      {/* Inline Upload Section */}
      <OCRUploadSection onUploadComplete={handleUploadComplete} />

      {/* Edit Modal */}
      {isEditModalOpen && currentText && (
        <OCREditModal
          rawText={currentText}
          onClose={handleCloseEditModal}
          onFinish={handleFinishOCR}
        />
      )}
    </section>
  )
}

export default OCRPage