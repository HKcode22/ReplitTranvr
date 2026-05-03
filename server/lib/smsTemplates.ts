// SMS message templates. Keep copy short and A2P-compliant — every body
// includes the sender brand and STOP/HELP language so each individual SMS
// stands on its own per carrier requirements.

export interface BuildGuestProposalSmsArgs {
  proposalUrl: string;
}

export function buildGuestProposalSms({ proposalUrl }: BuildGuestProposalSmsArgs): string {
  return `Travnr: Your travel options are ready: ${proposalUrl} Reply STOP to opt out or HELP for help. Msg & data rates may apply.`;
}

// TODO: not yet wired to any event. Stubbed so the template surface lives in
// one place when booking-update SMS gets enabled in a follow-up task.
export interface BuildBookingUpdateSmsArgs {
  bookingRef: string;
  statusLine: string;
  detailsUrl?: string;
}
export function buildBookingUpdateSms({ bookingRef, statusLine, detailsUrl }: BuildBookingUpdateSmsArgs): string {
  const tail = detailsUrl ? ` ${detailsUrl}` : "";
  return `Travnr booking ${bookingRef}: ${statusLine}.${tail} Reply STOP to opt out or HELP for help.`;
}

// TODO: not yet wired to any event. Stubbed for the future
// payment-reminder follow-up.
export interface BuildPaymentReminderSmsArgs {
  amountLabel: string;
  payUrl: string;
}
export function buildPaymentReminderSms({ amountLabel, payUrl }: BuildPaymentReminderSmsArgs): string {
  return `Travnr: Your payment of ${amountLabel} is pending. Complete it here: ${payUrl} Reply STOP to opt out or HELP for help.`;
}
