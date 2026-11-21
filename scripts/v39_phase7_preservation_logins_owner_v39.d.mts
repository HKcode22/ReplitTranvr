import type {PoolClient,Client} from "pg";
export interface P7PreservationActor {
 readonly role:string;
 readonly secret:string;
 readonly table?:string;
 readonly privilege?:"SELECT"|"INSERT";
 readonly fn?:string;
 readonly functions?:readonly string[];
}
export const P7_PRESERVATION_ACTORS:readonly P7PreservationActor[];
export function inspectP7PreservationActors(c:PoolClient|Client,options:{newLogins:boolean;expiryLogins?:boolean}):Promise<{existingRoles:number;preservationLogins:number;expiryLogins:number;empty:boolean}>;
export function commissionP7PreservationActors(c:PoolClient|Client,passwords:Record<string,string>,assertDisabled:(client:PoolClient|Client)=>Promise<void>):Promise<{status:string;newLogins:number;providerCalls:number;phase6PaidGo:boolean}>;
export function verifyP7PreservationLogin(c:PoolClient|Client,a:P7PreservationActor):Promise<void>;
