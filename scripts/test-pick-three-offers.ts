import { pickThreeOffers } from "../server/routes";

// Mirrors the (loosely-typed) Duffel offer shape that pickThreeOffers reads
// via its helper accessors. We define explicit fields here instead of using
// `any` so the test exercises the same property names production reads.
interface FakeSegment {
  marketing_carrier: { iata_code: string; name: string };
  marketing_carrier_flight_number: string;
  departing_at: string;
  arriving_at: string;
}

interface FakeSlice {
  duration: string;
  segments: FakeSegment[];
}

interface FakeOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  slices: FakeSlice[];
}

function offer(args: {
  id: string;
  carrier: string;
  flightNo: string;
  price: number;
  durationMin: number;
  stops?: number;
  layoverMin?: number;
}): FakeOffer {
  const stops = args.stops ?? 0;
  const layoverMin = args.layoverMin ?? 60;
  const flyMin = args.durationMin - stops * layoverMin;
  const segMin = stops > 0 ? Math.max(45, Math.floor(flyMin / (stops + 1))) : args.durationMin;
  const segments: FakeSegment[] = [];
  let t = Date.parse("2026-06-15T08:00:00.000Z");
  for (let i = 0; i <= stops; i++) {
    const dep = new Date(t).toISOString();
    const arr = new Date(t + segMin * 60_000).toISOString();
    segments.push({
      marketing_carrier: { iata_code: args.carrier, name: args.carrier },
      marketing_carrier_flight_number: `${args.flightNo}-${i}`,
      departing_at: dep,
      arriving_at: arr,
    });
    t += segMin * 60_000;
    if (i < stops) t += layoverMin * 60_000;
  }
  const h = Math.floor(args.durationMin / 60);
  const m = args.durationMin % 60;
  return {
    id: args.id,
    total_amount: args.price.toFixed(2),
    total_currency: "USD",
    slices: [{ duration: `PT${h}H${m}M`, segments }],
  };
}

let failures = 0;
function assert(cond: any, msg: string) {
  if (!cond) {
    failures++;
    console.error(`  FAIL: ${msg}`);
  } else {
    console.log(`  ok: ${msg}`);
  }
}

console.log("Test 1: Best Price is the strictly cheapest offer in the pool");
{
  const pool = [
    offer({ id: "a", carrier: "AA", flightNo: "1", price: 320, durationMin: 240, stops: 0 }),
    offer({ id: "b", carrier: "UA", flightNo: "2", price: 210, durationMin: 360, stops: 1 }),
    offer({ id: "c", carrier: "DL", flightNo: "3", price: 285, durationMin: 280, stops: 0 }),
    offer({ id: "d", carrier: "B6", flightNo: "4", price: 260, durationMin: 410, stops: 1 }),
  ];
  const picks = pickThreeOffers(pool);
  const bp = picks.find((p) => p.label === "Best Price");
  assert(bp?.offer.id === "b", `Best Price = cheapest (got id=${bp?.offer.id})`);
}

console.log("Test 2: Best Value is never strictly dominated by Best Price");
{
  // Pool where the OLD `price + duration*0.5` value formula would surface a
  // longer-and-pricier offer for Best Value. Guard must reject it.
  const pool = [
    offer({ id: "cheap-fast", carrier: "UA", flightNo: "1", price: 200, durationMin: 240, stops: 0 }),
    // Pricier AND longer than cheap-fast → strictly dominated, must be rejected.
    offer({ id: "dominated", carrier: "AA", flightNo: "2", price: 210, durationMin: 260, stops: 0 }),
    // Pricier but faster → legitimate value compromise.
    offer({ id: "value-ok", carrier: "DL", flightNo: "3", price: 230, durationMin: 220, stops: 0 }),
  ];
  const picks = pickThreeOffers(pool);
  const bp = picks.find((p) => p.label === "Best Price");
  const bv = picks.find((p) => p.label === "Best Value");
  assert(bp?.offer.id === "cheap-fast", `BP correct (got ${bp?.offer.id})`);
  assert(bv?.offer.id !== "dominated", `BV is not the strictly-dominated offer (got ${bv?.offer.id})`);
  // BV is allowed to equal "value-ok" or fall through to another non-dominated
  // candidate — what matters is that "dominated" is never the BV pick.
  if (bv) {
    const bvPrice = parseFloat(bv.offer.total_amount);
    const bvDur = sumDur(bv.offer);
    const bpPrice = parseFloat(bp!.offer.total_amount);
    const bpDur = sumDur(bp!.offer);
    assert(
      !(bvPrice >= bpPrice && bvDur >= bpDur),
      `BV (${bvPrice}/${bvDur}m) not dominated by BP (${bpPrice}/${bpDur}m)`,
    );
  }
}

console.log("Test 3: Fastest is a nonstop when at least one nonstop exists");
{
  // The shortest-by-raw-minutes offer is a 1-stop, but a nonstop exists in
  // the pool. Fastest must prefer the nonstop.
  const pool = [
    offer({ id: "cheap-1stop", carrier: "AA", flightNo: "1", price: 180, durationMin: 230, stops: 1 }),
    offer({ id: "nonstop", carrier: "UA", flightNo: "2", price: 260, durationMin: 245, stops: 0 }),
    // A second 1-stop that is shorter than the nonstop on raw minutes.
    offer({ id: "shortest-1stop", carrier: "DL", flightNo: "3", price: 240, durationMin: 235, stops: 1 }),
  ];
  const picks = pickThreeOffers(pool);
  const fastest = picks.find((p) => p.label === "Fastest");
  assert(
    fastest?.offer.id === "nonstop",
    `Fastest prefers nonstop over a shorter 1-stop (got ${fastest?.offer.id})`,
  );
}

function sumDur(o: FakeOffer): number {
  let m = 0;
  for (const s of o.slices || []) {
    const match = String(s.duration || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) m += (parseInt(match[1] || "0", 10) * 60) + parseInt(match[2] || "0", 10);
  }
  return m;
}

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll picker invariants hold.");
