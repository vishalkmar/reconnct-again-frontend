import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container-app section text-center">
      <h1 className="text-6xl font-bold text-brand">404</h1>
      <p className="mt-3 text-ink-muted">The page you’re looking for can’t be found.</p>
      <Link to="/" className="btn-primary mt-6 inline-flex">Go home</Link>
    </div>
  );
}
