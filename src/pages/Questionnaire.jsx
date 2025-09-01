import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ymrsQuestions } from "../data/ymrsQuestions";
import { madrsQuestions } from "../data/madrsQuestions";
import { rbdQuestions } from "../data/rbdQuestions";
import { hamaQuestions } from "../data/hamaQuestions";
import { getCurrentTime } from "../utils"; // Import the utility function
import * as XLSX from "xlsx";
import ConfirmationModal from "../components/ConfirmationModal"; // Import the modal component
import SaveModal from "../components/SaveModal";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const questionnaires = {
  ymrs: ymrsQuestions,
  madrs: madrsQuestions,
  rbd: rbdQuestions,
  "ham-a": hamaQuestions,
  // Add more questionnaires here
};

const Questionnaire = () => {
  const { user } = useAuth();

  const { id } = useParams(); // Get the questionnaire ID from the URL
  const { questions, severityLevels, icon, colorScheme } = questionnaires[id];

  const [answers, setAnswers] = useState({});
  const [descriptions, setDescriptions] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  const location = useLocation();
  const previousResult = location.state?.previousResult;
  const navigate = useNavigate(); // Initialize useNavigate

  // Add this useEffect to load saved results if they exist
  useEffect(() => {
    if (previousResult) {
      setAnswers(previousResult.answers || {});
      setDescriptions(previousResult.descriptions || {});

      // Scroll to top when loading previous result
      window.scrollTo(0, 0);
    }
  }, [previousResult, id]); // Add id to dependencies

  const styles = {
    primaryColor: { color: colorScheme.primary },
    secondaryBackground: { backgroundColor: colorScheme.secondary },
  };

  const handleAnswer = (questionId, score, description) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: score,
    }));
    setDescriptions((prevDescriptions) => ({
      ...prevDescriptions,
      [questionId]: description,
    }));
  };

  const calculateTotalScore = () => {
    return Object.values(answers).reduce((total, score) => total + score, 0);
  };

  const getSeverityLevel = (totalScore) => {
    const level = severityLevels.find(
      (range) => totalScore >= range.minScore && totalScore <= range.maxScore,
    );
    return level ? level.level : "Unknown severity";
  };

  const totalScore = calculateTotalScore();
  const severityLevel = getSeverityLevel(totalScore);

  // Calculate progress
  const totalQuestions = questions.length;
  const answeredQuestions = Object.keys(answers).length;
  const progress = ((answeredQuestions / totalQuestions) * 100).toFixed(0);

  // Function to go back to the main app
  const goBackToMainApp = () => {
    navigate("/"); // Navigate to the home page
  };

  const saveResult = async (title) => {
    try {
      // Prompt user for a title (default to questionnaire ID )
      // const defaultTitle = `${id.toUpperCase()}`;
      // const title = prompt("Name this assessment:", defaultTitle);

      // If user cancels the prompt, abort the save
      // if (title === null) return null;

      const { data, error } = await supabase
        .from("questionnaire_results")
        .upsert({
          title: title, // Add the title from user input
          user_id: user.id,
          questionnaire_id: id,
          total_score: totalScore,
          severity_level: severityLevel,
          answers: answers,
          descriptions: descriptions,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      // Trigger sidebar refresh
      window.dispatchEvent(new CustomEvent("resultsUpdated"));

      return data;
    } catch (error) {
      console.error("Error saving result:", error.message);
      throw error;
    }
  };

  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const exportResults = async () => {
    setIsExporting(true);

    try {
      // Then proceed with Excel export
      const { date, hour, minutes, seconds } = getCurrentTime();
      const currentDate = date;
      const currentTime = `${hour}${minutes}${seconds}`;

      const dataForExcel = questions.map((q) => ({
        Question: q.question,
        SelectedOption: descriptions[q.id] || "Not answered",
        Score: answers[q.id] || 0,
      }));

      dataForExcel.push({
        Question: "Total Score",
        SelectedOption: "",
        Score: totalScore,
      });
      dataForExcel.push({
        Question: "Severity Level",
        SelectedOption: severityLevel,
        Score: "",
      });
      dataForExcel.push({
        Question: "Assessment Title",
        SelectedOption: id || "Untitled",
        Score: "",
      });
      dataForExcel.push({
        Question: "Date Created",
        SelectedOption: currentDate,
        Score: `${hour}:${minutes}:${seconds}`,
      });

      const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

      // Use the title in the filename if available
      const fileName = `${id}_Results_${currentDate}_${currentTime}.xlsx`;

      XLSX.writeFile(workbook, fileName);

      const savedResult = await handleSaveClick();
      if (!savedResult) return; // User cancelled the save
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  // Function to reset the questionnaire
  const resetQuestionnaire = () => {
    setAnswers({});
    setDescriptions({});
    setShowResetModal(false); // Close the modal
  };

  return (
    <div className="App">
      {isLoadingSaved && <div>Loading saved results...</div>}
      <h1>
        {icon} {id.toUpperCase()} Questionnaire
      </h1>

      {/* Questions */}
      {questions.map((q) => (
        <div className="questions" key={q.id}>
          <h3>
            {q.id}. {q.question}
          </h3>
          {/* Display the question description if it exists */}
          {q.description && (
            <div className="question-description">{q.description}</div>
          )}
          {/* Render the options */}
          {q.options.map((option) => (
            <label
              key={option.score}
              style={{
                backgroundColor:
                  answers[q.id] === option.score
                    ? colorScheme.primary
                    : "transparent",
              }}
              className={`option-label ${
                answers[q.id] === option.score ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name={`question-${q.id}`}
                value={option.score}
                onChange={() => handleAnswer(q.id, option.score, option.text)}
                className="radio-input"
              />
              <div className="labelandscore">
                <div className="labelandscore left">{option.text}</div>
                <div className="labelandscore right">
                  <span className="scoreSpan">+{option.score}</span>
                </div>
              </div>
            </label>
          ))}
        </div>
      ))}

      {/* Total Score and Severity Level */}
      {progress >= 100 ? (
        <>
          <h2>Total Score: {totalScore}</h2>
          <div className="severityLevel">
            <h2>Severity Level: {severityLevel}</h2>
          </div>
        </>
      ) : (
        <h2>Please fill out all questions</h2>
      )}

      {/* Sticky Progress Bar */}
      <div className="sticky-progress-bar">
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progress}%`,
                backgroundColor: colorScheme.primary, // Use the primary color for the progress bar
              }}
            ></div>
          </div>
          <div className="progress-text">
            {progress}% completed ({answeredQuestions}/{totalQuestions}{" "}
            questions answered)
            {progress >= 100 ? " 🎉" : ""} {/* Add the emoji conditionally */}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="exportButtons">
        {/* Go Back Button */}
        <button
          onClick={() => setShowHomeModal(true)}
          className="action-button"
        >
          🏠
          <p
            style={{
              padding: 0,
              margin: 0,
              fontSize: "14px",
              color: "gray",
            }}
          >
            Home
          </p>
        </button>
        {/* Save Button */}
        <button onClick={handleSaveClick} className="action-button">
          📥
          <p
            style={{
              padding: 0,
              margin: 0,
              fontSize: "14px",
              color: "gray",
            }}
          >
            Save
          </p>
        </button>

        <SaveModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={saveResult}
          defaultTitle={`${id.toUpperCase()}`}
        />

        {/* Export Button */}
        <button
          onClick={() => setShowExportModal(true)}
          className="action-button"
          disabled={isExporting}
        >
          {isExporting ? "⏳" : "❎"}
          <p
            style={{
              padding: 0,
              margin: 0,
              fontSize: "14px",
              color: "gray",
            }}
          >
            Excel
          </p>
        </button>
        {/* Print Button */}
        {/* <button
          onClick={() => setShowPrintModal(true)}
          className="action-button"
        >
          🖨️
          <p
            style={{
              padding: 0,
              margin: 0,
              fontSize: "14px",
              color: "gray",
            }}
          >
            Print
          </p>
        </button> */}
        {/* Reset Button */}
        <button
          onClick={() => setShowResetModal(true)}
          className="action-button"
        >
          🔄
          <p
            style={{
              padding: 0,
              margin: 0,
              fontSize: "14px",
              color: "gray",
            }}
          >
            Reset
          </p>
        </button>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showHomeModal}
        onClose={() => setShowHomeModal(false)}
        onConfirm={goBackToMainApp}
        message="Are you sure you want to go back to HomePage?"
      />

      <ConfirmationModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={exportResults}
        message="Are you sure you want to export the results as an Excel file?"
      />
      <ConfirmationModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        onConfirm={() => {
          setShowPrintModal(false); // Close the modal
          setTimeout(() => {
            window.print(); // Trigger print after the modal is closed
          }, 200); // Small delay to ensure the modal is removed from the DOM
        }}
        message="Are you sure you want to print the results?"
      />
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={resetQuestionnaire}
        message="Are you sure you want to reset the questionnaire?"
      />
    </div>
  );
};

export default Questionnaire;
