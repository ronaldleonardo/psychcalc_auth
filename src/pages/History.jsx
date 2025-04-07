// src/pages/History.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const History = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("questionnaire_results")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setResults(data);
      } catch (error) {
        console.error("Error fetching results:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [user]);

  const viewResult = (result) => {
    navigate(`/${result.questionnaire_id}`, { state: { savedResult: result } });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="history-container">
      <h1>Your Saved Results</h1>
      {results.length === 0 ? (
        <p>No saved results yet.</p>
      ) : (
        <div className="results-list">
          {results.map((result) => (
            <div
              key={result.id}
              className="result-card"
              onClick={() => viewResult(result)}
            >
              <h3>{result.questionnaire_id.toUpperCase()}</h3>
              <p>Score: {result.total_score}</p>
              <p>Severity: {result.severity_level}</p>
              <p>{new Date(result.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
