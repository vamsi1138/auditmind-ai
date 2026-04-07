import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useStore";

const authBenefits = [
  "Local profile persistence for history, settings, and saved reports",
  "Provider-style sign in for Google or GitHub without cloud storage yet",
  "Ready for future hosted sync when backend storage is introduced"
];

export default function Auth() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const signInWithProvider = useAppStore((state) => state.signInWithProvider);
  const showSavedToast = useAppStore((state) => state.showSavedToast);

  const handleSignIn = (provider) => {
    signInWithProvider(provider);
    showSavedToast(`${provider === "github" ? "GitHub" : "Google"} sign-in stored locally`);
    navigate("/analyze");
  };

  return (
    <div className="am-auth-grid">
      <section className="am-card am-landing-card">
        <div className="am-chip" style={{ marginBottom: 16 }}>
          Local auth enabled
        </div>
        <h1 className="am-page-title" style={{ fontSize: "2.4rem" }}>
          Sign in to <span>AuditMind</span>
        </h1>
        <p className="am-subtitle">
          Authentication is local for now, so these actions create a workspace profile on this machine while keeping the UI ready for real Google and GitHub auth later.
        </p>
        <div className="am-stack" style={{ marginTop: 20 }}>
          {authBenefits.map((item) => (
            <div key={item} className="am-list-item">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="am-card am-auth-card">
        <h2 className="am-section-title">{user ? `Signed in as ${user.name}` : "Create your local profile"}</h2>
        <p className="am-muted" style={{ marginBottom: 18 }}>
          Choose a provider-style sign-in option. We can connect real storage and hosted auth flows later.
        </p>
        <div className="am-stack">
          <button type="button" className="am-secondary-btn am-auth-provider" onClick={() => handleSignIn("google")}>
            Continue with Google
          </button>
          <button type="button" className="am-secondary-btn am-auth-provider" onClick={() => handleSignIn("github")}>
            Continue with GitHub
          </button>
          <button type="button" className="am-primary-btn am-auth-provider" onClick={() => navigate("/analyze")}>
            Continue to Analyzer
          </button>
        </div>
      </section>
    </div>
  );
}
