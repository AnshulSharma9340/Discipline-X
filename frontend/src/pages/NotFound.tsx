import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center">
        <div className="text-7xl font-display font-bold neon-text">404</div>
        <p className="text-white/60 mt-2">This page slipped the streak.</p>
        <Link to="/dashboard" className="inline-block mt-6">
          <Button>Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
