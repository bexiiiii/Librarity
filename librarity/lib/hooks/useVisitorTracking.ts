/**
 * Visitor tracking hook
 * Tracks anonymous visitors and conversions
 */
'use client';

import { useEffect, useState } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Generate or retrieve visitor ID
const getVisitorId = async (): Promise<string> => {
  // Check if we already have a visitor ID in localStorage
  const stored = localStorage.getItem('visitor_id');
  if (stored) {
    return stored;
  }

  // Generate new fingerprint
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  const visitorId = result.visitorId;

  // Store for future use
  localStorage.setItem('visitor_id', visitorId);
  return visitorId;
};

// Get device info
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  
  let deviceType = 'desktop';
  if (/mobile/i.test(ua)) deviceType = 'mobile';
  if (/tablet/i.test(ua)) deviceType = 'tablet';
  
  let browser = 'unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  let os = 'unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';
  
  return { deviceType, browser, os };
};

// Get UTM parameters from URL
const getUTMParams = () => {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
};

export const useVisitorTracking = () => {
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    if (tracked) return;

    const trackVisit = async () => {
      try {
        const visitorId = await getVisitorId();
        const deviceInfo = getDeviceInfo();
        const utmParams = getUTMParams();

        const response = await fetch('/api/tracking/visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visitor_id: visitorId,
            landing_page: window.location.pathname,
            referrer: document.referrer || undefined,
            ...utmParams,
            ...deviceInfo,
          }),
        });

        if (response.ok) {
          setTracked(true);
          console.log('Visitor tracked successfully');
        }
      } catch (error) {
        console.error('Failed to track visitor:', error);
      }
    };

    trackVisit();
  }, [tracked]);

  return { tracked };
};
