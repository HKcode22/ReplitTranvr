/**
 * Phase4 Gate5 PROVISIONAL origin context & operator sensitivity, read-only.
 *
 * An airport-scoped FIDS Departure query withLeg and IsOperator can justify a
 * query-origin OPERATOR RECORD candidate. It CANNOT establish physical-flight
 * identity, commercially eligible scope, frozen first selected T, or labels.
 * Only bounded SQL aggregates of already-retained, nonexpired provider originals;
 * no row identifiers, schedules, routes or response bytes in the report.
 */
export const P4_ORIGIN_SENSITIVITY_SCHEMA_V39="v39.phase4.gate5-query-origin-sensitivity.v1" as const;
export const P4_ORIGIN_SENSITIVITY_SQL_V39=[
 "WITH selected AS (",
 "SELECT source_airport_icao,query_direction,raw_payload",
 "FROM clean.fids_query_response",
 "WHERE population_query_id=ANY($1::uuid[])",
 "AND source_airport_icao=$2",
 "AND available_at<=$3::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "), items AS (",
 "SELECT s.source_airport_icao,s.query_direction,f.value AS item",
 "FROM selected s CROSS JOIN LATERAL jsonb_array_elements(",
 "CASE WHEN jsonb_typeof(s.raw_payload->'departures')='array'",
 "THEN s.raw_payload->'departures' ELSE '[]'::jsonb END) f",
 "), f AS (",
 "SELECT source_airport_icao,query_direction,",
 "item->>'codeshareStatus' AS codeshare,",
 "NULLIF(upper(btrim(item->>'number')),'') AS flight_no,",
 "NULLIF(upper(btrim(item#>>'{departure,airport,icao}')),'') AS dep_icao,",
 "NULLIF(upper(btrim(item#>>'{arrival,airport,icao}')),'') AS arr_icao,",
 "NULLIF(btrim(item#>>'{departure,scheduledTime,utc}'),'') AS dep_schedule,",
 "item->>'isCargo' AS is_cargo,item->>'isPrivate' AS is_private,",
 "item->>'isCharter' AS is_charter,item->>'isGeneralAviation' AS is_ga",
 "FROM items",
 "), classified AS (",
 "SELECT *,",
 "(codeshare IN ('IsOperator','1')) AS operator_record,",
 "(query_direction IN ('Departure','Both')) AS departure_context,",
 "coalesce(is_cargo='true' OR is_private='true' OR is_charter='true' OR is_ga='true',false) AS exclusion_flag,",
 "coalesce(is_charter='false' OR (is_cargo='false' AND is_private='false'),false) AS explicit_core_pattern,",
 "(dep_icao IS NULL) AS missing_explicit_origin,",
 "(dep_icao=source_airport_icao) AS explicit_origin_agrees,",
 "(dep_icao IS NOT NULL AND dep_icao<>source_airport_icao) AS origin_conflicts,",
 "(flight_no IS NOT NULL AND arr_icao ~ '^[A-Z0-9]{4}$'",
 " AND dep_schedule ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{1,3})?Z$')",
 " AS fingerprint_fields_present",
 "FROM f",
 ") SELECT",
 "COUNT(*)::int AS departures,",
 "COUNT(*) FILTER (WHERE operator_record)::int AS operator_records,",
 "COUNT(*) FILTER (WHERE operator_record AND departure_context)::int AS operator_query_departure_records,",
 "COUNT(*) FILTER (WHERE operator_record AND departure_context AND missing_explicit_origin)::int AS query_origin_only_records,",
 "COUNT(*) FILTER (WHERE operator_record AND explicit_origin_agrees)::int AS explicit_origin_agrees,",
 "COUNT(*) FILTER (WHERE operator_record AND origin_conflicts)::int AS conflicting_origins,",
 "COUNT(*) FILTER (WHERE operator_record AND flight_no IS NULL)::int AS missing_flight_number,",
 "COUNT(*) FILTER (WHERE operator_record AND arr_icao IS NULL)::int AS missing_arrival_icao,",
 "COUNT(*) FILTER (WHERE operator_record AND dep_schedule IS NULL)::int AS missing_departure_schedule,",
 "COUNT(*) FILTER (WHERE operator_record AND exclusion_flag)::int AS explicit_auxiliary_scope,",
 "COUNT(*) FILTER (WHERE operator_record AND NOT exclusion_flag AND explicit_core_pattern)::int AS explicit_core_pattern,",
 "COUNT(*) FILTER (WHERE operator_record AND NOT exclusion_flag AND NOT explicit_core_pattern)::int AS scope_unknown,",
 "COUNT(*) FILTER (WHERE operator_record AND departure_context AND NOT origin_conflicts AND fingerprint_fields_present)::int AS fingerprint_rows,",
 "COUNT(DISTINCT jsonb_build_array(source_airport_icao,flight_no,arr_icao,dep_schedule))",
 "FILTER (WHERE operator_record AND departure_context AND NOT origin_conflicts AND fingerprint_fields_present)::int",
 "AS unique_fingerprints",
 "FROM classified"
].join(" ");

export interface P4QueryOriginReaderV39{
 query(sql:string,params:unknown[]):Promise<{rows:unknown[]}>;
}
export interface P4QueryOriginReportV39{
 schema:typeof P4_ORIGIN_SENSITIVITY_SCHEMA_V39;
 status:"PROVISIONAL_QUERY_ORIGIN_OPERATOR_RECORD_SENSITIVITY_ONLY";
 sourceAirport:string;
 selectedUnexpiredQueries:number;
 sourceDepartureRecords:number;
 providerOperatorRecords:number;
 operatorDepartureQueryRecords:number;
 operatorMissingExplicitOrigin:number;
 operatorExplicitOriginAgree:number;
 operatorExplicitOriginConflicts:number;
 operatorMissingFlightNumber:number;
 operatorMissingDestinationIcao:number;
 operatorMissingScheduledUtc:number;
 operatorExplicitAuxiliaryFlags:number;
 operatorExplicitCoreBooleanPattern:number;
 operatorUnknownScope:number;
 completeSourceFingerprintObservations:number;
 distinctSyntacticFingerprints:number;
 repeatedExactFingerprintObservations:number;
 originFromQueryContextOnly:true;
 physicalFlightUniquenessCertified:false;
 firstSelectedTScheduleCertified:false;
 commercialCorePopulationCertified:false;
 sourceByteHashIndependentlyVerified:false;
 prospectivelyAvailableAtAllHorizonsCertified:false;
 strictGate5Passed:false;phase6Authorized:false;
 providerCalls:0;databaseWrites:0;
}
const METRICS=[
 "departures","operator_records","operator_query_departure_records",
 "query_origin_only_records","explicit_origin_agrees","conflicting_origins",
 "missing_flight_number","missing_arrival_icao","missing_departure_schedule",
 "explicit_auxiliary_scope","explicit_core_pattern","scope_unknown",
 "fingerprint_rows","unique_fingerprints"
] as const;
export async function assessP4QueryOriginSensitivityV39(
 db:P4QueryOriginReaderV39,
 args:{airport:string;auditUtc:string;unexpiredQueryIds:readonly string[]}
):Promise<P4QueryOriginReportV39>{
 if(!args||!/^[A-Z]{4}$/.test(args.airport)||
  !Array.isArray(args.unexpiredQueryIds)||args.unexpiredQueryIds.length>12||
  new Set(args.unexpiredQueryIds).size!==args.unexpiredQueryIds.length||
  args.unexpiredQueryIds.some(id=>typeof id!=="string"||
   !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))||
  typeof args.auditUtc!=="string"||!/^20\d\d-\d\d-\d\dT/.test(args.auditUtc)||
  !Number.isFinite(Date.parse(args.auditUtc)))
  throw Error("P4_ORIGIN_SCOPE_INVALID");
 const result=await db.query(P4_ORIGIN_SENSITIVITY_SQL_V39,
  [[...args.unexpiredQueryIds],args.airport,args.auditUtc]);
 if(!result||!Array.isArray(result.rows)||result.rows.length!==1||
  !result.rows[0]||typeof result.rows[0]!=="object")
  throw Error("P4_ORIGIN_SQL_AGGREGATE_MISSING");
 const row=result.rows[0] as Record<string,unknown>;
 const m=Object.fromEntries(METRICS.map(key=>[key,Number(row[key])])) as Record<typeof METRICS[number],number>;
 for(const key of METRICS){
  if(!Number.isSafeInteger(m[key])||m[key]<0||m[key]>20000)
   throw Error("P4_ORIGIN_SQL_AGGREGATE_INVALID");
 }
 if(m.operator_records>m.departures||
  m.operator_query_departure_records>m.operator_records||
  m.query_origin_only_records>m.operator_query_departure_records||
  m.explicit_origin_agrees+m.conflicting_origins>m.operator_records||
  m.missing_flight_number>m.operator_records||
  m.missing_arrival_icao>m.operator_records||
  m.missing_departure_schedule>m.operator_records||
  m.explicit_auxiliary_scope+m.explicit_core_pattern+m.scope_unknown!==m.operator_records||
  m.fingerprint_rows>m.operator_query_departure_records||
  m.unique_fingerprints>m.fingerprint_rows)
  throw Error("P4_ORIGIN_SQL_AGGREGATE_CONTRADICTION");
 return {
  schema:P4_ORIGIN_SENSITIVITY_SCHEMA_V39,
  status:"PROVISIONAL_QUERY_ORIGIN_OPERATOR_RECORD_SENSITIVITY_ONLY",
  sourceAirport:args.airport,
  selectedUnexpiredQueries:args.unexpiredQueryIds.length,
  sourceDepartureRecords:m.departures,
  providerOperatorRecords:m.operator_records,
  operatorDepartureQueryRecords:m.operator_query_departure_records,
  operatorMissingExplicitOrigin:m.query_origin_only_records,
  operatorExplicitOriginAgree:m.explicit_origin_agrees,
  operatorExplicitOriginConflicts:m.conflicting_origins,
  operatorMissingFlightNumber:m.missing_flight_number,
  operatorMissingDestinationIcao:m.missing_arrival_icao,
  operatorMissingScheduledUtc:m.missing_departure_schedule,
  operatorExplicitAuxiliaryFlags:m.explicit_auxiliary_scope,
  operatorExplicitCoreBooleanPattern:m.explicit_core_pattern,
  operatorUnknownScope:m.scope_unknown,
  completeSourceFingerprintObservations:m.fingerprint_rows,
  distinctSyntacticFingerprints:m.unique_fingerprints,
  repeatedExactFingerprintObservations:m.fingerprint_rows-m.unique_fingerprints,
  originFromQueryContextOnly:true,
  physicalFlightUniquenessCertified:false,
  firstSelectedTScheduleCertified:false,
  commercialCorePopulationCertified:false,
  sourceByteHashIndependentlyVerified:false,
  prospectivelyAvailableAtAllHorizonsCertified:false,
  strictGate5Passed:false,phase6Authorized:false,
  providerCalls:0,databaseWrites:0
 };
}
