import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '@/components/common';
import { requestDeviceCode, pollDeviceToken } from '@/providers/allegro/api';
import { useInvitationStore } from '@/stores';
import { tracker, AnalyticsEvents } from '@/analytics';
import type { ProviderCredentials } from '@/providers/types';
import type { AllegroDeviceCodeResponse } from '@/providers/allegro/types';
import {
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  ClipboardCheck,
  Timer,
} from 'lucide-react';

type DeviceFlowStatus =
  | 'idle'
  | 'requesting'
  | 'waiting'
  | 'success'
  | 'denied'
  | 'expired'
  | 'error';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  credentials: ProviderCredentials;
}

export function DeviceFlowModal({
  isOpen,
  onClose,
  providerId,
  providerName,
  credentials,
}: Props) {
  const { t } = useTranslation();
  const { updateCredentials } = useInvitationStore();

  const [status, setStatus] = useState<DeviceFlowStatus>('idle');
  const [deviceData, setDeviceData] = useState<AllegroDeviceCodeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    abortRef.current = true;
  }, []);

  const startFlow = useCallback(async () => {
    setStatus('requesting');
    setErrorMessage('');
    setDeviceData(null);
    setCopied(false);
    abortRef.current = false;

    try {
      const data = await requestDeviceCode(credentials);
      if (abortRef.current) return;

      setDeviceData(data);
      setStatus('waiting');
      setSecondsLeft(data.expires_in);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            cleanup();
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start polling
      let interval = data.interval * 1000; // convert to ms
      const poll = async () => {
        if (abortRef.current) return;

        try {
          const result = await pollDeviceToken(credentials, data.device_code);
          if (abortRef.current) return;

          if (result.ok) {
            cleanup();
            const tokenData = result.data;
            const expiresAt = new Date(
              Date.now() + tokenData.expires_in * 1000,
            ).toISOString();

            updateCredentials(providerId, {
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              tokenExpiresAt: expiresAt,
            });

            tracker.trackEvent(AnalyticsEvents.PROVIDER_SYNC_COMPLETED, {
              providerId,
              action: 'device_flow_connected',
            });

            setStatus('success');
            setTimeout(() => onClose(), 2000);
            return;
          }

          // Handle non-ok results
          switch (result.error) {
            case 'authorization_pending':
              // Keep polling — schedule next
              break;
            case 'slow_down':
              // Increase interval
              interval += 5000;
              break;
            case 'access_denied':
              cleanup();
              setStatus('denied');
              tracker.trackEvent(AnalyticsEvents.PROVIDER_SYNC_FAILED, {
                providerId,
                error: 'access_denied',
              });
              return;
            default:
              // expired or invalid device code
              cleanup();
              setStatus('expired');
              return;
          }
        } catch {
          // Network error — keep retrying
        }

        // Schedule next poll
        if (!abortRef.current) {
          pollingRef.current = setTimeout(poll, interval) as unknown as ReturnType<typeof setInterval>;
        }
      };

      // First poll after interval
      pollingRef.current = setTimeout(poll, interval) as unknown as ReturnType<typeof setInterval>;
    } catch (err) {
      if (abortRef.current) return;
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      tracker.trackEvent(AnalyticsEvents.PROVIDER_SYNC_FAILED, {
        providerId,
        error: err instanceof Error ? err.message : 'device_code_request_failed',
      });
    }
  }, [credentials, providerId, updateCredentials, onClose, cleanup]);

  // Start flow when modal opens
  useEffect(() => {
    if (isOpen) {
      startFlow();
    }
    return () => {
      cleanup();
    };
  }, [isOpen, startFlow, cleanup]);

  // Reset on close
  const handleClose = () => {
    cleanup();
    setStatus('idle');
    setDeviceData(null);
    onClose();
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select text
    }
  };

  // Format user_code as "XXX XXX XXX" for readability
  const formatCode = (code: string): string => {
    const clean = code.replace(/\s/g, '');
    return clean.match(/.{1,3}/g)?.join(' ') ?? code;
  };

  const minutesLeft = Math.ceil(secondsLeft / 60);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('providers.deviceFlow.title', { provider: providerName })}>
      <div className="space-y-5">
        {/* Requesting device code */}
        {status === 'requesting' && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        )}

        {/* Waiting for user to authorize */}
        {status === 'waiting' && deviceData && (
          <>
            {/* Step 1: Link */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('providers.deviceFlow.step1')}
              </p>
              <a
                href={deviceData.verification_uri_complete}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                {t('providers.deviceFlow.openLink')}
              </a>
            </div>

            {/* Step 2: Code */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('providers.deviceFlow.step2')}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <code className="rounded-lg bg-gray-100 px-5 py-3 text-2xl font-bold tracking-[0.3em] text-gray-900 dark:bg-gray-800 dark:text-white select-all">
                  {formatCode(deviceData.user_code)}
                </code>
                <button
                  onClick={() => copyCode(deviceData.user_code)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                  title="Copy"
                >
                  {copied ? (
                    <ClipboardCheck className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Polling indicator */}
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('providers.deviceFlow.waiting')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('providers.deviceFlow.waitingDescription')}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-xs text-gray-400 shrink-0">
                <Timer className="h-3.5 w-3.5" />
                {t('providers.deviceFlow.codeExpires', { minutes: minutesLeft })}
              </div>
            </div>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="mt-3 text-sm font-medium text-green-700 dark:text-green-400">
              {t('providers.deviceFlow.success')}
            </p>
          </div>
        )}

        {/* Denied */}
        {status === 'denied' && (
          <div className="flex flex-col items-center py-6 text-center">
            <XCircle className="h-10 w-10 text-red-500" />
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {t('providers.deviceFlow.denied')}
            </p>
            <Button size="sm" className="mt-4" onClick={startFlow}>
              {t('providers.deviceFlow.tryAgain')}
            </Button>
          </div>
        )}

        {/* Expired */}
        {status === 'expired' && (
          <div className="flex flex-col items-center py-6 text-center">
            <Timer className="h-10 w-10 text-amber-500" />
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              {t('providers.deviceFlow.expired')}
            </p>
            <Button size="sm" className="mt-4" onClick={startFlow}>
              {t('providers.deviceFlow.tryAgain')}
            </Button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex flex-col items-center py-6 text-center">
            <XCircle className="h-10 w-10 text-red-500" />
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {t('providers.deviceFlow.error')}
            </p>
            {errorMessage && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {errorMessage}
              </p>
            )}
            <Button size="sm" className="mt-4" onClick={startFlow}>
              {t('providers.deviceFlow.tryAgain')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
