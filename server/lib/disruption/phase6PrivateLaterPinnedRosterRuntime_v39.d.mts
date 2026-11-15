import type {P5CdGithubPreRelease} from "./phase5CdGithubPreReleaseGate_v39";
import type {P5CdFrozenRoster,P5CdFrozenRosterEntry,P5CdVerifiedTaskPacket} from "./phase5CdGithubBoundedPreTick_v39";
export const P6_PRIVATE_LATER_PINNED_PATH:"PRIVATE_STORED";
export interface P6PrivatePinnedRoster {readonly packetCount:number;readonly rosterBytes:Buffer;readonly roster:P5CdFrozenRoster;readonly entries:P5CdFrozenRosterEntry[];readonly packets:Map<string,P5CdVerifiedTaskPacket>}
export function readP6PrivatePinnedRosterForOriginalRunner(env:NodeJS.ProcessEnv,gate:P5CdGithubPreRelease,writerUrl:string|undefined):Promise<P6PrivatePinnedRoster>;
export function admitP6PrivateLaterPinnedRoster(env:NodeJS.ProcessEnv,gate:P5CdGithubPreRelease,writerUrl:string|undefined):unknown;
export function verifyP6PrivatePinnedProjection(projected:unknown,gate:P5CdGithubPreRelease,selector:unknown):P6PrivatePinnedRoster;
