import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ResultsHistory = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const navigate = useNavigate();

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("questionnaire_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error("Error fetching results:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter results based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredResults(results);
    } else {
      const filtered = results.filter(
        (result) =>
          result.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.questionnaire_id
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          result.total_score.toString().includes(searchTerm) ||
          new Date(result.created_at)
            .toLocaleString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
      setFilteredResults(filtered);
    }
  }, [searchTerm, results]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchResults();

    // Listen for update events
    const handleResultsUpdated = () => {
      fetchResults();
    };

    window.addEventListener("resultsUpdated", handleResultsUpdated);

    return () => {
      window.removeEventListener("resultsUpdated", handleResultsUpdated);
    };
  }, [user]);

  const handleDeleteStart = (id, e) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleDeleteConfirm = async (e) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("questionnaire_results")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;
      fetchResults();
    } catch (error) {
      console.error("Delete error:", error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = (e) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  const handleRenameStart = (result, e) => {
    e.stopPropagation();
    setEditingId(result.id);
    setNewTitle(result.title || "");
  };

  const handleRenameSave = async (result, e) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("questionnaire_results")
        .update({ title: newTitle })
        .eq("id", result.id);

      if (error) throw error;
      setEditingId(null);
      fetchResults();
    } catch (error) {
      console.error("Rename error:", error.message);
    }
  };

  const handleResultClick = (result) => {
    if (editingId !== result.id) {
      navigate(`/${result.questionnaire_id}`, {
        state: {
          previousResult: result,
        },
      });
    }
  };

  if (loading) return <div>Loading history...</div>;

  return (
    <div className="results-history">
      {/* Search Bar - Always visible if there are results */}
      {results.length > 0 && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="clear-search">
              ×
            </button>
          )}
        </div>
      )}

      {/* Results Display */}
      {loading ? (
        <div>Loading history...</div>
      ) : results.length === 0 ? (
        <p>No previous results found</p>
      ) : filteredResults.length === 0 ? (
        <p>No results found{searchTerm ? ` for "${searchTerm}"` : ""}</p>
      ) : (
        <ul>
          {filteredResults.map((result) => (
            <li
              key={result.id}
              onClick={() => handleResultClick(result)}
              className="history-item"
            >
              {deletingId === result.id ? (
                <div className="edit-form" onClick={(e) => e.stopPropagation()}>
                  <p className="delete-items">Delete this item?</p>
                  <div className="edit-form-buttons">
                    <button className="cancel" onClick={handleDeleteConfirm}>
                      Delete
                    </button>
                    <button className="save" onClick={handleDeleteCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : editingId === result.id ? (
                <div className="edit-form" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter new title"
                    autoFocus
                  />
                  <div className="edit-form-buttons">
                    <button
                      className="save"
                      onClick={(e) => handleRenameSave(result, e)}
                    >
                      Save
                    </button>
                    <button
                      className="cancel"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="history-content">
                  <div>
                    <strong>
                      {result.title ||
                        `${result.questionnaire_id.toUpperCase()} Result`}
                    </strong>
                    <span>({result.total_score})</span>
                  </div>
                </div>
              )}
              <small>{new Date(result.created_at).toLocaleString()}</small>
              <div className="history-actions">
                <button onClick={(e) => handleRenameStart(result, e)}>
                  ✏️
                </button>
                <button onClick={(e) => handleDeleteStart(result.id, e)}>
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ResultsHistory;
