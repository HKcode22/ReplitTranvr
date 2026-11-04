/**
 * GitHub Actions REST `workflow_run.path` is often branch-suffixed:
 *   ".github/workflows/owner.yml@main"
 * See GitHub official REST workflow runs example. It does NOT necessarily
 * equal GITHUB_WORKFLOW_REF (which uses @refs/heads/main).
 *
 * Require exactly the reviewed file on the default main branch; never
 * accept pull refs, arbitrary SHA, another path, a tag or another branch.
 * Pure source verification; no GitHub access, DB mutations or provider calls.
 */
export function isP4G5ReviewedMainWorkflowRestPathV39(
 actual:unknown,expected:string
):boolean {
 if(typeof actual!=="string"||
   !/^\.github\/workflows\/[a-z0-9][a-z0-9-]*\.yml$/.test(expected))
  return false;
 return actual===expected||
  actual===expected+"@main"||
  actual===expected+"@refs/heads/main";
}
