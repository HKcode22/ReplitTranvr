npx tsx scripts/rescore_historical_v2.ts archived-only
[rescore] Found 1956 archived/resolved flights to rescore (concurrency=5)
[rescore] progress: 1/1956
[flightStatus] number lookup "AA4551" 2026-05-19
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] computing AA
[flightStatus] number lookup "UA2267" 2026-05-20
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] computing UA
[flightStatus] number lookup "UA586" 2026-05-20
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] computing UA
[flightStatus] number lookup "AA1517" 2026-05-19
[weather] fetching DFW (KDFW)
[weather] fetching ORD (KORD)
[carrierHealth] computing AA
[flightStatus] number lookup "AA1279" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching CMH (KCMH)
[carrierHealth] computing AA
[carrierHealth] AA sample=11 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[carrierHealth] AA sample=11 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[carrierHealth] UA sample=10 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[carrierHealth] AA sample=11 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[carrierHealth] UA sample=10 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[flightStatus] HTTP 429 for "AA4551" 2026-05-19
[flightStatus] number lookup "AA 4551" 2026-05-19
[weather] LGA cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CMH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LGA cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] HTTP 429 for "UA2267" 2026-05-20
[flightStatus] number lookup "UA 2267" 2026-05-20
[weather] LGA cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[flightStatus] HTTP 429 for "UA586" 2026-05-20
[flightStatus] number lookup "UA 586" 2026-05-20
[flightStatus] HTTP 429 for "AA1517" 2026-05-19
[flightStatus] number lookup "AA 1517" 2026-05-19
[flightStatus] HTTP 429 for "AA1279" 2026-06-09
[flightStatus] number lookup "AA 1279" 2026-06-09
[flightStatus] HTTP 429 for "AA 4551" 2026-05-19
[flightStatus] FIDS fallback ORD 2026-05-19 for AA4551
[flightStatus] HTTP 429 for "UA 2267" 2026-05-20
[flightStatus] FIDS fallback ORD 2026-05-20 for UA2267
[flightStatus] HTTP 429 for "UA 586" 2026-05-20
[flightStatus] FIDS fallback ORD 2026-05-20 for UA586
[flightStatus] HTTP 429 for "AA 1517" 2026-05-19
[flightStatus] FIDS fallback DFW 2026-05-19 for AA1517
[flightStatus] HTTP 429 for "AA 1279" 2026-06-09
[flightStatus] FIDS fallback DFW 2026-06-09 for AA1279
[flightStatus] no result for AA4551 2026-05-19
[riskScorer] AA4551 2026-05-19 horizon=short hours_out=-1720.4 raw_total=7 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[flightStatus] number lookup "UA644" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching DEN (KDEN)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] DFW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] DEN cat=VFR vis=10 ceil=22000 ts=false fz=false contrib=2
[flightStatus] no result for UA2267 2026-05-20
[riskScorer] UA2267 2026-05-20 horizon=short hours_out=-1690.4 raw_total=10 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA1963" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching YUL (CYUL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] DFW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] YUL cat=VFR vis=15 ceil=17000 ts=false fz=false contrib=2
[flightStatus] no result for UA586 2026-05-20
[riskScorer] UA586 2026-05-20 horizon=short hours_out=-1696.4 raw_total=8 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL1592" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching BWI (KBWI)
[carrierHealth] computing DL
[carrierHealth] DL sample=15 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] ATL cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[weather] BWI cat=VFR vis=10 ceil=6000 ts=false fz=false contrib=2
[flightStatus] no result for AA1517 2026-05-19
[riskScorer] AA1517 2026-05-19 horizon=short hours_out=-1705.1 raw_total=6 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[flightStatus] number lookup "DL1687" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching BTR (KBTR)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] BTR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for AA1279 2026-06-09
[riskScorer] AA1279 2026-06-09 horizon=short hours_out=-1215.2 raw_total=7 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[flightStatus] number lookup "DL1682" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching IAH (KIAH)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] IAH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] HTTP 429 for "UA644" 2026-06-09
[flightStatus] number lookup "UA 644" 2026-06-09
[flightStatus] HTTP 429 for "AA1963" 2026-06-09
[flightStatus] number lookup "AA 1963" 2026-06-09
[flightStatus] HTTP 429 for "DL1592" 2026-06-09
[flightStatus] number lookup "DL 1592" 2026-06-09
[flightStatus] HTTP 429 for "DL1687" 2026-06-09
[flightStatus] number lookup "DL 1687" 2026-06-09
[flightStatus] HTTP 429 for "DL1682" 2026-06-09
[flightStatus] number lookup "DL 1682" 2026-06-09
[flightStatus] HTTP 429 for "UA 644" 2026-06-09
[flightStatus] FIDS fallback DFW 2026-06-09 for UA644
[flightStatus] HTTP 429 for "AA 1963" 2026-06-09
[flightStatus] FIDS fallback DFW 2026-06-09 for AA1963
[flightStatus] HTTP 429 for "DL 1592" 2026-06-09
[flightStatus] FIDS fallback ATL 2026-06-09 for DL1592
[flightStatus] HTTP 429 for "DL 1687" 2026-06-09
[flightStatus] FIDS fallback ATL 2026-06-09 for DL1687
[flightStatus] HTTP 429 for "DL 1682" 2026-06-09
[flightStatus] FIDS fallback ATL 2026-06-09 for DL1682
[flightStatus] no result for UA644 2026-06-09
[riskScorer] UA644 2026-06-09 horizon=short hours_out=-1213.7 raw_total=7 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[flightStatus] number lookup "UA4471" 2026-06-09
[weather] fetching ORD (KORD)
[weather] fetching SDF (KSDF)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] SDF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for AA1963 2026-06-09
[riskScorer] AA1963 2026-06-09 horizon=short hours_out=-1212.4 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "OO6232" 2026-06-09
[weather] fetching ORD (KORD)
[weather] fetching FWA (KFWA)
[carrierHealth] computing OO
[carrierHealth] OO sample=0 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] FWA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for DL1592 2026-06-09
[riskScorer] DL1592 2026-06-09 horizon=short hours_out=-1215.8 raw_total=7 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[flightStatus] number lookup "UA5668" 2026-06-09
[weather] fetching ORD (KORD)
[weather] fetching RDU (KRDU)
[carrierHealth] cache hit UA
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] RDU cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for DL1687 2026-06-09
[riskScorer] DL1687 2026-06-09 horizon=short hours_out=-1214.3 raw_total=7 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[flightStatus] number lookup "AM649" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching MEX (MMMX)
[carrierHealth] computing AM
[carrierHealth] AM sample=0 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] LAX cat=IFR vis=10 ceil=900 ts=false fz=false contrib=18
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] MEX cat=VFR vis=7 ceil=8000 ts=true fz=false contrib=12
[flightStatus] no result for DL1682 2026-06-09
[riskScorer] DL1682 2026-06-09 horizon=short hours_out=-1213.3 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "DL6330" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit DL
[weather] LAX cat=IFR vis=10 ceil=900 ts=false fz=false contrib=18
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=41min
[nasStatus] fetched airport-events: 9 airports
[flightStatus] HTTP 429 for "UA4471" 2026-06-09
[flightStatus] number lookup "UA 4471" 2026-06-09
[flightStatus] HTTP 429 for "OO6232" 2026-06-09
[flightStatus] number lookup "OO 6232" 2026-06-09
[flightStatus] HTTP 429 for "UA5668" 2026-06-09
[flightStatus] number lookup "UA 5668" 2026-06-09
[flightStatus] HTTP 429 for "AM649" 2026-06-09
[flightStatus] number lookup "AM 649" 2026-06-09
[flightStatus] HTTP 429 for "DL6330" 2026-06-09
[flightStatus] number lookup "DL 6330" 2026-06-09
[flightStatus] HTTP 429 for "UA 4471" 2026-06-09
[flightStatus] FIDS fallback ORD 2026-06-09 for UA4471
[flightStatus] HTTP 429 for "OO 6232" 2026-06-09
[flightStatus] FIDS fallback ORD 2026-06-09 for OO6232
[flightStatus] HTTP 429 for "UA 5668" 2026-06-09
[flightStatus] FIDS fallback ORD 2026-06-09 for UA5668
[flightStatus] HTTP 429 for "AM 649" 2026-06-09
[flightStatus] FIDS fallback LAX 2026-06-09 for AM649
[flightStatus] HTTP 429 for "DL 6330" 2026-06-09
[flightStatus] FIDS fallback LAX 2026-06-09 for DL6330
[flightStatus] no result for UA4471 2026-06-09
[riskScorer] UA4471 2026-06-09 horizon=short hours_out=-1215.4 raw_total=7 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[flightStatus] number lookup "DL1514" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching MIA (KMIA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] JFK cat=VFR vis=10 ceil=11000 ts=false fz=false contrib=2
[weather] MIA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for OO6232 2026-06-09
[riskScorer] OO6232 2026-06-09 horizon=short hours_out=-1213.9 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[flightStatus] number lookup "TJ433" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching GFL (KGFL)
[carrierHealth] computing TJ
[carrierHealth] TJ sample=0 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] JFK cat=VFR vis=10 ceil=11000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] fetch failed for KGFL: Unexpected end of JSON input
[flightStatus] no result for UA5668 2026-06-09
[riskScorer] UA5668 2026-06-09 horizon=short hours_out=-1213.3 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "MQ3549" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching GRK (KGRK)
[carrierHealth] computing MQ
[carrierHealth] MQ sample=0 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] DFW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] GRK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for AM649 2026-06-09
[riskScorer] AM649 2026-06-09 horizon=short hours_out=-1213.4 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":16,"destinationWeather":6,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "AA2239" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching ONT (KONT)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] ONT cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for DL6330 2026-06-09
[riskScorer] DL6330 2026-06-09 horizon=short hours_out=-1211.1 raw_total=33 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":10,"originWeather":16,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "AA1405" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching AUS (KAUS)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] AUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] HTTP 429 for "DL1514" 2026-06-09
[flightStatus] number lookup "DL 1514" 2026-06-09
[flightStatus] HTTP 429 for "TJ433" 2026-06-09
[flightStatus] number lookup "TJ 433" 2026-06-09
[flightStatus] HTTP 429 for "MQ3549" 2026-06-09
[flightStatus] number lookup "MQ 3549" 2026-06-09
[flightStatus] HTTP 429 for "AA2239" 2026-06-09
[flightStatus] number lookup "AA 2239" 2026-06-09
[flightStatus] HTTP 429 for "AA1405" 2026-06-09
[flightStatus] number lookup "AA 1405" 2026-06-09
[flightStatus] HTTP 429 for "DL 1514" 2026-06-09
[flightStatus] FIDS fallback JFK 2026-06-09 for DL1514
[flightStatus] HTTP 429 for "TJ 433" 2026-06-09
[flightStatus] FIDS fallback JFK 2026-06-09 for TJ433
[flightStatus] HTTP 429 for "MQ 3549" 2026-06-09
[flightStatus] FIDS fallback DFW 2026-06-09 for MQ3549
[flightStatus] HTTP 429 for "AA 2239" 2026-06-09
[flightStatus] FIDS fallback DFW 2026-06-09 for AA2239
[flightStatus] HTTP 429 for "AA 1405" 2026-06-09
[flightStatus] FIDS fallback DFW 2026-06-09 for AA1405
[flightStatus] no result for DL1514 2026-06-09
[riskScorer] DL1514 2026-06-09 horizon=short hours_out=-1212.3 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "AA3249" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching DFW (KDFW)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 9 airports
[weather] DFW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[weather] ATL cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for TJ433 2026-06-09
[riskScorer] TJ433 2026-06-09 horizon=short hours_out=-1209.1 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[flightStatus] number lookup "DL1437" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching RIC (KRIC)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] RIC cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for MQ3549 2026-06-09
[riskScorer] MQ3549 2026-06-09 horizon=short hours_out=-1211.0 raw_total=11 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "DL1642" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching MCO (KMCO)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] MCO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for AA2239 2026-06-09
[riskScorer] AA2239 2026-06-09 horizon=short hours_out=-1210.1 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "WN4943" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching ABQ (KABQ)
[carrierHealth] computing WN
[carrierHealth] WN sample=4 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] LAX cat=IFR vis=10 ceil=900 ts=false fz=false contrib=18
[weather] ABQ cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for AA1405 2026-06-09
[riskScorer] AA1405 2026-06-09 horizon=short hours_out=-1208.6 raw_total=11 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[flightStatus] number lookup "DL3842" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching SJC (KSJC)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] LAX cat=IFR vis=10 ceil=900 ts=false fz=false contrib=18
[weather] SJC cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] HTTP 429 for "AA3249" 2026-06-09
[flightStatus] number lookup "AA 3249" 2026-06-09
[flightStatus] HTTP 429 for "DL1437" 2026-06-09
[flightStatus] number lookup "DL 1437" 2026-06-09
[flightStatus] HTTP 429 for "DL1642" 2026-06-09
[flightStatus] number lookup "DL 1642" 2026-06-09
[flightStatus] HTTP 429 for "WN4943" 2026-06-09
[flightStatus] number lookup "WN 4943" 2026-06-09
[flightStatus] HTTP 429 for "DL3842" 2026-06-09
[flightStatus] number lookup "DL 3842" 2026-06-09
[flightStatus] HTTP 429 for "AA 3249" 2026-06-09
[flightStatus] FIDS fallback ATL 2026-06-09 for AA3249
[flightStatus] HTTP 429 for "DL 1437" 2026-06-09
[flightStatus] FIDS fallback ATL 2026-06-09 for DL1437
[flightStatus] HTTP 429 for "DL 1642" 2026-06-09
[flightStatus] FIDS fallback ATL 2026-06-09 for DL1642
[flightStatus] HTTP 429 for "WN 4943" 2026-06-09
[flightStatus] FIDS fallback LAX 2026-06-09 for WN4943
[flightStatus] HTTP 429 for "DL 3842" 2026-06-09
[flightStatus] FIDS fallback LAX 2026-06-09 for DL3842
[flightStatus] no result for AA3249 2026-06-09
[riskScorer] AA3249 2026-06-09 horizon=short hours_out=-1212.1 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "DL3894" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching PHX (KPHX)
[carrierHealth] cache hit DL
[weather] PHX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] LAX cat=IFR vis=10 ceil=900 ts=false fz=false contrib=18
[flightStatus] no result for DL1437 2026-06-09
[riskScorer] DL1437 2026-06-09 horizon=short hours_out=-1210.8 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "DL322" 2026-06-09
[weather] fetching BOS (KBOS)
[weather] fetching ATL (KATL)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[flightStatus] no result for DL1642 2026-06-09
[riskScorer] DL1642 2026-06-09 horizon=short hours_out=-1209.4 raw_total=11 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[flightStatus] number lookup "CM812" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching PTY (KPTY)
[carrierHealth] computing CM
[carrierHealth] CM sample=0 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[nasStatus] fetched airport-events: 9 airports
[weather] JFK cat=VFR vis=10 ceil=11000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[weather] fetch failed for KPTY: Unexpected end of JSON input
[flightStatus] no result for WN4943 2026-06-09
[riskScorer] WN4943 2026-06-09 horizon=short hours_out=-1209.4 raw_total=25 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":16,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[flightStatus] number lookup "NO785" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching PMO (KPMO)
[carrierHealth] computing NO
[carrierHealth] NO sample=0 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] JFK cat=VFR vis=10 ceil=11000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] fetch failed for KPMO: Unexpected end of JSON input
[flightStatus] no result for DL3842 2026-06-09
[riskScorer] DL3842 2026-06-09 horizon=short hours_out=-1207.5 raw_total=25 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":16,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[flightStatus] number lookup "DL3026" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching HSV (KHSV)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] HSV cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] HTTP 429 for "DL3894" 2026-06-09
[flightStatus] number lookup "DL 3894" 2026-06-09
[flightStatus] HTTP 429 for "DL322" 2026-06-09
[flightStatus] number lookup "DL 322" 2026-06-09
[flightStatus] HTTP 429 for "CM812" 2026-06-09
[flightStatus] number lookup "CM 812" 2026-06-09
[flightStatus] HTTP 429 for "NO785" 2026-06-09
[flightStatus] number lookup "NO 785" 2026-06-09
[flightStatus] HTTP 429 for "DL3026" 2026-06-09
[flightStatus] number lookup "DL 3026" 2026-06-09
[flightStatus] HTTP 429 for "DL 3894" 2026-06-09
[flightStatus] FIDS fallback LAX 2026-06-09 for DL3894
[flightStatus] HTTP 429 for "DL 322" 2026-06-09
[flightStatus] FIDS fallback BOS 2026-06-09 for DL322
[flightStatus] HTTP 429 for "CM 812" 2026-06-09
[flightStatus] FIDS fallback JFK 2026-06-09 for CM812
[flightStatus] HTTP 429 for "NO 785" 2026-06-09
[flightStatus] FIDS fallback JFK 2026-06-09 for NO785
[flightStatus] HTTP 429 for "DL 3026" 2026-06-09
[flightStatus] FIDS fallback ATL 2026-06-09 for DL3026
[weather] BOS cat=LIFR vis=2.5 ceil=300 ts=false fz=false contrib=25
[flightStatus] no result for DL3894 2026-06-09
[riskScorer] DL3894 2026-06-09 horizon=short hours_out=-1206.6 raw_total=27 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":16,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[flightStatus] number lookup "DL5105" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching CRW (KCRW)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] CRW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] no result for DL322 2026-06-09
[riskScorer] DL322 2026-06-09 horizon=short hours_out=-1209.5 raw_total=25 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":18,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[flightStatus] number lookup "DL2086" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching DSM (KDSM)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[flightStatus] no result for CM812 2026-06-09
[riskScorer] CM812 2026-06-09 horizon=short hours_out=-1207.9 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[flightStatus] number lookup "OO6200" 2026-06-09
[weather] fetching ORD (KORD)
[weather] fetching BNA (KBNA)
[carrierHealth] cache hit OO
[nasStatus] fetched airport-events: 9 airports
[nasStatus] fetched airport-events: 9 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BNA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DSM cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2