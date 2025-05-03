export const GA_TRACKING_ID = 'UA-2059775-9';

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  if (!process.env.NEXT_PUBLIC_USE_EMULATORS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (window as any).gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({
  action,
  category,
  label,
  value,
  nonInteraction,
}: {
  action: string;
  category: string;
  label: string;
  value?: number;
  nonInteraction?: boolean;
}) => {
  if (!process.env.NEXT_PUBLIC_USE_EMULATORS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      ...(nonInteraction && { non_interaction: true }),
    });
  }
};
