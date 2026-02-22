import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInvitationStore } from '@/stores';
import { exchangeAuthorizationCode } from '@/providers/allegro/api';
import {
  loadCodeVerifier,
  clearCodeVerifier,
  loadState,
  clearState,
} from '@/providers/allegro/pkce';
import { tracker, AnalyticsEvents } from '@/analytics';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function AllegroCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getCredentials, updateCredentials } = useInvitationStore();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('[Allegro OAuth] Error from Allegro:', error);
      setStatus('error');
      setErrorMessage(`Allegro authorization denied: ${error}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No authorization code received from Allegro.');
      return;
    }

    // Validate state parameter (CSRF protection)
    const returnedState = searchParams.get('state');
    const savedState = loadState();
    clearState();

    if (savedState && returnedState !== savedState) {
      setStatus('error');
      setErrorMessage('Invalid state parameter — possible CSRF attack. Please try again.');
      return;
    }

    const credentials = getCredentials('allegro');
    if (!credentials) {
      setStatus('error');
      setErrorMessage('No Allegro credentials found. Load an invitation first.');
      return;
    }

    // Load PKCE code_verifier from session
    const codeVerifier = loadCodeVerifier();
    clearCodeVerifier();

    (async () => {
      try {
        console.info('[Allegro OAuth] Exchanging authorization code...', { pkce: !!codeVerifier });
        const tokenData = await exchangeAuthorizationCode(credentials, code, codeVerifier ?? undefined);

        const expiresAt = new Date(
          Date.now() + tokenData.expires_in * 1000,
        ).toISOString();

        updateCredentials('allegro', {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt: expiresAt,
        });

        tracker.trackEvent(AnalyticsEvents.PROVIDER_SYNC_COMPLETED, {
          providerId: 'allegro',
          action: 'oauth_connected',
        });

        console.info('[Allegro OAuth] Connected successfully, token expires at:', expiresAt);
        setStatus('success');

        // Redirect to main page after short delay
        setTimeout(() => navigate('/', { replace: true }), 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Token exchange failed';
        console.error('[Allegro OAuth] Exchange failed:', message);
        setStatus('error');
        setErrorMessage(message);
        tracker.trackEvent(AnalyticsEvents.PROVIDER_SYNC_FAILED, {
          providerId: 'allegro',
          error: message,
        });
      }
    })();
  }, [searchParams, getCredentials, updateCredentials, navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="mx-auto max-w-md rounded-lg border border-gray-200 p-8 text-center dark:border-gray-800">
        {status === 'processing' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-500" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Connecting to Allegro...
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Exchanging authorization code for access token.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Connected!
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Allegro account linked successfully. Redirecting...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Connection Failed
            </h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Back to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
