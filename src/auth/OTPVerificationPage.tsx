import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * This page is kept for backward compatibility (old cached PWA versions).
 * The app now uses magic links — users click the link in their email.
 * Anyone landing here is redirected to the sign-in page.
 */
export function OTPVerificationPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/signin', { replace: true });
  }, [navigate]);

  return null;
}
