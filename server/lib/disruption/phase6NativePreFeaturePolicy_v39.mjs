// Exact existing native feature-review predicate. No new rights or authority.
// Optionality remains with the caller; conditional commissioning requires it.
export function hasP6NativePreFeatureReview(review,rightsSha256){
 return Boolean(review&&review.approved===true&&
  /^[a-f0-9]{64}$/.test(review.externalContentUseReviewSha256??"")&&
  review.rightsSha256===rightsSha256);
}
