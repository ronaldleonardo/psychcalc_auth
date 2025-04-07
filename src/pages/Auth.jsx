import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? "Login" : "Sign Up"}</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{isLogin ? "Login" : "Sign Up"}</button>
      </form>
      <button
        className="forgot-password-button"
        onClick={() => navigate("/forgot-password")}
      >
        Forgot password?
      </button>
      <p className="create-new-account">
        <button
          className="create-new-account"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Need to create an account?" : "Already have an account?"}
        </button>
      </p>
      <p className="guest">
        <a
          className="guest-link"
          href="https://guestcalc.ronaldleonardo.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Don't want to sign in? Guest
        </a>
      </p>
    </div>
  );
};

export default Auth;
