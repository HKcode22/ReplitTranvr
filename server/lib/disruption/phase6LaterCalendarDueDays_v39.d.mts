export const P6_CURRENT_PRE_DISPATCH_CONFIRM: "RUN_CURRENT_SIGNED_PRE_TICK_NO_PROVIDER";
export const P6_CURRENT_T24_DISPATCH_CONFIRM: "RUN_CURRENT_SIGNED_T24_WITH_WITNESS_NO_PROVIDER";
export function isP6CurrentPreTrigger(env: NodeJS.ProcessEnv): boolean;
export function isP6CurrentT24Trigger(env: NodeJS.ProcessEnv): boolean;
export interface P6CalendarTrust {
 reviewedCodeSha: string;
 manifestSha256: string;
 calendarSha256: string;
 releaseSha256: string;
 rightsSha256: string;
}
export interface P6CalendarWindows {
 windows: {day:number;children:{start:number;end:number}[]}[];
 validFrom:number;
 validUntil:number;
}
export function loadP6LaterCalendarWindows(env:NodeJS.ProcessEnv,trust:P6CalendarTrust,read?:(path:string)=>Buffer,horizonMode?:"LATER"|"T24"):P6CalendarWindows;
export function loadP6CurrentPreCalendarWindows(env:NodeJS.ProcessEnv,trust:P6CalendarTrust,read?:(path:string)=>Buffer):P6CalendarWindows;
export function loadP6CurrentT24CalendarWindows(env:NodeJS.ProcessEnv,trust:P6CalendarTrust,read?:(path:string)=>Buffer):P6CalendarWindows;
export function selectP6LaterCalendarDueDays(reviewed:P6CalendarWindows,observedUtc:string):{dayIndices:number[];deferredDays:number};
export const P6_CURRENT_LATER_ENROLL_CONFIRM: "ENROLL_DUE_CURRENT_SIGNED_LATER_NO_PROVIDER";
export const P6_CURRENT_T24_ENROLL_CONFIRM: "ENROLL_DUE_CURRENT_SIGNED_T24_NO_PROVIDER";
export function isP6CurrentEnrollmentDispatch(env:NodeJS.ProcessEnv,horizonMode:"LATER"|"T24"):boolean;
export function loadP6CurrentEnrollmentCalendarWindows(env:NodeJS.ProcessEnv,trust:P6CalendarTrust,read?:(path:string)=>Buffer,horizonMode?:"LATER"|"T24"):P6CalendarWindows;
