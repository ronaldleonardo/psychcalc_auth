import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { panssQuestions } from "../data/panssQuestions";
import { getCurrentTime } from "../utils"; // Import the utility function
import * as XLSX from "xlsx";
import ConfirmationModal from "../components/ConfirmationModal"; // Import the modal component
import SaveModal from "../components/SaveModal";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
// import ScrollDownButton from "../components/ScrollDownButton";
// import ScrollUpButton from "../components/ScrollUpButton";

const QuestionnairePANSS = () => {
  const { user } = useAuth();
  const { questions, icon, colorScheme } = panssQuestions;
  // Tabs
  const [activeTab, setActiveTab] = useState("total"); // State to track active tab
  // Scoring
  const [scoreRem, setScoreRem] = useState(0); // remission total score
  const [scoreEC, setScoreEC] = useState(0); // Ec total score
  const [ArrayRem, setArrayRem] = useState([]); // remission array
  const [ArrayEC, setArrayEC] = useState([]); // EC array

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
  }, [previousResult, "panss"]); // Add panss to dependencies

  const styles = {
    primaryColor: { color: colorScheme.primary },
    secondaryBackground: { backgroundColor: colorScheme.secondary },
  };

  const handleAnswer = (questionId, score, description) => {
    // Update the answers and descriptions
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: score,
    }));
    setDescriptions((prevDescriptions) => ({
      ...prevDescriptions,
      [questionId]: description,
    }));

    // Calculate scoreTotal, scoreRem, and scoreEC
    const newAnswers = { ...answers, [questionId]: score };

    // Calculate scoreTotal (sum of all scores)
    const scoreTotal = Object.values(newAnswers).reduce(
      (total, s) => total + s,
      0,
    );

    // Calculate scoreRem (sum of scores for questions 1, 2, 4)
    const scoreRem = [1, 2, 3, 8, 11, 13, 19, 23].reduce(
      (total, id) => total + (newAnswers[id] || 0),
      0,
    );

    // Calculate scoreEC (sum of scores for questions 3, 5, 6)
    const scoreEC = [4, 7, 18, 22, 28].reduce(
      (total, id) => total + (newAnswers[id] || 0),
      0,
    );

    // Update the scores
    setScoreRem(scoreRem);
    setScoreEC(scoreEC);

    // Update ArrayRem (scores for questions 1, 2, 4)
    const arrayRem = [1, 2, 3, 8, 11, 13, 19, 23].map(
      (id) => newAnswers[id] || 0,
    );
    setArrayRem(arrayRem);

    // Update ArrayEC (scores for questions 3, 5, 6)
    const arrayEC = [4, 7, 18, 22, 28].map((id) => newAnswers[id] || 0);
    setArrayEC(arrayEC);
  };

  const calculateTotalScore = () => {
    return Object.values(answers).reduce((total, score) => total + score, 0);
  };

  const totalScore = calculateTotalScore();

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
          questionnaire_id: "panss",
          total_score: totalScore,
          severity_level: scoreRem,
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

  // Function to export results as Excel
  const exportResults = async () => {
    setIsExporting(true); // Start loading

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
      // Add total score and severity level to the data
      dataForExcel.push({
        Question: "",
        SelectedOption: "",
        Score: "",
      });
      dataForExcel.push({
        Question: "Total Score",
        SelectedOption: "",
        Score: totalScore,
      });
      dataForExcel.push({
        Question: "PANSS-R",
        SelectedOption: ArrayRem.join("/"),
        Score: scoreRem,
      });
      dataForExcel.push({
        Question: "PANSS-EC",
        SelectedOption: ArrayEC.join("/"),
        Score: scoreEC,
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
      const fileName = `panss_Results_${currentDate}_${currentTime}.xlsx`;

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

  // Tab Functions
  const handleTabClick = (tab) => {
    setActiveTab(tab); // Set the active tab
    // window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll to the top of the page
  };

  return (
    <div className="App">
      {isLoadingSaved && <div>Loading saved results...</div>}
      <h1>{icon} PANSS Questionnaire</h1>

      {/* Questions */}
      {questions.map((q) => (
        <div
          className={`questions ${q.tab} ${activeTab === "total" || activeTab === `${q.tab}` ? "visible" : "hidden"} ${q.tag}`}
          key={q.id}
        >
          <h3>{q.question}</h3>
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
      <div
        className={`panssRemisi panss-remisi ${activeTab === "total" || activeTab === "panss-remisi" ? "visible" : "hidden"}`}
      >
        <h3
          style={{
            textAlign: "center",
          }}
        >
          PANSS-Remisi: {ArrayRem.join("/")}: {scoreRem}
        </h3>
      </div>
      <div
        className={`panssEC panss-ec ${activeTab === "total" || activeTab === "panss-ec" ? "visible" : "hidden"}`}
      >
        <h3
          style={{
            textAlign: "center",
          }}
        >
          PANSS-EC: {ArrayEC.join("/")}: {scoreEC}
        </h3>
      </div>

      {progress >= 100 ? (
        <>
          <div
            className={`panssTotal total ${activeTab === "total" ? "visible" : "hidden"}`}
          >
            <h2>Total Score: {totalScore}</h2>
          </div>
        </>
      ) : (
        <h3
          style={{
            textAlign: "center",
          }}
          className={`panssEC panss-ec ${activeTab === "total" || activeTab === "total" ? "visible" : "hidden"}`}
        >
          Please fill out all questions
        </h3>
      )}

      {/* Sticky Progress Bar */}
      <div className="sticky-progress-bar">
        <div className="progress-bar-container">
          <div className="progress-bar">
            {/* Buttons to switch tabs */}
            <div className="tabButtons">
              <button
                className={`tab-button total ${activeTab === "total" ? "tab-selected" : ""}`}
                onClick={() => handleTabClick("total")}
              >
                Total
              </button>
              <button
                className={`tab-button panss-remisi ${activeTab === "panss-remisi" ? "tab-selected" : ""}`}
                onClick={() => handleTabClick("panss-remisi")}
              >
                Remisi
              </button>
              <button
                className={`tab-button panss-ec ${activeTab === "panss-ec" ? "tab-selected" : ""}`}
                onClick={() => handleTabClick("panss-ec")}
              >
                EC
              </button>
            </div>
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
          defaultTitle={`PANSS`}
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

export default QuestionnairePANSS;
