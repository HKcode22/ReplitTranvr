/**
 * P16 provider deletion must prove more than an unlogged bound ID.
 * This pure function accepts no credentials and never performs HTTP or
 * provider mutations. Recovery can DELETE only an exact subscriber URL,
 * ICAO, callback kind and CreditBased live subscription.
 */
export type Stage1ProviderOwnershipCandidateV39 = Readonly<{
  isActive?:boolean;
  billingType?:string;
  subject?:{type?:string|null;id?:string|null}|null;
  subscriber?:{type?:string|null;id?:string|null}|null;
}>;

export function isExactStage1ProviderSubscriptionOwnerV39(
  subscription:Stage1ProviderOwnershipCandidateV39|undefined|null,
  expected:Readonly<{icao:string;webhookSubscriberId:string}>
):boolean {
  if(!subscription||
     !/^[A-Z0-9]{4}$/.test(expected.icao)||
     !/^https:\/\/[^\s]+$/i.test(expected.webhookSubscriberId))
    return false;
  return subscription.isActive===true&&
    subscription.billingType==="CreditBased"&&
    subscription.subject?.type==="FlightByAirportIcao"&&
    String(subscription.subject?.id??"").toUpperCase()===expected.icao&&
    subscription.subscriber?.type==="WebHook"&&
    subscription.subscriber?.id===expected.webhookSubscriberId;
}
