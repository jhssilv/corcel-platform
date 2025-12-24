"use client"

import { useState, useEffect, useCallback, useContext } from "react"
import "../styles/main_page.css"

import EssaySelector from "./EssaySelector.jsx"
import EssayDisplay from "./EssayDisplay.jsx"
import AuthContext from "./AuthContext.jsx"
import DownloadDialog from "./DownloadDialog.jsx"
import TopBar from "./TopBar.jsx"

import downloadTexts from "./api/DownloadTexts.jsx"
import { getTextById, getNormalizationsByText } from "./api/APIFunctions.jsx"

// MAIN PAGE COMPONENT \\

function MainPage() {
  const [selectedEssay, setSelectedEssay] = useState(null)
  const [currentText, setCurrentText] = useState(null)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchEssay = useCallback(async () => {
    const text = await getTextById(selectedEssay.value)
    const normalizations = await getNormalizationsByText(selectedEssay.value)

    text.corrections = normalizations
    setCurrentText(text)
  }, [selectedEssay])

  const handleEssayUpdate = async () => {
    await fetchEssay()
    setRefreshTrigger(prev => prev + 1)
  }

  useEffect(() => {
    if (selectedEssay) fetchEssay()
  }, [selectedEssay, fetchEssay])

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
        onDownload={(useBrackets) => downloadTexts(useBrackets)}
      />
    </section>
  )
}

export default MainPage
