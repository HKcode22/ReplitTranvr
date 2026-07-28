[weather] fetching DCA (KDCA)
[carrierHealth] cache hit DL
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DCA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] EI110 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] EI110 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 22:25Z","local":"2026-07-22 18:25-04:00"},"revisedTime":{"utc":"2026-07-22 22:40Z","local":"2026-07-22 18:40-04:00"},"runwayTime":{"utc":"2026-07-22 22:40Z","local":"2026-07-22 18:40-04:00"},"terminal":"7","runway":"22R","quality":["Basic","Live"]}
[flightStatus] EI110 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 22:25Z","revisedTime":"2026-07-22 22:40Z","runwayTime":"2026-07-22 22:40Z","terminal":"7","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for EI110
[flightStatus] EI110 2026-07-22 status=Departed dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] EI110 2026-07-22 horizon=short hours_out=-99.7 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL5814" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching JFK (KJFK)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] UA923 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA923 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-22 22:35Z","local":"2026-07-22 15:35-07:00"},"revisedTime":{"utc":"2026-07-22 22:54Z","local":"2026-07-22 15:54-07:00"},"runwayTime":{"utc":"2026-07-22 22:54Z","local":"2026-07-22 15:54-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA923 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-22 22:35Z","revisedTime":"2026-07-22 22:54Z","runwayTime":"2026-07-22 22:54Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for UA923
[flightStatus] UA923 2026-07-22 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] UA923 2026-07-22 horizon=short hours_out=-99.5 raw_total=36 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "TP218" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching LIS (KLIS)
[carrierHealth] computing TP
[carrierHealth] TP sample=22 cancelRate=0.000 avgDelay=190.0 healthScore=10 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] BA280 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] BA280 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 00:05Z","local":"2026-07-22 17:05-07:00"},"revisedTime":{"utc":"2026-07-23 01:04Z","local":"2026-07-22 18:04-07:00"},"runwayTime":{"utc":"2026-07-23 01:04Z","local":"2026-07-22 18:04-07:00"},"terminal":"4","runway":"25R","quality":["Basic","Live"]}
[flightStatus] BA280 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 00:05Z","revisedTime":"2026-07-23 01:04Z","runwayTime":"2026-07-23 01:04Z","terminal":"4","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 59min for BA280
[flightStatus] computed inbound delay from revisedTime: 14min for BA280
[flightStatus] BA280 2026-07-22 status=Arrived dep_delay=59 inbound_delay=14 cancelled=false
[riskScorer] BA280 2026-07-22 horizon=short hours_out=-98.0 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "EI124" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching DUB (KDUB)
[carrierHealth] cache hit EI
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KLIS: Unexpected end of JSON input
[flightStatus] WN2418 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN2418 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 01:35Z","local":"2026-07-22 18:35-07:00"},"revisedTime":{"utc":"2026-07-23 01:56Z","local":"2026-07-22 18:56-07:00"},"runwayTime":{"utc":"2026-07-23 01:56Z","local":"2026-07-22 18:56-07:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] WN2418 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 01:35Z","revisedTime":"2026-07-23 01:56Z","runwayTime":"2026-07-23 01:56Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for WN2418
[flightStatus] WN2418 2026-07-22 status=Arrived dep_delay=21 inbound_delay=0 cancelled=false
[riskScorer] WN2418 2026-07-22 horizon=short hours_out=-96.5 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA4610" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching GRB (KGRB)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL5689 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5689 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 19:45Z","local":"2026-07-22 15:45-04:00"},"revisedTime":{"utc":"2026-07-22 20:01Z","local":"2026-07-22 16:01-04:00"},"runwayTime":{"utc":"2026-07-22 20:01Z","local":"2026-07-22 16:01-04:00"},"terminal":"A","runway":"22R","quality":["Basic","Live"]}
[flightStatus] DL5689 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 19:45Z","revisedTime":"2026-07-22 20:01Z","runwayTime":"2026-07-22 20:01Z","terminal":"A","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for DL5689
[flightStatus] DL5689 2026-07-22 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] DL5689 2026-07-22 horizon=short hours_out=-102.4 raw_total=34 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA813" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching ECP (KECP)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] GRB cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ECP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DUB cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL5814 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5814 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 21:05Z","local":"2026-07-22 17:05-04:00"},"revisedTime":{"utc":"2026-07-22 22:04Z","local":"2026-07-22 18:04-04:00"},"runwayTime":{"utc":"2026-07-22 22:04Z","local":"2026-07-22 18:04-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5814 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 21:05Z","revisedTime":"2026-07-22 22:04Z","runwayTime":"2026-07-22 22:04Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 59min for DL5814
[flightStatus] computed inbound delay from revisedTime: 6min for DL5814
[flightStatus] DL5814 2026-07-22 status=Arrived dep_delay=59 inbound_delay=6 cancelled=false
[riskScorer] DL5814 2026-07-22 horizon=short hours_out=-101.0 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA3735" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching AGU (KAGU)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] TP218 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] TP218 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 22:05Z","local":"2026-07-22 18:05-04:00"},"revisedTime":{"utc":"2026-07-23 01:15Z","local":"2026-07-22 21:15-04:00"},"runwayTime":{"utc":"2026-07-23 01:15Z","local":"2026-07-22 21:15-04:00"},"terminal":"C","runway":"22L","quality":["Basic","Live"]}
[flightStatus] TP218 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 22:05Z","revisedTime":"2026-07-23 01:15Z","runwayTime":"2026-07-23 01:15Z","terminal":"C","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 190min for TP218
[flightStatus] computed inbound delay from revisedTime: 17min for TP218
[flightStatus] TP218 2026-07-22 status=Arrived dep_delay=190 inbound_delay=17 cancelled=false
[riskScorer] TP218 2026-07-22 horizon=short hours_out=-100.0 raw_total=62 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA4065" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching CRP (KCRP)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CRP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] EI124 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] EI124 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 02:00Z","local":"2026-07-22 21:00-05:00"},"revisedTime":{"utc":"2026-07-23 04:17Z","local":"2026-07-22 23:17-05:00"},"runwayTime":{"utc":"2026-07-23 04:17Z","local":"2026-07-22 23:17-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] EI124 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 02:00Z","revisedTime":"2026-07-23 04:17Z","runwayTime":"2026-07-23 04:17Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 137min for EI124
[flightStatus] computed inbound delay from revisedTime: 89min for EI124
[flightStatus] EI124 2026-07-22 status=Arrived dep_delay=137 inbound_delay=89 cancelled=false
[riskScorer] EI124 2026-07-22 horizon=short hours_out=-96.1 raw_total=56 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "WN266" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching STL (KSTL)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KAGU: Unexpected end of JSON input
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] UA4610 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA4610 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 03:00Z","local":"2026-07-22 22:00-05:00"},"revisedTime":{"utc":"2026-07-23 03:45Z","local":"2026-07-22 22:45-05:00"},"runwayTime":{"utc":"2026-07-23 03:45Z","local":"2026-07-22 22:45-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA4610 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 03:00Z","revisedTime":"2026-07-23 03:45Z","runwayTime":"2026-07-23 03:45Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 45min for UA4610
[flightStatus] computed inbound delay from revisedTime: 3min for UA4610
[flightStatus] UA4610 2026-07-22 status=Arrived dep_delay=45 inbound_delay=3 cancelled=false
[riskScorer] UA4610 2026-07-22 horizon=short hours_out=-95.1 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL1076" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching MDW (KMDW)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MDW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA813 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA813 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 00:42Z","local":"2026-07-22 19:42-05:00"},"revisedTime":{"utc":"2026-07-23 01:24Z","local":"2026-07-22 20:24-05:00"},"runwayTime":{"utc":"2026-07-23 01:24Z","local":"2026-07-22 20:24-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA813 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 00:42Z","revisedTime":"2026-07-23 01:24Z","runwayTime":"2026-07-23 01:24Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 42min for AA813
[flightStatus] computed inbound delay from revisedTime: 15min for AA813
[flightStatus] AA813 2026-07-22 status=Arrived dep_delay=42 inbound_delay=15 cancelled=false
[riskScorer] AA813 2026-07-22 horizon=short hours_out=-97.4 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL1268" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching MKE (KMKE)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] STL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] MKE cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3735 dep keys: airport,scheduledTime,quality
[flightStatus] AA3735 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 01:57Z","local":"2026-07-22 20:57-05:00"},"quality":["Basic"]}
[flightStatus] AA3735 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 01:57Z","quality":["Basic"]}
[flightStatus] AA3735 2026-07-22 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA3735 2026-07-22 horizon=short hours_out=-96.2 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA236" 2026-07-22
[weather] fetching JFK (KJFK)
[weather] fetching FCO (KFCO)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA4065 dep keys: airport,scheduledTime,quality
[flightStatus] AA4065 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 03:38Z","local":"2026-07-22 22:38-05:00"},"quality":["Basic"]}
[flightStatus] AA4065 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 03:38Z","quality":["Basic"]}
[flightStatus] AA4065 2026-07-22 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA4065 2026-07-22 horizon=short hours_out=-94.5 raw_total=53 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "LO27" 2026-07-22
[weather] fetching JFK (KJFK)
[weather] fetching WAW (KWAW)
[carrierHealth] computing LO
[carrierHealth] LO sample=22 cancelRate=0.000 avgDelay=34.0 healthScore=7 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KFCO: Unexpected end of JSON input
[flightStatus] WN266 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN266 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 23:40Z","local":"2026-07-22 19:40-04:00"},"revisedTime":{"utc":"2026-07-23 00:38Z","local":"2026-07-22 20:38-04:00"},"runwayTime":{"utc":"2026-07-23 00:38Z","local":"2026-07-22 20:38-04:00"},"terminal":"N","quality":["Basic","Live"]}
[flightStatus] WN266 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 23:40Z","revisedTime":"2026-07-23 00:38Z","runwayTime":"2026-07-23 00:38Z","terminal":"N","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 58min for WN266
[flightStatus] computed inbound delay from revisedTime: 25min for WN266
[flightStatus] WN266 2026-07-22 status=Arrived dep_delay=58 inbound_delay=25 cancelled=false
[riskScorer] WN266 2026-07-22 horizon=short hours_out=-98.5 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "WN2380" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching AUS (KAUS)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] AUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] fetch failed for KWAW: Unexpected end of JSON input
[flightStatus] DL1076 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1076 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 01:15Z","local":"2026-07-22 21:15-04:00"},"revisedTime":{"utc":"2026-07-23 01:29Z","local":"2026-07-22 21:29-04:00"},"runwayTime":{"utc":"2026-07-23 01:29Z","local":"2026-07-22 21:29-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1076 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 01:15Z","revisedTime":"2026-07-23 01:29Z","runwayTime":"2026-07-23 01:29Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for DL1076
[flightStatus] DL1076 2026-07-22 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[riskScorer] DL1076 2026-07-22 horizon=short hours_out=-96.9 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL2986" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=67min
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[flightStatus] DL1268 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1268 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 02:52Z","local":"2026-07-22 22:52-04:00"},"revisedTime":{"utc":"2026-07-23 03:04Z","local":"2026-07-22 23:04-04:00"},"runwayTime":{"utc":"2026-07-23 03:04Z","local":"2026-07-22 23:04-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL1268 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 02:52Z","revisedTime":"2026-07-23 03:04Z","runwayTime":"2026-07-23 03:04Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL1268
[flightStatus] DL1268 2026-07-22 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] DL1268 2026-07-22 horizon=short hours_out=-95.3 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL89" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching HKG (KHKG)
[carrierHealth] cache hit DL
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA236 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA236 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 23:30Z","local":"2026-07-22 19:30-04:00"},"revisedTime":{"utc":"2026-07-22 23:48Z","local":"2026-07-22 19:48-04:00"},"runwayTime":{"utc":"2026-07-22 23:48Z","local":"2026-07-22 19:48-04:00"},"terminal":"8","runway":"22R","quality":["Basic","Live"]}
[flightStatus] AA236 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 23:30Z","revisedTime":"2026-07-22 23:48Z","runwayTime":"2026-07-22 23:48Z","terminal":"8","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for AA236
[flightStatus] AA236 2026-07-22 status=Arrived dep_delay=18 inbound_delay=0 cancelled=false
[flightStatus] LO27 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] LO27 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 02:20Z","local":"2026-07-22 22:20-04:00"},"revisedTime":{"utc":"2026-07-23 02:54Z","local":"2026-07-22 22:54-04:00"},"runwayTime":{"utc":"2026-07-23 02:54Z","local":"2026-07-22 22:54-04:00"},"terminal":"1","runway":"22R","quality":["Basic","Live"]}
[flightStatus] LO27 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 02:20Z","revisedTime":"2026-07-23 02:54Z","runwayTime":"2026-07-23 02:54Z","terminal":"1","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 34min for LO27
[flightStatus] LO27 2026-07-22 status=Arrived dep_delay=34 inbound_delay=0 cancelled=false
[riskScorer] LO27 2026-07-22 horizon=short hours_out=-95.8 raw_total=40 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "PD618" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching YYZ (CYYZ)
[carrierHealth] cache hit PD
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] YYZ cat=VFR vis=15 ceil=3800 ts=false fz=false contrib=2
[flightStatus] WN2380 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN2380 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 02:50Z","local":"2026-07-22 19:50-07:00"},"revisedTime":{"utc":"2026-07-23 03:07Z","local":"2026-07-22 20:07-07:00"},"runwayTime":{"utc":"2026-07-23 03:07Z","local":"2026-07-22 20:07-07:00"},"terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] WN2380 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 02:50Z","revisedTime":"2026-07-23 03:07Z","runwayTime":"2026-07-23 03:07Z","terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for WN2380
[flightStatus] WN2380 2026-07-22 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] WN2380 2026-07-22 horizon=short hours_out=-95.3 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL5610" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit DL
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2986 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2986 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 04:40Z","local":"2026-07-22 21:40-07:00"},"revisedTime":{"utc":"2026-07-23 05:52Z","local":"2026-07-22 22:52-07:00"},"runwayTime":{"utc":"2026-07-23 05:52Z","local":"2026-07-22 22:52-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL2986 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 04:40Z","revisedTime":"2026-07-23 05:52Z","runwayTime":"2026-07-23 05:52Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 72min for DL2986
[flightStatus] computed inbound delay from revisedTime: 65min for DL2986
[flightStatus] DL2986 2026-07-22 status=Arrived dep_delay=72 inbound_delay=65 cancelled=false
[riskScorer] DL2986 2026-07-22 horizon=short hours_out=-93.5 raw_total=70 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":15,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL5704" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching DCA (KDCA)
[carrierHealth] cache hit DL
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DCA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL89 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL89 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 06:15Z","local":"2026-07-22 23:15-07:00"},"revisedTime":{"utc":"2026-07-23 06:38Z","local":"2026-07-22 23:38-07:00"},"runwayTime":{"utc":"2026-07-23 06:38Z","local":"2026-07-22 23:38-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL89 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 06:15Z","revisedTime":"2026-07-23 06:38Z","runwayTime":"2026-07-23 06:38Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for DL89
[flightStatus] DL89 2026-07-22 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[flightStatus] PD618 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] PD618 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 23:30Z","local":"2026-07-22 19:30-04:00"},"revisedTime":{"utc":"2026-07-23 03:27Z","local":"2026-07-22 23:27-04:00"},"runwayTime":{"utc":"2026-07-23 03:27Z","local":"2026-07-22 23:27-04:00"},"terminal":"E","quality":["Basic","Live"]}
[flightStatus] PD618 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 23:30Z","revisedTime":"2026-07-23 03:27Z","runwayTime":"2026-07-23 03:27Z","terminal":"E","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 237min for PD618
[flightStatus] computed inbound delay from revisedTime: 198min for PD618
[flightStatus] PD618 2026-07-22 status=Arrived dep_delay=237 inbound_delay=198 cancelled=false
[riskScorer] PD618 2026-07-22 horizon=short hours_out=-98.6 raw_total=60 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA2361" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL5610 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5610 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 00:25Z","local":"2026-07-22 20:25-04:00"},"revisedTime":{"utc":"2026-07-23 02:50Z","local":"2026-07-22 22:50-04:00"},"runwayTime":{"utc":"2026-07-23 02:50Z","local":"2026-07-22 22:50-04:00"},"terminal":"A","runway":"22R","quality":["Basic","Live"]}
[flightStatus] DL5610 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 00:25Z","revisedTime":"2026-07-23 02:50Z","runwayTime":"2026-07-23 02:50Z","terminal":"A","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 145min for DL5610
[flightStatus] computed inbound delay from revisedTime: 112min for DL5610
[flightStatus] DL5610 2026-07-22 status=Arrived dep_delay=145 inbound_delay=112 cancelled=false
[riskScorer] DL5610 2026-07-22 horizon=short hours_out=-97.7 raw_total=53 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA249" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching MEX (MMMX)
[carrierHealth] cache hit AA
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MEX cat=VFR vis=8 ceil=8000 ts=false fz=false contrib=2
[flightStatus] DL5704 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5704 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 01:48Z","local":"2026-07-22 21:48-04:00"},"revisedTime":{"utc":"2026-07-23 02:56Z","local":"2026-07-22 22:56-04:00"},"runwayTime":{"utc":"2026-07-23 02:56Z","local":"2026-07-22 22:56-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5704 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 01:48Z","revisedTime":"2026-07-23 02:56Z","runwayTime":"2026-07-23 02:56Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 68min for DL5704
[flightStatus] computed inbound delay from revisedTime: 37min for DL5704
[flightStatus] DL5704 2026-07-22 status=Arrived dep_delay=68 inbound_delay=37 cancelled=false
[riskScorer] DL5704 2026-07-22 horizon=short hours_out=-96.3 raw_total=53 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA1949" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit AA
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=67min
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[riskScorer] AA236 2026-07-22 horizon=short hours_out=-98.6 raw_total=35 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA5684" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching MSP (KMSP)
[carrierHealth] cache hit UA
[flightStatus] UA2361 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2361 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 12:00Z","local":"2026-07-22 07:00-05:00"},"revisedTime":{"utc":"2026-07-22 12:19Z","local":"2026-07-22 07:19-05:00"},"runwayTime":{"utc":"2026-07-22 12:19Z","local":"2026-07-22 07:19-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2361 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 12:00Z","revisedTime":"2026-07-22 12:19Z","runwayTime":"2026-07-22 12:19Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for UA2361
[flightStatus] UA2361 2026-07-22 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] UA2361 2026-07-22 horizon=short hours_out=-110.1 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[rescore] progress: 751/1166
[flightStatus] number lookup "BW553" 2026-07-22
[weather] fetching JFK (KJFK)
[weather] fetching SVD (KSVD)
[carrierHealth] cache hit BW
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] MSP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KSVD: Unexpected end of JSON input
[flightStatus] AA249 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA249 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 13:42Z","local":"2026-07-22 08:42-05:00"},"revisedTime":{"utc":"2026-07-22 13:53Z","local":"2026-07-22 08:53-05:00"},"runwayTime":{"utc":"2026-07-22 13:53Z","local":"2026-07-22 08:53-05:00"},"terminal":"3","runway":"10L","quality":["Basic","Live"]}
[flightStatus] AA249 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 13:42Z","revisedTime":"2026-07-22 13:53Z","runwayTime":"2026-07-22 13:53Z","terminal":"3","runway":"10L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for AA249
[flightStatus] AA249 2026-07-22 status=EnRoute dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] AA249 2026-07-22 horizon=short hours_out=-108.4 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL5370" 2026-07-22
[weather] fetching JFK (KJFK)
[weather] fetching ORF (KORF)
[carrierHealth] cache hit DL
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1949 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1949 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 12:10Z","local":"2026-07-22 07:10-05:00"},"revisedTime":{"utc":"2026-07-22 12:26Z","local":"2026-07-22 07:26-05:00"},"runwayTime":{"utc":"2026-07-22 12:26Z","local":"2026-07-22 07:26-05:00"},"runway":"36R","quality":["Basic","Live"]}
[flightStatus] AA1949 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 12:10Z","revisedTime":"2026-07-22 12:26Z","runwayTime":"2026-07-22 12:26Z","runway":"36R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AA1949
[flightStatus] AA1949 2026-07-22 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] AA1949 2026-07-22 horizon=short hours_out=-110.0 raw_total=47 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":15,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AS668" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching PDX (KPDX)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] PDX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA5684 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5684 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 15:25Z","local":"2026-07-22 10:25-05:00"},"revisedTime":{"utc":"2026-07-22 16:08Z","local":"2026-07-22 11:08-05:00"},"runwayTime":{"utc":"2026-07-22 16:08Z","local":"2026-07-22 11:08-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5684 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 15:25Z","revisedTime":"2026-07-22 16:08Z","runwayTime":"2026-07-22 16:08Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 43min for UA5684
[flightStatus] UA5684 2026-07-22 status=Arrived dep_delay=43 inbound_delay=0 cancelled=false
[riskScorer] UA5684 2026-07-22 horizon=short hours_out=-106.7 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA2039" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching PIT (KPIT)
[carrierHealth] cache hit UA
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] PIT cat=VFR vis=10 ceil=8500 ts=false fz=false contrib=2
[flightStatus] BW553 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] BW553 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 11:18Z","local":"2026-07-22 07:18-04:00"},"revisedTime":{"utc":"2026-07-22 11:18Z","local":"2026-07-22 07:18-04:00"},"runwayTime":{"utc":"2026-07-22 11:18Z","local":"2026-07-22 07:18-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] BW553 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 11:18Z","revisedTime":"2026-07-22 11:18Z","runwayTime":"2026-07-22 11:18Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 32min for BW553
[flightStatus] BW553 2026-07-22 status=EnRoute dep_delay=0 inbound_delay=32 cancelled=false
[riskScorer] BW553 2026-07-22 horizon=short hours_out=-110.8 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL895" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit DL
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL5370 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5370 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 13:50Z","local":"2026-07-22 09:50-04:00"},"revisedTime":{"utc":"2026-07-22 14:36Z","local":"2026-07-22 10:36-04:00"},"runwayTime":{"utc":"2026-07-22 14:36Z","local":"2026-07-22 10:36-04:00"},"terminal":"4","runway":"22R","quality":["Basic","Live"]}
[flightStatus] DL5370 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 13:50Z","revisedTime":"2026-07-22 14:36Z","runwayTime":"2026-07-22 14:36Z","terminal":"4","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 46min for DL5370
[flightStatus] computed inbound delay from revisedTime: 27min for DL5370
[flightStatus] DL5370 2026-07-22 status=Approaching dep_delay=46 inbound_delay=27 cancelled=false
[riskScorer] DL5370 2026-07-22 horizon=short hours_out=-108.3 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA2229" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching OMA (KOMA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KHKG: Unexpected end of JSON input
[riskScorer] DL89 2026-07-22 horizon=short hours_out=-91.9 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA5932" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching ILM (KILM)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] ILM cat=MVFR vis=10 ceil=2800 ts=false fz=false contrib=10
[flightStatus] AS668 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS668 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-22 14:00Z","local":"2026-07-22 07:00-07:00"},"revisedTime":{"utc":"2026-07-22 14:30Z","local":"2026-07-22 07:30-07:00"},"runwayTime":{"utc":"2026-07-22 14:30Z","local":"2026-07-22 07:30-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS668 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-22 14:00Z","revisedTime":"2026-07-22 14:30Z","runwayTime":"2026-07-22 14:30Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 30min for AS668
[flightStatus] computed inbound delay from revisedTime: 19min for AS668
[flightStatus] AS668 2026-07-22 status=Arrived dep_delay=30 inbound_delay=19 cancelled=false
[riskScorer] AS668 2026-07-22 horizon=short hours_out=-108.1 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "KG5745" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching MKG (KMKG)
[carrierHealth] cache hit KG
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] MKG cat=VFR vis=7 ceil=25000 ts=false fz=false contrib=2
[weather] OMA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA2039 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA2039 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-22 16:00Z","local":"2026-07-22 09:00-07:00"},"revisedTime":{"utc":"2026-07-22 16:16Z","local":"2026-07-22 09:16-07:00"},"runwayTime":{"utc":"2026-07-22 16:16Z","local":"2026-07-22 09:16-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA2039 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-22 16:00Z","revisedTime":"2026-07-22 16:16Z","runwayTime":"2026-07-22 16:16Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for UA2039
[flightStatus] UA2039 2026-07-22 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] UA2039 2026-07-22 horizon=short hours_out=-106.1 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL2775" 2026-07-22
[weather] fetching JFK (KJFK)
[weather] fetching MCO (KMCO)
[carrierHealth] cache hit DL
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MCO cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL895 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL895 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 16:40Z","local":"2026-07-22 12:40-04:00"},"revisedTime":{"utc":"2026-07-22 16:51Z","local":"2026-07-22 12:51-04:00"},"runwayTime":{"utc":"2026-07-22 16:51Z","local":"2026-07-22 12:51-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL895 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 16:40Z","revisedTime":"2026-07-22 16:51Z","runwayTime":"2026-07-22 16:51Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for DL895
[flightStatus] DL895 2026-07-22 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] DL895 2026-07-22 horizon=short hours_out=-105.5 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL2343" 2026-07-22
[weather] fetching JFK (KJFK)
[weather] fetching DTW (KDTW)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] DTW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA2229 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2229 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 19:25Z","local":"2026-07-22 14:25-05:00"},"revisedTime":{"utc":"2026-07-22 19:31Z","local":"2026-07-22 14:31-05:00"},"runwayTime":{"utc":"2026-07-22 19:31Z","local":"2026-07-22 14:31-05:00"},"runway":"36R","quality":["Basic","Live"]}
[flightStatus] AA2229 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 19:25Z","revisedTime":"2026-07-22 19:31Z","runwayTime":"2026-07-22 19:31Z","runway":"36R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 6min for AA2229
[flightStatus] AA2229 2026-07-22 status=Arrived dep_delay=6 inbound_delay=0 cancelled=false
[riskScorer] AA2229 2026-07-22 horizon=short hours_out=-102.7 raw_total=26 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AF21" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching CDG (LFPG)
[carrierHealth] cache hit AF
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CDG cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA5932 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5932 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 16:34Z","local":"2026-07-22 11:34-05:00"},"revisedTime":{"utc":"2026-07-22 16:49Z","local":"2026-07-22 11:49-05:00"},"runwayTime":{"utc":"2026-07-22 16:49Z","local":"2026-07-22 11:49-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5932 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 16:34Z","revisedTime":"2026-07-22 16:49Z","runwayTime":"2026-07-22 16:49Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for UA5932
[flightStatus] UA5932 2026-07-22 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] UA5932 2026-07-22 horizon=short hours_out=-105.6 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":6,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL5598" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching CVG (KCVG)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CVG cat=VFR vis=10 ceil=6000 ts=false fz=false contrib=2
[flightStatus] KG5745 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] KG5745 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 19:15Z","local":"2026-07-22 14:15-05:00"},"revisedTime":{"utc":"2026-07-22 20:16Z","local":"2026-07-22 15:16-05:00"},"runwayTime":{"utc":"2026-07-22 20:16Z","local":"2026-07-22 15:16-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] KG5745 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 19:15Z","revisedTime":"2026-07-22 20:16Z","runwayTime":"2026-07-22 20:16Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 61min for KG5745
[flightStatus] computed inbound delay from revisedTime: 41min for KG5745
[flightStatus] KG5745 2026-07-22 status=Arrived dep_delay=61 inbound_delay=41 cancelled=false
[riskScorer] KG5745 2026-07-22 horizon=short hours_out=-102.9 raw_total=58 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "WN887" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching DEN (KDEN)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DEN cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[flightStatus] DL2775 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL2775 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 15:27Z","local":"2026-07-22 11:27-04:00"},"revisedTime":{"utc":"2026-07-22 16:35Z","local":"2026-07-22 12:35-04:00"},"runwayTime":{"utc":"2026-07-22 16:35Z","local":"2026-07-22 12:35-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL2775 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 15:27Z","revisedTime":"2026-07-22 16:35Z","runwayTime":"2026-07-22 16:35Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 68min for DL2775
[flightStatus] computed inbound delay from revisedTime: 39min for DL2775
[flightStatus] DL2775 2026-07-22 status=Arrived dep_delay=68 inbound_delay=39 cancelled=false
[riskScorer] DL2775 2026-07-22 horizon=short hours_out=-106.7 raw_total=56 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL1206" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching MKE (KMKE)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] MKE cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2343 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL2343 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 16:59Z","local":"2026-07-22 12:59-04:00"},"revisedTime":{"utc":"2026-07-22 17:20Z","local":"2026-07-22 13:20-04:00"},"runwayTime":{"utc":"2026-07-22 17:20Z","local":"2026-07-22 13:20-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL2343 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 16:59Z","revisedTime":"2026-07-22 17:20Z","runwayTime":"2026-07-22 17:20Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for DL2343
[flightStatus] DL2343 2026-07-22 status=Arrived dep_delay=21 inbound_delay=0 cancelled=false
[riskScorer] DL2343 2026-07-22 horizon=short hours_out=-105.1 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL2211" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching PNS (KPNS)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AF21 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AF21 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-22 21:00Z","local":"2026-07-22 14:00-07:00"},"revisedTime":{"utc":"2026-07-22 21:16Z","local":"2026-07-22 14:16-07:00"},"runwayTime":{"utc":"2026-07-22 21:16Z","local":"2026-07-22 14:16-07:00"},"terminal":"B","runway":"24L","quality":["Basic","Live"]}
[flightStatus] AF21 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-22 21:00Z","revisedTime":"2026-07-22 21:16Z","runwayTime":"2026-07-22 21:16Z","terminal":"B","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AF21
[flightStatus] AF21 2026-07-22 status=Approaching dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] AF21 2026-07-22 horizon=short hours_out=-101.1 raw_total=33 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL2035" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching MCO (KMCO)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MCO cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] PNS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL5598 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5598 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 15:40Z","local":"2026-07-22 11:40-04:00"},"revisedTime":{"utc":"2026-07-22 16:01Z","local":"2026-07-22 12:01-04:00"},"runwayTime":{"utc":"2026-07-22 16:01Z","local":"2026-07-22 12:01-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5598 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 15:40Z","revisedTime":"2026-07-22 16:01Z","runwayTime":"2026-07-22 16:01Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for DL5598
[flightStatus] DL5598 2026-07-22 status=Arrived dep_delay=21 inbound_delay=0 cancelled=false
[riskScorer] DL5598 2026-07-22 horizon=short hours_out=-106.5 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA560" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching CLE (KCLE)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] CLE cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN887 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN887 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 16:50Z","local":"2026-07-22 12:50-04:00"},"revisedTime":{"utc":"2026-07-22 18:07Z","local":"2026-07-22 14:07-04:00"},"runwayTime":{"utc":"2026-07-22 18:07Z","local":"2026-07-22 14:07-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] WN887 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 16:50Z","revisedTime":"2026-07-22 18:07Z","runwayTime":"2026-07-22 18:07Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 77min for WN887
[flightStatus] computed inbound delay from revisedTime: 293min for WN887
[flightStatus] WN887 2026-07-22 status=Arrived dep_delay=77 inbound_delay=293 cancelled=false
[riskScorer] WN887 2026-07-22 horizon=short hours_out=-105.3 raw_total=56 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AC508" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching YYZ (CYYZ)
[carrierHealth] cache hit AC
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] YYZ cat=VFR vis=15 ceil=10000 ts=false fz=false contrib=2
[flightStatus] DL1206 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1206 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 19:29Z","local":"2026-07-22 15:29-04:00"},"revisedTime":{"utc":"2026-07-22 19:39Z","local":"2026-07-22 15:39-04:00"},"runwayTime":{"utc":"2026-07-22 19:39Z","local":"2026-07-22 15:39-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1206 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 19:29Z","revisedTime":"2026-07-22 19:39Z","runwayTime":"2026-07-22 19:39Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for DL1206
[flightStatus] DL1206 2026-07-22 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] DL1206 2026-07-22 horizon=short hours_out=-102.6 raw_total=26 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA3717" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching MSN (KMSN)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] MSN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2211 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2211 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 20:48Z","local":"2026-07-22 16:48-04:00"},"revisedTime":{"utc":"2026-07-22 21:15Z","local":"2026-07-22 17:15-04:00"},"runwayTime":{"utc":"2026-07-22 21:15Z","local":"2026-07-22 17:15-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2211 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 20:48Z","revisedTime":"2026-07-22 21:15Z","runwayTime":"2026-07-22 21:15Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for DL2211
[flightStatus] DL2211 2026-07-22 status=Arrived dep_delay=27 inbound_delay=0 cancelled=false
[riskScorer] DL2211 2026-07-22 horizon=short hours_out=-101.3 raw_total=36 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL148" 2026-07-22
[weather] fetching JFK (KJFK)
[weather] fetching MLA (KMLA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] fetch failed for KMLA: Unexpected end of JSON input
[flightStatus] DL2035 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2035 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 22:00Z","local":"2026-07-22 18:00-04:00"},"revisedTime":{"utc":"2026-07-22 22:19Z","local":"2026-07-22 18:19-04:00"},"runwayTime":{"utc":"2026-07-22 22:19Z","local":"2026-07-22 18:19-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2035 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 22:00Z","revisedTime":"2026-07-22 22:19Z","runwayTime":"2026-07-22 22:19Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for DL2035
[flightStatus] DL2035 2026-07-22 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] DL2035 2026-07-22 horizon=short hours_out=-100.1 raw_total=36 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA1170" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching HNL (PHNL)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] HNL cat=VFR vis=10 ceil=4700 ts=false fz=false contrib=5
[flightStatus] AA560 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA560 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 23:30Z","local":"2026-07-22 18:30-05:00"},"revisedTime":{"utc":"2026-07-23 00:06Z","local":"2026-07-22 19:06-05:00"},"runwayTime":{"utc":"2026-07-23 00:06Z","local":"2026-07-22 19:06-05:00"},"runway":"36R","quality":["Basic","Live"]}
[flightStatus] AA560 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 23:30Z","revisedTime":"2026-07-23 00:06Z","runwayTime":"2026-07-23 00:06Z","runway":"36R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for AA560
[flightStatus] AA560 2026-07-22 status=Arrived dep_delay=36 inbound_delay=0 cancelled=false
[riskScorer] AA560 2026-07-22 horizon=short hours_out=-98.6 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL1287" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching IAH (KIAH)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] IAH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AC508 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AC508 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 20:45Z","local":"2026-07-22 15:45-05:00"},"revisedTime":{"utc":"2026-07-22 22:39Z","local":"2026-07-22 17:39-05:00"},"runwayTime":{"utc":"2026-07-22 22:39Z","local":"2026-07-22 17:39-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] AC508 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 20:45Z","revisedTime":"2026-07-22 22:39Z","runwayTime":"2026-07-22 22:39Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 114min for AC508
[flightStatus] computed inbound delay from revisedTime: 97min for AC508
[flightStatus] AC508 2026-07-22 status=Arrived dep_delay=114 inbound_delay=97 cancelled=false
[riskScorer] AC508 2026-07-22 horizon=short hours_out=-101.4 raw_total=63 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "WN4106" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching MDW (KMDW)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MDW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3717 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3717 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 22:00Z","local":"2026-07-22 17:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3717 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 22:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3717 2026-07-22 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3717 2026-07-22 horizon=short hours_out=-100.1 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA3543" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching IAD (KIAD)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] IAD cat=VFR vis=10 ceil=8500 ts=true fz=false contrib=12
[flightStatus] DL148 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL148 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 21:05Z","local":"2026-07-22 17:05-04:00"},"revisedTime":{"utc":"2026-07-22 21:28Z","local":"2026-07-22 17:28-04:00"},"runwayTime":{"utc":"2026-07-22 21:28Z","local":"2026-07-22 17:28-04:00"},"terminal":"4","runway":"22R","quality":["Basic","Live"]}
[flightStatus] DL148 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 21:05Z","revisedTime":"2026-07-22 21:28Z","runwayTime":"2026-07-22 21:28Z","terminal":"4","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for DL148
[flightStatus] DL148 2026-07-22 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[riskScorer] DL148 2026-07-22 horizon=short hours_out=-101.0 raw_total=35 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL357" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching PDX (KPDX)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] PDX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL1287 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1287 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 01:35Z","local":"2026-07-22 18:35-07:00"},"revisedTime":{"utc":"2026-07-23 01:36Z","local":"2026-07-22 18:36-07:00"},"runwayTime":{"utc":"2026-07-23 01:36Z","local":"2026-07-22 18:36-07:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] DL1287 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 01:35Z","revisedTime":"2026-07-23 01:36Z","runwayTime":"2026-07-23 01:36Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 1min for DL1287
[flightStatus] DL1287 2026-07-22 status=Arrived dep_delay=1 inbound_delay=0 cancelled=false
[riskScorer] DL1287 2026-07-22 horizon=short hours_out=-96.5 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL2416" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching YUL (CYUL)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] UA1170 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1170 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 00:05Z","local":"2026-07-22 17:05-07:00"},"revisedTime":{"utc":"2026-07-23 00:32Z","local":"2026-07-22 17:32-07:00"},"runwayTime":{"utc":"2026-07-23 00:32Z","local":"2026-07-22 17:32-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA1170 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 00:05Z","revisedTime":"2026-07-23 00:32Z","runwayTime":"2026-07-23 00:32Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for UA1170
[flightStatus] computed inbound delay from revisedTime: 4min for UA1170
[flightStatus] UA1170 2026-07-22 status=Arrived dep_delay=27 inbound_delay=4 cancelled=false
[riskScorer] UA1170 2026-07-22 horizon=short hours_out=-98.0 raw_total=31 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA531" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching TUL (KTUL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] WN4106 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN4106 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 19:45Z","local":"2026-07-22 15:45-04:00"},"revisedTime":{"utc":"2026-07-22 21:25Z","local":"2026-07-22 17:25-04:00"},"runwayTime":{"utc":"2026-07-22 21:25Z","local":"2026-07-22 17:25-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] WN4106 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 19:45Z","revisedTime":"2026-07-22 21:25Z","runwayTime":"2026-07-22 21:25Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 100min for WN4106
[flightStatus] computed inbound delay from revisedTime: 67min for WN4106
[flightStatus] WN4106 2026-07-22 status=Arrived dep_delay=100 inbound_delay=67 cancelled=false
[riskScorer] WN4106 2026-07-22 horizon=short hours_out=-102.4 raw_total=58 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA5768" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching MSN (KMSN)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] MSN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] YUL cat=VFR vis=15 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA3543 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA3543 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 22:05Z","local":"2026-07-22 18:05-04:00"},"revisedTime":{"utc":"2026-07-23 01:00Z","local":"2026-07-22 21:00-04:00"},"runwayTime":{"utc":"2026-07-23 01:00Z","local":"2026-07-22 21:00-04:00"},"terminal":"B","runway":"22R","quality":["Basic","Live"]}
[flightStatus] UA3543 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 22:05Z","revisedTime":"2026-07-23 01:00Z","runwayTime":"2026-07-23 01:00Z","terminal":"B","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 175min for UA3543
[flightStatus] computed inbound delay from revisedTime: 125min for UA3543
[flightStatus] UA3543 2026-07-22 status=Arrived dep_delay=175 inbound_delay=125 cancelled=false
[riskScorer] UA3543 2026-07-22 horizon=short hours_out=-100.0 raw_total=65 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":6,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA5336" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching COU (KCOU)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] TUL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL357 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL357 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 23:40Z","local":"2026-07-22 19:40-04:00"},"revisedTime":{"utc":"2026-07-23 00:20Z","local":"2026-07-22 20:20-04:00"},"runwayTime":{"utc":"2026-07-23 00:20Z","local":"2026-07-22 20:20-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL357 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 23:40Z","revisedTime":"2026-07-23 00:20Z","runwayTime":"2026-07-23 00:20Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 40min for DL357
[flightStatus] computed inbound delay from revisedTime: 9min for DL357
[flightStatus] DL357 2026-07-22 status=Arrived dep_delay=40 inbound_delay=9 cancelled=false
[riskScorer] DL357 2026-07-22 horizon=short hours_out=-98.5 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "EK206" 2026-07-22
[weather] fetching JFK (KJFK)
[weather] fetching MXP (KMXP)
[carrierHealth] cache hit EK
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KMXP: Unexpected end of JSON input
[weather] COU cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2416 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2416 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 01:15Z","local":"2026-07-22 21:15-04:00"},"revisedTime":{"utc":"2026-07-23 01:27Z","local":"2026-07-22 21:27-04:00"},"runwayTime":{"utc":"2026-07-23 01:27Z","local":"2026-07-22 21:27-04:00"},"terminal":"I","runway":"26L","quality":["Basic","Live"]}
[flightStatus] DL2416 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 01:15Z","revisedTime":"2026-07-23 01:27Z","runwayTime":"2026-07-23 01:27Z","terminal":"I","runway":"26L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL2416
[flightStatus] DL2416 2026-07-22 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] DL2416 2026-07-22 horizon=short hours_out=-96.9 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA2114" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching MEM (KMEM)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] MEM cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA531 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA531 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 03:38Z","local":"2026-07-22 22:38-05:00"},"revisedTime":{"utc":"2026-07-23 04:30Z","local":"2026-07-22 23:30-05:00"},"runwayTime":{"utc":"2026-07-23 04:30Z","local":"2026-07-22 23:30-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA531 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 03:38Z","revisedTime":"2026-07-23 04:30Z","runwayTime":"2026-07-23 04:30Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 52min for AA531
[flightStatus] computed inbound delay from revisedTime: 24min for AA531
[flightStatus] AA531 2026-07-22 status=Arrived dep_delay=52 inbound_delay=24 cancelled=false
[riskScorer] AA531 2026-07-22 horizon=short hours_out=-94.5 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA1916" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching IAH (KIAH)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] IAH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA5768 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5768 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 00:45Z","local":"2026-07-22 19:45-05:00"},"revisedTime":{"utc":"2026-07-23 01:02Z","local":"2026-07-22 20:02-05:00"},"runwayTime":{"utc":"2026-07-23 01:02Z","local":"2026-07-22 20:02-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5768 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 00:45Z","revisedTime":"2026-07-23 01:02Z","runwayTime":"2026-07-23 01:02Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for UA5768
[flightStatus] UA5768 2026-07-22 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] UA5768 2026-07-22 horizon=short hours_out=-97.4 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA1998" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching JAX (KJAX)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] UA5336 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA5336 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 03:00Z","local":"2026-07-22 22:00-05:00"},"terminal":"2","quality":["Basic"]}
[flightStatus] UA5336 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 03:00Z","terminal":"2","quality":["Basic"]}
[flightStatus] UA5336 2026-07-22 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA5336 2026-07-22 horizon=short hours_out=-95.1 raw_total=13 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA3489" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching CVG (KCVG)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CVG cat=VFR vis=10 ceil=6000 ts=false fz=false contrib=2
[flightStatus] EK206 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] EK206 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 02:20Z","local":"2026-07-22 22:20-04:00"},"revisedTime":{"utc":"2026-07-23 02:37Z","local":"2026-07-22 22:37-04:00"},"runwayTime":{"utc":"2026-07-23 02:37Z","local":"2026-07-22 22:37-04:00"},"terminal":"4","runway":"22R","quality":["Basic","Live"]}
[flightStatus] EK206 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 02:20Z","revisedTime":"2026-07-23 02:37Z","runwayTime":"2026-07-23 02:37Z","terminal":"4","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for EK206
[flightStatus] EK206 2026-07-22 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] EK206 2026-07-22 horizon=short hours_out=-95.8 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA4537" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching GRB (KGRB)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] GRB cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] JAX cat=VFR vis=10 ceil=20000 ts=false fz=false contrib=2
[flightStatus] AA2114 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2114 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 12:15Z","local":"2026-07-22 07:15-05:00"},"revisedTime":{"utc":"2026-07-22 12:31Z","local":"2026-07-22 07:31-05:00"},"runwayTime":{"utc":"2026-07-22 12:31Z","local":"2026-07-22 07:31-05:00"},"runway":"35L","quality":["Basic","Live"]}
[flightStatus] AA2114 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 12:15Z","revisedTime":"2026-07-22 12:31Z","runwayTime":"2026-07-22 12:31Z","runway":"35L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AA2114
[flightStatus] AA2114 2026-07-22 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] AA2114 2026-07-22 horizon=short hours_out=-109.9 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA388" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA1916 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1916 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 13:35Z","local":"2026-07-22 08:35-05:00"},"revisedTime":{"utc":"2026-07-22 13:48Z","local":"2026-07-22 08:48-05:00"},"runwayTime":{"utc":"2026-07-22 13:48Z","local":"2026-07-22 08:48-05:00"},"runway":"35L","quality":["Basic","Live"]}
[flightStatus] AA1916 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 13:35Z","revisedTime":"2026-07-22 13:48Z","runwayTime":"2026-07-22 13:48Z","runway":"35L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for AA1916
[flightStatus] AA1916 2026-07-22 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[riskScorer] AA1916 2026-07-22 horizon=short hours_out=-108.5 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA703" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching DEN (KDEN)
[carrierHealth] cache hit UA
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DEN cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA1998 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA1998 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 15:01Z","local":"2026-07-22 10:01-05:00"},"revisedTime":{"utc":"2026-07-22 15:29Z","local":"2026-07-22 10:29-05:00"},"runwayTime":{"utc":"2026-07-22 15:29Z","local":"2026-07-22 10:29-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA1998 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 15:01Z","revisedTime":"2026-07-22 15:29Z","runwayTime":"2026-07-22 15:29Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 28min for AA1998
[flightStatus] computed inbound delay from revisedTime: 10min for AA1998
[flightStatus] AA1998 2026-07-22 status=Arrived dep_delay=28 inbound_delay=10 cancelled=false
[riskScorer] AA1998 2026-07-22 horizon=short hours_out=-107.1 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "WN2397" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching HNL (PHNL)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] HNL cat=VFR vis=10 ceil=4700 ts=false fz=false contrib=5
[flightStatus] AA3489 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3489 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 12:06Z","local":"2026-07-22 07:06-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3489 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 12:06Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3489 2026-07-22 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3489 2026-07-22 horizon=short hours_out=-110.0 raw_total=54 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "MQ3814" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching STL (KSTL)
[carrierHealth] cache hit MQ
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] UA4537 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA4537 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 13:40Z","local":"2026-07-22 08:40-05:00"},"revisedTime":{"utc":"2026-07-22 14:39Z","local":"2026-07-22 09:39-05:00"},"runwayTime":{"utc":"2026-07-22 14:39Z","local":"2026-07-22 09:39-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA4537 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 13:40Z","revisedTime":"2026-07-22 14:39Z","runwayTime":"2026-07-22 14:39Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 59min for UA4537
[flightStatus] computed inbound delay from revisedTime: 19min for UA4537
[flightStatus] UA4537 2026-07-22 status=Arrived dep_delay=59 inbound_delay=19 cancelled=false
[riskScorer] UA4537 2026-07-22 horizon=short hours_out=-108.5 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA4635" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching SYR (KSYR)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] SYR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA388 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA388 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 15:20Z","local":"2026-07-22 10:20-05:00"},"revisedTime":{"utc":"2026-07-22 15:52Z","local":"2026-07-22 10:52-05:00"},"runwayTime":{"utc":"2026-07-22 15:52Z","local":"2026-07-22 10:52-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA388 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 15:20Z","revisedTime":"2026-07-22 15:52Z","runwayTime":"2026-07-22 15:52Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 32min for AA388
[flightStatus] AA388 2026-07-22 status=Arrived dep_delay=32 inbound_delay=0 cancelled=false
[riskScorer] AA388 2026-07-22 horizon=short hours_out=-106.8 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA1270" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching PUJ (KPUJ)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] PUJ cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA703 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA703 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-22 14:00Z","local":"2026-07-22 07:00-07:00"},"revisedTime":{"utc":"2026-07-22 14:17Z","local":"2026-07-22 07:17-07:00"},"runwayTime":{"utc":"2026-07-22 14:17Z","local":"2026-07-22 07:17-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA703 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-22 14:00Z","revisedTime":"2026-07-22 14:17Z","runwayTime":"2026-07-22 14:17Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for UA703
[flightStatus] UA703 2026-07-22 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] UA703 2026-07-22 horizon=short hours_out=-108.1 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL483" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching BUR (KBUR)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] BUR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN2397 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN2397 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-22 16:00Z","local":"2026-07-22 09:00-07:00"},"revisedTime":{"utc":"2026-07-22 16:30Z","local":"2026-07-22 09:30-07:00"},"runwayTime":{"utc":"2026-07-22 16:30Z","local":"2026-07-22 09:30-07:00"},"terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] WN2397 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-22 16:00Z","revisedTime":"2026-07-22 16:30Z","runwayTime":"2026-07-22 16:30Z","terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 30min for WN2397
[flightStatus] computed inbound delay from revisedTime: 15min for WN2397
[flightStatus] WN2397 2026-07-22 status=Arrived dep_delay=30 inbound_delay=15 cancelled=false
[riskScorer] WN2397 2026-07-22 horizon=short hours_out=-106.1 raw_total=34 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA1226" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching EWR (KEWR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] EWR active programs: Arrival Delay, Departure Delay avgDelay=0min
[weather] EWR cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] MQ3814 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] MQ3814 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 11:00Z","local":"2026-07-22 07:00-04:00"},"revisedTime":{"utc":"2026-07-22 11:10Z","local":"2026-07-22 07:10-04:00"},"runwayTime":{"utc":"2026-07-22 11:10Z","local":"2026-07-22 07:10-04:00"},"quality":["Basic","Live"]}
[flightStatus] MQ3814 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 11:00Z","revisedTime":"2026-07-22 11:10Z","runwayTime":"2026-07-22 11:10Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for MQ3814
[flightStatus] computed inbound delay from revisedTime: 12min for MQ3814
[flightStatus] MQ3814 2026-07-22 status=Arrived dep_delay=10 inbound_delay=12 cancelled=false
[weather] STL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[riskScorer] MQ3814 2026-07-22 horizon=short hours_out=-111.1 raw_total=19 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA5371" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching SLC (KSLC)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SLC cat=VFR vis=10 ceil=17000 ts=false fz=false contrib=2
[flightStatus] AA4635 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA4635 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 12:36Z","local":"2026-07-22 08:36-04:00"},"revisedTime":{"utc":"2026-07-22 12:50Z","local":"2026-07-22 08:50-04:00"},"runwayTime":{"utc":"2026-07-22 12:50Z","local":"2026-07-22 08:50-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AA4635 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 12:36Z","revisedTime":"2026-07-22 12:50Z","runwayTime":"2026-07-22 12:50Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for AA4635
[flightStatus] AA4635 2026-07-22 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[riskScorer] AA4635 2026-07-22 horizon=short hours_out=-109.5 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "WN3038" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching BWI (KBWI)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BWI cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[flightStatus] UA1270 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1270 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 13:45Z","local":"2026-07-22 08:45-05:00"},"revisedTime":{"utc":"2026-07-22 14:01Z","local":"2026-07-22 09:01-05:00"},"runwayTime":{"utc":"2026-07-22 14:01Z","local":"2026-07-22 09:01-05:00"},"terminal":"1","runway":"10L","quality":["Basic","Live"]}
[flightStatus] UA1270 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 13:45Z","revisedTime":"2026-07-22 14:01Z","runwayTime":"2026-07-22 14:01Z","terminal":"1","runway":"10L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for UA1270
[flightStatus] UA1270 2026-07-22 status=EnRoute dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] UA1270 2026-07-22 horizon=short hours_out=-108.4 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA4375" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching LGA (KLGA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] DL483 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL483 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 15:19Z","local":"2026-07-22 11:19-04:00"},"revisedTime":{"utc":"2026-07-22 16:56Z","local":"2026-07-22 12:56-04:00"},"runwayTime":{"utc":"2026-07-22 16:56Z","local":"2026-07-22 12:56-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL483 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 15:19Z","revisedTime":"2026-07-22 16:56Z","runwayTime":"2026-07-22 16:56Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 97min for DL483
[flightStatus] computed inbound delay from revisedTime: 65min for DL483
[flightStatus] DL483 2026-07-22 status=Arrived dep_delay=97 inbound_delay=65 cancelled=false
[riskScorer] DL483 2026-07-22 horizon=short hours_out=-106.8 raw_total=56 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA2186" 2026-07-22
[weather] fetching DFW (KDFW)
[weather] fetching MCO (KMCO)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] MCO cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA1226 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1226 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 16:39Z","local":"2026-07-22 12:39-04:00"},"revisedTime":{"utc":"2026-07-22 16:56Z","local":"2026-07-22 12:56-04:00"},"runwayTime":{"utc":"2026-07-22 16:56Z","local":"2026-07-22 12:56-04:00"},"terminal":"N","quality":["Basic","Live"]}
[flightStatus] UA1226 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 16:39Z","revisedTime":"2026-07-22 16:56Z","runwayTime":"2026-07-22 16:56Z","terminal":"N","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for UA1226
[flightStatus] UA1226 2026-07-22 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] UA1226 2026-07-22 horizon=short hours_out=-105.5 raw_total=37 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA6245" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching LEX (KLEX)
[carrierHealth] cache hit AA
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LEX cat=VFR vis=10 ceil=3200 ts=false fz=false contrib=2
[flightStatus] UA5371 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA5371 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-22 19:55Z","local":"2026-07-22 12:55-07:00"},"revisedTime":{"utc":"2026-07-22 20:10Z","local":"2026-07-22 13:10-07:00"},"runwayTime":{"utc":"2026-07-22 20:10Z","local":"2026-07-22 13:10-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA5371 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-22 19:55Z","revisedTime":"2026-07-22 20:10Z","runwayTime":"2026-07-22 20:10Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for UA5371
[flightStatus] UA5371 2026-07-22 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] UA5371 2026-07-22 horizon=short hours_out=-102.2 raw_total=26 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA3458" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching CID (KCID)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CID cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4375 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA4375 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 18:04Z","local":"2026-07-22 14:04-04:00"},"revisedTime":{"utc":"2026-07-22 19:52Z","local":"2026-07-22 15:52-04:00"},"runwayTime":{"utc":"2026-07-22 19:52Z","local":"2026-07-22 15:52-04:00"},"terminal":"B","runway":"22R","quality":["Basic","Live"]}
[flightStatus] AA4375 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 18:04Z","revisedTime":"2026-07-22 19:52Z","runwayTime":"2026-07-22 19:52Z","terminal":"B","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 108min for AA4375
[flightStatus] computed inbound delay from revisedTime: 83min for AA4375
[flightStatus] AA4375 2026-07-22 status=Arrived dep_delay=108 inbound_delay=83 cancelled=false
[riskScorer] AA4375 2026-07-22 horizon=short hours_out=-104.1 raw_total=58 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL2459" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching PDX (KPDX)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] PDX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN3038 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN3038 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 15:35Z","local":"2026-07-22 11:35-04:00"},"revisedTime":{"utc":"2026-07-22 16:13Z","local":"2026-07-22 12:13-04:00"},"runwayTime":{"utc":"2026-07-22 16:13Z","local":"2026-07-22 12:13-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] WN3038 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 15:35Z","revisedTime":"2026-07-22 16:13Z","runwayTime":"2026-07-22 16:13Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 38min for WN3038
[flightStatus] computed inbound delay from revisedTime: 17min for WN3038
[flightStatus] WN3038 2026-07-22 status=Arrived dep_delay=38 inbound_delay=17 cancelled=false
[riskScorer] WN3038 2026-07-22 horizon=short hours_out=-106.6 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[rescore] progress: 801/1166
[flightStatus] number lookup "DL692" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching AUS (KAUS)
[carrierHealth] cache hit DL
[weather] AUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA2186 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA2186 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 23:30Z","local":"2026-07-22 18:30-05:00"},"revisedTime":{"utc":"2026-07-22 23:45Z","local":"2026-07-22 18:45-05:00"},"runwayTime":{"utc":"2026-07-22 23:45Z","local":"2026-07-22 18:45-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA2186 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 23:30Z","revisedTime":"2026-07-22 23:45Z","runwayTime":"2026-07-22 23:45Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for AA2186
[flightStatus] AA2186 2026-07-22 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] AA2186 2026-07-22 horizon=short hours_out=-98.6 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA3309" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA6245 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA6245 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 20:45Z","local":"2026-07-22 15:45-05:00"},"revisedTime":{"utc":"2026-07-22 21:37Z","local":"2026-07-22 16:37-05:00"},"runwayTime":{"utc":"2026-07-22 21:37Z","local":"2026-07-22 16:37-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA6245 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 20:45Z","revisedTime":"2026-07-22 21:37Z","runwayTime":"2026-07-22 21:37Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 52min for AA6245
[flightStatus] computed inbound delay from revisedTime: 1min for AA6245
[flightStatus] AA6245 2026-07-22 status=Arrived dep_delay=52 inbound_delay=1 cancelled=false
[riskScorer] AA6245 2026-07-22 horizon=short hours_out=-101.4 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA1325" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching DSM (KDSM)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] DSM cat=VFR vis=10 ceil=17000 ts=false fz=false contrib=2
[flightStatus] AA3458 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3458 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-22 22:00Z","local":"2026-07-22 17:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3458 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-22 22:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3458 2026-07-22 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3458 2026-07-22 horizon=short hours_out=-100.1 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA5539" 2026-07-22
[weather] fetching ORD (KORD)
[weather] fetching MLI (KMLI)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL2459 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2459 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 00:01Z","local":"2026-07-22 17:01-07:00"},"revisedTime":{"utc":"2026-07-23 00:17Z","local":"2026-07-22 17:17-07:00"},"runwayTime":{"utc":"2026-07-23 00:17Z","local":"2026-07-22 17:17-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL2459 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 00:01Z","revisedTime":"2026-07-23 00:17Z","runwayTime":"2026-07-23 00:17Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for DL2459
[flightStatus] computed inbound delay from revisedTime: 7min for DL2459
[flightStatus] DL2459 2026-07-22 status=Arrived dep_delay=16 inbound_delay=7 cancelled=false
[riskScorer] DL2459 2026-07-22 horizon=short hours_out=-98.1 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL1104" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching DAL (KDAL)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL692 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL692 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 01:32Z","local":"2026-07-22 18:32-07:00"},"revisedTime":{"utc":"2026-07-23 02:36Z","local":"2026-07-22 19:36-07:00"},"runwayTime":{"utc":"2026-07-23 02:36Z","local":"2026-07-22 19:36-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL692 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 01:32Z","revisedTime":"2026-07-23 02:36Z","runwayTime":"2026-07-23 02:36Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 64min for DL692
[flightStatus] computed inbound delay from revisedTime: 44min for DL692
[flightStatus] DL692 2026-07-22 status=Arrived dep_delay=64 inbound_delay=44 cancelled=false
[riskScorer] DL692 2026-07-22 horizon=short hours_out=-96.6 raw_total=53 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL2810" 2026-07-22
[weather] fetching ATL (KATL)
[weather] fetching DAB (KDAB)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA3309 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA3309 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-22 21:05Z","local":"2026-07-22 17:05-04:00"},"revisedTime":{"utc":"2026-07-22 21:50Z","local":"2026-07-22 17:50-04:00"},"runwayTime":{"utc":"2026-07-22 21:50Z","local":"2026-07-22 17:50-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AA3309 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-22 21:05Z","revisedTime":"2026-07-22 21:50Z","runwayTime":"2026-07-22 21:50Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 45min for AA3309
[flightStatus] computed inbound delay from revisedTime: 13min for AA3309
[flightStatus] AA3309 2026-07-22 status=Arrived dep_delay=45 inbound_delay=13 cancelled=false
[riskScorer] AA3309 2026-07-22 horizon=short hours_out=-101.1 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "BA172" 2026-07-22
[weather] fetching JFK (KJFK)
[weather] fetching LHR (EGLL)
[carrierHealth] cache hit BA
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] DAL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA1325 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1325 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 00:45Z","local":"2026-07-22 19:45-05:00"},"revisedTime":{"utc":"2026-07-23 01:16Z","local":"2026-07-22 20:16-05:00"},"runwayTime":{"utc":"2026-07-23 01:16Z","local":"2026-07-22 20:16-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1325 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 00:45Z","revisedTime":"2026-07-23 01:16Z","runwayTime":"2026-07-23 01:16Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for UA1325
[flightStatus] UA1325 2026-07-22 status=Arrived dep_delay=31 inbound_delay=0 cancelled=false
[riskScorer] UA1325 2026-07-22 horizon=short hours_out=-97.4 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA2199" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching CLT (KCLT)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LHR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA5539 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5539 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 03:00Z","local":"2026-07-22 22:00-05:00"},"revisedTime":{"utc":"2026-07-23 03:43Z","local":"2026-07-22 22:43-05:00"},"runwayTime":{"utc":"2026-07-23 03:43Z","local":"2026-07-22 22:43-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5539 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 03:00Z","revisedTime":"2026-07-23 03:43Z","runwayTime":"2026-07-23 03:43Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 43min for UA5539
[flightStatus] UA5539 2026-07-22 status=EnRoute dep_delay=43 inbound_delay=0 cancelled=false
[weather] CLT cat=VFR vis=10 ceil=11000 ts=false fz=false contrib=2
[weather] MLI cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] UA5539 2026-07-22 horizon=short hours_out=-95.1 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "VS24" 2026-07-22
[weather] fetching LAX (KLAX)
[weather] fetching LHR (EGLL)
[carrierHealth] cache hit VS
[weather] LHR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL1104 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1104 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 01:15Z","local":"2026-07-22 21:15-04:00"},"revisedTime":{"utc":"2026-07-23 01:24Z","local":"2026-07-22 21:24-04:00"},"runwayTime":{"utc":"2026-07-23 01:24Z","local":"2026-07-22 21:24-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL1104 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 01:15Z","revisedTime":"2026-07-23 01:24Z","runwayTime":"2026-07-23 01:24Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for DL1104
[flightStatus] computed inbound delay from revisedTime: 39min for DL1104
[flightStatus] DL1104 2026-07-22 status=Arrived dep_delay=9 inbound_delay=39 cancelled=false
[riskScorer] DL1104 2026-07-22 horizon=short hours_out=-96.9 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "KL618" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching AMS (EHAM)
[carrierHealth] cache hit KL
[weather] AMS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DAB cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2810 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2810 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 02:49Z","local":"2026-07-22 22:49-04:00"},"revisedTime":{"utc":"2026-07-23 03:01Z","local":"2026-07-22 23:01-04:00"},"runwayTime":{"utc":"2026-07-23 03:01Z","local":"2026-07-22 23:01-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2810 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 02:49Z","revisedTime":"2026-07-23 03:01Z","runwayTime":"2026-07-23 03:01Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL2810
[flightStatus] DL2810 2026-07-22 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] DL2810 2026-07-22 horizon=short hours_out=-95.3 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AF331" 2026-07-22
[weather] fetching BOS (KBOS)
[weather] fetching CDG (LFPG)
[carrierHealth] cache hit AF
[weather] CDG cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] BA172 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] BA172 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 00:55Z","local":"2026-07-22 20:55-04:00"},"revisedTime":{"utc":"2026-07-23 01:18Z","local":"2026-07-22 21:18-04:00"},"runwayTime":{"utc":"2026-07-23 01:18Z","local":"2026-07-22 21:18-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] BA172 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 00:55Z","revisedTime":"2026-07-23 01:18Z","runwayTime":"2026-07-23 01:18Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for BA172
[flightStatus] BA172 2026-07-22 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[riskScorer] BA172 2026-07-22 horizon=short hours_out=-97.2 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA2899" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching OMA (KOMA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] OMA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2199 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA2199 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 04:41Z","local":"2026-07-22 21:41-07:00"},"revisedTime":{"utc":"2026-07-23 05:14Z","local":"2026-07-22 22:14-07:00"},"runwayTime":{"utc":"2026-07-23 05:14Z","local":"2026-07-22 22:14-07:00"},"quality":["Basic","Live"]}
[flightStatus] AA2199 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 04:41Z","revisedTime":"2026-07-23 05:14Z","runwayTime":"2026-07-23 05:14Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 33min for AA2199
[flightStatus] computed inbound delay from revisedTime: 10min for AA2199
[flightStatus] AA2199 2026-07-22 status=Arrived dep_delay=33 inbound_delay=10 cancelled=false
[riskScorer] AA2199 2026-07-22 horizon=short hours_out=-93.5 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA3167" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching GRR (KGRR)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] VS24 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] VS24 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 06:15Z","local":"2026-07-22 23:15-07:00"},"revisedTime":{"utc":"2026-07-23 06:33Z","local":"2026-07-22 23:33-07:00"},"runwayTime":{"utc":"2026-07-23 06:33Z","local":"2026-07-22 23:33-07:00"},"terminal":"2","runway":"24L","quality":["Basic","Live"]}
[flightStatus] VS24 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 06:15Z","revisedTime":"2026-07-23 06:33Z","runwayTime":"2026-07-23 06:33Z","terminal":"2","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for VS24
[flightStatus] VS24 2026-07-22 status=Arrived dep_delay=18 inbound_delay=0 cancelled=false
[riskScorer] VS24 2026-07-22 horizon=short hours_out=-91.9 raw_total=23 tier=green cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA2736" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching STS (KSTS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] STS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] KL618 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] KL618 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 00:25Z","local":"2026-07-22 20:25-04:00"},"revisedTime":{"utc":"2026-07-23 01:02Z","local":"2026-07-22 21:02-04:00"},"runwayTime":{"utc":"2026-07-23 01:02Z","local":"2026-07-22 21:02-04:00"},"terminal":"E","quality":["Basic","Live"]}
[flightStatus] KL618 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 00:25Z","revisedTime":"2026-07-23 01:02Z","runwayTime":"2026-07-23 01:02Z","terminal":"E","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 37min for KL618
[flightStatus] KL618 2026-07-22 status=Arrived dep_delay=37 inbound_delay=0 cancelled=false
[riskScorer] KL618 2026-07-22 horizon=short hours_out=-97.7 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA1336" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching AUS (KAUS)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] AUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AF331 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AF331 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 01:45Z","local":"2026-07-22 21:45-04:00"},"revisedTime":{"utc":"2026-07-23 02:12Z","local":"2026-07-22 22:12-04:00"},"runwayTime":{"utc":"2026-07-23 02:12Z","local":"2026-07-22 22:12-04:00"},"terminal":"E","quality":["Basic","Live"]}
[flightStatus] AF331 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 01:45Z","revisedTime":"2026-07-23 02:12Z","runwayTime":"2026-07-23 02:12Z","terminal":"E","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for AF331
[flightStatus] AF331 2026-07-22 status=Approaching dep_delay=27 inbound_delay=0 cancelled=false
[riskScorer] AF331 2026-07-22 horizon=short hours_out=-96.4 raw_total=26 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA249" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching MEX (MMMX)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MEX cat=VFR vis=8 ceil=8000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2899 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2899 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 12:10Z","local":"2026-07-23 07:10-05:00"},"revisedTime":{"utc":"2026-07-23 12:26Z","local":"2026-07-23 07:26-05:00"},"runwayTime":{"utc":"2026-07-23 12:26Z","local":"2026-07-23 07:26-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2899 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 12:10Z","revisedTime":"2026-07-23 12:26Z","runwayTime":"2026-07-23 12:26Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AA2899
[flightStatus] AA2899 2026-07-23 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] AA2899 2026-07-23 horizon=short hours_out=-86.0 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA1850" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching MSY (KMSY)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MSY cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3167 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA3167 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 13:53Z","local":"2026-07-23 08:53-05:00"},"revisedTime":{"utc":"2026-07-23 14:05Z","local":"2026-07-23 09:05-05:00"},"runwayTime":{"utc":"2026-07-23 14:05Z","local":"2026-07-23 09:05-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA3167 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 13:53Z","revisedTime":"2026-07-23 14:05Z","runwayTime":"2026-07-23 14:05Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for AA3167
[flightStatus] AA3167 2026-07-23 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[flightStatus] AA2736 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2736 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:15Z","local":"2026-07-23 10:15-05:00"},"revisedTime":{"utc":"2026-07-23 15:32Z","local":"2026-07-23 10:32-05:00"},"runwayTime":{"utc":"2026-07-23 15:32Z","local":"2026-07-23 10:32-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2736 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:15Z","revisedTime":"2026-07-23 15:32Z","runwayTime":"2026-07-23 15:32Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for AA2736
[flightStatus] AA2736 2026-07-23 status=Approaching dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] AA2736 2026-07-23 horizon=short hours_out=-82.9 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "BW423" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching TAB (KTAB)
[carrierHealth] cache hit BW
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] fetch failed for KTAB: Unexpected end of JSON input
[flightStatus] UA1336 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1336 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 12:00Z","local":"2026-07-23 07:00-05:00"},"revisedTime":{"utc":"2026-07-23 12:16Z","local":"2026-07-23 07:16-05:00"},"runwayTime":{"utc":"2026-07-23 12:16Z","local":"2026-07-23 07:16-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1336 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 12:00Z","revisedTime":"2026-07-23 12:16Z","runwayTime":"2026-07-23 12:16Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for UA1336
[flightStatus] UA1336 2026-07-23 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] UA1336 2026-07-23 horizon=short hours_out=-86.1 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL1994" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching PUJ (KPUJ)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] PUJ cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA249 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA249 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 13:42Z","local":"2026-07-23 08:42-05:00"},"revisedTime":{"utc":"2026-07-23 13:53Z","local":"2026-07-23 08:53-05:00"},"runwayTime":{"utc":"2026-07-23 13:53Z","local":"2026-07-23 08:53-05:00"},"terminal":"3","runway":"10L","quality":["Basic","Live"]}
[flightStatus] AA249 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 13:42Z","revisedTime":"2026-07-23 13:53Z","runwayTime":"2026-07-23 13:53Z","terminal":"3","runway":"10L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for AA249
[flightStatus] AA249 2026-07-23 status=EnRoute dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] AA249 2026-07-23 horizon=short hours_out=-84.4 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA1798" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching HNL (PHNL)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] HNL cat=VFR vis=10 ceil=4700 ts=false fz=false contrib=5
[flightStatus] UA1850 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1850 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:25Z","local":"2026-07-23 10:25-05:00"},"revisedTime":{"utc":"2026-07-23 16:15Z","local":"2026-07-23 11:15-05:00"},"runwayTime":{"utc":"2026-07-23 16:15Z","local":"2026-07-23 11:15-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1850 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:25Z","revisedTime":"2026-07-23 16:15Z","runwayTime":"2026-07-23 16:15Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 50min for UA1850
[flightStatus] computed inbound delay from revisedTime: 11min for UA1850
[flightStatus] UA1850 2026-07-23 status=Arrived dep_delay=50 inbound_delay=11 cancelled=false
[riskScorer] UA1850 2026-07-23 horizon=short hours_out=-82.7 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA1084" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching CLE (KCLE)
[carrierHealth] cache hit UA
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] CLE cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] BW423 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] BW423 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 11:00Z","local":"2026-07-23 07:00-04:00"},"revisedTime":{"utc":"2026-07-23 10:25Z","local":"2026-07-23 06:25-04:00"},"runwayTime":{"utc":"2026-07-23 10:25Z","local":"2026-07-23 06:25-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] BW423 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 11:00Z","revisedTime":"2026-07-23 10:25Z","runwayTime":"2026-07-23 10:25Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 54min for BW423
[flightStatus] BW423 2026-07-23 status=EnRoute dep_delay=0 inbound_delay=54 cancelled=false
[riskScorer] BW423 2026-07-23 horizon=short hours_out=-87.1 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA3164" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL1994 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1994 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 12:20Z","local":"2026-07-23 08:20-04:00"},"revisedTime":{"utc":"2026-07-23 13:14Z","local":"2026-07-23 09:14-04:00"},"runwayTime":{"utc":"2026-07-23 13:14Z","local":"2026-07-23 09:14-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL1994 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 12:20Z","revisedTime":"2026-07-23 13:14Z","runwayTime":"2026-07-23 13:14Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 54min for DL1994
[flightStatus] computed inbound delay from revisedTime: 23min for DL1994
[flightStatus] DL1994 2026-07-23 status=EnRoute dep_delay=54 inbound_delay=23 cancelled=false
[riskScorer] DL1994 2026-07-23 horizon=short hours_out=-85.8 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL5703" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching BWI (KBWI)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BWI cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[flightStatus] UA1798 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1798 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 14:00Z","local":"2026-07-23 07:00-07:00"},"revisedTime":{"utc":"2026-07-23 14:16Z","local":"2026-07-23 07:16-07:00"},"runwayTime":{"utc":"2026-07-23 14:16Z","local":"2026-07-23 07:16-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA1798 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 14:00Z","revisedTime":"2026-07-23 14:16Z","runwayTime":"2026-07-23 14:16Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for UA1798
[flightStatus] UA1798 2026-07-23 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] UA1798 2026-07-23 horizon=short hours_out=-84.1 raw_total=34 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "PD616" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching YYZ (CYYZ)
[carrierHealth] cache hit PD
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] YYZ cat=VFR vis=15 ceil=10000 ts=false fz=false contrib=2
[flightStatus] UA1084 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1084 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 16:00Z","local":"2026-07-23 09:00-07:00"},"revisedTime":{"utc":"2026-07-23 16:54Z","local":"2026-07-23 09:54-07:00"},"runwayTime":{"utc":"2026-07-23 16:54Z","local":"2026-07-23 09:54-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA1084 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 16:00Z","revisedTime":"2026-07-23 16:54Z","runwayTime":"2026-07-23 16:54Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 54min for UA1084
[flightStatus] computed inbound delay from revisedTime: 11min for UA1084
[flightStatus] UA1084 2026-07-23 status=Arrived dep_delay=54 inbound_delay=11 cancelled=false
[riskScorer] UA1084 2026-07-23 horizon=short hours_out=-82.1 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA1743" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3164 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA3164 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 17:16Z","local":"2026-07-23 10:16-07:00"},"revisedTime":{"utc":"2026-07-23 17:57Z","local":"2026-07-23 10:57-07:00"},"runwayTime":{"utc":"2026-07-23 17:57Z","local":"2026-07-23 10:57-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA3164 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 17:16Z","revisedTime":"2026-07-23 17:57Z","runwayTime":"2026-07-23 17:57Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 41min for AA3164
[flightStatus] AA3164 2026-07-23 status=Arrived dep_delay=41 inbound_delay=0 cancelled=false
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA3164 2026-07-23 horizon=short hours_out=-80.9 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL1564" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] DL5703 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5703 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 10:35Z","local":"2026-07-23 06:35-04:00"},"revisedTime":{"utc":"2026-07-23 10:49Z","local":"2026-07-23 06:49-04:00"},"runwayTime":{"utc":"2026-07-23 10:49Z","local":"2026-07-23 06:49-04:00"},"terminal":"A","runway":"27","quality":["Basic","Live"]}
[flightStatus] DL5703 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 10:35Z","revisedTime":"2026-07-23 10:49Z","runwayTime":"2026-07-23 10:49Z","terminal":"A","runway":"27","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for DL5703
[flightStatus] DL5703 2026-07-23 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[riskScorer] DL5703 2026-07-23 horizon=short hours_out=-87.6 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "KG5745" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching MKG (KMKG)
[carrierHealth] cache hit KG
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] MKG cat=VFR vis=7 ceil=25000 ts=false fz=false contrib=2
[flightStatus] PD616 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] PD616 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 14:05Z","local":"2026-07-23 10:05-04:00"},"revisedTime":{"utc":"2026-07-23 14:32Z","local":"2026-07-23 10:32-04:00"},"runwayTime":{"utc":"2026-07-23 14:32Z","local":"2026-07-23 10:32-04:00"},"terminal":"E","quality":["Basic","Live"]}
[flightStatus] PD616 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 14:05Z","revisedTime":"2026-07-23 14:32Z","runwayTime":"2026-07-23 14:32Z","terminal":"E","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for PD616
[flightStatus] PD616 2026-07-23 status=Arrived dep_delay=27 inbound_delay=0 cancelled=false
[riskScorer] PD616 2026-07-23 horizon=short hours_out=-84.1 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL3507" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching SHV (KSHV)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] SHV cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1743 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA1743 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 16:40Z","local":"2026-07-23 11:40-05:00"},"revisedTime":{"utc":"2026-07-23 16:51Z","local":"2026-07-23 11:51-05:00"},"runwayTime":{"utc":"2026-07-23 16:51Z","local":"2026-07-23 11:51-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1743 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 16:40Z","revisedTime":"2026-07-23 16:51Z","runwayTime":"2026-07-23 16:51Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for AA1743
[flightStatus] computed inbound delay from revisedTime: 158min for AA1743
[flightStatus] AA1743 2026-07-23 status=Arrived dep_delay=11 inbound_delay=158 cancelled=false
[riskScorer] AA1743 2026-07-23 horizon=short hours_out=-81.5 raw_total=56 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL895" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit DL
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL1564 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1564 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 18:00Z","local":"2026-07-23 13:00-05:00"},"revisedTime":{"utc":"2026-07-23 18:18Z","local":"2026-07-23 13:18-05:00"},"runwayTime":{"utc":"2026-07-23 18:18Z","local":"2026-07-23 13:18-05:00"},"terminal":"5","quality":["Basic","Live"]}
[flightStatus] DL1564 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 18:00Z","revisedTime":"2026-07-23 18:18Z","runwayTime":"2026-07-23 18:18Z","terminal":"5","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for DL1564
[flightStatus] DL1564 2026-07-23 status=Arrived dep_delay=18 inbound_delay=0 cancelled=false
[riskScorer] DL1564 2026-07-23 horizon=short hours_out=-80.1 raw_total=34 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "WN194" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching DAL (KDAL)
[carrierHealth] cache hit WN
[weather] DAL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] KG5745 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] KG5745 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 19:15Z","local":"2026-07-23 14:15-05:00"},"revisedTime":{"utc":"2026-07-23 19:51Z","local":"2026-07-23 14:51-05:00"},"runwayTime":{"utc":"2026-07-23 19:51Z","local":"2026-07-23 14:51-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] KG5745 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 19:15Z","revisedTime":"2026-07-23 19:51Z","runwayTime":"2026-07-23 19:51Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for KG5745
[flightStatus] computed inbound delay from revisedTime: 14min for KG5745
[flightStatus] KG5745 2026-07-23 status=Arrived dep_delay=36 inbound_delay=14 cancelled=false
[riskScorer] KG5745 2026-07-23 horizon=short hours_out=-78.9 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL2775" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching MCO (KMCO)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] MCO cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL3507 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3507 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 15:21Z","local":"2026-07-23 11:21-04:00"},"revisedTime":{"utc":"2026-07-23 15:39Z","local":"2026-07-23 11:39-04:00"},"runwayTime":{"utc":"2026-07-23 15:39Z","local":"2026-07-23 11:39-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL3507 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 15:21Z","revisedTime":"2026-07-23 15:39Z","runwayTime":"2026-07-23 15:39Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for DL3507
[flightStatus] DL3507 2026-07-23 status=Arrived dep_delay=18 inbound_delay=0 cancelled=false
[riskScorer] DL3507 2026-07-23 horizon=short hours_out=-82.8 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA4658" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching RDU (KRDU)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] GRR cat=VFR vis=8 ceil=25000 ts=false fz=false contrib=2
[riskScorer] AA3167 2026-07-23 horizon=short hours_out=-84.3 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA1074" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit UA
[weather] RDU cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=67min
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[flightStatus] DL895 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL895 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 16:40Z","local":"2026-07-23 12:40-04:00"},"revisedTime":{"utc":"2026-07-23 16:52Z","local":"2026-07-23 12:52-04:00"},"runwayTime":{"utc":"2026-07-23 16:52Z","local":"2026-07-23 12:52-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL895 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 16:40Z","revisedTime":"2026-07-23 16:52Z","runwayTime":"2026-07-23 16:52Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL895
[flightStatus] DL895 2026-07-23 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] DL895 2026-07-23 horizon=short hours_out=-81.5 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA4008" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching LIT (KLIT)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] WN194 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN194 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 18:10Z","local":"2026-07-23 14:10-04:00"},"revisedTime":{"utc":"2026-07-23 18:33Z","local":"2026-07-23 14:33-04:00"},"runwayTime":{"utc":"2026-07-23 18:33Z","local":"2026-07-23 14:33-04:00"},"terminal":"N","runway":"26L","quality":["Basic","Live"]}
[flightStatus] WN194 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 18:10Z","revisedTime":"2026-07-23 18:33Z","runwayTime":"2026-07-23 18:33Z","terminal":"N","runway":"26L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for WN194
[flightStatus] WN194 2026-07-23 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[riskScorer] WN194 2026-07-23 horizon=short hours_out=-80.0 raw_total=34 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA3274" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching XNA (KXNA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] XNA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LIT cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2775 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2775 dep RAW: {"airport":{"icao":"KMCO","iata":"MCO","name":"Orlando","shortName":"Orlando","municipalityName":"Orlando","location":{"lat":28.4294,"lon":-81.309},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 19:22Z","local":"2026-07-23 15:22-04:00"},"revisedTime":{"utc":"2026-07-23 22:37Z","local":"2026-07-23 18:37-04:00"},"runwayTime":{"utc":"2026-07-23 22:37Z","local":"2026-07-23 18:37-04:00"},"terminal":"B","runway":"17R","quality":["Basic","Live"]}
[flightStatus] DL2775 dep extracted: {"airport":{"icao":"KMCO","iata":"MCO","name":"Orlando","shortName":"Orlando","municipalityName":"Orlando","location":{"lat":28.4294,"lon":-81.309},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 19:22Z","revisedTime":"2026-07-23 22:37Z","runwayTime":"2026-07-23 22:37Z","terminal":"B","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 195min for DL2775
[flightStatus] computed inbound delay from revisedTime: 145min for DL2775
[flightStatus] DL2775 2026-07-23 status=Arrived dep_delay=195 inbound_delay=145 cancelled=false
[riskScorer] DL2775 2026-07-23 horizon=short hours_out=-78.8 raw_total=58 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA499" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching SAT (KSAT)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SAT cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4658 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA4658 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 16:59Z","local":"2026-07-23 12:59-04:00"},"revisedTime":{"utc":"2026-07-23 19:00Z","local":"2026-07-23 15:00-04:00"},"runwayTime":{"utc":"2026-07-23 19:00Z","local":"2026-07-23 15:00-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA4658 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 16:59Z","revisedTime":"2026-07-23 19:00Z","runwayTime":"2026-07-23 19:00Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 121min for AA4658
[flightStatus] computed inbound delay from revisedTime: 82min for AA4658
[flightStatus] AA4658 2026-07-23 status=Arrived dep_delay=121 inbound_delay=82 cancelled=false
[riskScorer] AA4658 2026-07-23 horizon=short hours_out=-81.2 raw_total=56 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA5584" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching PIT (KPIT)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] PIT cat=VFR vis=10 ceil=8500 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] UA1074 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1074 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 15:35Z","local":"2026-07-23 11:35-04:00"},"revisedTime":{"utc":"2026-07-23 16:59Z","local":"2026-07-23 12:59-04:00"},"runwayTime":{"utc":"2026-07-23 16:59Z","local":"2026-07-23 12:59-04:00"},"terminal":"B","runway":"33L","quality":["Basic","Live"]}
[flightStatus] UA1074 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 15:35Z","revisedTime":"2026-07-23 16:59Z","runwayTime":"2026-07-23 16:59Z","terminal":"B","runway":"33L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 84min for UA1074
[flightStatus] computed inbound delay from revisedTime: 38min for UA1074
[flightStatus] UA1074 2026-07-23 status=Arrived dep_delay=84 inbound_delay=38 cancelled=false
[riskScorer] UA1074 2026-07-23 horizon=short hours_out=-82.6 raw_total=73 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":15,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA3458" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching CID (KCID)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] CID cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4008 dep keys: airport,scheduledTime,quality
[flightStatus] AA4008 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 20:43Z","local":"2026-07-23 15:43-05:00"},"quality":["Basic"]}
[flightStatus] AA4008 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 20:43Z","quality":["Basic"]}
[flightStatus] AA4008 2026-07-23 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA4008 2026-07-23 horizon=short hours_out=-77.4 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA987" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching CDG (LFPG)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CDG cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3274 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA3274 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 21:58Z","local":"2026-07-23 16:58-05:00"},"revisedTime":{"utc":"2026-07-23 22:28Z","local":"2026-07-23 17:28-05:00"},"runwayTime":{"utc":"2026-07-23 22:28Z","local":"2026-07-23 17:28-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA3274 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 21:58Z","revisedTime":"2026-07-23 22:28Z","runwayTime":"2026-07-23 22:28Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 30min for AA3274
[flightStatus] AA3274 2026-07-23 status=Arrived dep_delay=30 inbound_delay=0 cancelled=false
[riskScorer] AA3274 2026-07-23 horizon=short hours_out=-76.2 raw_total=36 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL771" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA499 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA499 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 00:56Z","local":"2026-07-23 19:56-05:00"},"revisedTime":{"utc":"2026-07-24 00:56Z","local":"2026-07-23 19:56-05:00"},"runwayTime":{"utc":"2026-07-24 00:56Z","local":"2026-07-23 19:56-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA499 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 00:56Z","revisedTime":"2026-07-24 00:56Z","runwayTime":"2026-07-24 00:56Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 53min for AA499
[flightStatus] AA499 2026-07-23 status=Arrived dep_delay=0 inbound_delay=53 cancelled=false
[riskScorer] AA499 2026-07-23 horizon=short hours_out=-73.2 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "BA282" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching LHR (EGLL)
[carrierHealth] cache hit BA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LHR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA5584 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5584 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 20:46Z","local":"2026-07-23 15:46-05:00"},"revisedTime":{"utc":"2026-07-23 20:55Z","local":"2026-07-23 15:55-05:00"},"runwayTime":{"utc":"2026-07-23 20:55Z","local":"2026-07-23 15:55-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5584 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 20:46Z","revisedTime":"2026-07-23 20:55Z","runwayTime":"2026-07-23 20:55Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for UA5584
[flightStatus] UA5584 2026-07-23 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[riskScorer] UA5584 2026-07-23 horizon=short hours_out=-77.4 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA2221" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching OGG (PHOG)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3458 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3458 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 22:00Z","local":"2026-07-23 17:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3458 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 22:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3458 2026-07-23 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3458 2026-07-23 horizon=short hours_out=-76.1 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA4905" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching ELP (KELP)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ELP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA987 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] UA987 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 00:21Z","local":"2026-07-23 19:21-05:00"},"revisedTime":{"utc":"2026-07-24 00:21Z","local":"2026-07-23 19:21-05:00"},"runwayTime":{"utc":"2026-07-24 00:21Z","local":"2026-07-23 19:21-05:00"},"quality":["Basic","Live"]}
[flightStatus] UA987 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 00:21Z","revisedTime":"2026-07-24 00:21Z","runwayTime":"2026-07-24 00:21Z","quality":["Basic","Live"]}
[flightStatus] UA987 2026-07-23 status=Departed dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA987 2026-07-23 horizon=short hours_out=-73.8 raw_total=13 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL1655" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=67min
[nasStatus] fetched airport-events: 7 airports
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] OGG cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[flightStatus] DL771 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL771 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 21:05Z","local":"2026-07-23 17:05-04:00"},"revisedTime":{"utc":"2026-07-23 21:46Z","local":"2026-07-23 17:46-04:00"},"runwayTime":{"utc":"2026-07-23 21:46Z","local":"2026-07-23 17:46-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL771 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 21:05Z","revisedTime":"2026-07-23 21:46Z","runwayTime":"2026-07-23 21:46Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 41min for DL771
[flightStatus] DL771 2026-07-23 status=Arrived dep_delay=41 inbound_delay=0 cancelled=false
[riskScorer] DL771 2026-07-23 horizon=short hours_out=-77.1 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL5831" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching LGA (KLGA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] BA282 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] BA282 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 22:50Z","local":"2026-07-23 15:50-07:00"},"terminal":"4","quality":["Basic"]}
[flightStatus] BA282 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 22:50Z","terminal":"4","quality":["Basic"]}
[flightStatus] computed inbound delay from revisedTime: 46min for BA282
[flightStatus] BA282 2026-07-23 status=Arrived dep_delay=0 inbound_delay=46 cancelled=false
[riskScorer] BA282 2026-07-23 horizon=short hours_out=-75.3 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA1465" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching LAS (KLAS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA2221 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2221 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-24 00:05Z","local":"2026-07-23 17:05-07:00"},"revisedTime":{"utc":"2026-07-24 00:29Z","local":"2026-07-23 17:29-07:00"},"runwayTime":{"utc":"2026-07-24 00:29Z","local":"2026-07-23 17:29-07:00"},"terminal":"7","quality":["Basic","Live"]}
[flightStatus] UA2221 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-24 00:05Z","revisedTime":"2026-07-24 00:29Z","runwayTime":"2026-07-24 00:29Z","terminal":"7","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 24min for UA2221
[flightStatus] computed inbound delay from revisedTime: 3min for UA2221
[flightStatus] UA2221 2026-07-23 status=EnRoute dep_delay=24 inbound_delay=3 cancelled=false
[riskScorer] UA2221 2026-07-23 horizon=short hours_out=-74.1 raw_total=31 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA5124" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching EAU (KEAU)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] EAU cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4905 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA4905 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-24 01:30Z","local":"2026-07-23 18:30-07:00"},"revisedTime":{"utc":"2026-07-24 01:50Z","local":"2026-07-23 18:50-07:00"},"runwayTime":{"utc":"2026-07-24 01:50Z","local":"2026-07-23 18:50-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA4905 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-24 01:30Z","revisedTime":"2026-07-24 01:50Z","runwayTime":"2026-07-24 01:50Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for AA4905
[flightStatus] computed inbound delay from revisedTime: 2min for AA4905
[flightStatus] AA4905 2026-07-23 status=Arrived dep_delay=20 inbound_delay=2 cancelled=false
[riskScorer] AA4905 2026-07-23 horizon=short hours_out=-72.6 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL495" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[nasStatus] fetched airport-events: 7 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=67min
[flightStatus] DL1655 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1655 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 21:05Z","local":"2026-07-23 17:05-04:00"},"revisedTime":{"utc":"2026-07-23 22:18Z","local":"2026-07-23 18:18-04:00"},"runwayTime":{"utc":"2026-07-23 22:18Z","local":"2026-07-23 18:18-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL1655 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 21:05Z","revisedTime":"2026-07-23 22:18Z","runwayTime":"2026-07-23 22:18Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 73min for DL1655
[flightStatus] computed inbound delay from revisedTime: 21min for DL1655
[flightStatus] DL1655 2026-07-23 status=Arrived dep_delay=73 inbound_delay=21 cancelled=false
[riskScorer] DL1655 2026-07-23 horizon=short hours_out=-77.1 raw_total=77 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":15,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL2269" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching BOS (KBOS)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL5831 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5831 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 22:00Z","local":"2026-07-23 18:00-04:00"},"revisedTime":{"utc":"2026-07-23 23:59Z","local":"2026-07-23 19:59-04:00"},"runwayTime":{"utc":"2026-07-23 23:59Z","local":"2026-07-23 19:59-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5831 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 22:00Z","revisedTime":"2026-07-23 23:59Z","runwayTime":"2026-07-23 23:59Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 119min for DL5831
[flightStatus] computed inbound delay from revisedTime: 72min for DL5831
[flightStatus] DL5831 2026-07-23 status=Arrived dep_delay=119 inbound_delay=72 cancelled=false
[riskScorer] DL5831 2026-07-23 horizon=short hours_out=-76.1 raw_total=60 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL2911" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching MCI (KMCI)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] MCI cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1465 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA1465 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 01:59Z","local":"2026-07-23 20:59-05:00"},"revisedTime":{"utc":"2026-07-24 04:34Z","local":"2026-07-23 23:34-05:00"},"runwayTime":{"utc":"2026-07-24 04:34Z","local":"2026-07-23 23:34-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1465 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 01:59Z","revisedTime":"2026-07-24 04:34Z","runwayTime":"2026-07-24 04:34Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 155min for AA1465
[flightStatus] computed inbound delay from revisedTime: 113min for AA1465
[flightStatus] AA1465 2026-07-23 status=Arrived dep_delay=155 inbound_delay=113 cancelled=false
[riskScorer] AA1465 2026-07-23 horizon=short hours_out=-72.2 raw_total=53 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[rescore] progress: 851/1166
[flightStatus] number lookup "DL5394" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching ITH (KITH)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] ITH cat=VFR vis=7 ceil=7000 ts=false fz=false contrib=2
[flightStatus] UA5124 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5124 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 02:55Z","local":"2026-07-23 21:55-05:00"},"revisedTime":{"utc":"2026-07-24 03:17Z","local":"2026-07-23 22:17-05:00"},"runwayTime":{"utc":"2026-07-24 03:17Z","local":"2026-07-23 22:17-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5124 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 02:55Z","revisedTime":"2026-07-24 03:17Z","runwayTime":"2026-07-24 03:17Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for UA5124
[flightStatus] UA5124 2026-07-23 status=EnRoute dep_delay=22 inbound_delay=0 cancelled=false
[riskScorer] UA5124 2026-07-23 horizon=short hours_out=-71.2 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "PD618" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching YYZ (CYYZ)
[carrierHealth] cache hit PD
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] YYZ cat=VFR vis=15 ceil=10000 ts=false fz=false contrib=2
[flightStatus] DL495 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL495 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 23:47Z","local":"2026-07-23 19:47-04:00"},"revisedTime":{"utc":"2026-07-24 00:48Z","local":"2026-07-23 20:48-04:00"},"runwayTime":{"utc":"2026-07-24 00:48Z","local":"2026-07-23 20:48-04:00"},"terminal":"S","runway":"26L","quality":["Basic","Live"]}
[flightStatus] DL495 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 23:47Z","revisedTime":"2026-07-24 00:48Z","runwayTime":"2026-07-24 00:48Z","terminal":"S","runway":"26L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 61min for DL495
[flightStatus] computed inbound delay from revisedTime: 36min for DL495
[flightStatus] DL495 2026-07-23 status=Arrived dep_delay=61 inbound_delay=36 cancelled=false
[riskScorer] DL495 2026-07-23 horizon=short hours_out=-74.4 raw_total=77 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":15,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA2060" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching EWR (KEWR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] EWR active programs: Arrival Delay, Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2269 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2269 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 01:15Z","local":"2026-07-23 21:15-04:00"},"revisedTime":{"utc":"2026-07-24 02:00Z","local":"2026-07-23 22:00-04:00"},"runwayTime":{"utc":"2026-07-24 02:00Z","local":"2026-07-23 22:00-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2269 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 01:15Z","revisedTime":"2026-07-24 02:00Z","runwayTime":"2026-07-24 02:00Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 45min for DL2269
[flightStatus] computed inbound delay from revisedTime: 12min for DL2269
[flightStatus] DL2269 2026-07-23 status=Arrived dep_delay=45 inbound_delay=12 cancelled=false
[riskScorer] DL2269 2026-07-23 horizon=short hours_out=-72.9 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL5704" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching DCA (KDCA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DCA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] EWR cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL2911 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2911 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 02:48Z","local":"2026-07-23 22:48-04:00"},"revisedTime":{"utc":"2026-07-24 03:01Z","local":"2026-07-23 23:01-04:00"},"runwayTime":{"utc":"2026-07-24 03:01Z","local":"2026-07-23 23:01-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2911 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 02:48Z","revisedTime":"2026-07-24 03:01Z","runwayTime":"2026-07-24 03:01Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for DL2911
[flightStatus] DL2911 2026-07-23 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[riskScorer] DL2911 2026-07-23 horizon=short hours_out=-71.4 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA1949" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=67min
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[flightStatus] DL5394 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5394 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 02:29Z","local":"2026-07-23 22:29-04:00"},"revisedTime":{"utc":"2026-07-24 02:49Z","local":"2026-07-23 22:49-04:00"},"runwayTime":{"utc":"2026-07-24 02:49Z","local":"2026-07-23 22:49-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL5394 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 02:29Z","revisedTime":"2026-07-24 02:49Z","runwayTime":"2026-07-24 02:49Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for DL5394
[flightStatus] DL5394 2026-07-23 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[riskScorer] DL5394 2026-07-23 horizon=short hours_out=-71.7 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA2140" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching MRY (KMRY)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] MRY cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] PD618 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] PD618 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 23:30Z","local":"2026-07-23 19:30-04:00"},"revisedTime":{"utc":"2026-07-24 00:19Z","local":"2026-07-23 20:19-04:00"},"runwayTime":{"utc":"2026-07-24 00:19Z","local":"2026-07-23 20:19-04:00"},"terminal":"E","runway":"09","quality":["Basic","Live"]}
[flightStatus] PD618 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 23:30Z","revisedTime":"2026-07-24 00:19Z","runwayTime":"2026-07-24 00:19Z","terminal":"E","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 49min for PD618
[flightStatus] computed inbound delay from revisedTime: 14min for PD618
[flightStatus] PD618 2026-07-23 status=Arrived dep_delay=49 inbound_delay=14 cancelled=false
[riskScorer] PD618 2026-07-23 horizon=short hours_out=-74.7 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA1902" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching DFW (KDFW)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA2060 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2060 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 00:27Z","local":"2026-07-23 20:27-04:00"},"revisedTime":{"utc":"2026-07-24 00:46Z","local":"2026-07-23 20:46-04:00"},"runwayTime":{"utc":"2026-07-24 00:46Z","local":"2026-07-23 20:46-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] UA2060 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 00:27Z","revisedTime":"2026-07-24 00:46Z","runwayTime":"2026-07-24 00:46Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for UA2060
[flightStatus] UA2060 2026-07-23 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] UA2060 2026-07-23 horizon=short hours_out=-73.7 raw_total=34 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA5589" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching OMA (KOMA)
[carrierHealth] cache hit UA
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL5704 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5704 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 01:48Z","local":"2026-07-23 21:48-04:00"},"revisedTime":{"utc":"2026-07-24 01:54Z","local":"2026-07-23 21:54-04:00"},"runwayTime":{"utc":"2026-07-24 01:54Z","local":"2026-07-23 21:54-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5704 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 01:48Z","revisedTime":"2026-07-24 01:54Z","runwayTime":"2026-07-24 01:54Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 6min for DL5704
[flightStatus] DL5704 2026-07-23 status=Arrived dep_delay=6 inbound_delay=0 cancelled=false
[riskScorer] DL5704 2026-07-23 horizon=short hours_out=-72.4 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL607" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching LAS (KLAS)
[carrierHealth] cache hit DL
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA1949 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA1949 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 12:10Z","local":"2026-07-23 07:10-05:00"},"revisedTime":{"utc":"2026-07-23 12:30Z","local":"2026-07-23 07:30-05:00"},"runwayTime":{"utc":"2026-07-23 12:30Z","local":"2026-07-23 07:30-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA1949 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 12:10Z","revisedTime":"2026-07-23 12:30Z","runwayTime":"2026-07-23 12:30Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for AA1949
[flightStatus] AA1949 2026-07-23 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[riskScorer] AA1949 2026-07-23 horizon=short hours_out=-86.0 raw_total=47 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":15,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AS801" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching HNL (PHNL)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] HNL cat=VFR vis=10 ceil=4700 ts=false fz=false contrib=5
[flightStatus] AA1902 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA1902 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 12:00Z","local":"2026-07-23 07:00-05:00"},"revisedTime":{"utc":"2026-07-23 12:32Z","local":"2026-07-23 07:32-05:00"},"runwayTime":{"utc":"2026-07-23 12:32Z","local":"2026-07-23 07:32-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1902 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 12:00Z","revisedTime":"2026-07-23 12:32Z","runwayTime":"2026-07-23 12:32Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 32min for AA1902
[flightStatus] AA1902 2026-07-23 status=Arrived dep_delay=32 inbound_delay=0 cancelled=false
[riskScorer] AA1902 2026-07-23 horizon=short hours_out=-86.2 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "WN2397" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching HNL (PHNL)
[carrierHealth] cache hit WN
[weather] HNL cat=VFR vis=10 ceil=4700 ts=false fz=false contrib=5
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA2140 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2140 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:15Z","local":"2026-07-23 10:15-05:00"},"revisedTime":{"utc":"2026-07-23 15:29Z","local":"2026-07-23 10:29-05:00"},"runwayTime":{"utc":"2026-07-23 15:29Z","local":"2026-07-23 10:29-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2140 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:15Z","revisedTime":"2026-07-23 15:29Z","runwayTime":"2026-07-23 15:29Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for AA2140
[flightStatus] AA2140 2026-07-23 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[riskScorer] AA2140 2026-07-23 horizon=short hours_out=-82.9 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL1410" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching AUS (KAUS)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] UA5589 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5589 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:25Z","local":"2026-07-23 10:25-05:00"},"revisedTime":{"utc":"2026-07-23 15:39Z","local":"2026-07-23 10:39-05:00"},"runwayTime":{"utc":"2026-07-23 15:39Z","local":"2026-07-23 10:39-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5589 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:25Z","revisedTime":"2026-07-23 15:39Z","runwayTime":"2026-07-23 15:39Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for UA5589
[flightStatus] UA5589 2026-07-23 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[weather] AUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL607 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL607 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 11:00Z","local":"2026-07-23 07:00-04:00"},"revisedTime":{"utc":"2026-07-23 11:20Z","local":"2026-07-23 07:20-04:00"},"runwayTime":{"utc":"2026-07-23 11:20Z","local":"2026-07-23 07:20-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL607 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 11:00Z","revisedTime":"2026-07-23 11:20Z","runwayTime":"2026-07-23 11:20Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for DL607
[flightStatus] DL607 2026-07-23 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[riskScorer] DL607 2026-07-23 horizon=short hours_out=-87.2 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL2279" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit DL
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AS801 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS801 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 14:00Z","local":"2026-07-23 07:00-07:00"},"revisedTime":{"utc":"2026-07-23 14:19Z","local":"2026-07-23 07:19-07:00"},"runwayTime":{"utc":"2026-07-23 14:19Z","local":"2026-07-23 07:19-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS801 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 14:00Z","revisedTime":"2026-07-23 14:19Z","runwayTime":"2026-07-23 14:19Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AS801
[flightStatus] AS801 2026-07-23 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] AS801 2026-07-23 horizon=short hours_out=-84.2 raw_total=34 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL2438" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching SRQ (KSRQ)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] WN2397 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN2397 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 16:00Z","local":"2026-07-23 09:00-07:00"},"revisedTime":{"utc":"2026-07-23 16:10Z","local":"2026-07-23 09:10-07:00"},"runwayTime":{"utc":"2026-07-23 16:10Z","local":"2026-07-23 09:10-07:00"},"terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] WN2397 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 16:00Z","revisedTime":"2026-07-23 16:10Z","runwayTime":"2026-07-23 16:10Z","terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for WN2397
[flightStatus] WN2397 2026-07-23 status=EnRoute dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] WN2397 2026-07-23 horizon=short hours_out=-82.2 raw_total=26 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA4453" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching CLE (KCLE)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] SRQ cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CLE cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL1410 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1410 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 10:30Z","local":"2026-07-23 06:30-04:00"},"revisedTime":{"utc":"2026-07-23 10:55Z","local":"2026-07-23 06:55-04:00"},"runwayTime":{"utc":"2026-07-23 10:55Z","local":"2026-07-23 06:55-04:00"},"terminal":"A","runway":"27","quality":["Basic","Live"]}
[flightStatus] DL1410 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 10:30Z","revisedTime":"2026-07-23 10:55Z","runwayTime":"2026-07-23 10:55Z","terminal":"A","runway":"27","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 25min for DL1410
[flightStatus] computed inbound delay from revisedTime: 1min for DL1410
[flightStatus] DL1410 2026-07-23 status=Arrived dep_delay=25 inbound_delay=1 cancelled=false
[riskScorer] DL1410 2026-07-23 horizon=short hours_out=-87.7 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA4009" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching ILM (KILM)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] ILM cat=MVFR vis=10 ceil=2800 ts=false fz=false contrib=10
[flightStatus] DL2279 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2279 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 15:21Z","local":"2026-07-23 11:21-04:00"},"revisedTime":{"utc":"2026-07-23 15:43Z","local":"2026-07-23 11:43-04:00"},"runwayTime":{"utc":"2026-07-23 15:43Z","local":"2026-07-23 11:43-04:00"},"terminal":"S","runway":"26L","quality":["Basic","Live"]}
[flightStatus] DL2279 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 15:21Z","revisedTime":"2026-07-23 15:43Z","runwayTime":"2026-07-23 15:43Z","terminal":"S","runway":"26L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL2279
[flightStatus] DL2279 2026-07-23 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[riskScorer] DL2279 2026-07-23 horizon=short hours_out=-82.8 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA1363" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2438 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2438 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 16:40Z","local":"2026-07-23 12:40-04:00"},"revisedTime":{"utc":"2026-07-23 16:50Z","local":"2026-07-23 12:50-04:00"},"runwayTime":{"utc":"2026-07-23 16:50Z","local":"2026-07-23 12:50-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2438 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 16:40Z","revisedTime":"2026-07-23 16:50Z","runwayTime":"2026-07-23 16:50Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for DL2438
[flightStatus] DL2438 2026-07-23 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] DL2438 2026-07-23 horizon=short hours_out=-81.5 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AC506" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching YYZ (CYYZ)
[carrierHealth] cache hit AC
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] OMA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] UA5589 2026-07-23 horizon=short hours_out=-82.7 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "WN4208" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching DEN (KDEN)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA4453 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA4453 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 16:59Z","local":"2026-07-23 12:59-04:00"},"revisedTime":{"utc":"2026-07-23 18:55Z","local":"2026-07-23 14:55-04:00"},"runwayTime":{"utc":"2026-07-23 18:55Z","local":"2026-07-23 14:55-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA4453 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 16:59Z","revisedTime":"2026-07-23 18:55Z","runwayTime":"2026-07-23 18:55Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 116min for AA4453
[flightStatus] computed inbound delay from revisedTime: 80min for AA4453
[flightStatus] AA4453 2026-07-23 status=Arrived dep_delay=116 inbound_delay=80 cancelled=false
[riskScorer] AA4453 2026-07-23 horizon=short hours_out=-81.2 raw_total=56 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA3532" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching FWA (KFWA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] FWA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4009 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA4009 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 16:40Z","local":"2026-07-23 11:40-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA4009 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 16:40Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA4009 2026-07-23 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA4009 2026-07-23 horizon=short hours_out=-81.5 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":6,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA2401" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching TPA (KTPA)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] TPA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA1363 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1363 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 18:00Z","local":"2026-07-23 13:00-05:00"},"revisedTime":{"utc":"2026-07-23 18:29Z","local":"2026-07-23 13:29-05:00"},"runwayTime":{"utc":"2026-07-23 18:29Z","local":"2026-07-23 13:29-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1363 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 18:00Z","revisedTime":"2026-07-23 18:29Z","runwayTime":"2026-07-23 18:29Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 29min for UA1363
[flightStatus] UA1363 2026-07-23 status=Arrived dep_delay=29 inbound_delay=0 cancelled=false
[riskScorer] UA1363 2026-07-23 horizon=short hours_out=-80.2 raw_total=34 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL1005" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching DTW (KDTW)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DTW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AC506 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AC506 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 19:15Z","local":"2026-07-23 14:15-05:00"},"revisedTime":{"utc":"2026-07-23 20:09Z","local":"2026-07-23 15:09-05:00"},"runwayTime":{"utc":"2026-07-23 20:09Z","local":"2026-07-23 15:09-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] AC506 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 19:15Z","revisedTime":"2026-07-23 20:09Z","runwayTime":"2026-07-23 20:09Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 54min for AC506
[flightStatus] computed inbound delay from revisedTime: 19min for AC506
[flightStatus] AC506 2026-07-23 status=Arrived dep_delay=54 inbound_delay=19 cancelled=false
[flightStatus] WN4208 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN4208 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 15:35Z","local":"2026-07-23 11:35-04:00"},"revisedTime":{"utc":"2026-07-23 15:55Z","local":"2026-07-23 11:55-04:00"},"runwayTime":{"utc":"2026-07-23 15:55Z","local":"2026-07-23 11:55-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] WN4208 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 15:35Z","revisedTime":"2026-07-23 15:55Z","runwayTime":"2026-07-23 15:55Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for WN4208
[flightStatus] WN4208 2026-07-23 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[weather] YYZ cat=VFR vis=15 ceil=10000 ts=false fz=false contrib=2
[riskScorer] AC506 2026-07-23 horizon=short hours_out=-78.9 raw_total=49 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL472" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit DL
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA3532 dep keys: airport,scheduledTime,quality
[flightStatus] AA3532 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 20:43Z","local":"2026-07-23 15:43-05:00"},"quality":["Basic"]}
[flightStatus] AA3532 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 20:43Z","quality":["Basic"]}
[flightStatus] AA3532 2026-07-23 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3532 2026-07-23 horizon=short hours_out=-77.4 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL836" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching PHX (KPHX)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] PHX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DEN cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[riskScorer] WN4208 2026-07-23 horizon=short hours_out=-82.6 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA110" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching FCO (KFCO)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KFCO: Unexpected end of JSON input
[flightStatus] AA2401 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2401 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 00:37Z","local":"2026-07-23 19:37-05:00"},"revisedTime":{"utc":"2026-07-24 00:37Z","local":"2026-07-23 19:37-05:00"},"runwayTime":{"utc":"2026-07-24 00:47Z","local":"2026-07-23 19:47-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2401 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 00:37Z","revisedTime":"2026-07-24 00:37Z","runwayTime":"2026-07-24 00:47Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from runwayTime: 10min for AA2401
[flightStatus] AA2401 2026-07-23 status=Departed dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] AA2401 2026-07-23 horizon=short hours_out=-73.5 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA3309" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL1005 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1005 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 19:28Z","local":"2026-07-23 15:28-04:00"},"revisedTime":{"utc":"2026-07-23 20:09Z","local":"2026-07-23 16:09-04:00"},"runwayTime":{"utc":"2026-07-23 20:09Z","local":"2026-07-23 16:09-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1005 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 19:28Z","revisedTime":"2026-07-23 20:09Z","runwayTime":"2026-07-23 20:09Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 41min for DL1005
[flightStatus] computed inbound delay from revisedTime: 11min for DL1005
[flightStatus] DL1005 2026-07-23 status=Arrived dep_delay=41 inbound_delay=11 cancelled=false
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL472 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL472 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 20:45Z","local":"2026-07-23 16:45-04:00"},"revisedTime":{"utc":"2026-07-23 21:22Z","local":"2026-07-23 17:22-04:00"},"runwayTime":{"utc":"2026-07-23 21:22Z","local":"2026-07-23 17:22-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL472 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 20:45Z","revisedTime":"2026-07-23 21:22Z","runwayTime":"2026-07-23 21:22Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 37min for DL472
[flightStatus] computed inbound delay from revisedTime: 3min for DL472
[flightStatus] DL472 2026-07-23 status=Arrived dep_delay=37 inbound_delay=3 cancelled=false
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[riskScorer] DL1005 2026-07-23 horizon=short hours_out=-78.7 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL1076" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching MDW (KMDW)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL836 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL836 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 21:59Z","local":"2026-07-23 17:59-04:00"},"revisedTime":{"utc":"2026-07-24 01:02Z","local":"2026-07-23 21:02-04:00"},"runwayTime":{"utc":"2026-07-24 01:02Z","local":"2026-07-23 21:02-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL836 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 21:59Z","revisedTime":"2026-07-24 01:02Z","runwayTime":"2026-07-24 01:02Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 183min for DL836
[flightStatus] computed inbound delay from revisedTime: 143min for DL836
[flightStatus] DL836 2026-07-23 status=Arrived dep_delay=183 inbound_delay=143 cancelled=false
[riskScorer] DL836 2026-07-23 horizon=short hours_out=-76.2 raw_total=60 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL3117" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching JAN (KJAN)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] JAN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[riskScorer] DL472 2026-07-23 horizon=short hours_out=-77.4 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL2457" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching PDX (KPDX)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MDW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA110 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA110 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 22:00Z","local":"2026-07-23 17:00-05:00"},"revisedTime":{"utc":"2026-07-24 00:22Z","local":"2026-07-23 19:22-05:00"},"runwayTime":{"utc":"2026-07-24 00:22Z","local":"2026-07-23 19:22-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA110 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 22:00Z","revisedTime":"2026-07-24 00:22Z","runwayTime":"2026-07-24 00:22Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 142min for AA110
[flightStatus] computed inbound delay from revisedTime: 99min for AA110
[flightStatus] AA110 2026-07-23 status=Arrived dep_delay=142 inbound_delay=99 cancelled=false
[riskScorer] AA110 2026-07-23 horizon=short hours_out=-76.2 raw_total=59 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA4908" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching SMF (KSMF)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SMF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] PDX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3309 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA3309 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 21:05Z","local":"2026-07-23 17:05-04:00"},"revisedTime":{"utc":"2026-07-23 21:13Z","local":"2026-07-23 17:13-04:00"},"runwayTime":{"utc":"2026-07-23 21:13Z","local":"2026-07-23 17:13-04:00"},"terminal":"B","runway":"33L","quality":["Basic","Live"]}
[flightStatus] AA3309 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 21:05Z","revisedTime":"2026-07-23 21:13Z","runwayTime":"2026-07-23 21:13Z","terminal":"B","runway":"33L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 8min for AA3309
[flightStatus] AA3309 2026-07-23 status=Arrived dep_delay=8 inbound_delay=0 cancelled=false
[riskScorer] AA3309 2026-07-23 horizon=short hours_out=-77.1 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA1605" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching BWI (KBWI)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BWI cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[flightStatus] DL1076 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1076 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 01:15Z","local":"2026-07-23 21:15-04:00"},"revisedTime":{"utc":"2026-07-24 02:57Z","local":"2026-07-23 22:57-04:00"},"runwayTime":{"utc":"2026-07-24 02:57Z","local":"2026-07-23 22:57-04:00"},"terminal":"S","runway":"26R","quality":["Basic","Live"]}
[flightStatus] DL1076 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 01:15Z","revisedTime":"2026-07-24 02:57Z","runwayTime":"2026-07-24 02:57Z","terminal":"S","runway":"26R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 102min for DL1076
[flightStatus] computed inbound delay from revisedTime: 72min for DL1076
[flightStatus] DL1076 2026-07-23 status=Arrived dep_delay=102 inbound_delay=72 cancelled=false
[riskScorer] DL1076 2026-07-23 horizon=short hours_out=-72.9 raw_total=53 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "PD2948" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching YTZ (KYTZ)
[carrierHealth] cache hit PD
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KYTZ: Unexpected end of JSON input
[flightStatus] DL3117 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL3117 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 02:48Z","local":"2026-07-23 22:48-04:00"},"revisedTime":{"utc":"2026-07-24 02:56Z","local":"2026-07-23 22:56-04:00"},"runwayTime":{"utc":"2026-07-24 02:56Z","local":"2026-07-23 22:56-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL3117 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 02:48Z","revisedTime":"2026-07-24 02:56Z","runwayTime":"2026-07-24 02:56Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 8min for DL3117
[flightStatus] DL3117 2026-07-23 status=Arrived dep_delay=8 inbound_delay=0 cancelled=false
[riskScorer] DL3117 2026-07-23 horizon=short hours_out=-71.4 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "LX53" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching ZRH (KZRH)
[carrierHealth] cache hit LX
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KZRH: Unexpected end of JSON input
[flightStatus] DL2457 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL2457 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-24 03:00Z","local":"2026-07-23 20:00-07:00"},"revisedTime":{"utc":"2026-07-24 03:17Z","local":"2026-07-23 20:17-07:00"},"runwayTime":{"utc":"2026-07-24 03:17Z","local":"2026-07-23 20:17-07:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] DL2457 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-24 03:00Z","revisedTime":"2026-07-24 03:17Z","runwayTime":"2026-07-24 03:17Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for DL2457
[flightStatus] DL2457 2026-07-23 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] DL2457 2026-07-23 horizon=short hours_out=-71.2 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA2814" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching TPA (KTPA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] TPA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4908 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA4908 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-24 04:44Z","local":"2026-07-23 21:44-07:00"},"revisedTime":{"utc":"2026-07-24 05:03Z","local":"2026-07-23 22:03-07:00"},"runwayTime":{"utc":"2026-07-24 05:03Z","local":"2026-07-23 22:03-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA4908 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-24 04:44Z","revisedTime":"2026-07-24 05:03Z","runwayTime":"2026-07-24 05:03Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AA4908
[flightStatus] AA4908 2026-07-23 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] AA4908 2026-07-23 horizon=short hours_out=-69.4 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "SY513" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching CUN (KCUN)
[carrierHealth] cache hit SY
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KCUN: Unexpected end of JSON input
[flightStatus] UA1605 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1605 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-24 06:05Z","local":"2026-07-23 23:05-07:00"},"revisedTime":{"utc":"2026-07-24 06:54Z","local":"2026-07-23 23:54-07:00"},"runwayTime":{"utc":"2026-07-24 06:54Z","local":"2026-07-23 23:54-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA1605 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-24 06:05Z","revisedTime":"2026-07-24 06:54Z","runwayTime":"2026-07-24 06:54Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 49min for UA1605
[flightStatus] computed inbound delay from revisedTime: 11min for UA1605
[flightStatus] UA1605 2026-07-23 status=Arrived dep_delay=49 inbound_delay=11 cancelled=false
[riskScorer] UA1605 2026-07-23 horizon=short hours_out=-68.1 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA1803" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching DSM (KDSM)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DSM cat=VFR vis=10 ceil=17000 ts=false fz=false contrib=2
[flightStatus] PD2948 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] PD2948 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 00:25Z","local":"2026-07-23 20:25-04:00"},"terminal":"E","quality":["Basic"]}
[flightStatus] PD2948 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 00:25Z","terminal":"E","quality":["Basic"]}
[flightStatus] PD2948 2026-07-23 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] PD2948 2026-07-23 horizon=short hours_out=-73.7 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA5285" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching SBN (KSBN)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SBN cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[flightStatus] LX53 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] LX53 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 01:40Z","local":"2026-07-23 21:40-04:00"},"revisedTime":{"utc":"2026-07-24 02:12Z","local":"2026-07-23 22:12-04:00"},"runwayTime":{"utc":"2026-07-24 02:12Z","local":"2026-07-23 22:12-04:00"},"terminal":"E","quality":["Basic","Live"]}
[flightStatus] LX53 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 01:40Z","revisedTime":"2026-07-24 02:12Z","runwayTime":"2026-07-24 02:12Z","terminal":"E","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 32min for LX53
[flightStatus] computed inbound delay from revisedTime: 15min for LX53
[flightStatus] LX53 2026-07-23 status=Arrived dep_delay=32 inbound_delay=15 cancelled=false
[riskScorer] LX53 2026-07-23 horizon=short hours_out=-72.5 raw_total=36 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL742" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA2814 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2814 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 12:10Z","local":"2026-07-23 07:10-05:00"},"revisedTime":{"utc":"2026-07-23 13:39Z","local":"2026-07-23 08:39-05:00"},"runwayTime":{"utc":"2026-07-23 13:39Z","local":"2026-07-23 08:39-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2814 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 12:10Z","revisedTime":"2026-07-23 13:39Z","runwayTime":"2026-07-23 13:39Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 89min for AA2814
[flightStatus] computed inbound delay from revisedTime: 64min for AA2814
[flightStatus] AA2814 2026-07-23 status=Arrived dep_delay=89 inbound_delay=64 cancelled=false
[riskScorer] AA2814 2026-07-23 horizon=short hours_out=-86.0 raw_total=54 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA2743" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching EWR (KEWR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] EWR active programs: Arrival Delay, Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] EWR cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] SY513 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] SY513 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:15Z","local":"2026-07-23 10:15-05:00"},"revisedTime":{"utc":"2026-07-23 15:34Z","local":"2026-07-23 10:34-05:00"},"runwayTime":{"utc":"2026-07-23 15:34Z","local":"2026-07-23 10:34-05:00"},"terminal":"D","runway":"17R","quality":["Basic","Live"]}
[flightStatus] SY513 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:15Z","revisedTime":"2026-07-23 15:34Z","runwayTime":"2026-07-23 15:34Z","terminal":"D","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for SY513
[flightStatus] SY513 2026-07-23 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] SY513 2026-07-23 horizon=short hours_out=-82.9 raw_total=31 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA2373" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching KOA (PHKO)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] KOA cat=VFR vis=10 ceil=6500 ts=false fz=false contrib=2
[flightStatus] UA1803 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1803 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 13:42Z","local":"2026-07-23 08:42-05:00"},"revisedTime":{"utc":"2026-07-23 14:05Z","local":"2026-07-23 09:05-05:00"},"runwayTime":{"utc":"2026-07-23 14:05Z","local":"2026-07-23 09:05-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1803 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 13:42Z","revisedTime":"2026-07-23 14:05Z","runwayTime":"2026-07-23 14:05Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for UA1803
[flightStatus] UA1803 2026-07-23 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[riskScorer] UA1803 2026-07-23 horizon=short hours_out=-84.5 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA2451" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching IAH (KIAH)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] IAH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA5285 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5285 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:25Z","local":"2026-07-23 10:25-05:00"},"revisedTime":{"utc":"2026-07-23 15:44Z","local":"2026-07-23 10:44-05:00"},"runwayTime":{"utc":"2026-07-23 15:44Z","local":"2026-07-23 10:44-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5285 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:25Z","revisedTime":"2026-07-23 15:44Z","runwayTime":"2026-07-23 15:44Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for UA5285
[flightStatus] UA5285 2026-07-23 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] UA5285 2026-07-23 horizon=short hours_out=-82.7 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA1226" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching EWR (KEWR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] EWR active programs: Arrival Delay, Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] EWR cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL742 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL742 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 11:00Z","local":"2026-07-23 07:00-04:00"},"revisedTime":{"utc":"2026-07-23 11:17Z","local":"2026-07-23 07:17-04:00"},"runwayTime":{"utc":"2026-07-23 11:17Z","local":"2026-07-23 07:17-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL742 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 11:00Z","revisedTime":"2026-07-23 11:17Z","runwayTime":"2026-07-23 11:17Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for DL742
[flightStatus] DL742 2026-07-23 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] DL742 2026-07-23 horizon=short hours_out=-87.2 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA621" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] UA2743 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2743 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 14:00Z","local":"2026-07-23 07:00-07:00"},"revisedTime":{"utc":"2026-07-23 14:09Z","local":"2026-07-23 07:09-07:00"},"runwayTime":{"utc":"2026-07-23 14:09Z","local":"2026-07-23 07:09-07:00"},"terminal":"7","quality":["Basic","Live"]}
[flightStatus] UA2743 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 14:00Z","revisedTime":"2026-07-23 14:09Z","runwayTime":"2026-07-23 14:09Z","terminal":"7","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for UA2743
[flightStatus] UA2743 2026-07-23 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[riskScorer] UA2743 2026-07-23 horizon=short hours_out=-84.2 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL2343" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching DTW (KDTW)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DTW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] UA2373 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA2373 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 16:00Z","local":"2026-07-23 09:00-07:00"},"revisedTime":{"utc":"2026-07-23 16:14Z","local":"2026-07-23 09:14-07:00"},"runwayTime":{"utc":"2026-07-23 16:14Z","local":"2026-07-23 09:14-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA2373 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 16:00Z","revisedTime":"2026-07-23 16:14Z","runwayTime":"2026-07-23 16:14Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for UA2373
[flightStatus] UA2373 2026-07-23 status=EnRoute dep_delay=14 inbound_delay=0 cancelled=false
[riskScorer] UA2373 2026-07-23 horizon=short hours_out=-82.2 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA2314" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching PNS (KPNS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] PNS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA2451 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA2451 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 19:15Z","local":"2026-07-23 14:15-05:00"},"revisedTime":{"utc":"2026-07-23 20:01Z","local":"2026-07-23 15:01-05:00"},"runwayTime":{"utc":"2026-07-23 20:01Z","local":"2026-07-23 15:01-05:00"},"terminal":"1","runway":"22L","quality":["Basic","Live"]}
[flightStatus] UA2451 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 19:15Z","revisedTime":"2026-07-23 20:01Z","runwayTime":"2026-07-23 20:01Z","terminal":"1","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 46min for UA2451
[flightStatus] UA2451 2026-07-23 status=Arrived dep_delay=46 inbound_delay=0 cancelled=false
[riskScorer] UA2451 2026-07-23 horizon=short hours_out=-78.9 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA3843" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching XNA (KXNA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] XNA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] UA1226 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1226 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 16:40Z","local":"2026-07-23 12:40-04:00"},"revisedTime":{"utc":"2026-07-23 16:56Z","local":"2026-07-23 12:56-04:00"},"runwayTime":{"utc":"2026-07-23 16:56Z","local":"2026-07-23 12:56-04:00"},"terminal":"N","runway":"27R","quality":["Basic","Live"]}
[flightStatus] UA1226 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 16:40Z","revisedTime":"2026-07-23 16:56Z","runwayTime":"2026-07-23 16:56Z","terminal":"N","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for UA1226
[flightStatus] UA1226 2026-07-23 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] UA1226 2026-07-23 horizon=short hours_out=-81.5 raw_total=37 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA3717" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching MSN (KMSN)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MSN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA621 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA621 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 18:10Z","local":"2026-07-23 14:10-04:00"},"revisedTime":{"utc":"2026-07-23 18:46Z","local":"2026-07-23 14:46-04:00"},"runwayTime":{"utc":"2026-07-23 18:46Z","local":"2026-07-23 14:46-04:00"},"terminal":"N","runway":"27R","quality":["Basic","Live"]}
[flightStatus] AA621 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 18:10Z","revisedTime":"2026-07-23 18:46Z","runwayTime":"2026-07-23 18:46Z","terminal":"N","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for AA621
[flightStatus] AA621 2026-07-23 status=Arrived dep_delay=36 inbound_delay=0 cancelled=false
[riskScorer] AA621 2026-07-23 horizon=short hours_out=-80.0 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA1967" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL2343 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2343 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 16:59Z","local":"2026-07-23 12:59-04:00"},"revisedTime":{"utc":"2026-07-23 17:21Z","local":"2026-07-23 13:21-04:00"},"runwayTime":{"utc":"2026-07-23 17:21Z","local":"2026-07-23 13:21-04:00"},"terminal":"4","runway":"31L","quality":["Basic","Live"]}
[flightStatus] DL2343 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 16:59Z","revisedTime":"2026-07-23 17:21Z","runwayTime":"2026-07-23 17:21Z","terminal":"4","runway":"31L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL2343
[flightStatus] DL2343 2026-07-23 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[riskScorer] DL2343 2026-07-23 horizon=short hours_out=-81.2 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL708" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching DTW (KDTW)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] DTW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA2314 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2314 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 21:58Z","local":"2026-07-23 16:58-05:00"},"revisedTime":{"utc":"2026-07-24 02:53Z","local":"2026-07-23 21:53-05:00"},"runwayTime":{"utc":"2026-07-24 02:53Z","local":"2026-07-23 21:53-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2314 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 21:58Z","revisedTime":"2026-07-24 02:53Z","runwayTime":"2026-07-24 02:53Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 295min for AA2314
[flightStatus] computed inbound delay from revisedTime: 267min for AA2314
[flightStatus] AA2314 2026-07-23 status=Arrived dep_delay=295 inbound_delay=267 cancelled=false
[riskScorer] AA2314 2026-07-23 horizon=short hours_out=-76.2 raw_total=60 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AC559" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching YVR (CYVR)
[carrierHealth] cache hit AC
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA3843 dep keys: airport,scheduledTime,quality
[flightStatus] AA3843 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 23:30Z","local":"2026-07-23 18:30-05:00"},"quality":["Basic"]}
[flightStatus] AA3843 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 23:30Z","quality":["Basic"]}
[flightStatus] AA3843 2026-07-23 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3843 2026-07-23 horizon=short hours_out=-74.7 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[rescore] progress: 901/1166
[flightStatus] number lookup "AA2661" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching TUS (KTUS)
[carrierHealth] cache hit AA
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] YVR cat=VFR vis=15 ceil=6200 ts=false fz=false contrib=2
[flightStatus] AA3717 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3717 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 22:00Z","local":"2026-07-23 17:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3717 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 22:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3717 2026-07-23 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3717 2026-07-23 horizon=short hours_out=-76.2 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL324" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA1967 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1967 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 23:10Z","local":"2026-07-23 18:10-05:00"},"revisedTime":{"utc":"2026-07-24 00:12Z","local":"2026-07-23 19:12-05:00"},"runwayTime":{"utc":"2026-07-24 00:12Z","local":"2026-07-23 19:12-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1967 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 23:10Z","revisedTime":"2026-07-24 00:12Z","runwayTime":"2026-07-24 00:12Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 62min for UA1967
[flightStatus] computed inbound delay from revisedTime: 6min for UA1967
[flightStatus] UA1967 2026-07-23 status=Arrived dep_delay=62 inbound_delay=6 cancelled=false
[riskScorer] UA1967 2026-07-23 horizon=short hours_out=-75.0 raw_total=60 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA1792" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching DTW (KDTW)
[carrierHealth] cache hit AA
[weather] DTW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] TUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL708 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL708 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 22:50Z","local":"2026-07-23 15:50-07:00"},"revisedTime":{"utc":"2026-07-23 23:02Z","local":"2026-07-23 16:02-07:00"},"runwayTime":{"utc":"2026-07-23 23:02Z","local":"2026-07-23 16:02-07:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] DL708 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 22:50Z","revisedTime":"2026-07-23 23:02Z","runwayTime":"2026-07-23 23:02Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL708
[flightStatus] DL708 2026-07-23 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] DL708 2026-07-23 horizon=short hours_out=-75.3 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "MQ3366" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching ABI (KABI)
[carrierHealth] cache hit MQ
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ABI cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AC559 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AC559 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-24 00:05Z","local":"2026-07-23 17:05-07:00"},"revisedTime":{"utc":"2026-07-24 00:12Z","local":"2026-07-23 17:12-07:00"},"runwayTime":{"utc":"2026-07-24 00:12Z","local":"2026-07-23 17:12-07:00"},"terminal":"6","quality":["Basic","Live"]}
[flightStatus] AC559 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-24 00:05Z","revisedTime":"2026-07-24 00:12Z","runwayTime":"2026-07-24 00:12Z","terminal":"6","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 7min for AC559
[flightStatus] AC559 2026-07-23 status=Arrived dep_delay=7 inbound_delay=0 cancelled=false
[riskScorer] AC559 2026-07-23 horizon=short hours_out=-74.1 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA1851" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching FLL (KFLL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] FLL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2661 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA2661 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 01:59Z","local":"2026-07-23 20:59-05:00"},"revisedTime":{"utc":"2026-07-24 02:10Z","local":"2026-07-23 21:10-05:00"},"runwayTime":{"utc":"2026-07-24 02:10Z","local":"2026-07-23 21:10-05:00"},"terminal":"3","runway":"22L","quality":["Basic","Live"]}
[flightStatus] AA2661 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 01:59Z","revisedTime":"2026-07-24 02:10Z","runwayTime":"2026-07-24 02:10Z","terminal":"3","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for AA2661
[flightStatus] AA2661 2026-07-23 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] AA2661 2026-07-23 horizon=short hours_out=-72.2 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA3092" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching PLS (KPLS)
[carrierHealth] computing AA
[carrierHealth] AA sample=1021 cancelRate=0.140 avgDelay=42.5 healthScore=7 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KPLS: Unexpected end of JSON input
[flightStatus] DL324 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL324 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 23:29Z","local":"2026-07-23 19:29-04:00"},"revisedTime":{"utc":"2026-07-24 00:34Z","local":"2026-07-23 20:34-04:00"},"runwayTime":{"utc":"2026-07-24 00:34Z","local":"2026-07-23 20:34-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL324 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 23:29Z","revisedTime":"2026-07-24 00:34Z","runwayTime":"2026-07-24 00:34Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 65min for DL324
[flightStatus] computed inbound delay from revisedTime: 31min for DL324
[flightStatus] DL324 2026-07-23 status=Arrived dep_delay=65 inbound_delay=31 cancelled=false
[riskScorer] DL324 2026-07-23 horizon=short hours_out=-74.7 raw_total=60 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA1778" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching OMA (KOMA)
[carrierHealth] computing UA
[carrierHealth] UA sample=657 cancelRate=0.040 avgDelay=43.7 healthScore=7 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] OMA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1792 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1792 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 12:10Z","local":"2026-07-23 07:10-05:00"},"revisedTime":{"utc":"2026-07-23 12:34Z","local":"2026-07-23 07:34-05:00"},"runwayTime":{"utc":"2026-07-23 12:34Z","local":"2026-07-23 07:34-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA1792 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 12:10Z","revisedTime":"2026-07-23 12:34Z","runwayTime":"2026-07-23 12:34Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 24min for AA1792
[flightStatus] AA1792 2026-07-23 status=Arrived dep_delay=24 inbound_delay=0 cancelled=false
[riskScorer] AA1792 2026-07-23 horizon=short hours_out=-86.0 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA388" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] MQ3366 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] MQ3366 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 13:53Z","local":"2026-07-23 08:53-05:00"},"revisedTime":{"utc":"2026-07-23 14:18Z","local":"2026-07-23 09:18-05:00"},"runwayTime":{"utc":"2026-07-23 14:18Z","local":"2026-07-23 09:18-05:00"},"quality":["Basic","Live"]}
[flightStatus] MQ3366 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 13:53Z","revisedTime":"2026-07-23 14:18Z","runwayTime":"2026-07-23 14:18Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 25min for MQ3366
[flightStatus] computed inbound delay from revisedTime: 22min for MQ3366
[flightStatus] MQ3366 2026-07-23 status=Arrived dep_delay=25 inbound_delay=22 cancelled=false
[riskScorer] MQ3366 2026-07-23 horizon=short hours_out=-84.3 raw_total=27 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AS21" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA1851 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA1851 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 11:59Z","local":"2026-07-23 06:59-05:00"},"revisedTime":{"utc":"2026-07-23 12:18Z","local":"2026-07-23 07:18-05:00"},"runwayTime":{"utc":"2026-07-23 12:18Z","local":"2026-07-23 07:18-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1851 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 11:59Z","revisedTime":"2026-07-23 12:18Z","runwayTime":"2026-07-23 12:18Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AA1851
[flightStatus] AA1851 2026-07-23 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] AA1851 2026-07-23 horizon=short hours_out=-86.2 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA1136" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching ANU (KANU)
[carrierHealth] cache hit AA
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KANU: Unexpected end of JSON input
[flightStatus] AA3092 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA3092 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:18Z","local":"2026-07-23 10:18-05:00"},"revisedTime":{"utc":"2026-07-23 15:50Z","local":"2026-07-23 10:50-05:00"},"runwayTime":{"utc":"2026-07-23 15:50Z","local":"2026-07-23 10:50-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA3092 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:18Z","revisedTime":"2026-07-23 15:50Z","runwayTime":"2026-07-23 15:50Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 32min for AA3092
[flightStatus] computed inbound delay from revisedTime: 26min for AA3092
[flightStatus] AA3092 2026-07-23 status=Arrived dep_delay=32 inbound_delay=26 cancelled=false
[riskScorer] AA3092 2026-07-23 horizon=short hours_out=-82.9 raw_total=43 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL1318" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching SLC (KSLC)
[carrierHealth] computing DL
[carrierHealth] DL sample=1179 cancelRate=0.025 avgDelay=41.0 healthScore=7 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA1778 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1778 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 13:40Z","local":"2026-07-23 08:40-05:00"},"revisedTime":{"utc":"2026-07-23 13:57Z","local":"2026-07-23 08:57-05:00"},"runwayTime":{"utc":"2026-07-23 13:57Z","local":"2026-07-23 08:57-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1778 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 13:40Z","revisedTime":"2026-07-23 13:57Z","runwayTime":"2026-07-23 13:57Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for UA1778
[flightStatus] UA1778 2026-07-23 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] UA1778 2026-07-23 horizon=short hours_out=-84.5 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "WN2251" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching AUS (KAUS)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] AUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA388 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA388 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:20Z","local":"2026-07-23 10:20-05:00"},"revisedTime":{"utc":"2026-07-23 15:35Z","local":"2026-07-23 10:35-05:00"},"runwayTime":{"utc":"2026-07-23 15:35Z","local":"2026-07-23 10:35-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA388 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:20Z","revisedTime":"2026-07-23 15:35Z","runwayTime":"2026-07-23 15:35Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for AA388
[flightStatus] AA388 2026-07-23 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] AA388 2026-07-23 horizon=short hours_out=-82.8 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA2683" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching SAN (KSAN)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] SLC cat=VFR vis=10 ceil=17000 ts=false fz=false contrib=2
[flightStatus] AS21 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AS21 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 11:00Z","local":"2026-07-23 07:00-04:00"},"revisedTime":{"utc":"2026-07-23 11:16Z","local":"2026-07-23 07:16-04:00"},"runwayTime":{"utc":"2026-07-23 11:16Z","local":"2026-07-23 07:16-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AS21 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 11:00Z","revisedTime":"2026-07-23 11:16Z","runwayTime":"2026-07-23 11:16Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AS21
[flightStatus] AS21 2026-07-23 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] AS21 2026-07-23 horizon=short hours_out=-87.2 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA3225" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] SAN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1136 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA1136 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 12:00Z","local":"2026-07-23 08:00-04:00"},"revisedTime":{"utc":"2026-07-23 13:00Z","local":"2026-07-23 09:00-04:00"},"runwayTime":{"utc":"2026-07-23 13:00Z","local":"2026-07-23 09:00-04:00"},"terminal":"8","runway":"31L","quality":["Basic","Live"]}
[flightStatus] AA1136 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 12:00Z","revisedTime":"2026-07-23 13:00Z","runwayTime":"2026-07-23 13:00Z","terminal":"8","runway":"31L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 60min for AA1136
[flightStatus] computed inbound delay from revisedTime: 41min for AA1136
[flightStatus] AA1136 2026-07-23 status=EnRoute dep_delay=60 inbound_delay=41 cancelled=false
[riskScorer] AA1136 2026-07-23 horizon=short hours_out=-86.2 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "XP394" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching HVN (KHVN)
[carrierHealth] computing XP
[carrierHealth] XP sample=12 cancelRate=0.000 avgDelay=36.0 healthScore=7 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL1318 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1318 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 14:15Z","local":"2026-07-23 07:15-07:00"},"revisedTime":{"utc":"2026-07-23 14:34Z","local":"2026-07-23 07:34-07:00"},"runwayTime":{"utc":"2026-07-23 14:34Z","local":"2026-07-23 07:34-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL1318 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 14:15Z","revisedTime":"2026-07-23 14:34Z","runwayTime":"2026-07-23 14:34Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for DL1318
[flightStatus] DL1318 2026-07-23 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] DL1318 2026-07-23 horizon=short hours_out=-83.9 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL3024" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching JAX (KJAX)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] JAX cat=VFR vis=10 ceil=20000 ts=false fz=false contrib=2
[weather] HVN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN2251 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN2251 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 15:55Z","local":"2026-07-23 08:55-07:00"},"revisedTime":{"utc":"2026-07-23 16:37Z","local":"2026-07-23 09:37-07:00"},"runwayTime":{"utc":"2026-07-23 16:37Z","local":"2026-07-23 09:37-07:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] WN2251 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 15:55Z","revisedTime":"2026-07-23 16:37Z","runwayTime":"2026-07-23 16:37Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 42min for WN2251
[flightStatus] computed inbound delay from revisedTime: 24min for WN2251
[flightStatus] WN2251 2026-07-23 status=Arrived dep_delay=42 inbound_delay=24 cancelled=false
[riskScorer] WN2251 2026-07-23 horizon=short hours_out=-82.3 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AS35" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching SAN (KSAN)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] SAN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA2683 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2683 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 18:00Z","local":"2026-07-23 13:00-05:00"},"revisedTime":{"utc":"2026-07-23 18:50Z","local":"2026-07-23 13:50-05:00"},"runwayTime":{"utc":"2026-07-23 18:50Z","local":"2026-07-23 13:50-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2683 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 18:00Z","revisedTime":"2026-07-23 18:50Z","runwayTime":"2026-07-23 18:50Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 50min for UA2683
[flightStatus] UA2683 2026-07-23 status=Arrived dep_delay=50 inbound_delay=0 cancelled=false
[riskScorer] UA2683 2026-07-23 horizon=short hours_out=-80.2 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL5301" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching RIC (KRIC)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA3225 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA3225 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 13:37Z","local":"2026-07-23 09:37-04:00"},"revisedTime":{"utc":"2026-07-23 14:14Z","local":"2026-07-23 10:14-04:00"},"runwayTime":{"utc":"2026-07-23 14:14Z","local":"2026-07-23 10:14-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AA3225 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 13:37Z","revisedTime":"2026-07-23 14:14Z","runwayTime":"2026-07-23 14:14Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 37min for AA3225
[flightStatus] computed inbound delay from revisedTime: 8min for AA3225
[flightStatus] AA3225 2026-07-23 status=Arrived dep_delay=37 inbound_delay=8 cancelled=false
[riskScorer] AA3225 2026-07-23 horizon=short hours_out=-84.6 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA2864" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching LAS (KLAS)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] XP394 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] XP394 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 15:20Z","local":"2026-07-23 11:20-04:00"},"revisedTime":{"utc":"2026-07-23 15:56Z","local":"2026-07-23 11:56-04:00"},"runwayTime":{"utc":"2026-07-23 15:56Z","local":"2026-07-23 11:56-04:00"},"runway":"27R","quality":["Basic","Live"]}
[flightStatus] XP394 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 15:20Z","revisedTime":"2026-07-23 15:56Z","runwayTime":"2026-07-23 15:56Z","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for XP394
[flightStatus] computed inbound delay from revisedTime: 9min for XP394
[flightStatus] XP394 2026-07-23 status=Arrived dep_delay=36 inbound_delay=9 cancelled=false
[riskScorer] XP394 2026-07-23 horizon=short hours_out=-82.8 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA1951" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching IND (KIND)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] IND cat=VFR vis=10 ceil=6000 ts=false fz=false contrib=2
[flightStatus] DL3024 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3024 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 16:37Z","local":"2026-07-23 12:37-04:00"},"revisedTime":{"utc":"2026-07-23 16:53Z","local":"2026-07-23 12:53-04:00"},"runwayTime":{"utc":"2026-07-23 16:53Z","local":"2026-07-23 12:53-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL3024 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 16:37Z","revisedTime":"2026-07-23 16:53Z","runwayTime":"2026-07-23 16:53Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for DL3024
[flightStatus] DL3024 2026-07-23 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] DL3024 2026-07-23 horizon=short hours_out=-81.6 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA4349" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching DCA (KDCA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] DCA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] RIC cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AS35 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AS35 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 15:30Z","local":"2026-07-23 11:30-04:00"},"revisedTime":{"utc":"2026-07-23 16:53Z","local":"2026-07-23 12:53-04:00"},"runwayTime":{"utc":"2026-07-23 16:53Z","local":"2026-07-23 12:53-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AS35 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 15:30Z","revisedTime":"2026-07-23 16:53Z","runwayTime":"2026-07-23 16:53Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 83min for AS35
[flightStatus] computed inbound delay from revisedTime: 38min for AS35
[flightStatus] AS35 2026-07-23 status=Arrived dep_delay=83 inbound_delay=38 cancelled=false
[riskScorer] AS35 2026-07-23 horizon=short hours_out=-86.7 raw_total=54 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA341" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL5301 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5301 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 18:25Z","local":"2026-07-23 14:25-04:00"},"revisedTime":{"utc":"2026-07-23 20:06Z","local":"2026-07-23 16:06-04:00"},"runwayTime":{"utc":"2026-07-23 20:06Z","local":"2026-07-23 16:06-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL5301 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 18:25Z","revisedTime":"2026-07-23 20:06Z","runwayTime":"2026-07-23 20:06Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 101min for DL5301
[flightStatus] computed inbound delay from revisedTime: 45min for DL5301
[flightStatus] DL5301 2026-07-23 status=Arrived dep_delay=101 inbound_delay=45 cancelled=false
[riskScorer] DL5301 2026-07-23 horizon=short hours_out=-83.8 raw_total=56 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA306" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2864 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2864 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 21:58Z","local":"2026-07-23 16:58-05:00"},"revisedTime":{"utc":"2026-07-23 22:27Z","local":"2026-07-23 17:27-05:00"},"runwayTime":{"utc":"2026-07-23 22:27Z","local":"2026-07-23 17:27-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2864 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 21:58Z","revisedTime":"2026-07-23 22:27Z","runwayTime":"2026-07-23 22:27Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 29min for AA2864
[flightStatus] computed inbound delay from revisedTime: 5min for AA2864
[flightStatus] AA2864 2026-07-23 status=Arrived dep_delay=29 inbound_delay=5 cancelled=false
[riskScorer] AA2864 2026-07-23 horizon=short hours_out=-81.2 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA1170" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching HNL (PHNL)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] HNL cat=VFR vis=10 ceil=4700 ts=false fz=false contrib=5
[flightStatus] AA1951 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA1951 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 22:00Z","local":"2026-07-23 17:00-05:00"},"revisedTime":{"utc":"2026-07-23 22:23Z","local":"2026-07-23 17:23-05:00"},"runwayTime":{"utc":"2026-07-23 22:23Z","local":"2026-07-23 17:23-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1951 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 22:00Z","revisedTime":"2026-07-23 22:23Z","runwayTime":"2026-07-23 22:23Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for AA1951
[flightStatus] AA1951 2026-07-23 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[riskScorer] AA1951 2026-07-23 horizon=short hours_out=-81.2 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA2937" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching FSD (KFSD)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] FSD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4349 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA4349 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 15:33Z","local":"2026-07-23 11:33-04:00"},"revisedTime":{"utc":"2026-07-23 15:59Z","local":"2026-07-23 11:59-04:00"},"runwayTime":{"utc":"2026-07-23 15:59Z","local":"2026-07-23 11:59-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AA4349 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 15:33Z","revisedTime":"2026-07-23 15:59Z","runwayTime":"2026-07-23 15:59Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for AA4349
[flightStatus] AA4349 2026-07-23 status=Arrived dep_delay=26 inbound_delay=0 cancelled=false
[riskScorer] AA4349 2026-07-23 horizon=short hours_out=-86.6 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA3314" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching SMF (KSMF)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] SMF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA341 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA341 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 19:40Z","local":"2026-07-23 15:40-04:00"},"revisedTime":{"utc":"2026-07-23 20:26Z","local":"2026-07-23 16:26-04:00"},"runwayTime":{"utc":"2026-07-23 20:26Z","local":"2026-07-23 16:26-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA341 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 19:40Z","revisedTime":"2026-07-23 20:26Z","runwayTime":"2026-07-23 20:26Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 46min for AA341
[flightStatus] AA341 2026-07-23 status=Arrived dep_delay=46 inbound_delay=0 cancelled=false
[riskScorer] AA341 2026-07-23 horizon=short hours_out=-82.5 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA4065" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching CRP (KCRP)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] CRP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA306 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA306 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 21:00Z","local":"2026-07-23 17:00-04:00"},"revisedTime":{"utc":"2026-07-23 21:41Z","local":"2026-07-23 17:41-04:00"},"runwayTime":{"utc":"2026-07-23 21:41Z","local":"2026-07-23 17:41-04:00"},"terminal":"8","runway":"13R","quality":["Basic","Live"]}
[flightStatus] AA306 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 21:00Z","revisedTime":"2026-07-23 21:41Z","runwayTime":"2026-07-23 21:41Z","terminal":"8","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 41min for AA306
[flightStatus] AA306 2026-07-23 status=Arrived dep_delay=41 inbound_delay=0 cancelled=false
[riskScorer] AA306 2026-07-23 horizon=short hours_out=-81.2 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL2889" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] UA1170 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1170 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-24 00:05Z","local":"2026-07-23 17:05-07:00"},"revisedTime":{"utc":"2026-07-24 00:41Z","local":"2026-07-23 17:41-07:00"},"runwayTime":{"utc":"2026-07-24 00:41Z","local":"2026-07-23 17:41-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA1170 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-24 00:05Z","revisedTime":"2026-07-24 00:41Z","runwayTime":"2026-07-24 00:41Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for UA1170
[flightStatus] computed inbound delay from revisedTime: 11min for UA1170
[flightStatus] UA1170 2026-07-23 status=Arrived dep_delay=36 inbound_delay=11 cancelled=false
[riskScorer] UA1170 2026-07-23 horizon=short hours_out=-81.1 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL1057" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching SRQ (KSRQ)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] SRQ cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2937 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2937 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 00:49Z","local":"2026-07-23 19:49-05:00"},"revisedTime":{"utc":"2026-07-24 04:24Z","local":"2026-07-23 23:24-05:00"},"runwayTime":{"utc":"2026-07-24 04:24Z","local":"2026-07-23 23:24-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2937 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 00:49Z","revisedTime":"2026-07-24 04:24Z","runwayTime":"2026-07-24 04:24Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 215min for AA2937
[flightStatus] computed inbound delay from revisedTime: 200min for AA2937
[flightStatus] AA2937 2026-07-23 status=Arrived dep_delay=215 inbound_delay=200 cancelled=false
[riskScorer] AA2937 2026-07-23 horizon=short hours_out=-78.4 raw_total=58 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL1601" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching IAH (KIAH)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] IAH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA3314 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA3314 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 01:59Z","local":"2026-07-23 20:59-05:00"},"revisedTime":{"utc":"2026-07-24 02:35Z","local":"2026-07-23 21:35-05:00"},"runwayTime":{"utc":"2026-07-24 02:35Z","local":"2026-07-23 21:35-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA3314 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 01:59Z","revisedTime":"2026-07-24 02:35Z","runwayTime":"2026-07-24 02:35Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for AA3314
[flightStatus] computed inbound delay from revisedTime: 3min for AA3314
[flightStatus] AA3314 2026-07-23 status=Arrived dep_delay=36 inbound_delay=3 cancelled=false
[riskScorer] AA3314 2026-07-23 horizon=short hours_out=-77.2 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "MQ3700" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching MFE (KMFE)
[carrierHealth] computing MQ
[carrierHealth] MQ sample=25 cancelRate=0.000 avgDelay=21.2 healthScore=4 reliable=true
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] MFE cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4065 dep keys: airport,scheduledTime,quality
[flightStatus] AA4065 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 03:38Z","local":"2026-07-23 22:38-05:00"},"quality":["Basic"]}
[flightStatus] AA4065 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 03:38Z","quality":["Basic"]}
[flightStatus] AA4065 2026-07-23 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA4065 2026-07-23 horizon=short hours_out=-75.5 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "MQ3968" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching AEX (KAEX)
[carrierHealth] cache hit MQ
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] AEX cat=MVFR vis=4 ceil=99999 ts=false fz=false contrib=10
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2889 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL2889 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 19:40Z","local":"2026-07-23 15:40-04:00"},"revisedTime":{"utc":"2026-07-23 20:04Z","local":"2026-07-23 16:04-04:00"},"runwayTime":{"utc":"2026-07-23 20:04Z","local":"2026-07-23 16:04-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL2889 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 19:40Z","revisedTime":"2026-07-23 20:04Z","runwayTime":"2026-07-23 20:04Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 24min for DL2889
[flightStatus] DL2889 2026-07-23 status=Arrived dep_delay=24 inbound_delay=0 cancelled=false
[riskScorer] DL2889 2026-07-23 horizon=short hours_out=-82.5 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "MQ3958" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching MGM (KMGM)
[carrierHealth] cache hit MQ
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] MGM cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL1057 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1057 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 01:15Z","local":"2026-07-23 21:15-04:00"},"revisedTime":{"utc":"2026-07-24 01:46Z","local":"2026-07-23 21:46-04:00"},"runwayTime":{"utc":"2026-07-24 01:46Z","local":"2026-07-23 21:46-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1057 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 01:15Z","revisedTime":"2026-07-24 01:46Z","runwayTime":"2026-07-24 01:46Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for DL1057
[flightStatus] computed inbound delay from revisedTime: 4min for DL1057
[flightStatus] DL1057 2026-07-23 status=Arrived dep_delay=31 inbound_delay=4 cancelled=false
[riskScorer] DL1057 2026-07-23 horizon=short hours_out=-76.9 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL3128" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching MSY (KMSY)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MSY cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL1601 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1601 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 02:48Z","local":"2026-07-23 22:48-04:00"},"revisedTime":{"utc":"2026-07-24 03:19Z","local":"2026-07-23 23:19-04:00"},"runwayTime":{"utc":"2026-07-24 03:19Z","local":"2026-07-23 23:19-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1601 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 02:48Z","revisedTime":"2026-07-24 03:19Z","runwayTime":"2026-07-24 03:19Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for DL1601
[flightStatus] DL1601 2026-07-23 status=Arrived dep_delay=31 inbound_delay=0 cancelled=false
[riskScorer] DL1601 2026-07-23 horizon=short hours_out=-75.4 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA2218" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching AUS (KAUS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] MQ3700 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] MQ3700 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 12:18Z","local":"2026-07-23 07:18-05:00"},"revisedTime":{"utc":"2026-07-23 12:27Z","local":"2026-07-23 07:27-05:00"},"runwayTime":{"utc":"2026-07-23 12:27Z","local":"2026-07-23 07:27-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] MQ3700 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 12:18Z","revisedTime":"2026-07-23 12:27Z","runwayTime":"2026-07-23 12:27Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for MQ3700
[flightStatus] computed inbound delay from revisedTime: 11min for MQ3700
[flightStatus] MQ3700 2026-07-23 status=Arrived dep_delay=9 inbound_delay=11 cancelled=false
[riskScorer] MQ3700 2026-07-23 horizon=short hours_out=-90.9 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL699" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] MQ3968 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] MQ3968 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 13:56Z","local":"2026-07-23 08:56-05:00"},"revisedTime":{"utc":"2026-07-23 14:02Z","local":"2026-07-23 09:02-05:00"},"runwayTime":{"utc":"2026-07-23 14:02Z","local":"2026-07-23 09:02-05:00"},"quality":["Basic","Live"]}
[flightStatus] MQ3968 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 13:56Z","revisedTime":"2026-07-23 14:02Z","runwayTime":"2026-07-23 14:02Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 6min for MQ3968
[flightStatus] computed inbound delay from revisedTime: 3min for MQ3968
[flightStatus] MQ3968 2026-07-23 status=Arrived dep_delay=6 inbound_delay=3 cancelled=false
[riskScorer] MQ3968 2026-07-23 horizon=short hours_out=-89.2 raw_total=23 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":6,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL3035" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching DAB (KDAB)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] MQ3958 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] MQ3958 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:04Z","local":"2026-07-23 10:04-05:00"},"revisedTime":{"utc":"2026-07-23 15:16Z","local":"2026-07-23 10:16-05:00"},"runwayTime":{"utc":"2026-07-23 15:16Z","local":"2026-07-23 10:16-05:00"},"quality":["Basic","Live"]}
[flightStatus] MQ3958 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:04Z","revisedTime":"2026-07-23 15:16Z","runwayTime":"2026-07-23 15:16Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for MQ3958
[flightStatus] computed inbound delay from revisedTime: 13min for MQ3958
[flightStatus] MQ3958 2026-07-23 status=Arrived dep_delay=12 inbound_delay=13 cancelled=false
[riskScorer] MQ3958 2026-07-23 horizon=short hours_out=-88.1 raw_total=19 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "MQ3606" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching YYZ (CYYZ)
[carrierHealth] cache hit MQ
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] YYZ cat=VFR vis=15 ceil=10000 ts=false fz=false contrib=2
[flightStatus] DL3128 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL3128 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 11:35Z","local":"2026-07-23 07:35-04:00"},"revisedTime":{"utc":"2026-07-23 11:46Z","local":"2026-07-23 07:46-04:00"},"runwayTime":{"utc":"2026-07-23 11:46Z","local":"2026-07-23 07:46-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL3128 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 11:35Z","revisedTime":"2026-07-23 11:46Z","runwayTime":"2026-07-23 11:46Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for DL3128
[flightStatus] DL3128 2026-07-23 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] DL3128 2026-07-23 horizon=short hours_out=-90.6 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL1743" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching TYS (KTYS)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] TYS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] AUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2218 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA2218 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 13:30Z","local":"2026-07-23 08:30-05:00"},"revisedTime":{"utc":"2026-07-23 13:48Z","local":"2026-07-23 08:48-05:00"},"runwayTime":{"utc":"2026-07-23 13:48Z","local":"2026-07-23 08:48-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA2218 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 13:30Z","revisedTime":"2026-07-23 13:48Z","runwayTime":"2026-07-23 13:48Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for AA2218
[flightStatus] AA2218 2026-07-23 status=Arrived dep_delay=18 inbound_delay=0 cancelled=false
[riskScorer] AA2218 2026-07-23 horizon=short hours_out=-89.7 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AS311" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching PDX (KPDX)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DAB cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL699 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL699 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 11:00Z","local":"2026-07-23 07:00-04:00"},"revisedTime":{"utc":"2026-07-23 11:14Z","local":"2026-07-23 07:14-04:00"},"runwayTime":{"utc":"2026-07-23 11:14Z","local":"2026-07-23 07:14-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL699 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 11:00Z","revisedTime":"2026-07-23 11:14Z","runwayTime":"2026-07-23 11:14Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for DL699
[flightStatus] DL699 2026-07-23 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[riskScorer] DL699 2026-07-23 horizon=short hours_out=-91.2 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL5678" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching PIT (KPIT)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] PIT cat=VFR vis=10 ceil=8500 ts=false fz=false contrib=2
[flightStatus] DL3035 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3035 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 12:59Z","local":"2026-07-23 08:59-04:00"},"revisedTime":{"utc":"2026-07-23 13:11Z","local":"2026-07-23 09:11-04:00"},"runwayTime":{"utc":"2026-07-23 13:11Z","local":"2026-07-23 09:11-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL3035 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 12:59Z","revisedTime":"2026-07-23 13:11Z","runwayTime":"2026-07-23 13:11Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL3035
[flightStatus] DL3035 2026-07-23 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] DL3035 2026-07-23 horizon=short hours_out=-89.2 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA662" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching DEN (KDEN)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DEN cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] MQ3606 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] MQ3606 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 14:45Z","local":"2026-07-23 09:45-05:00"},"revisedTime":{"utc":"2026-07-23 15:07Z","local":"2026-07-23 10:07-05:00"},"runwayTime":{"utc":"2026-07-23 15:07Z","local":"2026-07-23 10:07-05:00"},"quality":["Basic","Live"]}
[flightStatus] MQ3606 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 14:45Z","revisedTime":"2026-07-23 15:07Z","runwayTime":"2026-07-23 15:07Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for MQ3606
[flightStatus] computed inbound delay from revisedTime: 8min for MQ3606
[flightStatus] MQ3606 2026-07-23 status=Arrived dep_delay=22 inbound_delay=8 cancelled=false
[riskScorer] MQ3606 2026-07-23 horizon=short hours_out=-88.4 raw_total=26 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA1159" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching CLT (KCLT)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] CLT cat=VFR vis=10 ceil=11000 ts=false fz=false contrib=2
[flightStatus] DL1743 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1743 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 14:10Z","local":"2026-07-23 10:10-04:00"},"revisedTime":{"utc":"2026-07-23 14:27Z","local":"2026-07-23 10:27-04:00"},"runwayTime":{"utc":"2026-07-23 14:27Z","local":"2026-07-23 10:27-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL1743 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 14:10Z","revisedTime":"2026-07-23 14:27Z","runwayTime":"2026-07-23 14:27Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for DL1743
[flightStatus] DL1743 2026-07-23 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] DL1743 2026-07-23 horizon=short hours_out=-88.0 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL3902" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching RNO (KRNO)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] RNO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[flightStatus] AS311 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS311 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 10:03Z","local":"2026-07-23 06:03-04:00"},"revisedTime":{"utc":"2026-07-23 10:44Z","local":"2026-07-23 06:44-04:00"},"runwayTime":{"utc":"2026-07-23 10:44Z","local":"2026-07-23 06:44-04:00"},"terminal":"B","runway":"33L","quality":["Basic","Live"]}
[flightStatus] AS311 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 10:03Z","revisedTime":"2026-07-23 10:44Z","runwayTime":"2026-07-23 10:44Z","terminal":"B","runway":"33L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 41min for AS311
[flightStatus] computed inbound delay from revisedTime: 4min for AS311
[flightStatus] AS311 2026-07-23 status=Arrived dep_delay=41 inbound_delay=4 cancelled=false
[weather] PDX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AS311 2026-07-23 horizon=short hours_out=-92.1 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA503" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching PUJ (KPUJ)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] PUJ cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL5678 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5678 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 12:15Z","local":"2026-07-23 08:15-04:00"},"revisedTime":{"utc":"2026-07-23 12:45Z","local":"2026-07-23 08:45-04:00"},"runwayTime":{"utc":"2026-07-23 12:45Z","local":"2026-07-23 08:45-04:00"},"terminal":"A","runway":"27","quality":["Basic","Live"]}
[flightStatus] DL5678 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 12:15Z","revisedTime":"2026-07-23 12:45Z","runwayTime":"2026-07-23 12:45Z","terminal":"A","runway":"27","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 30min for DL5678
[flightStatus] DL5678 2026-07-23 status=Arrived dep_delay=30 inbound_delay=0 cancelled=false
[riskScorer] DL5678 2026-07-23 horizon=short hours_out=-89.9 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA1685" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching PHX (KPHX)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] PHX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA662 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA662 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 13:40Z","local":"2026-07-23 09:40-04:00"},"revisedTime":{"utc":"2026-07-23 14:15Z","local":"2026-07-23 10:15-04:00"},"runwayTime":{"utc":"2026-07-23 14:15Z","local":"2026-07-23 10:15-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] UA662 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 13:40Z","revisedTime":"2026-07-23 14:15Z","runwayTime":"2026-07-23 14:15Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 35min for UA662
[flightStatus] computed inbound delay from revisedTime: 2min for UA662
[flightStatus] UA662 2026-07-23 status=Arrived dep_delay=35 inbound_delay=2 cancelled=false
[riskScorer] UA662 2026-07-23 horizon=short hours_out=-88.5 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA5420" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching TUL (KTUL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] TUL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1159 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1159 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 18:00Z","local":"2026-07-23 11:00-07:00"},"revisedTime":{"utc":"2026-07-23 18:35Z","local":"2026-07-23 11:35-07:00"},"runwayTime":{"utc":"2026-07-23 18:35Z","local":"2026-07-23 11:35-07:00"},"runway":"24L","quality":["Basic","Live"]}
[flightStatus] AA1159 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 18:00Z","revisedTime":"2026-07-23 18:35Z","runwayTime":"2026-07-23 18:35Z","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 35min for AA1159
[flightStatus] computed inbound delay from revisedTime: 1min for AA1159
[flightStatus] AA1159 2026-07-23 status=Arrived dep_delay=35 inbound_delay=1 cancelled=false
[riskScorer] AA1159 2026-07-23 horizon=short hours_out=-87.2 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA2672" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching PNS (KPNS)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] PNS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL3902 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3902 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 19:58Z","local":"2026-07-23 12:58-07:00"},"revisedTime":{"utc":"2026-07-23 20:02Z","local":"2026-07-23 13:02-07:00"},"runwayTime":{"utc":"2026-07-23 20:02Z","local":"2026-07-23 13:02-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL3902 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 19:58Z","revisedTime":"2026-07-23 20:02Z","runwayTime":"2026-07-23 20:02Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 4min for DL3902
[flightStatus] DL3902 2026-07-23 status=Arrived dep_delay=4 inbound_delay=0 cancelled=false
[riskScorer] DL3902 2026-07-23 horizon=short hours_out=-85.2 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA5437" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching DLH (KDLH)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA503 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA503 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:19Z","local":"2026-07-23 10:19-05:00"},"revisedTime":{"utc":"2026-07-23 16:44Z","local":"2026-07-23 11:44-05:00"},"runwayTime":{"utc":"2026-07-23 16:44Z","local":"2026-07-23 11:44-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA503 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:19Z","revisedTime":"2026-07-23 16:44Z","runwayTime":"2026-07-23 16:44Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 85min for AA503
[flightStatus] computed inbound delay from revisedTime: 59min for AA503
[flightStatus] AA503 2026-07-23 status=EnRoute dep_delay=85 inbound_delay=59 cancelled=false
[riskScorer] AA503 2026-07-23 horizon=short hours_out=-87.9 raw_total=54 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA1746" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching MDT (KMDT)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] MDT cat=VFR vis=10 ceil=11000 ts=false fz=false contrib=2
[flightStatus] AA1685 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA1685 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 17:33Z","local":"2026-07-23 12:33-05:00"},"revisedTime":{"utc":"2026-07-23 17:52Z","local":"2026-07-23 12:52-05:00"},"runwayTime":{"utc":"2026-07-23 17:52Z","local":"2026-07-23 12:52-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA1685 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 17:33Z","revisedTime":"2026-07-23 17:52Z","runwayTime":"2026-07-23 17:52Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AA1685
[flightStatus] AA1685 2026-07-23 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] AA1685 2026-07-23 horizon=short hours_out=-85.6 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[rescore] progress: 951/1166
[flightStatus] number lookup "SY568" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching MSP (KMSP)
[carrierHealth] cache hit SY
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] MSP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA5420 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA5420 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 18:57Z","local":"2026-07-23 13:57-05:00"},"revisedTime":{"utc":"2026-07-23 19:20Z","local":"2026-07-23 14:20-05:00"},"runwayTime":{"utc":"2026-07-23 19:20Z","local":"2026-07-23 14:20-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA5420 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 18:57Z","revisedTime":"2026-07-23 19:20Z","runwayTime":"2026-07-23 19:20Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for AA5420
[flightStatus] AA5420 2026-07-23 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[riskScorer] AA5420 2026-07-23 horizon=short hours_out=-84.2 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL1801" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching MBJ (KMBJ)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] DLH cat=VFR vis=9 ceil=12000 ts=false fz=false contrib=2
[flightStatus] UA2672 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2672 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 15:38Z","local":"2026-07-23 10:38-05:00"},"revisedTime":{"utc":"2026-07-23 16:28Z","local":"2026-07-23 11:28-05:00"},"runwayTime":{"utc":"2026-07-23 16:28Z","local":"2026-07-23 11:28-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2672 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 15:38Z","revisedTime":"2026-07-23 16:28Z","runwayTime":"2026-07-23 16:28Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 50min for UA2672
[flightStatus] UA2672 2026-07-23 status=Arrived dep_delay=50 inbound_delay=0 cancelled=false
[riskScorer] UA2672 2026-07-23 horizon=short hours_out=-87.5 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL2827" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching DAB (KDAB)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] DAB cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA5437 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5437 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 17:59Z","local":"2026-07-23 12:59-05:00"},"revisedTime":{"utc":"2026-07-23 17:59Z","local":"2026-07-23 12:59-05:00"},"runwayTime":{"utc":"2026-07-23 17:59Z","local":"2026-07-23 12:59-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5437 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 17:59Z","revisedTime":"2026-07-23 17:59Z","runwayTime":"2026-07-23 17:59Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5437 2026-07-23 status=Arrived dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA5437 2026-07-23 horizon=short hours_out=-85.2 raw_total=14 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "WN416" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching SAT (KSAT)
[carrierHealth] computing WN
[carrierHealth] WN sample=190 cancelRate=0.000 avgDelay=45.5 healthScore=7 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] SAT cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KMBJ: Unexpected end of JSON input
[flightStatus] UA1746 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1746 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 18:57Z","local":"2026-07-23 13:57-05:00"},"revisedTime":{"utc":"2026-07-23 19:21Z","local":"2026-07-23 14:21-05:00"},"runwayTime":{"utc":"2026-07-23 19:21Z","local":"2026-07-23 14:21-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1746 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 18:57Z","revisedTime":"2026-07-23 19:21Z","runwayTime":"2026-07-23 19:21Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 24min for UA1746
[flightStatus] UA1746 2026-07-23 status=Arrived dep_delay=24 inbound_delay=0 cancelled=false
[riskScorer] UA1746 2026-07-23 horizon=short hours_out=-84.2 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL5668" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching BWI (KBWI)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] SY568 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] SY568 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 15:57Z","local":"2026-07-23 11:57-04:00"},"revisedTime":{"utc":"2026-07-23 16:41Z","local":"2026-07-23 12:41-04:00"},"runwayTime":{"utc":"2026-07-23 16:41Z","local":"2026-07-23 12:41-04:00"},"quality":["Basic","Live"]}
[flightStatus] SY568 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 15:57Z","revisedTime":"2026-07-23 16:41Z","runwayTime":"2026-07-23 16:41Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 44min for SY568
[flightStatus] computed inbound delay from revisedTime: 3min for SY568
[flightStatus] SY568 2026-07-23 status=Arrived dep_delay=44 inbound_delay=3 cancelled=false
[riskScorer] SY568 2026-07-23 horizon=short hours_out=-86.2 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA3043" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL1801 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1801 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 15:15Z","local":"2026-07-23 11:15-04:00"},"revisedTime":{"utc":"2026-07-23 15:24Z","local":"2026-07-23 11:24-04:00"},"runwayTime":{"utc":"2026-07-23 15:24Z","local":"2026-07-23 11:24-04:00"},"terminal":"I","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1801 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 15:15Z","revisedTime":"2026-07-23 15:24Z","runwayTime":"2026-07-23 15:24Z","terminal":"I","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for DL1801
[flightStatus] DL1801 2026-07-23 status=EnRoute dep_delay=9 inbound_delay=0 cancelled=false
[riskScorer] DL1801 2026-07-23 horizon=short hours_out=-86.9 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA4440" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching BUF (KBUF)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] BUF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2827 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2827 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 16:40Z","local":"2026-07-23 12:40-04:00"},"revisedTime":{"utc":"2026-07-23 16:45Z","local":"2026-07-23 12:45-04:00"},"runwayTime":{"utc":"2026-07-23 16:45Z","local":"2026-07-23 12:45-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2827 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 16:40Z","revisedTime":"2026-07-23 16:45Z","runwayTime":"2026-07-23 16:45Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 5min for DL2827
[flightStatus] DL2827 2026-07-23 status=Arrived dep_delay=5 inbound_delay=0 cancelled=false
[riskScorer] DL2827 2026-07-23 horizon=short hours_out=-85.5 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "WN4306" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching DAL (KDAL)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BWI cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[weather] DAL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN416 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN416 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 17:15Z","local":"2026-07-23 13:15-04:00"},"revisedTime":{"utc":"2026-07-23 18:14Z","local":"2026-07-23 14:14-04:00"},"runwayTime":{"utc":"2026-07-23 18:14Z","local":"2026-07-23 14:14-04:00"},"terminal":"N","runway":"26L","quality":["Basic","Live"]}
[flightStatus] WN416 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 17:15Z","revisedTime":"2026-07-23 18:14Z","runwayTime":"2026-07-23 18:14Z","terminal":"N","runway":"26L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 59min for WN416
[flightStatus] computed inbound delay from revisedTime: 29min for WN416
[flightStatus] WN416 2026-07-23 status=Arrived dep_delay=59 inbound_delay=29 cancelled=false
[riskScorer] WN416 2026-07-23 horizon=short hours_out=-84.9 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA5459" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching RDD (KRDD)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL5668 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5668 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 15:10Z","local":"2026-07-23 11:10-04:00"},"revisedTime":{"utc":"2026-07-23 15:51Z","local":"2026-07-23 11:51-04:00"},"runwayTime":{"utc":"2026-07-23 15:51Z","local":"2026-07-23 11:51-04:00"},"terminal":"A","runway":"04R","quality":["Basic","Live"]}
[flightStatus] DL5668 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 15:10Z","revisedTime":"2026-07-23 15:51Z","runwayTime":"2026-07-23 15:51Z","terminal":"A","runway":"04R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 41min for DL5668
[flightStatus] computed inbound delay from revisedTime: 11min for DL5668
[flightStatus] DL5668 2026-07-23 status=Arrived dep_delay=41 inbound_delay=11 cancelled=false
[riskScorer] DL5668 2026-07-23 horizon=short hours_out=-87.0 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL418" 2026-07-23
[weather] fetching LAX (KLAX)
[weather] fetching OGG (PHOG)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] OGG cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[flightStatus] AA3043 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA3043 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 16:38Z","local":"2026-07-23 12:38-04:00"},"revisedTime":{"utc":"2026-07-23 17:09Z","local":"2026-07-23 13:09-04:00"},"runwayTime":{"utc":"2026-07-23 17:09Z","local":"2026-07-23 13:09-04:00"},"terminal":"B","runway":"33L","quality":["Basic","Live"]}
[flightStatus] AA3043 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 16:38Z","revisedTime":"2026-07-23 17:09Z","runwayTime":"2026-07-23 17:09Z","terminal":"B","runway":"33L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for AA3043
[flightStatus] AA3043 2026-07-23 status=Arrived dep_delay=31 inbound_delay=0 cancelled=false
[riskScorer] AA3043 2026-07-23 horizon=short hours_out=-85.5 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA554" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching PHX (KPHX)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] PHX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] RDD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4440 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA4440 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 17:55Z","local":"2026-07-23 13:55-04:00"},"revisedTime":{"utc":"2026-07-23 18:14Z","local":"2026-07-23 14:14-04:00"},"runwayTime":{"utc":"2026-07-23 18:14Z","local":"2026-07-23 14:14-04:00"},"terminal":"B","runway":"33L","quality":["Basic","Live"]}
[flightStatus] AA4440 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 17:55Z","revisedTime":"2026-07-23 18:14Z","runwayTime":"2026-07-23 18:14Z","terminal":"B","runway":"33L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AA4440
[flightStatus] AA4440 2026-07-23 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] AA4440 2026-07-23 horizon=short hours_out=-84.3 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA651" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching SMF (KSMF)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SMF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN4306 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN4306 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 21:55Z","local":"2026-07-23 14:55-07:00"},"revisedTime":{"utc":"2026-07-23 22:52Z","local":"2026-07-23 15:52-07:00"},"runwayTime":{"utc":"2026-07-23 22:52Z","local":"2026-07-23 15:52-07:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] WN4306 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 21:55Z","revisedTime":"2026-07-23 22:52Z","runwayTime":"2026-07-23 22:52Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 57min for WN4306
[flightStatus] computed inbound delay from revisedTime: 45min for WN4306
[flightStatus] WN4306 2026-07-23 status=Arrived dep_delay=57 inbound_delay=45 cancelled=false
[riskScorer] WN4306 2026-07-23 horizon=short hours_out=-83.3 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AV443" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching SAL (KSAL)
[carrierHealth] computing AV
[carrierHealth] AV sample=11 cancelRate=0.000 avgDelay=22.0 healthScore=4 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KSAL: Unexpected end of JSON input
[flightStatus] UA5459 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5459 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 23:55Z","local":"2026-07-23 16:55-07:00"},"revisedTime":{"utc":"2026-07-24 00:10Z","local":"2026-07-23 17:10-07:00"},"runwayTime":{"utc":"2026-07-24 00:10Z","local":"2026-07-23 17:10-07:00"},"terminal":"7","quality":["Basic","Live"]}
[flightStatus] UA5459 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 23:55Z","revisedTime":"2026-07-24 00:10Z","runwayTime":"2026-07-24 00:10Z","terminal":"7","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for UA5459
[flightStatus] UA5459 2026-07-23 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] UA5459 2026-07-23 horizon=short hours_out=-81.3 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA944" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching FRA (EDDF)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] FRA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL418 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL418 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-23 23:55Z","local":"2026-07-23 16:55-07:00"},"revisedTime":{"utc":"2026-07-24 03:03Z","local":"2026-07-23 20:03-07:00"},"runwayTime":{"utc":"2026-07-24 03:03Z","local":"2026-07-23 20:03-07:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] DL418 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-23 23:55Z","revisedTime":"2026-07-24 03:03Z","runwayTime":"2026-07-24 03:03Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 188min for DL418
[flightStatus] computed inbound delay from revisedTime: 163min for DL418
[flightStatus] DL418 2026-07-23 status=Approaching dep_delay=188 inbound_delay=163 cancelled=false
[riskScorer] DL418 2026-07-23 horizon=short hours_out=-81.3 raw_total=58 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA2303" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching BOS (KBOS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA554 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA554 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 20:34Z","local":"2026-07-23 15:34-05:00"},"revisedTime":{"utc":"2026-07-23 20:48Z","local":"2026-07-23 15:48-05:00"},"runwayTime":{"utc":"2026-07-23 20:48Z","local":"2026-07-23 15:48-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA554 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 20:34Z","revisedTime":"2026-07-23 20:48Z","runwayTime":"2026-07-23 20:48Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for AA554
[flightStatus] AA554 2026-07-23 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[riskScorer] AA554 2026-07-23 horizon=short hours_out=-82.6 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA4740" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching MSN (KMSN)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] MSN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA651 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA651 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 21:43Z","local":"2026-07-23 16:43-05:00"},"revisedTime":{"utc":"2026-07-23 22:09Z","local":"2026-07-23 17:09-05:00"},"runwayTime":{"utc":"2026-07-23 22:09Z","local":"2026-07-23 17:09-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA651 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 21:43Z","revisedTime":"2026-07-23 22:09Z","runwayTime":"2026-07-23 22:09Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for AA651
[flightStatus] AA651 2026-07-23 status=Arrived dep_delay=26 inbound_delay=0 cancelled=false
[riskScorer] AA651 2026-07-23 horizon=short hours_out=-81.5 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL738" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AV443 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AV443 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 23:25Z","local":"2026-07-23 18:25-05:00"},"revisedTime":{"utc":"2026-07-23 23:39Z","local":"2026-07-23 18:39-05:00"},"runwayTime":{"utc":"2026-07-23 23:39Z","local":"2026-07-23 18:39-05:00"},"terminal":"D","runway":"18L","quality":["Basic","Live"]}
[flightStatus] AV443 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 23:25Z","revisedTime":"2026-07-23 23:39Z","runwayTime":"2026-07-23 23:39Z","terminal":"D","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for AV443
[flightStatus] computed inbound delay from revisedTime: 14min for AV443
[flightStatus] AV443 2026-07-23 status=EnRoute dep_delay=14 inbound_delay=14 cancelled=false
[riskScorer] AV443 2026-07-23 horizon=short hours_out=-79.8 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA198" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching MXP (KMXP)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KMXP: Unexpected end of JSON input
[flightStatus] UA944 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA944 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 20:10Z","local":"2026-07-23 15:10-05:00"},"revisedTime":{"utc":"2026-07-23 20:45Z","local":"2026-07-23 15:45-05:00"},"runwayTime":{"utc":"2026-07-23 20:45Z","local":"2026-07-23 15:45-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA944 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 20:10Z","revisedTime":"2026-07-23 20:45Z","runwayTime":"2026-07-23 20:45Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 35min for UA944
[flightStatus] UA944 2026-07-23 status=Arrived dep_delay=35 inbound_delay=0 cancelled=false
[riskScorer] UA944 2026-07-23 horizon=short hours_out=-83.0 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL28" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching NCE (KNCE)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA2303 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA2303 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 20:08Z","local":"2026-07-23 15:08-05:00"},"revisedTime":{"utc":"2026-07-23 22:14Z","local":"2026-07-23 17:14-05:00"},"runwayTime":{"utc":"2026-07-23 22:14Z","local":"2026-07-23 17:14-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA2303 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 20:08Z","revisedTime":"2026-07-23 22:14Z","runwayTime":"2026-07-23 22:14Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 126min for AA2303
[flightStatus] computed inbound delay from revisedTime: 75min for AA2303
[flightStatus] AA2303 2026-07-23 status=Arrived dep_delay=126 inbound_delay=75 cancelled=false
[riskScorer] AA2303 2026-07-23 horizon=short hours_out=-83.0 raw_total=56 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA4759" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching ORD (KORD)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KNCE: Unexpected end of JSON input
[flightStatus] UA4740 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA4740 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-23 22:45Z","local":"2026-07-23 17:45-05:00"},"revisedTime":{"utc":"2026-07-23 23:15Z","local":"2026-07-23 18:15-05:00"},"runwayTime":{"utc":"2026-07-23 23:15Z","local":"2026-07-23 18:15-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA4740 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-23 22:45Z","revisedTime":"2026-07-23 23:15Z","runwayTime":"2026-07-23 23:15Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 30min for UA4740
[flightStatus] UA4740 2026-07-23 status=Arrived dep_delay=30 inbound_delay=0 cancelled=false
[riskScorer] UA4740 2026-07-23 horizon=short hours_out=-80.4 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL2128" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching ICT (KICT)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] ICT cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL738 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL738 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 19:05Z","local":"2026-07-23 15:05-04:00"},"revisedTime":{"utc":"2026-07-23 19:54Z","local":"2026-07-23 15:54-04:00"},"runwayTime":{"utc":"2026-07-23 19:54Z","local":"2026-07-23 15:54-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL738 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 19:05Z","revisedTime":"2026-07-23 19:54Z","runwayTime":"2026-07-23 19:54Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 49min for DL738
[flightStatus] computed inbound delay from revisedTime: 7min for DL738
[flightStatus] DL738 2026-07-23 status=Arrived dep_delay=49 inbound_delay=7 cancelled=false
[riskScorer] DL738 2026-07-23 horizon=short hours_out=-83.1 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL2831" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching SDF (KSDF)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] SDF cat=MVFR vis=10 ceil=2100 ts=false fz=false contrib=10
[flightStatus] AA198 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA198 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 23:00Z","local":"2026-07-23 19:00-04:00"},"revisedTime":{"utc":"2026-07-24 00:18Z","local":"2026-07-23 20:18-04:00"},"runwayTime":{"utc":"2026-07-24 00:18Z","local":"2026-07-23 20:18-04:00"},"terminal":"8","runway":"13R","quality":["Basic","Live"]}
[flightStatus] AA198 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 23:00Z","revisedTime":"2026-07-24 00:18Z","runwayTime":"2026-07-24 00:18Z","terminal":"8","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 78min for AA198
[flightStatus] computed inbound delay from revisedTime: 37min for AA198
[flightStatus] AA198 2026-07-23 status=Arrived dep_delay=78 inbound_delay=37 cancelled=false
[riskScorer] AA198 2026-07-23 horizon=short hours_out=-79.2 raw_total=57 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "VJA303" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching MNZ (KMNZ)
[carrierHealth] computing VJA
[carrierHealth] VJA sample=0 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] MNZ cat=VFR vis=8 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL28 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL28 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 22:10Z","local":"2026-07-23 18:10-04:00"},"revisedTime":{"utc":"2026-07-23 22:36Z","local":"2026-07-23 18:36-04:00"},"runwayTime":{"utc":"2026-07-23 22:36Z","local":"2026-07-23 18:36-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL28 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 22:10Z","revisedTime":"2026-07-23 22:36Z","runwayTime":"2026-07-23 22:36Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for DL28
[flightStatus] DL28 2026-07-23 status=Departed dep_delay=26 inbound_delay=0 cancelled=false
[riskScorer] DL28 2026-07-23 horizon=short hours_out=-80.0 raw_total=33 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "PB7668" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching YHZ (KYHZ)
[carrierHealth] computing PB
[carrierHealth] PB sample=0 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KYHZ: Unexpected end of JSON input
[flightStatus] AA4759 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA4759 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 19:27Z","local":"2026-07-23 15:27-04:00"},"revisedTime":{"utc":"2026-07-23 19:45Z","local":"2026-07-23 15:45-04:00"},"runwayTime":{"utc":"2026-07-23 19:45Z","local":"2026-07-23 15:45-04:00"},"terminal":"N","quality":["Basic","Live"]}
[flightStatus] AA4759 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 19:27Z","revisedTime":"2026-07-23 19:45Z","runwayTime":"2026-07-23 19:45Z","terminal":"N","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for AA4759
[flightStatus] AA4759 2026-07-23 status=Arrived dep_delay=18 inbound_delay=0 cancelled=false
[riskScorer] AA4759 2026-07-23 horizon=short hours_out=-82.7 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA2587" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching ORF (KORF)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2128 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL2128 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 20:31Z","local":"2026-07-23 16:31-04:00"},"revisedTime":{"utc":"2026-07-23 20:53Z","local":"2026-07-23 16:53-04:00"},"runwayTime":{"utc":"2026-07-23 20:53Z","local":"2026-07-23 16:53-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL2128 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 20:31Z","revisedTime":"2026-07-23 20:53Z","runwayTime":"2026-07-23 20:53Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL2128
[flightStatus] DL2128 2026-07-23 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[riskScorer] DL2128 2026-07-23 horizon=short hours_out=-81.7 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AS550" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit AS
[weather] ORF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] DL2831 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2831 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 21:59Z","local":"2026-07-23 17:59-04:00"},"revisedTime":{"utc":"2026-07-23 22:10Z","local":"2026-07-23 18:10-04:00"},"runwayTime":{"utc":"2026-07-23 22:10Z","local":"2026-07-23 18:10-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2831 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 21:59Z","revisedTime":"2026-07-23 22:10Z","runwayTime":"2026-07-23 22:10Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for DL2831
[flightStatus] DL2831 2026-07-23 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] DL2831 2026-07-23 horizon=short hours_out=-80.2 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":6,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA3589" 2026-07-23
[weather] fetching DFW (KDFW)
[weather] fetching LRD (KLRD)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] VJA303 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] VJA303 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 23:28Z","local":"2026-07-23 19:28-04:00"},"revisedTime":{"utc":"2026-07-23 23:28Z","local":"2026-07-23 19:28-04:00"},"runwayTime":{"utc":"2026-07-23 23:28Z","local":"2026-07-23 19:28-04:00"},"runway":"09","quality":["Basic","Live"]}
[flightStatus] VJA303 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 23:28Z","revisedTime":"2026-07-23 23:28Z","runwayTime":"2026-07-23 23:28Z","runway":"09","quality":["Basic","Live"]}
[flightStatus] VJA303 2026-07-23 status=Arrived dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] VJA303 2026-07-23 horizon=short hours_out=-80.9 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA4638" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching COS (KCOS)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] COS cat=VFR vis=10 ceil=13000 ts=false fz=false contrib=2
[flightStatus] PB7668 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] PB7668 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 22:30Z","local":"2026-07-23 18:30-04:00"},"revisedTime":{"utc":"2026-07-23 23:36Z","local":"2026-07-23 19:36-04:00"},"runwayTime":{"utc":"2026-07-23 23:36Z","local":"2026-07-23 19:36-04:00"},"quality":["Basic","Live"]}
[flightStatus] PB7668 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 22:30Z","revisedTime":"2026-07-23 23:36Z","runwayTime":"2026-07-23 23:36Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 66min for PB7668
[flightStatus] PB7668 2026-07-23 status=Approaching dep_delay=66 inbound_delay=0 cancelled=false
[riskScorer] PB7668 2026-07-23 horizon=short hours_out=-79.7 raw_total=53 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA2167" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching RDU (KRDU)
[carrierHealth] cache hit AA
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] RDU cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA2587 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2587 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 00:34Z","local":"2026-07-23 19:34-05:00"},"revisedTime":{"utc":"2026-07-24 04:00Z","local":"2026-07-23 23:00-05:00"},"runwayTime":{"utc":"2026-07-24 04:00Z","local":"2026-07-23 23:00-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2587 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 00:34Z","revisedTime":"2026-07-24 04:00Z","runwayTime":"2026-07-24 04:00Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 206min for AA2587
[flightStatus] computed inbound delay from revisedTime: 162min for AA2587
[flightStatus] AA2587 2026-07-23 status=Arrived dep_delay=206 inbound_delay=162 cancelled=false
[riskScorer] AA2587 2026-07-23 horizon=short hours_out=-78.6 raw_total=58 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "LO4" 2026-07-23
[weather] fetching ORD (KORD)
[weather] fetching WAW (KWAW)
[carrierHealth] cache hit LO
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KWAW: Unexpected end of JSON input
[flightStatus] AS550 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS550 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 01:45Z","local":"2026-07-23 20:45-05:00"},"revisedTime":{"utc":"2026-07-24 02:00Z","local":"2026-07-23 21:00-05:00"},"runwayTime":{"utc":"2026-07-24 02:00Z","local":"2026-07-23 21:00-05:00"},"terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] AS550 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 01:45Z","revisedTime":"2026-07-24 02:00Z","runwayTime":"2026-07-24 02:00Z","terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for AS550
[flightStatus] AS550 2026-07-23 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] AS550 2026-07-23 horizon=short hours_out=-77.4 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AF5" 2026-07-23
[weather] fetching JFK (KJFK)
[weather] fetching CDG (LFPG)
[carrierHealth] computing AF
[carrierHealth] AF sample=14 cancelRate=0.000 avgDelay=20.2 healthScore=4 reliable=true
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] CDG cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3589 dep keys: airport,scheduledTime,quality
[flightStatus] AA3589 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 03:34Z","local":"2026-07-23 22:34-05:00"},"quality":["Basic"]}
[flightStatus] AA3589 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 03:34Z","quality":["Basic"]}
[flightStatus] AA3589 2026-07-23 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[flightStatus] UA4638 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA4638 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 00:45Z","local":"2026-07-23 19:45-05:00"},"terminal":"2","quality":["Basic"]}
[flightStatus] UA4638 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 00:45Z","terminal":"2","quality":["Basic"]}
[flightStatus] UA4638 2026-07-23 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] UA4638 2026-07-23 horizon=short hours_out=-78.4 raw_total=58 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "WN233" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching MDW (KMDW)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] MDW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2167 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA2167 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 01:56Z","local":"2026-07-23 20:56-05:00"},"revisedTime":{"utc":"2026-07-24 02:29Z","local":"2026-07-23 21:29-05:00"},"runwayTime":{"utc":"2026-07-24 02:29Z","local":"2026-07-23 21:29-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA2167 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 01:56Z","revisedTime":"2026-07-24 02:29Z","runwayTime":"2026-07-24 02:29Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 33min for AA2167
[flightStatus] AA2167 2026-07-23 status=Arrived dep_delay=33 inbound_delay=0 cancelled=false
[riskScorer] AA2167 2026-07-23 horizon=short hours_out=-77.3 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL5412" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching ABE (KABE)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] ABE cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] LO4 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] LO4 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-24 02:50Z","local":"2026-07-23 21:50-05:00"},"revisedTime":{"utc":"2026-07-24 03:34Z","local":"2026-07-23 22:34-05:00"},"runwayTime":{"utc":"2026-07-24 03:34Z","local":"2026-07-23 22:34-05:00"},"terminal":"5","quality":["Basic","Live"]}
[flightStatus] LO4 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-24 02:50Z","revisedTime":"2026-07-24 03:34Z","runwayTime":"2026-07-24 03:34Z","terminal":"5","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 44min for LO4
[flightStatus] LO4 2026-07-23 status=Arrived dep_delay=44 inbound_delay=0 cancelled=false
[riskScorer] LO4 2026-07-23 horizon=short hours_out=-76.4 raw_total=47 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL2590" 2026-07-23
[weather] fetching ATL (KATL)
[weather] fetching BWI (KBWI)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BWI cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[flightStatus] AF5 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AF5 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 22:30Z","local":"2026-07-23 18:30-04:00"},"revisedTime":{"utc":"2026-07-23 23:25Z","local":"2026-07-23 19:25-04:00"},"runwayTime":{"utc":"2026-07-23 23:25Z","local":"2026-07-23 19:25-04:00"},"terminal":"1","runway":"13R","quality":["Basic","Live"]}
[flightStatus] AF5 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 22:30Z","revisedTime":"2026-07-23 23:25Z","runwayTime":"2026-07-23 23:25Z","terminal":"1","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 55min for AF5
[flightStatus] AF5 2026-07-23 status=Approaching dep_delay=55 inbound_delay=0 cancelled=false
[riskScorer] AF5 2026-07-23 horizon=short hours_out=-79.7 raw_total=43 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL2305" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching DFW (KDFW)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN233 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN233 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 23:35Z","local":"2026-07-23 19:35-04:00"},"revisedTime":{"utc":"2026-07-24 04:10Z","local":"2026-07-24 00:10-04:00"},"runwayTime":{"utc":"2026-07-24 04:10Z","local":"2026-07-24 00:10-04:00"},"terminal":"N","quality":["Basic","Live"]}
[flightStatus] WN233 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 23:35Z","revisedTime":"2026-07-24 04:10Z","runwayTime":"2026-07-24 04:10Z","terminal":"N","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 275min for WN233
[flightStatus] computed inbound delay from revisedTime: 256min for WN233
[flightStatus] WN233 2026-07-23 status=Arrived dep_delay=275 inbound_delay=256 cancelled=false
[riskScorer] WN233 2026-07-23 horizon=short hours_out=-78.6 raw_total=58 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA4047" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching DCA (KDCA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DCA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL5412 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5412 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 00:59Z","local":"2026-07-23 20:59-04:00"},"revisedTime":{"utc":"2026-07-24 01:37Z","local":"2026-07-23 21:37-04:00"},"runwayTime":{"utc":"2026-07-24 01:37Z","local":"2026-07-23 21:37-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL5412 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 00:59Z","revisedTime":"2026-07-24 01:37Z","runwayTime":"2026-07-24 01:37Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 38min for DL5412
[flightStatus] computed inbound delay from revisedTime: 22min for DL5412
[flightStatus] DL5412 2026-07-23 status=Arrived dep_delay=38 inbound_delay=22 cancelled=false
[riskScorer] DL5412 2026-07-23 horizon=short hours_out=-77.2 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "VS158" 2026-07-23
[weather] fetching BOS (KBOS)
[weather] fetching LHR (EGLL)
[carrierHealth] computing VS
[carrierHealth] VS sample=27 cancelRate=0.000 avgDelay=15.3 healthScore=4 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LHR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2590 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2590 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 02:45Z","local":"2026-07-23 22:45-04:00"},"revisedTime":{"utc":"2026-07-24 02:58Z","local":"2026-07-23 22:58-04:00"},"runwayTime":{"utc":"2026-07-24 02:58Z","local":"2026-07-23 22:58-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2590 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 02:45Z","revisedTime":"2026-07-24 02:58Z","runwayTime":"2026-07-24 02:58Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for DL2590
[flightStatus] DL2590 2026-07-23 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[riskScorer] DL2590 2026-07-23 horizon=short hours_out=-75.4 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA1975" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching JAX (KJAX)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2305 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2305 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-23 23:20Z","local":"2026-07-23 19:20-04:00"},"revisedTime":{"utc":"2026-07-24 00:06Z","local":"2026-07-23 20:06-04:00"},"runwayTime":{"utc":"2026-07-24 00:06Z","local":"2026-07-23 20:06-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL2305 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-23 23:20Z","revisedTime":"2026-07-24 00:06Z","runwayTime":"2026-07-24 00:06Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 46min for DL2305
[flightStatus] DL2305 2026-07-23 status=Arrived dep_delay=46 inbound_delay=0 cancelled=false
[riskScorer] DL2305 2026-07-23 horizon=short hours_out=-78.9 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA1911" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching RNO (KRNO)
[carrierHealth] cache hit AA
[weather] JAX cat=VFR vis=10 ceil=20000 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] RNO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[flightStatus] AA4047 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA4047 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 00:22Z","local":"2026-07-23 20:22-04:00"},"terminal":"B","quality":["Basic"]}
[flightStatus] AA4047 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 00:22Z","terminal":"B","quality":["Basic"]}
[flightStatus] AA4047 2026-07-23 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA4047 2026-07-23 horizon=short hours_out=-77.8 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA1492" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching CMH (KCMH)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] CMH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] VS158 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] VS158 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-24 01:30Z","local":"2026-07-23 21:30-04:00"},"revisedTime":{"utc":"2026-07-24 01:36Z","local":"2026-07-23 21:36-04:00"},"runwayTime":{"utc":"2026-07-24 01:36Z","local":"2026-07-23 21:36-04:00"},"terminal":"E","runway":"15R","quality":["Basic","Live"]}
[flightStatus] VS158 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-24 01:30Z","revisedTime":"2026-07-24 01:36Z","runwayTime":"2026-07-24 01:36Z","terminal":"E","runway":"15R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 6min for VS158
[flightStatus] VS158 2026-07-23 status=Arrived dep_delay=6 inbound_delay=0 cancelled=false
[riskScorer] VS158 2026-07-23 horizon=short hours_out=-76.7 raw_total=25 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA1657" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[weather] LRD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA3589 2026-07-23 horizon=short hours_out=-75.6 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA1879" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching SJD (KSJD)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KSJD: Unexpected end of JSON input
[flightStatus] AA1975 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1975 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 12:10Z","local":"2026-07-25 07:10-05:00"},"revisedTime":{"utc":"2026-07-25 12:21Z","local":"2026-07-25 07:21-05:00"},"runwayTime":{"utc":"2026-07-25 12:21Z","local":"2026-07-25 07:21-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1975 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 12:10Z","revisedTime":"2026-07-25 12:21Z","runwayTime":"2026-07-25 12:21Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for AA1975
[flightStatus] AA1975 2026-07-25 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] AA1975 2026-07-25 horizon=short hours_out=-43.0 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA4460" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching ATW (KATW)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] ATW cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA1911 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1911 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 13:50Z","local":"2026-07-25 08:50-05:00"},"revisedTime":{"utc":"2026-07-25 14:13Z","local":"2026-07-25 09:13-05:00"},"runwayTime":{"utc":"2026-07-25 14:13Z","local":"2026-07-25 09:13-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA1911 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 13:50Z","revisedTime":"2026-07-25 14:13Z","runwayTime":"2026-07-25 14:13Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for AA1911
[flightStatus] AA1911 2026-07-25 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[riskScorer] AA1911 2026-07-25 horizon=short hours_out=-41.4 raw_total=31 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AS21" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA1492 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1492 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 15:41Z","local":"2026-07-25 10:41-05:00"},"revisedTime":{"utc":"2026-07-25 15:41Z","local":"2026-07-25 10:41-05:00"},"runwayTime":{"utc":"2026-07-25 15:41Z","local":"2026-07-25 10:41-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1492 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 15:41Z","revisedTime":"2026-07-25 15:41Z","runwayTime":"2026-07-25 15:41Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1492 2026-07-25 status=Arrived dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA1492 2026-07-25 horizon=short hours_out=-40.0 raw_total=14 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL532" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching DEN (KDEN)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] DEN cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] UA1657 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1657 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 12:00Z","local":"2026-07-25 07:00-05:00"},"revisedTime":{"utc":"2026-07-25 12:10Z","local":"2026-07-25 07:10-05:00"},"runwayTime":{"utc":"2026-07-25 12:10Z","local":"2026-07-25 07:10-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1657 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 12:00Z","revisedTime":"2026-07-25 12:10Z","runwayTime":"2026-07-25 12:10Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for UA1657
[flightStatus] UA1657 2026-07-25 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] UA1657 2026-07-25 horizon=short hours_out=-43.2 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA1151" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA1879 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1879 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 13:40Z","local":"2026-07-25 08:40-05:00"},"revisedTime":{"utc":"2026-07-25 14:14Z","local":"2026-07-25 09:14-05:00"},"runwayTime":{"utc":"2026-07-25 14:14Z","local":"2026-07-25 09:14-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1879 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 13:40Z","revisedTime":"2026-07-25 14:14Z","runwayTime":"2026-07-25 14:14Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 34min for UA1879
[flightStatus] UA1879 2026-07-25 status=EnRoute dep_delay=34 inbound_delay=0 cancelled=false
[riskScorer] UA1879 2026-07-25 horizon=short hours_out=-41.5 raw_total=40 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AS482" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] UA4460 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA4460 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 15:25Z","local":"2026-07-25 10:25-05:00"},"revisedTime":{"utc":"2026-07-25 15:40Z","local":"2026-07-25 10:40-05:00"},"runwayTime":{"utc":"2026-07-25 15:40Z","local":"2026-07-25 10:40-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA4460 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 15:25Z","revisedTime":"2026-07-25 15:40Z","runwayTime":"2026-07-25 15:40Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for UA4460
[flightStatus] UA4460 2026-07-25 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] UA4460 2026-07-25 horizon=short hours_out=-39.8 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AS1418" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching GDL (KGDL)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KGDL: Unexpected end of JSON input
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AS21 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AS21 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 11:00Z","local":"2026-07-25 07:00-04:00"},"revisedTime":{"utc":"2026-07-25 11:29Z","local":"2026-07-25 07:29-04:00"},"runwayTime":{"utc":"2026-07-25 11:29Z","local":"2026-07-25 07:29-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AS21 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 11:00Z","revisedTime":"2026-07-25 11:29Z","runwayTime":"2026-07-25 11:29Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 29min for AS21
[flightStatus] AS21 2026-07-25 status=Arrived dep_delay=29 inbound_delay=0 cancelled=false
[riskScorer] AS21 2026-07-25 horizon=short hours_out=-43.2 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AS256" 2026-07-25
[weather] fetching BOS (KBOS)
[weather] fetching SAN (KSAN)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SAN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL532 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL532 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 12:25Z","local":"2026-07-25 08:25-04:00"},"revisedTime":{"utc":"2026-07-25 12:41Z","local":"2026-07-25 08:41-04:00"},"runwayTime":{"utc":"2026-07-25 12:41Z","local":"2026-07-25 08:41-04:00"},"terminal":"4","runway":"04L","quality":["Basic","Live"]}
[flightStatus] DL532 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 12:25Z","revisedTime":"2026-07-25 12:41Z","runwayTime":"2026-07-25 12:41Z","terminal":"4","runway":"04L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for DL532
[flightStatus] DL532 2026-07-25 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] DL532 2026-07-25 horizon=short hours_out=-41.8 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "KG3802" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching GLH (KGLH)
[carrierHealth] cache hit KG
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] GLH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1151 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1151 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 14:02Z","local":"2026-07-25 07:02-07:00"},"revisedTime":{"utc":"2026-07-25 14:21Z","local":"2026-07-25 07:21-07:00"},"runwayTime":{"utc":"2026-07-25 14:21Z","local":"2026-07-25 07:21-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA1151 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 14:02Z","revisedTime":"2026-07-25 14:21Z","runwayTime":"2026-07-25 14:21Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AA1151
[flightStatus] AA1151 2026-07-25 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] AA1151 2026-07-25 horizon=short hours_out=-43.2 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[rescore] progress: 1001/1166
[flightStatus] number lookup "AA1862" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching FLL (KFLL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] FLL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AS482 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS482 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 16:00Z","local":"2026-07-25 09:00-07:00"},"revisedTime":{"utc":"2026-07-25 16:26Z","local":"2026-07-25 09:26-07:00"},"runwayTime":{"utc":"2026-07-25 16:26Z","local":"2026-07-25 09:26-07:00"},"terminal":"6","runway":"24L","quality":["Basic","Live"]}
[flightStatus] AS482 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 16:00Z","revisedTime":"2026-07-25 16:26Z","runwayTime":"2026-07-25 16:26Z","terminal":"6","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for AS482
[flightStatus] AS482 2026-07-25 status=Arrived dep_delay=26 inbound_delay=0 cancelled=false
[riskScorer] AS482 2026-07-25 horizon=short hours_out=-41.2 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA3485" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching CRP (KCRP)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AS1418 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS1418 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 17:18Z","local":"2026-07-25 10:18-07:00"},"revisedTime":{"utc":"2026-07-25 18:11Z","local":"2026-07-25 11:11-07:00"},"runwayTime":{"utc":"2026-07-25 18:11Z","local":"2026-07-25 11:11-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS1418 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 17:18Z","revisedTime":"2026-07-25 18:11Z","runwayTime":"2026-07-25 18:11Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 53min for AS1418
[flightStatus] computed inbound delay from revisedTime: 31min for AS1418
[flightStatus] AS1418 2026-07-25 status=EnRoute dep_delay=53 inbound_delay=31 cancelled=false
[riskScorer] AS1418 2026-07-25 horizon=short hours_out=-39.9 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA2182" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] CRP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AS256 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AS256 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 12:28Z","local":"2026-07-25 08:28-04:00"},"revisedTime":{"utc":"2026-07-25 12:59Z","local":"2026-07-25 08:59-04:00"},"runwayTime":{"utc":"2026-07-25 12:59Z","local":"2026-07-25 08:59-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AS256 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 12:28Z","revisedTime":"2026-07-25 12:59Z","runwayTime":"2026-07-25 12:59Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for AS256
[flightStatus] AS256 2026-07-25 status=Arrived dep_delay=31 inbound_delay=0 cancelled=false
[riskScorer] AS256 2026-07-25 horizon=short hours_out=-41.7 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA3716" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching MSN (KMSN)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] MSN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] KG3802 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] KG3802 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 16:35Z","local":"2026-07-25 11:35-05:00"},"revisedTime":{"utc":"2026-07-25 16:44Z","local":"2026-07-25 11:44-05:00"},"runwayTime":{"utc":"2026-07-25 16:44Z","local":"2026-07-25 11:44-05:00"},"terminal":"D","runway":"17R","quality":["Basic","Live"]}
[flightStatus] KG3802 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 16:35Z","revisedTime":"2026-07-25 16:44Z","runwayTime":"2026-07-25 16:44Z","terminal":"D","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for KG3802
[flightStatus] computed inbound delay from revisedTime: 19min for KG3802
[flightStatus] KG3802 2026-07-25 status=EnRoute dep_delay=9 inbound_delay=19 cancelled=false
[riskScorer] KG3802 2026-07-25 horizon=short hours_out=-38.6 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA2091" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching RDU (KRDU)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] RDU cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA1862 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1862 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 17:45Z","local":"2026-07-25 12:45-05:00"},"revisedTime":{"utc":"2026-07-25 20:02Z","local":"2026-07-25 15:02-05:00"},"runwayTime":{"utc":"2026-07-25 20:02Z","local":"2026-07-25 15:02-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1862 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 17:45Z","revisedTime":"2026-07-25 20:02Z","runwayTime":"2026-07-25 20:02Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 137min for AA1862
[flightStatus] computed inbound delay from revisedTime: 114min for AA1862
[flightStatus] AA1862 2026-07-25 status=Arrived dep_delay=137 inbound_delay=114 cancelled=false
[riskScorer] AA1862 2026-07-25 horizon=short hours_out=-37.4 raw_total=54 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA4834" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching LWB (KLWB)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] LWB cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3485 dep keys: airport,scheduledTime,quality
[flightStatus] AA3485 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 19:25Z","local":"2026-07-25 14:25-05:00"},"quality":["Basic"]}
[flightStatus] AA3485 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 19:25Z","quality":["Basic"]}
[flightStatus] AA3485 2026-07-25 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3485 2026-07-25 horizon=short hours_out=-35.8 raw_total=56 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "IB342" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching MAD (KMAD)
[carrierHealth] computing IB
[carrierHealth] IB sample=0 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KMAD: Unexpected end of JSON input
[flightStatus] UA2182 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2182 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 16:33Z","local":"2026-07-25 11:33-05:00"},"revisedTime":{"utc":"2026-07-25 16:46Z","local":"2026-07-25 11:46-05:00"},"runwayTime":{"utc":"2026-07-25 16:46Z","local":"2026-07-25 11:46-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2182 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 16:33Z","revisedTime":"2026-07-25 16:46Z","runwayTime":"2026-07-25 16:46Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for UA2182
[flightStatus] UA2182 2026-07-25 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[riskScorer] UA2182 2026-07-25 horizon=short hours_out=-38.6 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA1620" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=67min
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[flightStatus] AA3716 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3716 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 18:00Z","local":"2026-07-25 13:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3716 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 18:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3716 2026-07-25 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3716 2026-07-25 horizon=short hours_out=-37.2 raw_total=54 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA516" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching ORD (KORD)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA2091 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2091 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 19:13Z","local":"2026-07-25 14:13-05:00"},"revisedTime":{"utc":"2026-07-25 19:29Z","local":"2026-07-25 14:29-05:00"},"runwayTime":{"utc":"2026-07-25 19:29Z","local":"2026-07-25 14:29-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2091 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 19:13Z","revisedTime":"2026-07-25 19:29Z","runwayTime":"2026-07-25 19:29Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for UA2091
[flightStatus] UA2091 2026-07-25 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[riskScorer] UA2091 2026-07-25 horizon=short hours_out=-36.0 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL3505" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching SHV (KSHV)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA4834 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA4834 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 20:43Z","local":"2026-07-25 15:43-05:00"},"revisedTime":{"utc":"2026-07-25 21:07Z","local":"2026-07-25 16:07-05:00"},"runwayTime":{"utc":"2026-07-25 21:07Z","local":"2026-07-25 16:07-05:00"},"terminal":"3","runway":"22L","quality":["Basic","Live"]}
[flightStatus] AA4834 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 20:43Z","revisedTime":"2026-07-25 21:07Z","runwayTime":"2026-07-25 21:07Z","terminal":"3","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 24min for AA4834
[flightStatus] AA4834 2026-07-25 status=EnRoute dep_delay=24 inbound_delay=0 cancelled=false
[riskScorer] AA4834 2026-07-25 horizon=short hours_out=-34.5 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL315" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching JAC (KJAC)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] JAC cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] IB342 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] IB342 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 21:55Z","local":"2026-07-25 16:55-05:00"},"revisedTime":{"utc":"2026-07-26 00:02Z","local":"2026-07-25 19:02-05:00"},"runwayTime":{"utc":"2026-07-26 00:02Z","local":"2026-07-25 19:02-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] IB342 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 21:55Z","revisedTime":"2026-07-26 00:02Z","runwayTime":"2026-07-26 00:02Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 127min for IB342
[flightStatus] computed inbound delay from revisedTime: 99min for IB342
[flightStatus] IB342 2026-07-25 status=Arrived dep_delay=127 inbound_delay=99 cancelled=false
[riskScorer] IB342 2026-07-25 horizon=short hours_out=-33.3 raw_total=51 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AV211" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching BOG (KBOG)
[carrierHealth] cache hit AV
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] fetch failed for KBOG: Unexpected end of JSON input
[weather] SHV cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1620 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA1620 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 23:09Z","local":"2026-07-25 18:09-05:00"},"revisedTime":{"utc":"2026-07-25 23:33Z","local":"2026-07-25 18:33-05:00"},"runwayTime":{"utc":"2026-07-25 23:33Z","local":"2026-07-25 18:33-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1620 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 23:09Z","revisedTime":"2026-07-25 23:33Z","runwayTime":"2026-07-25 23:33Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 24min for AA1620
[flightStatus] AA1620 2026-07-25 status=Arrived dep_delay=24 inbound_delay=0 cancelled=false
[riskScorer] AA1620 2026-07-25 horizon=short hours_out=-32.0 raw_total=51 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":15,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA1523" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching DEN (KDEN)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DEN cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[flightStatus] UA516 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA516 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 19:30Z","local":"2026-07-25 15:30-04:00"},"revisedTime":{"utc":"2026-07-25 19:51Z","local":"2026-07-25 15:51-04:00"},"runwayTime":{"utc":"2026-07-25 19:51Z","local":"2026-07-25 15:51-04:00"},"terminal":"N","runway":"27R","quality":["Basic","Live"]}
[flightStatus] UA516 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 19:30Z","revisedTime":"2026-07-25 19:51Z","runwayTime":"2026-07-25 19:51Z","terminal":"N","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for UA516
[flightStatus] UA516 2026-07-25 status=Arrived dep_delay=21 inbound_delay=0 cancelled=false
[riskScorer] UA516 2026-07-25 horizon=short hours_out=-34.7 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA3489" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching CVG (KCVG)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CVG cat=VFR vis=10 ceil=6000 ts=false fz=false contrib=2
[flightStatus] DL3505 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL3505 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 20:45Z","local":"2026-07-25 16:45-04:00"},"revisedTime":{"utc":"2026-07-25 20:54Z","local":"2026-07-25 16:54-04:00"},"runwayTime":{"utc":"2026-07-25 20:54Z","local":"2026-07-25 16:54-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL3505 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 20:45Z","revisedTime":"2026-07-25 20:54Z","runwayTime":"2026-07-25 20:54Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for DL3505
[flightStatus] DL3505 2026-07-25 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[riskScorer] DL3505 2026-07-25 horizon=short hours_out=-33.4 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA3451" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching CHA (KCHA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CHA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL315 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL315 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 22:10Z","local":"2026-07-25 18:10-04:00"},"revisedTime":{"utc":"2026-07-25 22:53Z","local":"2026-07-25 18:53-04:00"},"runwayTime":{"utc":"2026-07-25 22:53Z","local":"2026-07-25 18:53-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL315 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 22:10Z","revisedTime":"2026-07-25 22:53Z","runwayTime":"2026-07-25 22:53Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 43min for DL315
[flightStatus] computed inbound delay from revisedTime: 11min for DL315
[flightStatus] DL315 2026-07-25 status=EnRoute dep_delay=43 inbound_delay=11 cancelled=false
[riskScorer] DL315 2026-07-25 horizon=short hours_out=-32.0 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA3275" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching XNA (KXNA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] XNA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AV211 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AV211 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 19:35Z","local":"2026-07-25 15:35-04:00"},"revisedTime":{"utc":"2026-07-25 19:50Z","local":"2026-07-25 15:50-04:00"},"runwayTime":{"utc":"2026-07-25 19:50Z","local":"2026-07-25 15:50-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] AV211 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 19:35Z","revisedTime":"2026-07-25 19:50Z","runwayTime":"2026-07-25 19:50Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for AV211
[flightStatus] AV211 2026-07-25 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] AV211 2026-07-25 horizon=short hours_out=-34.6 raw_total=20 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA1484" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching MCI (KMCI)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1523 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1523 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 12:05Z","local":"2026-07-25 07:05-05:00"},"revisedTime":{"utc":"2026-07-25 12:22Z","local":"2026-07-25 07:22-05:00"},"runwayTime":{"utc":"2026-07-25 12:22Z","local":"2026-07-25 07:22-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA1523 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 12:05Z","revisedTime":"2026-07-25 12:22Z","runwayTime":"2026-07-25 12:22Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for AA1523
[flightStatus] AA1523 2026-07-25 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] AA1523 2026-07-25 horizon=short hours_out=-43.1 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AS801" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching HNL (PHNL)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA3489 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3489 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 11:59Z","local":"2026-07-25 06:59-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3489 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 11:59Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3489 2026-07-25 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3489 2026-07-25 horizon=short hours_out=-43.2 raw_total=53 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA4643" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching SAN (KSAN)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] MCI cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SAN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3451 dep keys: airport,scheduledTime,quality
[flightStatus] AA3451 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 13:40Z","local":"2026-07-25 08:40-05:00"},"quality":["Basic"]}
[flightStatus] AA3451 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 13:40Z","quality":["Basic"]}
[flightStatus] AA3451 2026-07-25 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3451 2026-07-25 horizon=short hours_out=-41.5 raw_total=53 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL1410" 2026-07-25
[weather] fetching BOS (KBOS)
[weather] fetching AUS (KAUS)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] AUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] HNL cat=VFR vis=10 ceil=4700 ts=false fz=false contrib=5
[flightStatus] AA3275 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA3275 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 15:04Z","local":"2026-07-25 10:04-05:00"},"revisedTime":{"utc":"2026-07-25 15:16Z","local":"2026-07-25 10:16-05:00"},"runwayTime":{"utc":"2026-07-25 15:16Z","local":"2026-07-25 10:16-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA3275 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 15:04Z","revisedTime":"2026-07-25 15:16Z","runwayTime":"2026-07-25 15:16Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for AA3275
[flightStatus] AA3275 2026-07-25 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] AA3275 2026-07-25 horizon=short hours_out=-40.1 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL1683" 2026-07-25
[weather] fetching BOS (KBOS)
[weather] fetching BZN (KBZN)
[carrierHealth] cache hit DL
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BZN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA1484 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1484 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 13:40Z","local":"2026-07-25 08:40-05:00"},"revisedTime":{"utc":"2026-07-25 13:53Z","local":"2026-07-25 08:53-05:00"},"runwayTime":{"utc":"2026-07-25 13:53Z","local":"2026-07-25 08:53-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1484 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 13:40Z","revisedTime":"2026-07-25 13:53Z","runwayTime":"2026-07-25 13:53Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for UA1484
[flightStatus] UA1484 2026-07-25 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[riskScorer] UA1484 2026-07-25 horizon=short hours_out=-41.5 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AM641" 2026-07-25
[weather] fetching BOS (KBOS)
[weather] fetching MEX (MMMX)
[carrierHealth] computing AM
[carrierHealth] AM sample=10 cancelRate=0.000 avgDelay=32.3 healthScore=7 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MEX cat=VFR vis=8 ceil=8000 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AS801 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS801 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 14:00Z","local":"2026-07-25 07:00-07:00"},"revisedTime":{"utc":"2026-07-25 14:46Z","local":"2026-07-25 07:46-07:00"},"runwayTime":{"utc":"2026-07-25 14:46Z","local":"2026-07-25 07:46-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS801 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 14:00Z","revisedTime":"2026-07-25 14:46Z","runwayTime":"2026-07-25 14:46Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 46min for AS801
[flightStatus] computed inbound delay from revisedTime: 10min for AS801
[flightStatus] AS801 2026-07-25 status=Arrived dep_delay=46 inbound_delay=10 cancelled=false
[riskScorer] AS801 2026-07-25 horizon=short hours_out=-43.2 raw_total=43 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA1894" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching GSO (KGSO)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] GSO cat=VFR vis=10 ceil=5000 ts=false fz=false contrib=2
[flightStatus] UA4643 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA4643 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 16:00Z","local":"2026-07-25 09:00-07:00"},"terminal":"7","quality":["Basic"]}
[flightStatus] UA4643 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 16:00Z","terminal":"7","quality":["Basic"]}
[flightStatus] UA4643 2026-07-25 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] UA4643 2026-07-25 horizon=short hours_out=-41.2 raw_total=53 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL295" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching HND (RJTT)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL1410 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1410 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 10:30Z","local":"2026-07-25 06:30-04:00"},"revisedTime":{"utc":"2026-07-25 10:53Z","local":"2026-07-25 06:53-04:00"},"runwayTime":{"utc":"2026-07-25 10:53Z","local":"2026-07-25 06:53-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL1410 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 10:30Z","revisedTime":"2026-07-25 10:53Z","runwayTime":"2026-07-25 10:53Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for DL1410
[flightStatus] DL1410 2026-07-25 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[riskScorer] DL1410 2026-07-25 horizon=short hours_out=-43.7 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL2974" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching CUN (KCUN)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] fetch failed for KCUN: Unexpected end of JSON input
[weather] HND cat=VFR vis=10 ceil=4000 ts=false fz=false contrib=2
[flightStatus] DL1683 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1683 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 12:15Z","local":"2026-07-25 08:15-04:00"},"revisedTime":{"utc":"2026-07-25 12:25Z","local":"2026-07-25 08:25-04:00"},"runwayTime":{"utc":"2026-07-25 12:25Z","local":"2026-07-25 08:25-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL1683 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 12:15Z","revisedTime":"2026-07-25 12:25Z","runwayTime":"2026-07-25 12:25Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for DL1683
[flightStatus] DL1683 2026-07-25 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] DL1683 2026-07-25 horizon=short hours_out=-41.9 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "MS986" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching CAI (KCAI)
[carrierHealth] cache hit MS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AM641 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AM641 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 13:55Z","local":"2026-07-25 09:55-04:00"},"revisedTime":{"utc":"2026-07-25 14:15Z","local":"2026-07-25 10:15-04:00"},"runwayTime":{"utc":"2026-07-25 14:15Z","local":"2026-07-25 10:15-04:00"},"terminal":"E","quality":["Basic","Live"]}
[flightStatus] AM641 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 13:55Z","revisedTime":"2026-07-25 14:15Z","runwayTime":"2026-07-25 14:15Z","terminal":"E","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for AM641
[flightStatus] AM641 2026-07-25 status=EnRoute dep_delay=20 inbound_delay=0 cancelled=false
[riskScorer] AM641 2026-07-25 horizon=short hours_out=-40.3 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL802" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching DTW (KDTW)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DTW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA1894 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1894 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 19:25Z","local":"2026-07-25 14:25-05:00"},"revisedTime":{"utc":"2026-07-25 19:47Z","local":"2026-07-25 14:47-05:00"},"runwayTime":{"utc":"2026-07-25 19:47Z","local":"2026-07-25 14:47-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1894 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 19:25Z","revisedTime":"2026-07-25 19:47Z","runwayTime":"2026-07-25 19:47Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for AA1894
[flightStatus] AA1894 2026-07-25 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[riskScorer] AA1894 2026-07-25 horizon=short hours_out=-35.8 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA6421" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching LBB (KLBB)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KCAI: Unexpected end of JSON input
[flightStatus] DL295 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL295 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 15:38Z","local":"2026-07-25 11:38-04:00"},"revisedTime":{"utc":"2026-07-25 15:38Z","local":"2026-07-25 11:38-04:00"},"runwayTime":{"utc":"2026-07-25 15:38Z","local":"2026-07-25 11:38-04:00"},"terminal":"I","quality":["Basic","Live"]}
[flightStatus] DL295 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 15:38Z","revisedTime":"2026-07-25 15:38Z","runwayTime":"2026-07-25 15:38Z","terminal":"I","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 50min for DL295
[flightStatus] DL295 2026-07-25 status=Arrived dep_delay=0 inbound_delay=50 cancelled=false
[riskScorer] DL295 2026-07-25 horizon=short hours_out=-38.9 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA2034" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching ELP (KELP)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ELP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2974 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2974 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 15:27Z","local":"2026-07-25 11:27-04:00"},"revisedTime":{"utc":"2026-07-25 15:54Z","local":"2026-07-25 11:54-04:00"},"runwayTime":{"utc":"2026-07-25 15:54Z","local":"2026-07-25 11:54-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL2974 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 15:27Z","revisedTime":"2026-07-25 15:54Z","runwayTime":"2026-07-25 15:54Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for DL2974
[flightStatus] DL2974 2026-07-25 status=Arrived dep_delay=27 inbound_delay=0 cancelled=false
[riskScorer] DL2974 2026-07-25 horizon=short hours_out=-38.7 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA2481" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching SYR (KSYR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SYR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LBB cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] MS986 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] MS986 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 16:55Z","local":"2026-07-25 12:55-04:00"},"revisedTime":{"utc":"2026-07-25 17:53Z","local":"2026-07-25 13:53-04:00"},"runwayTime":{"utc":"2026-07-25 17:53Z","local":"2026-07-25 13:53-04:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] MS986 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 16:55Z","revisedTime":"2026-07-25 17:53Z","runwayTime":"2026-07-25 17:53Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 58min for MS986
[flightStatus] MS986 2026-07-25 status=EnRoute dep_delay=58 inbound_delay=0 cancelled=false
[riskScorer] MS986 2026-07-25 horizon=short hours_out=-37.3 raw_total=37 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL1169" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL802 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL802 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 18:50Z","local":"2026-07-25 11:50-07:00"},"revisedTime":{"utc":"2026-07-25 19:00Z","local":"2026-07-25 12:00-07:00"},"runwayTime":{"utc":"2026-07-25 19:00Z","local":"2026-07-25 12:00-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL802 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 18:50Z","revisedTime":"2026-07-25 19:00Z","runwayTime":"2026-07-25 19:00Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for DL802
[flightStatus] DL802 2026-07-25 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] DL802 2026-07-25 horizon=short hours_out=-38.4 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL680" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching SAN (KSAN)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] SAN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA6421 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA6421 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 21:55Z","local":"2026-07-25 16:55-05:00"},"revisedTime":{"utc":"2026-07-25 23:52Z","local":"2026-07-25 18:52-05:00"},"runwayTime":{"utc":"2026-07-25 23:52Z","local":"2026-07-25 18:52-05:00"},"terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA6421 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 21:55Z","revisedTime":"2026-07-25 23:52Z","runwayTime":"2026-07-25 23:52Z","terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 117min for AA6421
[flightStatus] computed inbound delay from revisedTime: 80min for AA6421
[flightStatus] AA6421 2026-07-25 status=Arrived dep_delay=117 inbound_delay=80 cancelled=false
[riskScorer] AA6421 2026-07-25 horizon=short hours_out=-33.3 raw_total=56 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "VS8" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching LHR (EGLL)
[carrierHealth] cache hit VS
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LHR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2034 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2034 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 23:30Z","local":"2026-07-25 18:30-05:00"},"revisedTime":{"utc":"2026-07-26 00:01Z","local":"2026-07-25 19:01-05:00"},"runwayTime":{"utc":"2026-07-26 00:01Z","local":"2026-07-25 19:01-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2034 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 23:30Z","revisedTime":"2026-07-26 00:01Z","runwayTime":"2026-07-26 00:01Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for AA2034
[flightStatus] AA2034 2026-07-25 status=Arrived dep_delay=31 inbound_delay=0 cancelled=false
[riskScorer] AA2034 2026-07-25 horizon=short hours_out=-31.7 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "WS1425" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching YEG (KYEG)
[carrierHealth] computing WS
[carrierHealth] WS sample=20 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KYEG: Unexpected end of JSON input
[flightStatus] UA2481 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2481 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 23:09Z","local":"2026-07-25 18:09-05:00"},"revisedTime":{"utc":"2026-07-25 23:41Z","local":"2026-07-25 18:41-05:00"},"runwayTime":{"utc":"2026-07-25 23:41Z","local":"2026-07-25 18:41-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2481 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 23:09Z","revisedTime":"2026-07-25 23:41Z","runwayTime":"2026-07-25 23:41Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 32min for UA2481
[flightStatus] UA2481 2026-07-25 status=Arrived dep_delay=32 inbound_delay=0 cancelled=false
[riskScorer] UA2481 2026-07-25 horizon=short hours_out=-32.1 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AF25" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching CDG (LFPG)
[carrierHealth] cache hit AF
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL1169 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1169 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 19:30Z","local":"2026-07-25 15:30-04:00"},"revisedTime":{"utc":"2026-07-25 19:51Z","local":"2026-07-25 15:51-04:00"},"runwayTime":{"utc":"2026-07-25 19:51Z","local":"2026-07-25 15:51-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1169 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 19:30Z","revisedTime":"2026-07-25 19:51Z","runwayTime":"2026-07-25 19:51Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for DL1169
[flightStatus] DL1169 2026-07-25 status=Arrived dep_delay=21 inbound_delay=0 cancelled=false
[riskScorer] DL1169 2026-07-25 horizon=short hours_out=-34.7 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "TP218" 2026-07-25
[weather] fetching BOS (KBOS)
[weather] fetching LIS (KLIS)
[carrierHealth] cache hit TP
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KLIS: Unexpected end of JSON input
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CDG cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL680 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL680 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 22:10Z","local":"2026-07-25 18:10-04:00"},"revisedTime":{"utc":"2026-07-25 22:16Z","local":"2026-07-25 18:16-04:00"},"runwayTime":{"utc":"2026-07-25 22:16Z","local":"2026-07-25 18:16-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL680 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 22:10Z","revisedTime":"2026-07-25 22:16Z","runwayTime":"2026-07-25 22:16Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 6min for DL680
[flightStatus] DL680 2026-07-25 status=Arrived dep_delay=6 inbound_delay=0 cancelled=false
[riskScorer] DL680 2026-07-25 horizon=short hours_out=-32.0 raw_total=26 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA3412" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching BRO (KBRO)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] VS8 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] VS8 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 22:50Z","local":"2026-07-25 15:50-07:00"},"revisedTime":{"utc":"2026-07-25 23:10Z","local":"2026-07-25 16:10-07:00"},"runwayTime":{"utc":"2026-07-25 23:10Z","local":"2026-07-25 16:10-07:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] VS8 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 22:50Z","revisedTime":"2026-07-25 23:10Z","runwayTime":"2026-07-25 23:10Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for VS8
[flightStatus] VS8 2026-07-25 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[riskScorer] VS8 2026-07-25 horizon=short hours_out=-34.4 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "DL956" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching DEN (KDEN)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] DEN cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] BRO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WS1425 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WS1425 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 23:55Z","local":"2026-07-25 16:55-07:00"},"revisedTime":{"utc":"2026-07-26 00:09Z","local":"2026-07-25 17:09-07:00"},"runwayTime":{"utc":"2026-07-26 00:09Z","local":"2026-07-25 17:09-07:00"},"terminal":"2","runway":"24L","quality":["Basic","Live"]}
[flightStatus] WS1425 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 23:55Z","revisedTime":"2026-07-26 00:09Z","runwayTime":"2026-07-26 00:09Z","terminal":"2","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for WS1425
[flightStatus] computed inbound delay from revisedTime: 13min for WS1425
[flightStatus] WS1425 2026-07-25 status=EnRoute dep_delay=14 inbound_delay=13 cancelled=false
[riskScorer] WS1425 2026-07-25 horizon=short hours_out=-33.3 raw_total=17 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA236" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching FCO (KFCO)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AF25 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AF25 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 01:25Z","local":"2026-07-25 18:25-07:00"},"revisedTime":{"utc":"2026-07-26 02:21Z","local":"2026-07-25 19:21-07:00"},"runwayTime":{"utc":"2026-07-26 02:21Z","local":"2026-07-25 19:21-07:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AF25 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 01:25Z","revisedTime":"2026-07-26 02:21Z","runwayTime":"2026-07-26 02:21Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 56min for AF25
[flightStatus] AF25 2026-07-25 status=EnRoute dep_delay=56 inbound_delay=0 cancelled=false
[riskScorer] AF25 2026-07-25 horizon=short hours_out=-31.8 raw_total=43 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL264" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching CDG (LFPG)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] CDG cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] TP218 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] TP218 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 22:05Z","local":"2026-07-25 18:05-04:00"},"revisedTime":{"utc":"2026-07-25 22:24Z","local":"2026-07-25 18:24-04:00"},"runwayTime":{"utc":"2026-07-25 22:24Z","local":"2026-07-25 18:24-04:00"},"terminal":"C","runway":"09","quality":["Basic","Live"]}
[flightStatus] TP218 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 22:05Z","revisedTime":"2026-07-25 22:24Z","runwayTime":"2026-07-25 22:24Z","terminal":"C","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for TP218
[flightStatus] TP218 2026-07-25 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] TP218 2026-07-25 horizon=short hours_out=-32.1 raw_total=36 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL4148" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching BOI (KBOI)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOI cat=IFR vis=2.5 ceil=3400 ts=false fz=false contrib=18
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3412 dep keys: airport,scheduledTime,quality
[flightStatus] AA3412 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 03:38Z","local":"2026-07-25 22:38-05:00"},"quality":["Basic"]}
[flightStatus] AA3412 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 03:38Z","quality":["Basic"]}
[flightStatus] AA3412 2026-07-25 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA3412 2026-07-25 horizon=short hours_out=-27.6 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA2152" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching MSP (KMSP)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] MSP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL956 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL956 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 02:40Z","local":"2026-07-25 22:40-04:00"},"revisedTime":{"utc":"2026-07-26 02:55Z","local":"2026-07-25 22:55-04:00"},"runwayTime":{"utc":"2026-07-26 02:55Z","local":"2026-07-25 22:55-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL956 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 02:40Z","revisedTime":"2026-07-26 02:55Z","runwayTime":"2026-07-26 02:55Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for DL956
[flightStatus] DL956 2026-07-25 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] DL956 2026-07-25 horizon=short hours_out=-27.5 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA389" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching MEX (MMMX)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] MEX cat=VFR vis=8 ceil=8000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA236 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA236 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 01:04Z","local":"2026-07-25 21:04-04:00"},"revisedTime":{"utc":"2026-07-26 01:04Z","local":"2026-07-25 21:04-04:00"},"runwayTime":{"utc":"2026-07-26 01:04Z","local":"2026-07-25 21:04-04:00"},"runway":"13R","quality":["Basic","Live"]}
[flightStatus] AA236 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 01:04Z","revisedTime":"2026-07-26 01:04Z","runwayTime":"2026-07-26 01:04Z","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 36min for AA236
[flightStatus] AA236 2026-07-25 status=Arrived dep_delay=0 inbound_delay=36 cancelled=false
[flightStatus] DL264 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL264 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 02:29Z","local":"2026-07-25 22:29-04:00"},"revisedTime":{"utc":"2026-07-26 03:01Z","local":"2026-07-25 23:01-04:00"},"runwayTime":{"utc":"2026-07-26 03:01Z","local":"2026-07-25 23:01-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL264 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 02:29Z","revisedTime":"2026-07-26 03:01Z","runwayTime":"2026-07-26 03:01Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 32min for DL264
[flightStatus] DL264 2026-07-25 status=EnRoute dep_delay=32 inbound_delay=0 cancelled=false
[riskScorer] DL264 2026-07-25 horizon=short hours_out=-27.7 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA1998" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching JAX (KJAX)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL4148 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL4148 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 02:59Z","local":"2026-07-25 19:59-07:00"},"revisedTime":{"utc":"2026-07-26 03:01Z","local":"2026-07-25 20:01-07:00"},"runwayTime":{"utc":"2026-07-26 03:01Z","local":"2026-07-25 20:01-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL4148 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 02:59Z","revisedTime":"2026-07-26 03:01Z","runwayTime":"2026-07-26 03:01Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 2min for DL4148
[flightStatus] DL4148 2026-07-25 status=Arrived dep_delay=2 inbound_delay=0 cancelled=false
[riskScorer] DL4148 2026-07-25 horizon=short hours_out=-30.2 raw_total=35 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":10,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA6391" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching GRR (KGRR)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] JAX cat=VFR vis=10 ceil=20000 ts=false fz=false contrib=2
[weather] GRR cat=VFR vis=8 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA2152 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA2152 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 12:17Z","local":"2026-07-25 07:17-05:00"},"revisedTime":{"utc":"2026-07-25 12:24Z","local":"2026-07-25 07:24-05:00"},"runwayTime":{"utc":"2026-07-25 12:24Z","local":"2026-07-25 07:24-05:00"},"terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2152 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 12:17Z","revisedTime":"2026-07-25 12:24Z","runwayTime":"2026-07-25 12:24Z","terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 7min for AA2152
[flightStatus] AA2152 2026-07-25 status=Arrived dep_delay=7 inbound_delay=0 cancelled=false
[riskScorer] AA2152 2026-07-25 horizon=short hours_out=-42.9 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "MQ3800" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching SGF (KSGF)
[carrierHealth] cache hit MQ
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA389 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA389 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 13:38Z","local":"2026-07-25 08:38-05:00"},"revisedTime":{"utc":"2026-07-25 14:04Z","local":"2026-07-25 09:04-05:00"},"runwayTime":{"utc":"2026-07-25 14:04Z","local":"2026-07-25 09:04-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA389 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 13:38Z","revisedTime":"2026-07-25 14:04Z","runwayTime":"2026-07-25 14:04Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for AA389
[flightStatus] AA389 2026-07-25 status=EnRoute dep_delay=26 inbound_delay=0 cancelled=false
[flightStatus] AA1998 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1998 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 15:01Z","local":"2026-07-25 10:01-05:00"},"revisedTime":{"utc":"2026-07-25 15:13Z","local":"2026-07-25 10:13-05:00"},"runwayTime":{"utc":"2026-07-25 15:13Z","local":"2026-07-25 10:13-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1998 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 15:01Z","revisedTime":"2026-07-25 15:13Z","runwayTime":"2026-07-25 15:13Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for AA1998
[flightStatus] AA1998 2026-07-25 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] AA1998 2026-07-25 horizon=short hours_out=-40.2 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA2520" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit AA
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA6391 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA6391 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 12:15Z","local":"2026-07-25 07:15-05:00"},"revisedTime":{"utc":"2026-07-25 13:09Z","local":"2026-07-25 08:09-05:00"},"runwayTime":{"utc":"2026-07-25 13:09Z","local":"2026-07-25 08:09-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA6391 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 12:15Z","revisedTime":"2026-07-25 13:09Z","runwayTime":"2026-07-25 13:09Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 54min for AA6391
[flightStatus] computed inbound delay from revisedTime: 12min for AA6391
[flightStatus] AA6391 2026-07-25 status=Arrived dep_delay=54 inbound_delay=12 cancelled=false
[riskScorer] AA6391 2026-07-25 horizon=short hours_out=-43.0 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL3144" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching CLT (KCLT)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] CLT cat=VFR vis=10 ceil=11000 ts=false fz=false contrib=2
[weather] fetch failed for KFCO: Unexpected end of JSON input
[riskScorer] AA236 2026-07-25 horizon=short hours_out=-30.7 raw_total=45 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "DL1374" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching SDF (KSDF)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] MQ3800 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] MQ3800 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 13:30Z","local":"2026-07-25 08:30-05:00"},"revisedTime":{"utc":"2026-07-25 13:55Z","local":"2026-07-25 08:55-05:00"},"runwayTime":{"utc":"2026-07-25 13:55Z","local":"2026-07-25 08:55-05:00"},"quality":["Basic","Live"]}
[flightStatus] MQ3800 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 13:30Z","revisedTime":"2026-07-25 13:55Z","runwayTime":"2026-07-25 13:55Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 25min for MQ3800
[flightStatus] computed inbound delay from revisedTime: 24min for MQ3800
[flightStatus] MQ3800 2026-07-25 status=Arrived dep_delay=25 inbound_delay=24 cancelled=false
[flightStatus] AA2520 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA2520 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 15:06Z","local":"2026-07-25 10:06-05:00"},"revisedTime":{"utc":"2026-07-25 15:26Z","local":"2026-07-25 10:26-05:00"},"runwayTime":{"utc":"2026-07-25 15:26Z","local":"2026-07-25 10:26-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA2520 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 15:06Z","revisedTime":"2026-07-25 15:26Z","runwayTime":"2026-07-25 15:26Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for AA2520
[flightStatus] AA2520 2026-07-25 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[riskScorer] AA2520 2026-07-25 horizon=short hours_out=-40.1 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL1421" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=67min
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL3144 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3144 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 11:47Z","local":"2026-07-25 07:47-04:00"},"revisedTime":{"utc":"2026-07-25 11:53Z","local":"2026-07-25 07:53-04:00"},"runwayTime":{"utc":"2026-07-25 11:53Z","local":"2026-07-25 07:53-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL3144 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 11:47Z","revisedTime":"2026-07-25 11:53Z","runwayTime":"2026-07-25 11:53Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 6min for DL3144
[flightStatus] DL3144 2026-07-25 status=Arrived dep_delay=6 inbound_delay=0 cancelled=false
[riskScorer] DL3144 2026-07-25 horizon=short hours_out=-42.4 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[rescore] progress: 1051/1166
[flightStatus] number lookup "AA119" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching LIH (PHLI)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LIH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SGF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] MQ3800 2026-07-25 horizon=short hours_out=-41.7 raw_total=26 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA2455" 2026-07-25
[weather] fetching BOS (KBOS)
[weather] fetching LAX (KLAX)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL1374 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1374 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 13:10Z","local":"2026-07-25 09:10-04:00"},"revisedTime":{"utc":"2026-07-25 13:16Z","local":"2026-07-25 09:16-04:00"},"runwayTime":{"utc":"2026-07-25 13:16Z","local":"2026-07-25 09:16-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL1374 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 13:10Z","revisedTime":"2026-07-25 13:16Z","runwayTime":"2026-07-25 13:16Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 6min for DL1374
[flightStatus] DL1374 2026-07-25 status=Arrived dep_delay=6 inbound_delay=0 cancelled=false
[weather] SDF cat=MVFR vis=10 ceil=2100 ts=false fz=false contrib=10
[riskScorer] DL1374 2026-07-25 horizon=short hours_out=-41.0 raw_total=26 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":6,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "MQ4171" 2026-07-25
[weather] fetching BOS (KBOS)
[weather] fetching ROC (KROC)
[carrierHealth] cache hit MQ
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ROC cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL1421 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1421 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 14:00Z","local":"2026-07-25 07:00-07:00"},"revisedTime":{"utc":"2026-07-25 14:22Z","local":"2026-07-25 07:22-07:00"},"runwayTime":{"utc":"2026-07-25 14:22Z","local":"2026-07-25 07:22-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL1421 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 14:00Z","revisedTime":"2026-07-25 14:22Z","runwayTime":"2026-07-25 14:22Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL1421
[flightStatus] computed inbound delay from revisedTime: 1min for DL1421
[flightStatus] DL1421 2026-07-25 status=Arrived dep_delay=22 inbound_delay=1 cancelled=false
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[riskScorer] DL1421 2026-07-25 horizon=short hours_out=-43.2 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":15,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA1868" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching FLL (KFLL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA119 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA119 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 15:48Z","local":"2026-07-25 08:48-07:00"},"revisedTime":{"utc":"2026-07-25 16:40Z","local":"2026-07-25 09:40-07:00"},"runwayTime":{"utc":"2026-07-25 16:40Z","local":"2026-07-25 09:40-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA119 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 15:48Z","revisedTime":"2026-07-25 16:40Z","runwayTime":"2026-07-25 16:40Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 52min for AA119
[flightStatus] computed inbound delay from revisedTime: 33min for AA119
[flightStatus] AA119 2026-07-25 status=EnRoute dep_delay=52 inbound_delay=33 cancelled=false
[riskScorer] AA119 2026-07-25 horizon=short hours_out=-41.4 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL940" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching SAV (KSAV)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] FLL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SAV cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA2455 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA2455 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 11:00Z","local":"2026-07-25 07:00-04:00"},"revisedTime":{"utc":"2026-07-25 11:05Z","local":"2026-07-25 07:05-04:00"},"runwayTime":{"utc":"2026-07-25 11:05Z","local":"2026-07-25 07:05-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AA2455 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 11:00Z","revisedTime":"2026-07-25 11:05Z","runwayTime":"2026-07-25 11:05Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 5min for AA2455
[flightStatus] AA2455 2026-07-25 status=Arrived dep_delay=5 inbound_delay=0 cancelled=false
[riskScorer] AA2455 2026-07-25 horizon=short hours_out=-43.2 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL1031" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching DTW (KDTW)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DTW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] MQ4171 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] MQ4171 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 13:55Z","local":"2026-07-25 09:55-04:00"},"revisedTime":{"utc":"2026-07-25 13:58Z","local":"2026-07-25 09:58-04:00"},"runwayTime":{"utc":"2026-07-25 13:58Z","local":"2026-07-25 09:58-04:00"},"runway":"09","quality":["Basic","Live"]}
[flightStatus] MQ4171 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 13:55Z","revisedTime":"2026-07-25 13:58Z","runwayTime":"2026-07-25 13:58Z","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 3min for MQ4171
[flightStatus] computed inbound delay from revisedTime: 8min for MQ4171
[flightStatus] MQ4171 2026-07-25 status=Arrived dep_delay=3 inbound_delay=8 cancelled=false
[riskScorer] MQ4171 2026-07-25 horizon=short hours_out=-40.3 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL4933" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching MSP (KMSP)
[carrierHealth] cache hit DL
[weather] MSP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA1868 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1868 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 19:25Z","local":"2026-07-25 14:25-05:00"},"revisedTime":{"utc":"2026-07-25 19:30Z","local":"2026-07-25 14:30-05:00"},"runwayTime":{"utc":"2026-07-25 19:30Z","local":"2026-07-25 14:30-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1868 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 19:25Z","revisedTime":"2026-07-25 19:30Z","runwayTime":"2026-07-25 19:30Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 5min for AA1868
[flightStatus] AA1868 2026-07-25 status=Arrived dep_delay=5 inbound_delay=0 cancelled=false
[riskScorer] AA1868 2026-07-25 horizon=short hours_out=-35.8 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "UA5459" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching RDD (KRDD)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] RDD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL940 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL940 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 15:15Z","local":"2026-07-25 11:15-04:00"},"revisedTime":{"utc":"2026-07-25 15:25Z","local":"2026-07-25 11:25-04:00"},"runwayTime":{"utc":"2026-07-25 15:25Z","local":"2026-07-25 11:25-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL940 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 15:15Z","revisedTime":"2026-07-25 15:25Z","runwayTime":"2026-07-25 15:25Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for DL940
[flightStatus] DL940 2026-07-25 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] DL940 2026-07-25 horizon=short hours_out=-39.0 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "WN2197" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching HNL (PHNL)
[carrierHealth] cache hit WN
[weather] HNL cat=VFR vis=10 ceil=4700 ts=false fz=false contrib=5
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA389 2026-07-25 horizon=short hours_out=-41.6 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA4981" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching DRO (KDRO)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] DRO cat=VFR vis=10 ceil=9000 ts=false fz=false contrib=2
[flightStatus] DL1031 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1031 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 18:10Z","local":"2026-07-25 14:10-04:00"},"revisedTime":{"utc":"2026-07-25 18:39Z","local":"2026-07-25 14:39-04:00"},"runwayTime":{"utc":"2026-07-25 18:39Z","local":"2026-07-25 14:39-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL1031 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 18:10Z","revisedTime":"2026-07-25 18:39Z","runwayTime":"2026-07-25 18:39Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 29min for DL1031
[flightStatus] computed inbound delay from revisedTime: 1min for DL1031
[flightStatus] DL1031 2026-07-25 status=Arrived dep_delay=29 inbound_delay=1 cancelled=false
[riskScorer] DL1031 2026-07-25 horizon=short hours_out=-36.0 raw_total=32 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "KL618" 2026-07-25
[weather] fetching BOS (KBOS)
[weather] fetching AMS (EHAM)
[carrierHealth] computing KL
[carrierHealth] KL sample=6 cancelRate=0.000 avgDelay=50.8 healthScore=7 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] AMS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL4933 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL4933 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 22:20Z","local":"2026-07-25 18:20-04:00"},"revisedTime":{"utc":"2026-07-25 23:05Z","local":"2026-07-25 19:05-04:00"},"runwayTime":{"utc":"2026-07-25 23:05Z","local":"2026-07-25 19:05-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL4933 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 22:20Z","revisedTime":"2026-07-25 23:05Z","runwayTime":"2026-07-25 23:05Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 45min for DL4933
[flightStatus] DL4933 2026-07-25 status=Arrived dep_delay=45 inbound_delay=0 cancelled=false
[riskScorer] DL4933 2026-07-25 horizon=short hours_out=-31.9 raw_total=46 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "AA2428" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching RSW (KRSW)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] RSW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA5459 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA5459 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 23:55Z","local":"2026-07-25 16:55-07:00"},"revisedTime":{"utc":"2026-07-26 00:06Z","local":"2026-07-25 17:06-07:00"},"runwayTime":{"utc":"2026-07-26 00:06Z","local":"2026-07-25 17:06-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA5459 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 23:55Z","revisedTime":"2026-07-26 00:06Z","runwayTime":"2026-07-26 00:06Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for UA5459
[flightStatus] UA5459 2026-07-25 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] UA5459 2026-07-25 horizon=short hours_out=-33.3 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[flightStatus] number lookup "AA1396" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching AUS (KAUS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] AUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN2197 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN2197 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 01:25Z","local":"2026-07-25 18:25-07:00"},"revisedTime":{"utc":"2026-07-26 02:45Z","local":"2026-07-25 19:45-07:00"},"runwayTime":{"utc":"2026-07-26 02:45Z","local":"2026-07-25 19:45-07:00"},"terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] WN2197 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 01:25Z","revisedTime":"2026-07-26 02:45Z","runwayTime":"2026-07-26 02:45Z","terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 80min for WN2197
[flightStatus] computed inbound delay from revisedTime: 51min for WN2197
[flightStatus] WN2197 2026-07-25 status=Arrived dep_delay=80 inbound_delay=51 cancelled=false
[riskScorer] WN2197 2026-07-25 horizon=short hours_out=-31.8 raw_total=60 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "MQ3591" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching IAH (KIAH)
[carrierHealth] cache hit MQ
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] IAH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4981 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA4981 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 02:00Z","local":"2026-07-25 21:00-05:00"},"revisedTime":{"utc":"2026-07-26 02:19Z","local":"2026-07-25 21:19-05:00"},"runwayTime":{"utc":"2026-07-26 02:19Z","local":"2026-07-25 21:19-05:00"},"terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA4981 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 02:00Z","revisedTime":"2026-07-26 02:19Z","runwayTime":"2026-07-26 02:19Z","terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AA4981
[flightStatus] AA4981 2026-07-25 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] AA4981 2026-07-25 horizon=short hours_out=-29.2 raw_total=36 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA4551" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching TYS (KTYS)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] TYS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] KL618 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] KL618 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 00:25Z","local":"2026-07-25 20:25-04:00"},"revisedTime":{"utc":"2026-07-26 00:51Z","local":"2026-07-25 20:51-04:00"},"runwayTime":{"utc":"2026-07-26 00:51Z","local":"2026-07-25 20:51-04:00"},"terminal":"E","quality":["Basic","Live"]}
[flightStatus] KL618 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 00:25Z","revisedTime":"2026-07-26 00:51Z","runwayTime":"2026-07-26 00:51Z","terminal":"E","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for KL618
[flightStatus] KL618 2026-07-25 status=Arrived dep_delay=26 inbound_delay=0 cancelled=false
[riskScorer] KL618 2026-07-25 horizon=short hours_out=-29.8 raw_total=36 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":1,"connectionRisk":3}
[flightStatus] number lookup "UA1292" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching YVR (CYVR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] YVR cat=VFR vis=15 ceil=6200 ts=false fz=false contrib=2
[flightStatus] AA2428 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2428 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 12:15Z","local":"2026-07-25 07:15-05:00"},"revisedTime":{"utc":"2026-07-25 12:29Z","local":"2026-07-25 07:29-05:00"},"runwayTime":{"utc":"2026-07-25 12:29Z","local":"2026-07-25 07:29-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2428 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 12:15Z","revisedTime":"2026-07-25 12:29Z","runwayTime":"2026-07-25 12:29Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for AA2428
[flightStatus] AA2428 2026-07-25 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[riskScorer] AA2428 2026-07-25 horizon=short hours_out=-43.0 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL1845" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching STI (KSTI)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KSTI: Unexpected end of JSON input
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA1396 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1396 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 13:58Z","local":"2026-07-25 08:58-05:00"},"revisedTime":{"utc":"2026-07-25 14:10Z","local":"2026-07-25 09:10-05:00"},"runwayTime":{"utc":"2026-07-25 14:10Z","local":"2026-07-25 09:10-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA1396 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 13:58Z","revisedTime":"2026-07-25 14:10Z","runwayTime":"2026-07-25 14:10Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for AA1396
[flightStatus] AA1396 2026-07-25 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] AA1396 2026-07-25 horizon=short hours_out=-41.2 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL5015" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching CHS (KCHS)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] MQ3591 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] MQ3591 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 14:45Z","local":"2026-07-25 09:45-05:00"},"revisedTime":{"utc":"2026-07-25 15:18Z","local":"2026-07-25 10:18-05:00"},"runwayTime":{"utc":"2026-07-25 15:18Z","local":"2026-07-25 10:18-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] MQ3591 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 14:45Z","revisedTime":"2026-07-25 15:18Z","runwayTime":"2026-07-25 15:18Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 33min for MQ3591
[flightStatus] computed inbound delay from revisedTime: 32min for MQ3591
[flightStatus] MQ3591 2026-07-25 status=Arrived dep_delay=33 inbound_delay=32 cancelled=false
[riskScorer] MQ3591 2026-07-25 horizon=short hours_out=-40.5 raw_total=38 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "WN2397" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching HNL (PHNL)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] HNL cat=VFR vis=10 ceil=4700 ts=false fz=false contrib=5
[flightStatus] UA4551 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA4551 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 11:55Z","local":"2026-07-25 06:55-05:00"},"revisedTime":{"utc":"2026-07-25 12:20Z","local":"2026-07-25 07:20-05:00"},"runwayTime":{"utc":"2026-07-25 12:20Z","local":"2026-07-25 07:20-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA4551 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 11:55Z","revisedTime":"2026-07-25 12:20Z","runwayTime":"2026-07-25 12:20Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 25min for UA4551
[flightStatus] UA4551 2026-07-25 status=Arrived dep_delay=25 inbound_delay=0 cancelled=false
[riskScorer] UA4551 2026-07-25 horizon=short hours_out=-43.3 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AS3398" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching MZT (KMZT)
[carrierHealth] computing AS
[carrierHealth] AS sample=82 cancelRate=0.000 avgDelay=32.5 healthScore=7 reliable=true
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] CHS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] UA1292 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1292 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 13:45Z","local":"2026-07-25 08:45-05:00"},"revisedTime":{"utc":"2026-07-25 13:56Z","local":"2026-07-25 08:56-05:00"},"runwayTime":{"utc":"2026-07-25 13:56Z","local":"2026-07-25 08:56-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1292 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 13:45Z","revisedTime":"2026-07-25 13:56Z","runwayTime":"2026-07-25 13:56Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for UA1292
[flightStatus] UA1292 2026-07-25 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] UA1292 2026-07-25 horizon=short hours_out=-41.5 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA3109" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching CZM (KCZM)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KCZM: Unexpected end of JSON input
[weather] fetch failed for KMZT: Unexpected end of JSON input
[flightStatus] DL1845 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1845 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 12:25Z","local":"2026-07-25 08:25-04:00"},"revisedTime":{"utc":"2026-07-25 12:53Z","local":"2026-07-25 08:53-04:00"},"runwayTime":{"utc":"2026-07-25 12:53Z","local":"2026-07-25 08:53-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL1845 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 12:25Z","revisedTime":"2026-07-25 12:53Z","runwayTime":"2026-07-25 12:53Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 28min for DL1845
[flightStatus] DL1845 2026-07-25 status=EnRoute dep_delay=28 inbound_delay=0 cancelled=false
[riskScorer] DL1845 2026-07-25 horizon=short hours_out=-41.8 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "AA2870" 2026-07-25
[weather] fetching DFW (KDFW)
[weather] fetching TVC (KTVC)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] TVC cat=VFR vis=10 ceil=21000 ts=false fz=false contrib=2
[flightStatus] DL5015 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5015 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 13:29Z","local":"2026-07-25 09:29-04:00"},"revisedTime":{"utc":"2026-07-25 14:12Z","local":"2026-07-25 10:12-04:00"},"runwayTime":{"utc":"2026-07-25 14:12Z","local":"2026-07-25 10:12-04:00"},"terminal":"4","runway":"04L","quality":["Basic","Live"]}
[flightStatus] DL5015 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 13:29Z","revisedTime":"2026-07-25 14:12Z","runwayTime":"2026-07-25 14:12Z","terminal":"4","runway":"04L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 43min for DL5015
[flightStatus] computed inbound delay from revisedTime: 7min for DL5015
[flightStatus] DL5015 2026-07-25 status=Arrived dep_delay=43 inbound_delay=7 cancelled=false
[riskScorer] DL5015 2026-07-25 horizon=short hours_out=-40.7 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "UA1811" 2026-07-25
[weather] fetching ORD (KORD)
[weather] fetching MCO (KMCO)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] MCO cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] WN2397 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN2397 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 16:00Z","local":"2026-07-25 09:00-07:00"},"revisedTime":{"utc":"2026-07-25 16:15Z","local":"2026-07-25 09:15-07:00"},"runwayTime":{"utc":"2026-07-25 16:15Z","local":"2026-07-25 09:15-07:00"},"terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] WN2397 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 16:00Z","revisedTime":"2026-07-25 16:15Z","runwayTime":"2026-07-25 16:15Z","terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for WN2397
[flightStatus] WN2397 2026-07-25 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] WN2397 2026-07-25 horizon=short hours_out=-41.2 raw_total=23 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":0}
[flightStatus] number lookup "DL2380" 2026-07-25
[weather] fetching ATL (KATL)
[weather] fetching JFK (KJFK)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AS3398 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS3398 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 17:20Z","local":"2026-07-25 10:20-07:00"},"revisedTime":{"utc":"2026-07-25 18:09Z","local":"2026-07-25 11:09-07:00"},"runwayTime":{"utc":"2026-07-25 18:09Z","local":"2026-07-25 11:09-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS3398 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 17:20Z","revisedTime":"2026-07-25 18:09Z","runwayTime":"2026-07-25 18:09Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 49min for AS3398
[flightStatus] computed inbound delay from revisedTime: 9min for AS3398
[flightStatus] AS3398 2026-07-25 status=EnRoute dep_delay=49 inbound_delay=9 cancelled=false
[riskScorer] AS3398 2026-07-25 horizon=short hours_out=-39.9 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "DL807" 2026-07-25
[weather] fetching JFK (KJFK)
[weather] fetching LAS (KLAS)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] LAS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA3109 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA3109 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 16:25Z","local":"2026-07-25 11:25-05:00"},"revisedTime":{"utc":"2026-07-25 16:38Z","local":"2026-07-25 11:38-05:00"},"runwayTime":{"utc":"2026-07-25 16:38Z","local":"2026-07-25 11:38-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA3109 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 16:25Z","revisedTime":"2026-07-25 16:38Z","runwayTime":"2026-07-25 16:38Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for AA3109
[flightStatus] AA3109 2026-07-25 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[riskScorer] AA3109 2026-07-25 horizon=short hours_out=-38.8 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA325" 2026-07-25
[weather] fetching LAX (KLAX)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA2870 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2870 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 17:31Z","local":"2026-07-25 12:31-05:00"},"revisedTime":{"utc":"2026-07-25 17:55Z","local":"2026-07-25 12:55-05:00"},"runwayTime":{"utc":"2026-07-25 17:55Z","local":"2026-07-25 12:55-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2870 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 17:31Z","revisedTime":"2026-07-25 17:55Z","runwayTime":"2026-07-25 17:55Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 24min for AA2870
[flightStatus] computed inbound delay from revisedTime: 2min for AA2870
[flightStatus] AA2870 2026-07-25 status=Arrived dep_delay=24 inbound_delay=2 cancelled=false
[riskScorer] AA2870 2026-07-25 horizon=short hours_out=-37.7 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA1949" 2026-07-26
[weather] fetching DFW (KDFW)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=67min
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[flightStatus] UA1811 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] UA1811 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-25 18:12Z","local":"2026-07-25 13:12-05:00"},"revisedTime":{"utc":"2026-07-25 18:12Z","local":"2026-07-25 13:12-05:00"},"runwayTime":{"utc":"2026-07-25 18:12Z","local":"2026-07-25 13:12-05:00"},"quality":["Basic","Live"]}
[flightStatus] UA1811 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-25 18:12Z","revisedTime":"2026-07-25 18:12Z","runwayTime":"2026-07-25 18:12Z","quality":["Basic","Live"]}
[flightStatus] UA1811 2026-07-25 status=Arrived dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA1811 2026-07-25 horizon=short hours_out=-37.5 raw_total=14 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA2736" 2026-07-26
[weather] fetching DFW (KDFW)
[weather] fetching STS (KSTS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] STS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2380 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2380 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 15:05Z","local":"2026-07-25 11:05-04:00"},"revisedTime":{"utc":"2026-07-25 15:30Z","local":"2026-07-25 11:30-04:00"},"runwayTime":{"utc":"2026-07-25 15:30Z","local":"2026-07-25 11:30-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2380 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 15:05Z","revisedTime":"2026-07-25 15:30Z","runwayTime":"2026-07-25 15:30Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 25min for DL2380
[flightStatus] DL2380 2026-07-25 status=Arrived dep_delay=25 inbound_delay=0 cancelled=false
[riskScorer] DL2380 2026-07-25 horizon=short hours_out=-39.1 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "AA4953" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching CMH (KCMH)
[carrierHealth] cache hit AA
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL807 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL807 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-25 15:30Z","local":"2026-07-25 11:30-04:00"},"revisedTime":{"utc":"2026-07-25 16:58Z","local":"2026-07-25 12:58-04:00"},"runwayTime":{"utc":"2026-07-25 16:58Z","local":"2026-07-25 12:58-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL807 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-25 15:30Z","revisedTime":"2026-07-25 16:58Z","runwayTime":"2026-07-25 16:58Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 88min for DL807
[flightStatus] computed inbound delay from revisedTime: 51min for DL807
[flightStatus] DL807 2026-07-25 status=Arrived dep_delay=88 inbound_delay=51 cancelled=false
[riskScorer] DL807 2026-07-25 horizon=short hours_out=-38.7 raw_total=54 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA764" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching YYC (CYYC)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] CMH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA325 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA325 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-25 18:41Z","local":"2026-07-25 11:41-07:00"},"revisedTime":{"utc":"2026-07-25 19:11Z","local":"2026-07-25 12:11-07:00"},"runwayTime":{"utc":"2026-07-25 19:11Z","local":"2026-07-25 12:11-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA325 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-25 18:41Z","revisedTime":"2026-07-25 19:11Z","runwayTime":"2026-07-25 19:11Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 30min for UA325
[flightStatus] UA325 2026-07-25 status=Arrived dep_delay=30 inbound_delay=0 cancelled=false
[riskScorer] UA325 2026-07-25 horizon=short hours_out=-38.5 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[flightStatus] number lookup "UA4460" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching ATW (KATW)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] ATW cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA1949 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1949 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 12:10Z","local":"2026-07-26 07:10-05:00"},"revisedTime":{"utc":"2026-07-26 12:20Z","local":"2026-07-26 07:20-05:00"},"runwayTime":{"utc":"2026-07-26 12:20Z","local":"2026-07-26 07:20-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA1949 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 12:10Z","revisedTime":"2026-07-26 12:20Z","runwayTime":"2026-07-26 12:20Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for AA1949
[flightStatus] AA1949 2026-07-26 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] AA1949 2026-07-26 horizon=short hours_out=-19.0 raw_total=39 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":15,"originWeather":2,"destinationWeather":3,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":0}
[flightStatus] number lookup "DL1994" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching PUJ (KPUJ)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA2736 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2736 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 15:15Z","local":"2026-07-26 10:15-05:00"},"revisedTime":{"utc":"2026-07-26 16:39Z","local":"2026-07-26 11:39-05:00"},"runwayTime":{"utc":"2026-07-26 16:39Z","local":"2026-07-26 11:39-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2736 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 15:15Z","revisedTime":"2026-07-26 16:39Z","runwayTime":"2026-07-26 16:39Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 84min for AA2736
[flightStatus] computed inbound delay from revisedTime: 42min for AA2736
[flightStatus] AA2736 2026-07-26 status=Approaching dep_delay=84 inbound_delay=42 cancelled=false
[riskScorer] AA2736 2026-07-26 horizon=short hours_out=-16.0 raw_total=55 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[flightStatus] number lookup "DL625" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching MEX (MMMX)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] MEX cat=VFR vis=8 ceil=8000 ts=false fz=false contrib=2
[weather] YYC cat=VFR vis=20 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4953 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA4953 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 12:00Z","local":"2026-07-26 07:00-05:00"},"revisedTime":{"utc":"2026-07-26 12:27Z","local":"2026-07-26 07:27-05:00"},"runwayTime":{"utc":"2026-07-26 12:27Z","local":"2026-07-26 07:27-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA4953 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 12:00Z","revisedTime":"2026-07-26 12:27Z","runwayTime":"2026-07-26 12:27Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for AA4953
[flightStatus] AA4953 2026-07-26 status=Arrived dep_delay=27 inbound_delay=0 cancelled=false
[riskScorer] AA4953 2026-07-26 horizon=short hours_out=-19.2 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":0}
[flightStatus] number lookup "AS748" 2026-07-26
[weather] fetching LAX (KLAX)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] PUJ cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA764 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA764 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:40Z","local":"2026-07-26 08:40-05:00"},"revisedTime":{"utc":"2026-07-26 14:35Z","local":"2026-07-26 09:35-05:00"},"runwayTime":{"utc":"2026-07-26 14:35Z","local":"2026-07-26 09:35-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA764 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:40Z","revisedTime":"2026-07-26 14:35Z","runwayTime":"2026-07-26 14:35Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 55min for UA764
[flightStatus] computed inbound delay from revisedTime: 20min for UA764
[flightStatus] UA764 2026-07-26 status=Arrived dep_delay=55 inbound_delay=20 cancelled=false
[riskScorer] UA764 2026-07-26 horizon=short hours_out=-17.5 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":0}
[flightStatus] number lookup "UA1185" 2026-07-26
[weather] fetching LAX (KLAX)
[weather] fetching SJD (KSJD)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KSJD: Unexpected end of JSON input
[flightStatus] UA4460 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA4460 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 15:25Z","local":"2026-07-26 10:25-05:00"},"revisedTime":{"utc":"2026-07-26 16:09Z","local":"2026-07-26 11:09-05:00"},"runwayTime":{"utc":"2026-07-26 16:09Z","local":"2026-07-26 11:09-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA4460 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 15:25Z","revisedTime":"2026-07-26 16:09Z","runwayTime":"2026-07-26 16:09Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 44min for UA4460
[flightStatus] computed inbound delay from revisedTime: 3min for UA4460
[flightStatus] UA4460 2026-07-26 status=Arrived dep_delay=44 inbound_delay=3 cancelled=false
[riskScorer] UA4460 2026-07-26 horizon=short hours_out=-15.8 raw_total=43 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[flightStatus] number lookup "UA319" 2026-07-26
[weather] fetching LAX (KLAX)
[weather] fetching PVR (KPVR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KPVR: Unexpected end of JSON input
[flightStatus] DL1994 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1994 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 12:20Z","local":"2026-07-26 08:20-04:00"},"revisedTime":{"utc":"2026-07-26 12:37Z","local":"2026-07-26 08:37-04:00"},"runwayTime":{"utc":"2026-07-26 12:37Z","local":"2026-07-26 08:37-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL1994 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 12:20Z","revisedTime":"2026-07-26 12:37Z","runwayTime":"2026-07-26 12:37Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for DL1994
[flightStatus] DL1994 2026-07-26 status=EnRoute dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] DL1994 2026-07-26 horizon=short hours_out=-17.9 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":0}
[flightStatus] number lookup "DL5842" 2026-07-26
[weather] fetching BOS (KBOS)
[weather] fetching BNA (KBNA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] BNA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL625 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL625 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 13:38Z","local":"2026-07-26 09:38-04:00"},"revisedTime":{"utc":"2026-07-26 14:14Z","local":"2026-07-26 10:14-04:00"},"runwayTime":{"utc":"2026-07-26 14:14Z","local":"2026-07-26 10:14-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL625 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 13:38Z","revisedTime":"2026-07-26 14:14Z","runwayTime":"2026-07-26 14:14Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for DL625
[flightStatus] DL625 2026-07-26 status=EnRoute dep_delay=36 inbound_delay=0 cancelled=false
[riskScorer] DL625 2026-07-26 horizon=short hours_out=-16.6 raw_total=42 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":0}
[flightStatus] number lookup "PD616" 2026-07-26
[weather] fetching BOS (KBOS)
[weather] fetching YYZ (CYYZ)
[carrierHealth] cache hit PD
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] YYZ cat=VFR vis=15 ceil=10000 ts=false fz=false contrib=2
[flightStatus] AS748 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS748 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 14:00Z","local":"2026-07-26 07:00-07:00"},"revisedTime":{"utc":"2026-07-26 14:19Z","local":"2026-07-26 07:19-07:00"},"runwayTime":{"utc":"2026-07-26 14:19Z","local":"2026-07-26 07:19-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS748 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 14:00Z","revisedTime":"2026-07-26 14:19Z","runwayTime":"2026-07-26 14:19Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AS748
[flightStatus] AS748 2026-07-26 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[riskScorer] AS748 2026-07-26 horizon=short hours_out=-19.2 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":0}
[flightStatus] number lookup "AA2524" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit AA
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] UA1185 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1185 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 15:51Z","local":"2026-07-26 08:51-07:00"},"revisedTime":{"utc":"2026-07-26 16:12Z","local":"2026-07-26 09:12-07:00"},"runwayTime":{"utc":"2026-07-26 16:12Z","local":"2026-07-26 09:12-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA1185 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 15:51Z","revisedTime":"2026-07-26 16:12Z","runwayTime":"2026-07-26 16:12Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for UA1185
[flightStatus] UA1185 2026-07-26 status=EnRoute dep_delay=21 inbound_delay=0 cancelled=false
[riskScorer] UA1185 2026-07-26 horizon=short hours_out=-17.4 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":0}
[flightStatus] number lookup "UA2683" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching SAN (KSAN)
[carrierHealth] cache hit UA
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] SAN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA319 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA319 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 17:19Z","local":"2026-07-26 10:19-07:00"},"revisedTime":{"utc":"2026-07-26 17:39Z","local":"2026-07-26 10:39-07:00"},"runwayTime":{"utc":"2026-07-26 17:39Z","local":"2026-07-26 10:39-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA319 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 17:19Z","revisedTime":"2026-07-26 17:39Z","runwayTime":"2026-07-26 17:39Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for UA319
[flightStatus] UA319 2026-07-26 status=EnRoute dep_delay=20 inbound_delay=0 cancelled=false
[riskScorer] UA319 2026-07-26 horizon=short hours_out=-15.9 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[flightStatus] number lookup "AC506" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching YYZ (CYYZ)
[carrierHealth] computing AC
[carrierHealth] AC sample=51 cancelRate=0.000 avgDelay=62.9 healthScore=10 reliable=true
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] YYZ cat=VFR vis=15 ceil=10000 ts=false fz=false contrib=2
[flightStatus] DL5842 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5842 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 12:30Z","local":"2026-07-26 08:30-04:00"},"revisedTime":{"utc":"2026-07-26 12:40Z","local":"2026-07-26 08:40-04:00"},"runwayTime":{"utc":"2026-07-26 12:40Z","local":"2026-07-26 08:40-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL5842 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 12:30Z","revisedTime":"2026-07-26 12:40Z","runwayTime":"2026-07-26 12:40Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for DL5842
[flightStatus] DL5842 2026-07-26 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] DL5842 2026-07-26 horizon=short hours_out=-17.7 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":0}
[flightStatus] number lookup "XP394" 2026-07-26
[weather] fetching ATL (KATL)
[weather] fetching HVN (KHVN)
[carrierHealth] cache hit XP
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] PD616 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] PD616 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 14:05Z","local":"2026-07-26 10:05-04:00"},"revisedTime":{"utc":"2026-07-26 14:36Z","local":"2026-07-26 10:36-04:00"},"runwayTime":{"utc":"2026-07-26 14:36Z","local":"2026-07-26 10:36-04:00"},"terminal":"E","runway":"09","quality":["Basic","Live"]}
[flightStatus] PD616 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 14:05Z","revisedTime":"2026-07-26 14:36Z","runwayTime":"2026-07-26 14:36Z","terminal":"E","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for PD616
[flightStatus] PD616 2026-07-26 status=Arrived dep_delay=31 inbound_delay=0 cancelled=false
[riskScorer] PD616 2026-07-26 horizon=short hours_out=-16.1 raw_total=43 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] number lookup "UA1226" 2026-07-26
[weather] fetching ATL (KATL)
[weather] fetching EWR (KEWR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[nasStatus] EWR active programs: Arrival Delay, Departure Delay avgDelay=0min
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] EWR cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] HVN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2524 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA2524 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 16:40Z","local":"2026-07-26 11:40-05:00"},"revisedTime":{"utc":"2026-07-26 18:34Z","local":"2026-07-26 13:34-05:00"},"runwayTime":{"utc":"2026-07-26 18:34Z","local":"2026-07-26 13:34-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA2524 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 16:40Z","revisedTime":"2026-07-26 18:34Z","runwayTime":"2026-07-26 18:34Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 114min for AA2524
[flightStatus] computed inbound delay from revisedTime: 66min for AA2524
[flightStatus] AA2524 2026-07-26 status=Arrived dep_delay=114 inbound_delay=66 cancelled=false
[riskScorer] AA2524 2026-07-26 horizon=short hours_out=-14.6 raw_total=55 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[flightStatus] number lookup "WN364" 2026-07-26
[weather] fetching ATL (KATL)
[weather] fetching MSY (KMSY)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] MSY cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA2683 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2683 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 18:00Z","local":"2026-07-26 13:00-05:00"},"revisedTime":{"utc":"2026-07-26 18:54Z","local":"2026-07-26 13:54-05:00"},"runwayTime":{"utc":"2026-07-26 18:54Z","local":"2026-07-26 13:54-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2683 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 18:00Z","revisedTime":"2026-07-26 18:54Z","runwayTime":"2026-07-26 18:54Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 54min for UA2683
[flightStatus] computed inbound delay from revisedTime: 2min for UA2683
[flightStatus] UA2683 2026-07-26 status=Arrived dep_delay=54 inbound_delay=2 cancelled=false
[riskScorer] UA2683 2026-07-26 horizon=short hours_out=-13.2 raw_total=43 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[flightStatus] number lookup "AA2049" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching DFW (KDFW)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AC506 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AC506 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 14:15-05:00"},"revisedTime":{"utc":"2026-07-26 19:48Z","local":"2026-07-26 14:48-05:00"},"runwayTime":{"utc":"2026-07-26 19:48Z","local":"2026-07-26 14:48-05:00"},"terminal":"2","runway":"28R","quality":["Basic","Live"]}
[flightStatus] AC506 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 19:15Z","revisedTime":"2026-07-26 19:48Z","runwayTime":"2026-07-26 19:48Z","terminal":"2","runway":"28R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 33min for AC506
[flightStatus] computed inbound delay from revisedTime: 5min for AC506
[flightStatus] AC506 2026-07-26 status=Arrived dep_delay=33 inbound_delay=5 cancelled=false
[riskScorer] AC506 2026-07-26 horizon=short hours_out=-12.0 raw_total=48 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "DL2343" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching DTW (KDTW)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] DTW cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] XP394 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] XP394 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 15:20Z","local":"2026-07-26 11:20-04:00"},"revisedTime":{"utc":"2026-07-26 15:41Z","local":"2026-07-26 11:41-04:00"},"runwayTime":{"utc":"2026-07-26 15:41Z","local":"2026-07-26 11:41-04:00"},"runway":"27R","quality":["Basic","Live"]}
[flightStatus] XP394 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 15:20Z","revisedTime":"2026-07-26 15:41Z","runwayTime":"2026-07-26 15:41Z","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for XP394
[flightStatus] XP394 2026-07-26 status=Arrived dep_delay=21 inbound_delay=0 cancelled=false
[riskScorer] XP394 2026-07-26 horizon=short hours_out=-14.9 raw_total=31 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[flightStatus] number lookup "DL2093" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching TPA (KTPA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] TPA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA1226 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1226 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 16:41Z","local":"2026-07-26 12:41-04:00"},"revisedTime":{"utc":"2026-07-26 18:13Z","local":"2026-07-26 14:13-04:00"},"runwayTime":{"utc":"2026-07-26 18:13Z","local":"2026-07-26 14:13-04:00"},"terminal":"N","runway":"27R","quality":["Basic","Live"]}
[flightStatus] UA1226 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 16:41Z","revisedTime":"2026-07-26 18:13Z","runwayTime":"2026-07-26 18:13Z","terminal":"N","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 92min for UA1226
[flightStatus] computed inbound delay from revisedTime: 68min for UA1226
[flightStatus] UA1226 2026-07-26 status=Arrived dep_delay=92 inbound_delay=68 cancelled=false
[riskScorer] UA1226 2026-07-26 horizon=short hours_out=-13.5 raw_total=60 tier=red cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[flightStatus] number lookup "WN2640" 2026-07-26
[weather] fetching BOS (KBOS)
[weather] fetching BWI (KBWI)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[weather] BWI cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] WN364 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN364 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:05Z","local":"2026-07-26 14:05-04:00"},"revisedTime":{"utc":"2026-07-26 18:19Z","local":"2026-07-26 14:19-04:00"},"runwayTime":{"utc":"2026-07-26 18:19Z","local":"2026-07-26 14:19-04:00"},"terminal":"N","quality":["Basic","Live"]}
[flightStatus] WN364 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:05Z","revisedTime":"2026-07-26 18:19Z","runwayTime":"2026-07-26 18:19Z","terminal":"N","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for WN364
[flightStatus] WN364 2026-07-26 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[riskScorer] WN364 2026-07-26 horizon=short hours_out=-12.1 raw_total=25 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "WN4917" 2026-07-26
[weather] fetching BOS (KBOS)
[weather] fetching STL (KSTL)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA2049 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA2049 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 15:21Z","local":"2026-07-26 11:21-04:00"},"revisedTime":{"utc":"2026-07-26 15:36Z","local":"2026-07-26 11:36-04:00"},"runwayTime":{"utc":"2026-07-26 15:36Z","local":"2026-07-26 11:36-04:00"},"terminal":"8","runway":"13R","quality":["Basic","Live"]}
[flightStatus] AA2049 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 15:21Z","revisedTime":"2026-07-26 15:36Z","runwayTime":"2026-07-26 15:36Z","terminal":"8","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for AA2049
[flightStatus] AA2049 2026-07-26 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] AA2049 2026-07-26 horizon=short hours_out=-14.9 raw_total=23 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[flightStatus] number lookup "AA4008" 2026-07-26
[weather] fetching DFW (KDFW)
[weather] fetching LIT (KLIT)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL2343 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2343 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 16:59Z","local":"2026-07-26 12:59-04:00"},"revisedTime":{"utc":"2026-07-26 17:17Z","local":"2026-07-26 13:17-04:00"},"runwayTime":{"utc":"2026-07-26 17:17Z","local":"2026-07-26 13:17-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL2343 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 16:59Z","revisedTime":"2026-07-26 17:17Z","runwayTime":"2026-07-26 17:17Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for DL2343
[flightStatus] DL2343 2026-07-26 status=Arrived dep_delay=18 inbound_delay=0 cancelled=false
[riskScorer] DL2343 2026-07-26 horizon=short hours_out=-13.2 raw_total=31 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[rescore] progress: 1101/1166
[flightStatus] number lookup "AA1137" 2026-07-26
[weather] fetching DFW (KDFW)
[weather] fetching BOG (KBOG)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] STL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] fetch failed for KBOG: Unexpected end of JSON input
[flightStatus] DL2093 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2093 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:30Z","local":"2026-07-26 14:30-04:00"},"revisedTime":{"utc":"2026-07-26 18:53Z","local":"2026-07-26 14:53-04:00"},"runwayTime":{"utc":"2026-07-26 18:53Z","local":"2026-07-26 14:53-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL2093 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:30Z","revisedTime":"2026-07-26 18:53Z","runwayTime":"2026-07-26 18:53Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for DL2093
[flightStatus] DL2093 2026-07-26 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[riskScorer] DL2093 2026-07-26 horizon=short hours_out=-11.7 raw_total=33 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "AA2401" 2026-07-26
[weather] fetching DFW (KDFW)
[weather] fetching TPA (KTPA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] TPA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LIT cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN2640 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN2640 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 15:35Z","local":"2026-07-26 11:35-04:00"},"revisedTime":{"utc":"2026-07-26 16:22Z","local":"2026-07-26 12:22-04:00"},"runwayTime":{"utc":"2026-07-26 16:22Z","local":"2026-07-26 12:22-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] WN2640 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 15:35Z","revisedTime":"2026-07-26 16:22Z","runwayTime":"2026-07-26 16:22Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 47min for WN2640
[flightStatus] computed inbound delay from revisedTime: 21min for WN2640
[flightStatus] WN2640 2026-07-26 status=Arrived dep_delay=47 inbound_delay=21 cancelled=false
[flightStatus] WN4917 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN4917 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:53Z","local":"2026-07-26 14:53-04:00"},"revisedTime":{"utc":"2026-07-26 18:53Z","local":"2026-07-26 14:53-04:00"},"runwayTime":{"utc":"2026-07-26 18:53Z","local":"2026-07-26 14:53-04:00"},"terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] WN4917 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:53Z","revisedTime":"2026-07-26 18:53Z","runwayTime":"2026-07-26 18:53Z","terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 17min for WN4917
[flightStatus] WN4917 2026-07-26 status=Arrived dep_delay=0 inbound_delay=17 cancelled=false
[riskScorer] WN4917 2026-07-26 horizon=short hours_out=-12.0 raw_total=33 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "EI122" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching DUB (KDUB)
[carrierHealth] cache hit EI
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DUB cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4008 dep keys: airport,scheduledTime,quality
[flightStatus] AA4008 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:43Z","local":"2026-07-26 15:43-05:00"},"quality":["Basic"]}
[flightStatus] AA4008 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:43Z","quality":["Basic"]}
[flightStatus] AA4008 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA4008 2026-07-26 horizon=short hours_out=-10.5 raw_total=17 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "UA2306" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1137 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1137 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 21:56Z","local":"2026-07-26 16:56-05:00"},"revisedTime":{"utc":"2026-07-26 22:38Z","local":"2026-07-26 17:38-05:00"},"runwayTime":{"utc":"2026-07-26 22:38Z","local":"2026-07-26 17:38-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1137 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 21:56Z","revisedTime":"2026-07-26 22:38Z","runwayTime":"2026-07-26 22:38Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 42min for AA1137
[flightStatus] AA1137 2026-07-26 status=EnRoute dep_delay=42 inbound_delay=0 cancelled=false
[riskScorer] AA1137 2026-07-26 horizon=short hours_out=-9.3 raw_total=44 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "UA2481" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching SYR (KSYR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA2401 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA2401 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:30Z","local":"2026-07-26 18:30-05:00"},"revisedTime":{"utc":"2026-07-27 00:27Z","local":"2026-07-26 19:27-05:00"},"runwayTime":{"utc":"2026-07-27 00:27Z","local":"2026-07-26 19:27-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA2401 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:30Z","revisedTime":"2026-07-27 00:27Z","runwayTime":"2026-07-27 00:27Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 57min for AA2401
[flightStatus] computed inbound delay from revisedTime: 33min for AA2401
[flightStatus] AA2401 2026-07-26 status=EnRoute dep_delay=57 inbound_delay=33 cancelled=false
[riskScorer] AA2401 2026-07-26 horizon=short hours_out=-7.7 raw_total=47 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "DL5408" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching MCI (KMCI)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] MCI cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] EI122 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] EI122 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:45Z","local":"2026-07-26 15:45-05:00"},"revisedTime":{"utc":"2026-07-26 21:07Z","local":"2026-07-26 16:07-05:00"},"runwayTime":{"utc":"2026-07-26 21:07Z","local":"2026-07-26 16:07-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] EI122 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:45Z","revisedTime":"2026-07-26 21:07Z","runwayTime":"2026-07-26 21:07Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for EI122
[flightStatus] EI122 2026-07-26 status=EnRoute dep_delay=22 inbound_delay=0 cancelled=false
[riskScorer] EI122 2026-07-26 horizon=short hours_out=-10.5 raw_total=36 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "DL148" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching MLA (KMLA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KMLA: Unexpected end of JSON input
[flightStatus] UA2306 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2306 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 22:00Z","local":"2026-07-26 17:00-05:00"},"revisedTime":{"utc":"2026-07-26 22:39Z","local":"2026-07-26 17:39-05:00"},"runwayTime":{"utc":"2026-07-26 22:39Z","local":"2026-07-26 17:39-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2306 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 22:00Z","revisedTime":"2026-07-26 22:39Z","runwayTime":"2026-07-26 22:39Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 39min for UA2306
[flightStatus] UA2306 2026-07-26 status=Arrived dep_delay=39 inbound_delay=0 cancelled=false
[riskScorer] UA2306 2026-07-26 horizon=short hours_out=-9.2 raw_total=45 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "DL4914" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching IND (KIND)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] WN2640 2026-07-26 horizon=short hours_out=-14.6 raw_total=43 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":2,"connectionRisk":1}
[flightStatus] number lookup "DL2120" 2026-07-26
[weather] fetching LAX (KLAX)
[weather] fetching LAS (KLAS)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] UA2481 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2481 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:09Z","local":"2026-07-26 18:09-05:00"},"revisedTime":{"utc":"2026-07-26 23:34Z","local":"2026-07-26 18:34-05:00"},"runwayTime":{"utc":"2026-07-26 23:34Z","local":"2026-07-26 18:34-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2481 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:09Z","revisedTime":"2026-07-26 23:34Z","runwayTime":"2026-07-26 23:34Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 25min for UA2481
[flightStatus] UA2481 2026-07-26 status=Approaching dep_delay=25 inbound_delay=0 cancelled=false
[flightStatus] DL5408 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5408 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 19:38Z","local":"2026-07-26 15:38-04:00"},"revisedTime":{"utc":"2026-07-26 21:13Z","local":"2026-07-26 17:13-04:00"},"runwayTime":{"utc":"2026-07-26 21:13Z","local":"2026-07-26 17:13-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL5408 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 19:38Z","revisedTime":"2026-07-26 21:13Z","runwayTime":"2026-07-26 21:13Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 95min for DL5408
[flightStatus] computed inbound delay from revisedTime: 39min for DL5408
[flightStatus] DL5408 2026-07-26 status=Arrived dep_delay=95 inbound_delay=39 cancelled=false
[riskScorer] DL5408 2026-07-26 horizon=short hours_out=-10.6 raw_total=57 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "WS1425" 2026-07-26
[weather] fetching LAX (KLAX)
[weather] fetching YEG (KYEG)
[carrierHealth] cache hit WS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KYEG: Unexpected end of JSON input
[weather] IND cat=VFR vis=10 ceil=6000 ts=false fz=false contrib=2
[weather] SYR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] UA2481 2026-07-26 horizon=short hours_out=-8.1 raw_total=35 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "AF25" 2026-07-26
[weather] fetching LAX (KLAX)
[weather] fetching CDG (LFPG)
[carrierHealth] cache hit AF
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] CDG cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL148 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL148 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 21:05Z","local":"2026-07-26 17:05-04:00"},"revisedTime":{"utc":"2026-07-26 20:03Z","local":"2026-07-26 16:03-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL148 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 21:05Z","revisedTime":"2026-07-26 20:03Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL148 2026-07-26 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] DL148 2026-07-26 horizon=short hours_out=-9.1 raw_total=56 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "DL5814" 2026-07-26
[weather] fetching BOS (KBOS)
[weather] fetching JFK (KJFK)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL4914 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL4914 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 22:27Z","local":"2026-07-26 18:27-04:00"},"revisedTime":{"utc":"2026-07-26 23:15Z","local":"2026-07-26 19:15-04:00"},"runwayTime":{"utc":"2026-07-26 23:15Z","local":"2026-07-26 19:15-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL4914 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 22:27Z","revisedTime":"2026-07-26 23:15Z","runwayTime":"2026-07-26 23:15Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 48min for DL4914
[flightStatus] DL4914 2026-07-26 status=Arrived dep_delay=48 inbound_delay=0 cancelled=false
[riskScorer] DL4914 2026-07-26 horizon=short hours_out=-7.8 raw_total=47 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "TP218" 2026-07-26
[weather] fetching BOS (KBOS)
[weather] fetching LIS (KLIS)
[carrierHealth] cache hit TP
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KLIS: Unexpected end of JSON input
[flightStatus] DL2120 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2120 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 22:32Z","local":"2026-07-26 15:32-07:00"},"revisedTime":{"utc":"2026-07-26 22:49Z","local":"2026-07-26 15:49-07:00"},"runwayTime":{"utc":"2026-07-26 22:49Z","local":"2026-07-26 15:49-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL2120 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 22:32Z","revisedTime":"2026-07-26 22:49Z","runwayTime":"2026-07-26 22:49Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for DL2120
[flightStatus] DL2120 2026-07-26 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[riskScorer] DL2120 2026-07-26 horizon=short hours_out=-10.7 raw_total=33 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "AA3127" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching CHS (KCHS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WS1425 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WS1425 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 23:55Z","local":"2026-07-26 16:55-07:00"},"revisedTime":{"utc":"2026-07-27 00:29Z","local":"2026-07-26 17:29-07:00"},"runwayTime":{"utc":"2026-07-27 00:29Z","local":"2026-07-26 17:29-07:00"},"terminal":"2","runway":"24L","quality":["Basic","Live"]}
[flightStatus] WS1425 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 23:55Z","revisedTime":"2026-07-27 00:29Z","runwayTime":"2026-07-27 00:29Z","terminal":"2","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 34min for WS1425
[flightStatus] WS1425 2026-07-26 status=EnRoute dep_delay=34 inbound_delay=0 cancelled=false
[riskScorer] WS1425 2026-07-26 horizon=short hours_out=-9.3 raw_total=38 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "AA3607" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching GSP (KGSP)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] GSP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AF25 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AF25 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 01:25Z","local":"2026-07-26 18:25-07:00"},"revisedTime":{"utc":"2026-07-27 01:40Z","local":"2026-07-26 18:40-07:00"},"runwayTime":{"utc":"2026-07-27 01:40Z","local":"2026-07-26 18:40-07:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AF25 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 01:25Z","revisedTime":"2026-07-27 01:40Z","runwayTime":"2026-07-27 01:40Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for AF25
[flightStatus] AF25 2026-07-26 status=EnRoute dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] AF25 2026-07-26 horizon=short hours_out=-7.8 raw_total=24 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "AA1880" 2026-07-26
[weather] fetching ORD (KORD)
[weather] fetching LAS (KLAS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] LAS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] CHS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] DL5814 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5814 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 21:05Z","local":"2026-07-26 17:05-04:00"},"revisedTime":{"utc":"2026-07-26 21:29Z","local":"2026-07-26 17:29-04:00"},"runwayTime":{"utc":"2026-07-26 21:29Z","local":"2026-07-26 17:29-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL5814 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 21:05Z","revisedTime":"2026-07-26 21:29Z","runwayTime":"2026-07-26 21:29Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 24min for DL5814
[flightStatus] DL5814 2026-07-26 status=Arrived dep_delay=24 inbound_delay=0 cancelled=false
[riskScorer] DL5814 2026-07-26 horizon=short hours_out=-9.1 raw_total=33 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":2,"connectionRisk":2}
[flightStatus] number lookup "DL3021" 2026-07-26
[weather] fetching ATL (KATL)
[weather] fetching PNS (KPNS)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] PNS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] TP218 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] TP218 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 22:05Z","local":"2026-07-26 18:05-04:00"},"revisedTime":{"utc":"2026-07-26 22:15Z","local":"2026-07-26 18:15-04:00"},"runwayTime":{"utc":"2026-07-26 22:15Z","local":"2026-07-26 18:15-04:00"},"terminal":"C","runway":"09","quality":["Basic","Live"]}
[flightStatus] TP218 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 22:05Z","revisedTime":"2026-07-26 22:15Z","runwayTime":"2026-07-26 22:15Z","terminal":"C","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for TP218
[flightStatus] TP218 2026-07-26 status=EnRoute dep_delay=10 inbound_delay=0 cancelled=false
[riskScorer] TP218 2026-07-26 horizon=short hours_out=-8.1 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "DL1104" 2026-07-26
[weather] fetching ATL (KATL)
[weather] fetching DAL (KDAL)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA3127 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA3127 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 19:45-05:00"},"revisedTime":{"utc":"2026-07-27 00:51Z","local":"2026-07-26 19:51-05:00"},"runwayTime":{"utc":"2026-07-27 00:51Z","local":"2026-07-26 19:51-05:00"},"terminal":"3","runway":"22L","quality":["Basic","Live"]}
[flightStatus] AA3127 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:45Z","revisedTime":"2026-07-27 00:51Z","runwayTime":"2026-07-27 00:51Z","terminal":"3","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 6min for AA3127
[flightStatus] AA3127 2026-07-26 status=EnRoute dep_delay=6 inbound_delay=0 cancelled=false
[riskScorer] AA3127 2026-07-26 horizon=short hours_out=-6.5 raw_total=27 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "DL2810" 2026-07-26
[weather] fetching ATL (KATL)
[weather] fetching DAB (KDAB)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] DAB cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DAL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA3607 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3607 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 01:59Z","local":"2026-07-26 20:59-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3607 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 01:59Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3607 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA3607 2026-07-26 horizon=short hours_out=-5.2 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "JU501" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching BEG (KBEG)
[carrierHealth] computing JU
[carrierHealth] JU sample=20 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA1880 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] AA1880 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 02:59Z","local":"2026-07-26 21:59-05:00"},"revisedTime":{"utc":"2026-07-27 02:59Z","local":"2026-07-26 21:59-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1880 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 02:59Z","revisedTime":"2026-07-27 02:59Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1880 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA1880 2026-07-26 horizon=short hours_out=-4.2 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "BA172" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching LHR (EGLL)
[carrierHealth] computing BA
[carrierHealth] BA sample=49 cancelRate=0.000 avgDelay=42.7 healthScore=7 reliable=true
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] LHR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KBEG: Unexpected end of JSON input
[flightStatus] DL3021 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3021 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 23:49Z","local":"2026-07-26 19:49-04:00"},"revisedTime":{"utc":"2026-07-26 23:55Z","local":"2026-07-26 19:55-04:00"},"runwayTime":{"utc":"2026-07-26 23:55Z","local":"2026-07-26 19:55-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL3021 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 23:49Z","revisedTime":"2026-07-26 23:55Z","runwayTime":"2026-07-26 23:55Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 6min for DL3021
[flightStatus] DL3021 2026-07-26 status=Arrived dep_delay=6 inbound_delay=0 cancelled=false
[riskScorer] DL3021 2026-07-26 horizon=short hours_out=-6.4 raw_total=27 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "LO27" 2026-07-26
[weather] fetching JFK (KJFK)
[weather] fetching WAW (KWAW)
[carrierHealth] cache hit LO
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KWAW: Unexpected end of JSON input
[flightStatus] DL1104 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1104 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 01:15Z","local":"2026-07-26 21:15-04:00"},"revisedTime":{"utc":"2026-07-27 01:27Z","local":"2026-07-26 21:27-04:00"},"runwayTime":{"utc":"2026-07-27 01:27Z","local":"2026-07-26 21:27-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1104 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 01:15Z","revisedTime":"2026-07-27 01:27Z","runwayTime":"2026-07-27 01:27Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL1104
[flightStatus] DL1104 2026-07-26 status=EnRoute dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] DL1104 2026-07-26 horizon=short hours_out=-5.0 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "UA3719" 2026-07-26
[weather] fetching BOS (KBOS)
[weather] fetching EWR (KEWR)
[carrierHealth] cache hit UA
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] EWR active programs: Arrival Delay, Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 7 airports
[weather] EWR cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL2810 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL2810 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:49Z","local":"2026-07-26 22:49-04:00"},"revisedTime":{"utc":"2026-07-27 02:49Z","local":"2026-07-26 22:49-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL2810 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:49Z","revisedTime":"2026-07-27 02:49Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL2810 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL2810 2026-07-26 horizon=short hours_out=-3.4 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "DL5704" 2026-07-26
[weather] fetching BOS (KBOS)
[weather] fetching DCA (KDCA)
[carrierHealth] cache hit DL
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DCA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] JU501 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] JU501 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 23:30Z","local":"2026-07-26 19:30-04:00"},"revisedTime":{"utc":"2026-07-27 00:16Z","local":"2026-07-26 20:16-04:00"},"runwayTime":{"utc":"2026-07-27 00:16Z","local":"2026-07-26 20:16-04:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] JU501 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 23:30Z","revisedTime":"2026-07-27 00:16Z","runwayTime":"2026-07-27 00:16Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 46min for JU501
[flightStatus] JU501 2026-07-26 status=EnRoute dep_delay=46 inbound_delay=0 cancelled=false
[riskScorer] JU501 2026-07-26 horizon=short hours_out=-6.7 raw_total=40 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "UA4568" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching SCE (KSCE)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KSCE: Unexpected end of JSON input
[flightStatus] BA172 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] BA172 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 00:55Z","local":"2026-07-26 20:55-04:00"},"revisedTime":{"utc":"2026-07-27 01:13Z","local":"2026-07-26 21:13-04:00"},"runwayTime":{"utc":"2026-07-27 01:13Z","local":"2026-07-26 21:13-04:00"},"terminal":"8","runway":"22R","quality":["Basic","Live"]}
[flightStatus] BA172 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 00:55Z","revisedTime":"2026-07-27 01:13Z","runwayTime":"2026-07-27 01:13Z","terminal":"8","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for BA172
[flightStatus] BA172 2026-07-26 status=EnRoute dep_delay=18 inbound_delay=0 cancelled=false
[riskScorer] BA172 2026-07-26 horizon=short hours_out=-5.3 raw_total=37 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "BW521" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching POS (KPOS)
[carrierHealth] cache hit BW
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] LO27 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] LO27 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:20Z","local":"2026-07-26 22:20-04:00"},"revisedTime":{"utc":"2026-07-27 02:20Z","local":"2026-07-26 22:20-04:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] LO27 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:20Z","revisedTime":"2026-07-27 02:20Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] LO27 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] LO27 2026-07-26 horizon=short hours_out=-3.9 raw_total=20 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":0,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "DL1955" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching MBJ (KMBJ)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KMBJ: Unexpected end of JSON input
[weather] fetch failed for KPOS: Unexpected end of JSON input
[flightStatus] UA3719 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA3719 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 00:51Z","local":"2026-07-26 20:51-04:00"},"revisedTime":{"utc":"2026-07-27 00:38Z","local":"2026-07-26 20:38-04:00"},"runwayTime":{"utc":"2026-07-27 00:51Z","local":"2026-07-26 20:51-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] UA3719 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 00:51Z","revisedTime":"2026-07-27 00:38Z","runwayTime":"2026-07-27 00:51Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] UA3719 2026-07-26 status=Arrived dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA3719 2026-07-26 horizon=short hours_out=-5.8 raw_total=26 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "UA1941" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching ORD (KORD)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL5704 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5704 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 01:48Z","local":"2026-07-26 21:48-04:00"},"revisedTime":{"utc":"2026-07-27 01:57Z","local":"2026-07-26 21:57-04:00"},"runwayTime":{"utc":"2026-07-27 01:57Z","local":"2026-07-26 21:57-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL5704 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 01:48Z","revisedTime":"2026-07-27 01:57Z","runwayTime":"2026-07-27 01:57Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for DL5704
[flightStatus] DL5704 2026-07-26 status=EnRoute dep_delay=9 inbound_delay=0 cancelled=false
[riskScorer] DL5704 2026-07-26 horizon=short hours_out=-4.4 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":7,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":2,"connectionRisk":3}
[flightStatus] number lookup "AA238" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching JFK (KJFK)
[carrierHealth] cache hit AA
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] UA4568 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA4568 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 15:25Z","local":"2026-07-27 10:25-05:00"},"terminal":"2","quality":["Basic"]}
[flightStatus] UA4568 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 15:25Z","terminal":"2","quality":["Basic"]}
[flightStatus] UA4568 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA4568 2026-07-27 horizon=medium hours_out=8.2 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "DL5703" 2026-07-27
[weather] fetching BOS (KBOS)
[weather] fetching BWI (KBWI)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] BW521 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] BW521 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 11:00Z","local":"2026-07-27 07:00-04:00"},"terminal":"4","quality":["Basic"]}
[flightStatus] BW521 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 11:00Z","terminal":"4","quality":["Basic"]}
[flightStatus] BW521 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] BW521 2026-07-27 horizon=medium hours_out=4.8 raw_total=14 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":0}
[flightStatus] number lookup "AA2501" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching VPS (KVPS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] BWI cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[flightStatus] DL1955 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL1955 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 12:20Z","local":"2026-07-27 08:20-04:00"},"terminal":"4","quality":["Basic"]}
[flightStatus] DL1955 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 12:20Z","terminal":"4","quality":["Basic"]}
[flightStatus] DL1955 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL1955 2026-07-27 horizon=medium hours_out=6.1 raw_total=14 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":0}
[flightStatus] number lookup "AA1894" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching GSO (KGSO)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] GSO cat=VFR vis=10 ceil=5000 ts=false fz=false contrib=2
[flightStatus] UA1941 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA1941 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 14:00Z","local":"2026-07-27 07:00-07:00"},"terminal":"7","quality":["Basic"]}
[flightStatus] UA1941 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 14:00Z","terminal":"7","quality":["Basic"]}
[flightStatus] UA1941 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA1941 2026-07-27 horizon=medium hours_out=4.8 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":0}
[flightStatus] number lookup "DL3507" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching SHV (KSHV)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] SHV cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA238 dep keys: airport,scheduledTime,quality
[flightStatus] AA238 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 17:11Z","local":"2026-07-27 10:11-07:00"},"quality":["Basic"]}
[flightStatus] AA238 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 17:11Z","quality":["Basic"]}
[flightStatus] AA238 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA238 2026-07-27 horizon=medium hours_out=8.0 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "UA1226" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching EWR (KEWR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] EWR active programs: Arrival Delay, Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] EWR cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] VPS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL5703 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL5703 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 10:35Z","local":"2026-07-27 06:35-04:00"},"terminal":"A","quality":["Basic"]}
[flightStatus] DL5703 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 10:35Z","terminal":"A","quality":["Basic"]}
[flightStatus] DL5703 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL5703 2026-07-27 horizon=medium hours_out=4.4 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":0}
[flightStatus] number lookup "DL2467" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching MYR (KMYR)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA2501 dep keys: airport,scheduledTime,quality
[flightStatus] AA2501 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 17:46Z","local":"2026-07-27 12:46-05:00"},"quality":["Basic"]}
[flightStatus] AA2501 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 17:46Z","quality":["Basic"]}
[flightStatus] AA2501 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA2501 2026-07-27 horizon=medium hours_out=10.5 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "AA1743" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching PHL (KPHL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] PHL cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1894 dep keys: airport,scheduledTime,quality
[flightStatus] AA1894 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 19:25Z","local":"2026-07-27 14:25-05:00"},"quality":["Basic"]}
[flightStatus] AA1894 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 19:25Z","quality":["Basic"]}
[flightStatus] AA1894 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA1894 2026-07-27 horizon=medium hours_out=12.2 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "UA2189" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[flightStatus] DL3507 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL3507 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 15:21Z","local":"2026-07-27 11:21-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL3507 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 15:21Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL3507 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL3507 2026-07-27 horizon=medium hours_out=9.1 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "UA2451" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching IAH (KIAH)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MYR cat=VFR vis=10 ceil=4800 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] IAH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA1226 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA1226 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 16:40Z","local":"2026-07-27 12:40-04:00"},"terminal":"N","quality":["Basic"]}
[flightStatus] UA1226 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 16:40Z","terminal":"N","quality":["Basic"]}
[flightStatus] UA1226 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA1226 2026-07-27 horizon=medium hours_out=10.4 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "DL2775" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching MCO (KMCO)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] MCO cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL2467 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL2467 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 18:12Z","local":"2026-07-27 14:12-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL2467 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 18:12Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL2467 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL2467 2026-07-27 horizon=medium hours_out=12.0 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "AA4453" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching CLE (KCLE)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA1743 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA1743 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 16:40Z","local":"2026-07-27 11:40-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA1743 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 16:40Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA1743 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA1743 2026-07-27 horizon=medium hours_out=9.4 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "AS6" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching DCA (KDCA)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA2189 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA2189 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 18:00Z","local":"2026-07-27 13:00-05:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] UA2189 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 18:00Z","terminal":"1","quality":["Basic"]}
[flightStatus] UA2189 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA2189 2026-07-27 horizon=medium hours_out=10.8 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "DL3794" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching GEG (KGEG)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] GEG cat=VFR vis=8 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] CLE cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA2451 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA2451 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 19:15Z","local":"2026-07-27 14:15-05:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] UA2451 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 19:15Z","terminal":"1","quality":["Basic"]}
[flightStatus] UA2451 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA2451 2026-07-27 horizon=medium hours_out=12.0 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "WN3225" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching HOU (KHOU)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] HOU cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] DCA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL2775 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL2775 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 15:27Z","local":"2026-07-27 11:27-04:00"},"terminal":"4","quality":["Basic"]}
[flightStatus] DL2775 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 15:27Z","terminal":"4","quality":["Basic"]}
[flightStatus] DL2775 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL2775 2026-07-27 horizon=medium hours_out=9.2 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "WN4208" 2026-07-27
[weather] fetching BOS (KBOS)
[weather] fetching DEN (KDEN)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KDEN: Unexpected end of JSON input
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4453 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA4453 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 16:59Z","local":"2026-07-27 12:59-04:00"},"terminal":"8","quality":["Basic"]}
[flightStatus] AA4453 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 16:59Z","terminal":"8","quality":["Basic"]}
[flightStatus] AA4453 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA4453 2026-07-27 horizon=medium hours_out=10.8 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "AA2194" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching MSY (KMSY)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] MSY cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AS6 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AS6 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 18:48Z","local":"2026-07-27 11:48-07:00"},"terminal":"6","quality":["Basic"]}
[flightStatus] AS6 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 18:48Z","terminal":"6","quality":["Basic"]}
[flightStatus] AS6 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AS6 2026-07-27 horizon=medium hours_out=9.6 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "AA1137" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching BOG (KBOG)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KBOG: Unexpected end of JSON input
[flightStatus] DL3794 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL3794 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 20:00Z","local":"2026-07-27 13:00-07:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] DL3794 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 20:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] DL3794 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL3794 2026-07-27 horizon=medium hours_out=10.8 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "AA2401" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching TPA (KTPA)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] TPA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN3225 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] WN3225 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 21:10Z","local":"2026-07-27 14:10-07:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] WN3225 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 21:10Z","terminal":"1","quality":["Basic"]}
[flightStatus] WN3225 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] WN3225 2026-07-27 horizon=medium hours_out=11.9 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "UA516" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching ORD (KORD)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN4208 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] WN4208 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 15:35Z","local":"2026-07-27 11:35-04:00"},"terminal":"B","quality":["Basic"]}
[flightStatus] WN4208 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 15:35Z","terminal":"B","quality":["Basic"]}
[flightStatus] WN4208 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] WN4208 2026-07-27 horizon=medium hours_out=9.4 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[flightStatus] number lookup "DL472" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] AA2194 dep keys: airport,scheduledTime,quality
[flightStatus] AA2194 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 20:39Z","local":"2026-07-27 15:39-05:00"},"quality":["Basic"]}
[flightStatus] AA2194 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 20:39Z","quality":["Basic"]}
[flightStatus] AA2194 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA2194 2026-07-27 horizon=medium hours_out=13.4 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "DL743" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching SMF (KSMF)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] SMF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1137 dep keys: airport,scheduledTime,quality
[flightStatus] AA1137 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 21:56Z","local":"2026-07-27 16:56-05:00"},"quality":["Basic"]}
[flightStatus] AA1137 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 21:56Z","quality":["Basic"]}
[flightStatus] AA1137 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA1137 2026-07-27 horizon=medium hours_out=14.7 raw_total=17 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[rescore] progress: 1151/1166
[flightStatus] number lookup "BA294" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching LHR (EGLL)
[carrierHealth] cache hit BA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LHR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SEA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA2401 dep keys: airport,scheduledTime,quality
[flightStatus] AA2401 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 23:30Z","local":"2026-07-27 18:30-05:00"},"quality":["Basic"]}
[flightStatus] AA2401 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 23:30Z","quality":["Basic"]}
[flightStatus] AA2401 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA2401 2026-07-27 horizon=medium hours_out=16.3 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[flightStatus] number lookup "UA1583" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching RIC (KRIC)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] UA516 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA516 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 19:30Z","local":"2026-07-27 15:30-04:00"},"terminal":"N","quality":["Basic"]}
[flightStatus] UA516 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 19:30Z","terminal":"N","quality":["Basic"]}
[flightStatus] UA516 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA516 2026-07-27 horizon=medium hours_out=13.3 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "DL1638" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching PBI (KPBI)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KPBI: Unexpected end of JSON input
[flightStatus] DL472 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL472 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 20:45Z","local":"2026-07-27 16:45-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL472 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 20:45Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL472 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL472 2026-07-27 horizon=medium hours_out=14.5 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "SK924" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching OSL (KOSL)
[carrierHealth] cache hit SK
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] RIC cat=VFR vis=9 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KOSL: Unexpected end of JSON input
[flightStatus] DL743 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL743 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 21:59Z","local":"2026-07-27 17:59-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL743 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 21:59Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL743 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL743 2026-07-27 horizon=medium hours_out=15.7 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "WN1571" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching LAS (KLAS)
[carrierHealth] cache hit WN
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] BA294 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] BA294 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 22:00Z","local":"2026-07-27 17:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] BA294 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 22:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] BA294 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] BA294 2026-07-27 horizon=medium hours_out=14.8 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "AS1397" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching PDX (KPDX)
[carrierHealth] cache hit AS
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] UA1583 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA1583 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 23:10Z","local":"2026-07-27 18:10-05:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] UA1583 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 23:10Z","terminal":"1","quality":["Basic"]}
[flightStatus] UA1583 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA1583 2026-07-27 horizon=medium hours_out=15.9 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[flightStatus] number lookup "DL5814" 2026-07-27
[weather] fetching BOS (KBOS)
[weather] fetching JFK (KJFK)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL1638 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL1638 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 19:45Z","local":"2026-07-27 15:45-04:00"},"terminal":"4","quality":["Basic"]}
[flightStatus] DL1638 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 19:45Z","terminal":"4","quality":["Basic"]}
[flightStatus] DL1638 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL1638 2026-07-27 horizon=medium hours_out=13.5 raw_total=17 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "AA2992" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching GSP (KGSP)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] PDX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] SK924 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] SK924 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 21:10Z","local":"2026-07-27 17:10-04:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] SK924 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 21:10Z","terminal":"1","quality":["Basic"]}
[flightStatus] SK924 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] SK924 2026-07-27 horizon=medium hours_out=14.9 raw_total=14 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "AA2346" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching ORD (KORD)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN1571 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] WN1571 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-28 00:00Z","local":"2026-07-27 17:00-07:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] WN1571 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-28 00:00Z","terminal":"1","quality":["Basic"]}
[flightStatus] WN1571 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] WN1571 2026-07-27 horizon=medium hours_out=14.8 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "DL4722" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching CHA (KCHA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] CHA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AS1397 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AS1397 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-28 01:27Z","local":"2026-07-27 18:27-07:00"},"terminal":"6","quality":["Basic"]}
[flightStatus] AS1397 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-28 01:27Z","terminal":"6","quality":["Basic"]}
[flightStatus] AS1397 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AS1397 2026-07-27 horizon=medium hours_out=16.2 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[flightStatus] number lookup "DL3117" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching JAN (KJAN)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] JAN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL5814 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL5814 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 21:05Z","local":"2026-07-27 17:05-04:00"},"terminal":"A","quality":["Basic"]}
[flightStatus] DL5814 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 21:05Z","terminal":"A","quality":["Basic"]}
[flightStatus] DL5814 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL5814 2026-07-27 horizon=medium hours_out=14.8 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[flightStatus] number lookup "UA1580" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching YVR (CYVR)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 7 airports
[weather] ORD cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] YVR cat=VFR vis=15 ceil=6200 ts=false fz=false contrib=2
[flightStatus] AA2992 dep keys: airport,scheduledTime,quality
[flightStatus] AA2992 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-28 00:50Z","local":"2026-07-27 19:50-05:00"},"quality":["Basic"]}
[flightStatus] AA2992 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-28 00:50Z","quality":["Basic"]}
[flightStatus] AA2992 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] AA2346 dep keys: airport,scheduledTime,quality
[flightStatus] AA2346 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-28 02:00Z","local":"2026-07-27 21:00-05:00"},"quality":["Basic"]}
[flightStatus] AA2346 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-28 02:00Z","quality":["Basic"]}
[flightStatus] AA2346 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA2346 2026-07-27 horizon=medium hours_out=18.8 raw_total=22 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":3,"dayOfWeekRisk":3,"connectionRisk":4}
[flightStatus] number lookup "AA292" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching DEL (KDEL)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL4722 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL4722 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 23:45Z","local":"2026-07-27 19:45-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL4722 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 23:45Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL4722 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL4722 2026-07-27 horizon=medium hours_out=17.5 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[flightStatus] number lookup "DL114" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching OPO (KOPO)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 7 airports
[weather] JFK cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[weather] fetch failed for KOPO: Unexpected end of JSON input
[weather] fetch failed for KDEL: Unexpected end of JSON input
[flightStatus] DL3117 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL3117 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-28 02:48Z","local":"2026-07-27 22:48-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL3117 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-28 02:48Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL3117 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL3117 2026-07-27 horizon=medium hours_out=20.6 raw_total=22 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":3,"dayOfWeekRisk":3,"connectionRisk":4}
[flightStatus] number lookup "AA4908" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching SMF (KSMF)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 7 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 7 airports
[flightStatus] UA1580 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA1580 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-28 00:45Z","local":"2026-07-27 19:45-05:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] UA1580 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-28 00:45Z","terminal":"1","quality":["Basic"]}
[flightStatus] UA1580 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA1580 2026-07-27 horizon=medium hours_out=17.5 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[rescore] progress: 1166/1166
[flightStatus] number lookup "PD618" 2026-07-27
[weather] fetching BOS (KBOS)
[weather] fetching YYZ (CYYZ)
[carrierHealth] cache hit PD
[nasStatus] fetched airport-events: 7 airports
[nasStatus] fetched airport-events: 7 airports
[weather] BOS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] YYZ cat=VFR vis=15 ceil=10000 ts=false fz=false contrib=2
[flightStatus] AA292 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA292 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-28 00:55Z","local":"2026-07-27 20:55-04:00"},"terminal":"8","quality":["Basic"]}
[flightStatus] AA292 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-28 00:55Z","terminal":"8","quality":["Basic"]}
[flightStatus] AA292 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA292 2026-07-27 horizon=medium hours_out=18.7 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":3,"dayOfWeekRisk":3,"connectionRisk":4}
[flightStatus] DL114 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL114 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:20Z","local":"2026-07-26 22:20-04:00"},"revisedTime":{"utc":"2026-07-27 02:20Z","local":"2026-07-26 22:20-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL114 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:20Z","revisedTime":"2026-07-27 02:20Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL114 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL114 2026-07-27 horizon=medium hours_out=20.2 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":3,"dayOfWeekRisk":3,"connectionRisk":4}
[flightStatus] AA4908 dep keys: airport,scheduledTime,quality
[flightStatus] AA4908 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-28 04:44Z","local":"2026-07-27 21:44-07:00"},"quality":["Basic"]}
[flightStatus] AA4908 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-28 04:44Z","quality":["Basic"]}
[flightStatus] AA4908 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] GSP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA2992 2026-07-27 horizon=medium hours_out=17.6 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[flightStatus] PD618 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] PD618 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 23:30Z","local":"2026-07-27 19:30-04:00"},"terminal":"E","quality":["Basic"]}
[flightStatus] PD618 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 23:30Z","terminal":"E","quality":["Basic"]}
[flightStatus] PD618 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] PD618 2026-07-27 horizon=medium hours_out=17.3 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[weather] SMF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA4908 2026-07-27 horizon=medium hours_out=19.5 raw_total=22 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":7,"historicalOtp":3,"timeOfDayRisk":3,"dayOfWeekRisk":3,"connectionRisk":4}
[rescore] Done