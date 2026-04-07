import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "../store/useStore";

const authBenefits = [
  "Create a reusable local workspace profile for history, settings, and saved reports.",
  "Use Google-style or GitHub-style sign in now, then swap in real OAuth later.",
  "Keep everything stored on this machine until hosted sync is introduced."
];

function modeLabel(mode) {
  return mode === "signup" ? "Sign Up" : "Sign In";
}

function providerLabel(provider) {
  return provider === "github" ? "GitHub" : "Google";
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppStore((state) => state.user);
  const authAccounts = useAppStore((state) => state.authAccounts);
  const signUpWithEmail = useAppStore((state) => state.signUpWithEmail);
  const signInWithEmail = useAppStore((state) => state.signInWithEmail);
  const authenticateWithProvider = useAppStore((state) => state.authenticateWithProvider);
  const signOut = useAppStore((state) => state.signOut);
  const showSavedToast = useAppStore((state) => state.showSavedToast);

  const mode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const localAccountCount = useMemo(
    () => authAccounts.filter((account) => account.provider === "local").length,
    [authAccounts]
  );

  const setMode = (nextMode) => {
    setError("");
    setSearchParams(nextMode === "signup" ? { mode: "signup" } : { mode: "signin" });
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleEmailSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const result = signUpWithEmail({
        name: fullName,
        email,
        password,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      showSavedToast("Local account created");
      resetForm();
      navigate("/analyze");
      return;
    }

    const result = signInWithEmail({ email, password });
    if (!result.ok) {
      setError(result.error);
      return;
    }

    showSavedToast("Signed in locally");
    resetForm();
    navigate("/analyze");
  };

  const handleProviderAuth = (provider) => {
    setError("");
    const result = authenticateWithProvider(provider, mode);

    if (!result.ok) {
      setError(result.error || `Unable to continue with ${providerLabel(provider)}.`);
      return;
    }

    const action =
      result.created && mode === "signup"
        ? `${providerLabel(provider)} profile created locally`
        : `${providerLabel(provider)} sign-in stored locally`;

    showSavedToast(action);
    navigate("/analyze");
  };

  return (
    <div className="am-auth-grid">
      <section className="am-card am-landing-card">
        <div className="am-chip" style={{ marginBottom: 16 }}>
          Local auth enabled
        </div>
        <h1 className="am-page-title" style={{ fontSize: "2.4rem" }}>
          {mode === "signup" ? "Create your" : "Access your"} <span>AuditMind</span> workspace
        </h1>
        <p className="am-subtitle">
          Auth is still local-only, but both Sign In and Sign Up now create reusable profiles on this machine so saved reports, preferences, and history stay attached to your workspace session.
        </p>
        <div className="am-stack" style={{ marginTop: 20 }}>
          {authBenefits.map((item) => (
            <div key={item} className="am-list-item">
              {item}
            </div>
          ))}
        </div>
        <div className="am-auth-meta-row" style={{ marginTop: 18 }}>
          <span className="am-chip">Stored local accounts: {localAccountCount}</span>
          <span className="am-chip">Provider profiles: {authAccounts.length - localAccountCount}</span>
        </div>
      </section>

      <section className="am-card am-auth-card">
        <div className="am-auth-switch">
          {["signin", "signup"].map((item) => (
            <button
              key={item}
              type="button"
              className={`am-auth-switch-btn${mode === item ? " active" : ""}`}
              onClick={() => setMode(item)}
            >
              {modeLabel(item)}
            </button>
          ))}
        </div>

        {user ? (
          <div className="am-auth-session">
            <div className="am-section-title">Current session</div>
            <div className="am-list-item">
              <strong style={{ display: "block", marginBottom: 8 }}>{user.name}</strong>
              <div className="am-muted">{user.email}</div>
              <div className="am-muted" style={{ marginTop: 6 }}>
                Provider: {providerLabel(user.provider)}
              </div>
            </div>
            <div className="am-input-actions">
              <button type="button" className="am-primary-btn am-auth-provider" onClick={() => navigate("/analyze")}>
                Continue to Analyzer
              </button>
              <button
                type="button"
                className="am-secondary-btn am-auth-provider"
                onClick={() => {
                  signOut();
                  showSavedToast("Signed out");
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : null}

        <div className="am-section-header" style={{ marginTop: user ? 22 : 0 }}>
          <div>
            <h2 className="am-section-title">{mode === "signup" ? "Create a local account" : "Sign in to your local account"}</h2>
            <p className="am-muted">
              {mode === "signup"
                ? "Use email and password for a reusable local profile, or create a provider-style profile with one click."
                : "Return with your email and password, or resume a Google/GitHub-style local profile."}
            </p>
          </div>
        </div>

        <div className="am-stack">
          <div className="am-auth-provider-grid">
            <button type="button" className="am-secondary-btn am-auth-provider" onClick={() => handleProviderAuth("google")}>
              {mode === "signup" ? "Sign Up with Google" : "Sign In with Google"}
            </button>
            <button type="button" className="am-secondary-btn am-auth-provider" onClick={() => handleProviderAuth("github")}>
              {mode === "signup" ? "Sign Up with GitHub" : "Sign In with GitHub"}
            </button>
          </div>

          <div className="am-auth-divider">
            <span>or continue with email</span>
          </div>

          <form className="am-stack" onSubmit={handleEmailSubmit}>
            {mode === "signup" ? (
              <label className="am-auth-field">
                <span className="am-auth-label">Full name</span>
                <input
                  className="am-text-input"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Vamsi Krishna"
                />
              </label>
            ) : null}

            <label className="am-auth-field">
              <span className="am-auth-label">Email</span>
              <input
                type="email"
                className="am-text-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@local.auditmind"
                autoComplete="username"
              />
            </label>

            <label className="am-auth-field">
              <span className="am-auth-label">Password</span>
              <input
                type="password"
                className="am-text-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "signup" ? "Choose a password" : "Enter your password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </label>

            {mode === "signup" ? (
              <label className="am-auth-field">
                <span className="am-auth-label">Confirm password</span>
                <input
                  type="password"
                  className="am-text-input"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
              </label>
            ) : null}

            {error ? <div className="am-error">{error}</div> : null}

            <button type="submit" className="am-primary-btn am-auth-provider">
              {mode === "signup" ? "Create Local Account" : "Sign In"}
            </button>
          </form>

          <div className="am-auth-footer">
            <span className="am-muted">
              {mode === "signup" ? "Already have a local account?" : "Need a new workspace account?"}
            </span>
            <button type="button" className="am-auth-link-btn" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
              {mode === "signup" ? "Switch to Sign In" : "Switch to Sign Up"}
            </button>
          </div>

          <Link className="am-secondary-btn am-link-btn am-auth-provider" to="/analyze">
            Continue without signing in
          </Link>
        </div>
      </section>
    </div>
  );
}
