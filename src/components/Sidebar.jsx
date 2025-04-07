import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ResultsHistory from "./ResultsHistory";
import { useEffect, useState } from "react";
import { color } from "framer-motion";

const Sidebar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [key, setKey] = useState(0); // Add key state

  useEffect(() => {
    // Change key when user changes to force remount
    setKey((prevKey) => prevKey + 1);
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  return (
    <div className="sidebar" key={key}>
      {/* Add key prop */}
      <div className="sidebar-header">
        {user && (
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        )}
      </div>
      {!user && (
        <div className="history-section">
          <hr style={{ color: "rgba(0,0,0,0)" }} />
          <hr style={{ color: "rgba(0,0,0,0)" }} />
          <h3 className="assessment-history">Assessment History</h3>
          <p> </p>
          <p>Login required ... </p>
        </div>
      )}
      {user && (
        <div className="history-section">
          <h3 className="assessment-history">Assessment History</h3>
          <ResultsHistory />
        </div>
      )}
    </div>
  );
};

export default Sidebar;
