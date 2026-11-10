import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '../components/ui';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <Compass className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-1 text-slate-500">The page you're looking for doesn't exist or has moved.</p>
        <Button as={Link} to="/" className="mt-6">Back to home</Button>
      </div>
    </div>
  );
}
