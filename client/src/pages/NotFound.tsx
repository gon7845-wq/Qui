import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="min-h-full grid place-items-center text-center px-6">
      <div>
        <p className="court-title text-5xl font-black mb-4">404</p>
        <p className="text-court-parchment/60 mb-6">Cette salle d'audience n'existe pas.</p>
        <Link to="/" className="court-btn">Retour au greffe</Link>
      </div>
    </div>
  );
}
