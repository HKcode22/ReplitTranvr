flightStatus] DL3794 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 20:00Z","local":"2026-07-27 13:00-07:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] DL3794 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 20:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] DL3794 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL3794 2026-07-27 horizon=medium hours_out=12.8 raw_total=10 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1463 score=10 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1467 AA1137 DFW->BOG 2026-07-27
[historicalOtp] AA1137 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA1137/history/recent
[flightStatus] DL5641 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5641 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:54Z","local":"2026-07-26 14:54-04:00"},"revisedTime":{"utc":"2026-07-26 19:57Z","local":"2026-07-26 15:57-04:00"},"runwayTime":{"utc":"2026-07-26 19:57Z","local":"2026-07-26 15:57-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL5641 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:54Z","revisedTime":"2026-07-26 19:57Z","runwayTime":"2026-07-26 19:57Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 63min for DL5641
[flightStatus] computed inbound delay from revisedTime: 17min for DL5641
[flightStatus] DL5641 2026-07-26 status=Arrived dep_delay=63 inbound_delay=17 cancelled=false
[flightStatus] number lookup "AS748" 2026-07-26
[historicalOtp] AA1137 HTTP 404 Not Found
[historicalOtp] AA1137 raw response (first 500 chars): 
[historicalOtp] AA1137 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AA1137" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching BOG (KBOG)
[nasStatus] cache hit DFW
[carrieealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KBOG: Unexpected end of JSON input
[flightStatus] HTTP 429 for "AS748" 2026-07-26
[flightStatus] number lookup "AS 748" 2026-07-26
[flightStatus] AA1137 dep keys: airport,scheduledTime,quality
[flightStatus] AA1137 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 21:56Z","local":"2026-07-27 16:56-05:00"},"quality":["Basic"]}
[flightStatus] AA1137 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 21:56Z","quality":["Basic"]}
[flightStatus] AA1137 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA1137 2026-07-27 horizon=medium hours_out=16.8 raw_total=14 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1467 score=14 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1470 DL472 ATL->SEA 2026-07-27
[historicalOtp] DL472 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL472/history/recent
[flightStatus] AS748 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS748 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 14:00Z","local":"2026-07-26 07:00-07:00"},"revisedTime":{"utc":"2026-07-26 14:19Z","local":"2026-07-26 07:19-07:00"},"runwayTime":{"utc":"2026-07-26 14:19Z","local":"2026-07-26 07:19-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS748 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 14:00Z","revisedTime":"2026-07-26 14:19Z","runwayTime":"2026-07-26 14:19Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AS748
[flightStatus] AS748 2026-07-26 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA4918" 2026-07-26
[historicalOtp] DL472 HTTP 404 Not Found
[historicalOtp] DL472 raw response (first 500 chars): 
[historicalOtp] DL472 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=050
[flightStatus] number lookup "DL472" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching SEA (KSEA)
[nasStatus] cache hit ATL
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] HTTP 429 for "AA4918" 2026-07-26
[flightStatus] number lookup "AA 4918" 2026-07-26
[flightStatus] DL472 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL472 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 20:45Z","local":"2026-07-27 16:45-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL472 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 20:45Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL472 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] SEA cat=VFR vis=10 ceil=5000 ts=false fz=false contrib=2
[riskScorer] DL472 2026-07-27 horizon=medium hours_out=16.6 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1470 score=12 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] cycle end checked=41 alerts=0 elapsed_ms=89690
[flightStatus] AA4918 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA4918 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:51Z","local":"2026-07-26 08:51-05:00"},"revisedTime":{"utc":"2026-07-26 14:14Z","local":"2026-07-26 09:14-05:00"},"runwayTime":{"utc":"2026-07-26 14:14Z","local":"2026-07-26 09:14-05:00"},"terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA4918 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:51Z","revisedTime":"2026-07-26 14:14Z","runwayTime":"2026-07-26 14:14Z","terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for AA4918
[flightStatus] AA4918 2026-07-26 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA1484" 2026-07-26
[flightStatus] UA1484 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1484 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:40Z","local":"2026-07-26 08:40-05:00"},"revisedTime":{"utc":"2026-07-26 13:55Z","local":"2026-07-26 08:55-05:00"},"runwayTime":{"utc":"2026-07-26 13:55Z","local":"2026-07-26 08:55-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1484 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:40Z","revisedTime":"2026-07-26 13:55Z","runwayTime":"2026-07-26 13:55Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for UA1484
[flightStatus] UA1484 2026-07-26 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[flightStatus] number lookup "VS26" 2026-07-26
[flightStatus] HTTP 429 for "VS26" 2026-07-26
[flightStatus] number lookup "VS 26" 2026-07-26
[flightStatus] VS26 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] VS26 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 12:15Z","local":"2026-07-26 08:15-04:00"},"revisedTime":{"utc":"2026-07-26 12:24Z","local":"2026-07-26 08:24-04:00"},"runwayTime":{"utc":"2026-07-26 12:24Z","local":"2026-07-26 08:24-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] VS26 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 12:15Z","revisedTime":"2026-07-26 12:24Z","runwayTime":"2026-07-26 12:24Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for VS26
[flightStatus] VS26 2026-07-26 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA703" 2026-07-26
[flightStatus] UA703 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA703 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 14:00Z","local":"2026-07-26 07:00-07:00"},"revisedTime":{"utc":"2026-07-26 14:16Z","local":"2026-07-26 07:16-07:00"},"runwayTime":{"utc":"2026-07-26 14:16Z","local":"2026-07-26 07:16-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA703 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 14:00Z","revisedTime":"2026-07-26 14:16Z","runwayTime":"2026-07-26 14:16Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for UA703
[flightStatus] UA703 2026-07-26 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL695" 2026-07-26
[flightStatus] DL695 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL695 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 10:45Z","local":"2026-07-26 06:45-04:00"},"revisedTime":{"utc":"2026-07-26 10:48Z","local":"2026-07-26 06:48-04:00"},"runwayTime":{"utc":"2026-07-26 10:48Z","local":"2026-07-26 06:48-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL695 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 10:45Z","revisedTime":"2026-07-26 10:48Z","runwayTime":"2026-07-26 10:48Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 3min for DL695
[flightStatus] DL695 2026-07-26 status=Arrived dep_delay=3 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA1743" 2026-07-26
[flightStatus] HTTP 429 for "AA1743" 2026-07-26
[flightStatus] number lookup "AA 1743" 2026-07-26
[flightStatus] AA1743 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA1743 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 16:40Z","local":"2026-07-26 11:40-05:00"},"revisedTime":{"utc":"2026-07-26 18:53Z","local":"2026-07-26 13:53-05:00"},"runwayTime":{"utc":"2026-07-26 18:53Z","local":"2026-07-26 13:53-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1743 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 16:40Z","revisedTime":"2026-07-26 18:53Z","runwayTime":"2026-07-26 18:53Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 133min for AA1743
[flightStatus] computed inbound delay from revisedTime: 94min for AA1743
[flightStatus] AA1743 2026-07-26 status=Arrived dep_delay=133 inbound_delay=94 cancelled=false
[flightStatus] number lookup "UA2202" 2026-07-26
[flightStatus] UA2202 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2202 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:09Z","local":"2026-07-26 18:09-05:00"},"revisedTime":{"utc":"2026-07-26 23:40Z","local":"2026-07-26 18:40-05:00"},"runwayTime":{"utc":"2026-07-26 23:40Z","local":"2026-07-26 18:40-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2202 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:09Z","revisedTime":"2026-07-26 23:40Z","runwayTime":"2026-07-26 23:40Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for UA2202
[flightStatus] UA2202 2026-07-26 status=EnRoute dep_delay=31 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA5459" 2026-07-26
[flightStatus] UA5459 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA5459 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 23:55Z","local":"2026-07-26 16:55-07:00"},"revisedTime":{"utc":"2026-07-26 23:53Z","local":"2026-07-26 16:53-07:00"},"runwayTime":{"utc":"2026-07-26 23:53Z","local":"2026-07-26 16:53-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA5459 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 23:55Z","revisedTime":"2026-07-26 23:53Z","runwayTime":"2026-07-26 23:53Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 4min for UA5459
[flightStatus] UA5459 2026-07-26 status=EnRoute dep_delay=0 inbound_delay=4 cancelled=false
[flightStatus] number lookup "UA3543" 2026-07-26
[flightStatus] UA3543 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA3543 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 22:05Z","local":"2026-07-26 18:05-04:00"},"revisedTime":{"utc":"2026-07-26 22:25Z","local":"2026-07-26 18:25-04:00"},"runwayTime":{"utc":"2026-07-26 22:25Z","local":"2026-07-26 18:25-04:00"},"terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] UA3543 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 22:05Z","revisedTime":"2026-07-26 22:25Z","runwayTime":"2026-07-26 22:25Z","terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for UA3543
[flightStatus] UA3543 2026-07-26 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA1156" 2026-07-26
[flightStatus] UA1156 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA1156 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 19:45-05:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] UA1156 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:45Z","terminal":"1","quality":["Basic"]}
[flightStatus] computed inbound delay from revisedTime: 53min for UA1156
[flightStatus] UA1156 2026-07-26 status=Delayed dep_delay=0 inbound_delay=53 cancelled=false
[flightStatus] number lookup "DL4441" 2026-07-26
[flightStatus] DL4441 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL4441 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:49Z","local":"2026-07-26 22:49-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL4441 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:49Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL4441 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA236" 2026-07-26
[flightStatus] AA236 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] AA236 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 23:30Z","local":"2026-07-26 19:30-04:00"},"revisedTime":{"utc":"2026-07-27 00:15Z","local":"2026-07-26 20:15-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA236 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 23:30Z","revisedTime":"2026-07-27 00:15Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 45min for AA236
[flightStatus] AA236 2026-07-26 status=Scheduled dep_delay=45 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3451" 2026-07-26
[flightStatus] AA3451 dep keys: airport,scheduledTime,quality
[flightStatus] AA3451 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:40Z","local":"2026-07-26 08:40-05:00"},"quality":["Basic"]}
[flightStatus] AA3451 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:40Z","quality":["Basic"]}
[flightStatus] AA3451 2026-07-26 status=Arrived dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2952" 2026-07-26
[flightStatus] DL2952 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2952 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 13:03Z","local":"2026-07-26 09:03-04:00"},"revisedTime":{"utc":"2026-07-26 13:20Z","local":"2026-07-26 09:20-04:00"},"runwayTime":{"utc":"2026-07-26 13:20Z","local":"2026-07-26 09:20-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2952 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 13:03Z","revisedTime":"2026-07-26 13:20Z","runwayTime":"2026-07-26 13:20Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for DL2952
[flightStatus] DL2952 2026-07-26 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AS1418" 2026-07-26
[flightStatus] AS1418 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS1418 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 17:18Z","local":"2026-07-26 10:18-07:00"},"revisedTime":{"utc":"2026-07-26 17:34Z","local":"2026-07-26 10:34-07:00"},"runwayTime":{"utc":"2026-07-26 17:34Z","local":"2026-07-26 10:34-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS1418 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 17:18Z","revisedTime":"2026-07-26 17:34Z","runwayTime":"2026-07-26 17:34Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AS1418
[flightStatus] AS1418 2026-07-26 status=EnRoute dep_delay=16 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AS256" 2026-07-26
[flightStatus] AS256 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AS256 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 12:28Z","local":"2026-07-26 08:28-04:00"},"revisedTime":{"utc":"2026-07-26 12:42Z","local":"2026-07-26 08:42-04:00"},"runwayTime":{"utc":"2026-07-26 12:42Z","local":"2026-07-26 08:42-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AS256 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 12:28Z","revisedTime":"2026-07-26 12:42Z","runwayTime":"2026-07-26 12:42Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for AS256
[flightStatus] AS256 2026-07-26 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2861" 2026-07-26
[flightStatus] AA2861 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2861 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 16:47Z","local":"2026-07-26 11:47-05:00"},"revisedTime":{"utc":"2026-07-26 17:48Z","local":"2026-07-26 12:48-05:00"},"runwayTime":{"utc":"2026-07-26 17:48Z","local":"2026-07-26 12:48-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2861 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 16:47Z","revisedTime":"2026-07-26 17:48Z","runwayTime":"2026-07-26 17:48Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 61min for AA2861
[flightStatus] computed inbound delay from revisedTime: 44min for AA2861
[flightStatus] AA2861 2026-07-26 status=Arrived dep_delay=61 inbound_delay=44 cancelled=false
[flightStatus] number lookup "AA6221" 2026-07-26
[flightStatus] AA6221 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA6221 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 21:00Z","local":"2026-07-26 14:00-07:00"},"revisedTime":{"utc":"2026-07-26 21:26Z","local":"2026-07-26 14:26-07:00"},"runwayTime":{"utc":"2026-07-26 21:26Z","local":"2026-07-26 14:26-07:00"},"runway":"24L","quality":["Basic","Live"]}
[flightStatus] AA6221 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 21:00Z","revisedTime":"2026-07-26 21:26Z","runwayTime":"2026-07-26 21:26Z","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for AA6221
[flightStatus] AA6221 2026-07-26 status=Arrived dep_delay=26 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3532" 2026-07-26
[flightStatus] AA3532 dep keys: airport,scheduledTime,quality
[flightStatus] AA3532 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:43Z","local":"2026-07-26 15:43-05:00"},"quality":["Basic"]}
[flightStatus] AA3532 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:43Z","quality":["Basic"]}
[flightStatus] AA3532 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL3117" 2026-07-26
[flightStatus] DL3117 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL3117 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:48Z","local":"2026-07-26 22:48-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL3117 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:48Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL3117 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2457" 2026-07-26
[flightStatus] DL2457 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL2457 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 03:00Z","local":"2026-07-26 20:00-07:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] DL2457 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 03:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] DL2457 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA644" 2026-07-26
[flightStatus] UA644 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA644 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:45Z","local":"2026-07-26 08:45-05:00"},"revisedTime":{"utc":"2026-07-26 14:02Z","local":"2026-07-26 09:02-05:00"},"runwayTime":{"utc":"2026-07-26 14:02Z","local":"2026-07-26 09:02-05:00"},"terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] UA644 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:45Z","revisedTime":"2026-07-26 14:02Z","runwayTime":"2026-07-26 14:02Z","terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for UA644
[flightStatus] UA644 2026-07-26 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA5477" 2026-07-26
[flightStatus] UA5477 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5477 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 11:45Z","local":"2026-07-26 06:45-05:00"},"revisedTime":{"utc":"2026-07-26 12:20Z","local":"2026-07-26 07:20-05:00"},"runwayTime":{"utc":"2026-07-26 12:20Z","local":"2026-07-26 07:20-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5477 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 11:45Z","revisedTime":"2026-07-26 12:20Z","runwayTime":"2026-07-26 12:20Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 35min for UA5477
[flightStatus] UA5477 2026-07-26 status=Arrived dep_delay=35 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5733" 2026-07-26
[flightStatus] HTTP 429 for "DL5733" 2026-07-26
[flightStatus] number lookup "DL 5733" 2026-07-26
[flightStatus] DL5733 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5733 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 13:50Z","local":"2026-07-26 09:50-04:00"},"revisedTime":{"utc":"2026-07-26 14:16Z","local":"2026-07-26 10:16-04:00"},"runwayTime":{"utc":"2026-07-26 14:16Z","local":"2026-07-26 10:16-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL5733 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 13:50Z","revisedTime":"2026-07-26 14:16Z","runwayTime":"2026-07-26 14:16Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for DL5733
[flightStatus] DL5733 2026-07-26 status=Arrived dep_delay=26 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2954" 2026-07-26
[flightStatus] AA2954 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2954 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 15:36Z","local":"2026-07-26 08:36-07:00"},"revisedTime":{"utc":"2026-07-26 16:03Z","local":"2026-07-26 09:03-07:00"},"runwayTime":{"utc":"2026-07-26 16:03Z","local":"2026-07-26 09:03-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA2954 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 15:36Z","revisedTime":"2026-07-26 16:03Z","runwayTime":"2026-07-26 16:03Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for AA2954
[flightStatus] computed inbound delay from revisedTime: 9min for AA2954
[flightStatus] AA2954 2026-07-26 status=EnRoute dep_delay=27 inbound_delay=9 cancelled=false
[flightStatus] number lookup "AA1509" 2026-07-26
[flightStatus] AA1509 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA1509 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 11:00Z","local":"2026-07-26 07:00-04:00"},"revisedTime":{"utc":"2026-07-26 11:02Z","local":"2026-07-26 07:02-04:00"},"runwayTime":{"utc":"2026-07-26 11:02Z","local":"2026-07-26 07:02-04:00"},"terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] AA1509 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 11:00Z","revisedTime":"2026-07-26 11:02Z","runwayTime":"2026-07-26 11:02Z","terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 2min for AA1509
[flightStatus] AA1509 2026-07-26 status=Arrived dep_delay=2 inbound_delay=0 cancelled=false
[flightStatus] number lookup "OO456R" 2026-07-26
[flightStatus] OO456R dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] OO456R dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 17:30Z","local":"2026-07-26 12:30-05:00"},"revisedTime":{"utc":"2026-07-26 18:05Z","local":"2026-07-26 13:05-05:00"},"runwayTime":{"utc":"2026-07-26 18:05Z","local":"2026-07-26 13:05-05:00"},"quality":["Basic","Live"]}
[flightStatus] OO456R dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 17:30Z","revisedTime":"2026-07-26 18:05Z","runwayTime":"2026-07-26 18:05Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 35min for OO456R
[flightStatus] computed inbound delay from revisedTime: 35min for OO456R
[flightStatus] OO456R 2026-07-26 status=EnRoute dep_delay=35 inbound_delay=35 cancelled=false
[flightStatus] number lookup "DL2711" 2026-07-26
[flightStatus] DL2711 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2711 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 15:10Z","local":"2026-07-26 11:10-04:00"},"revisedTime":{"utc":"2026-07-26 15:32Z","local":"2026-07-26 11:32-04:00"},"runwayTime":{"utc":"2026-07-26 15:32Z","local":"2026-07-26 11:32-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2711 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 15:10Z","revisedTime":"2026-07-26 15:32Z","runwayTime":"2026-07-26 15:32Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL2711
[flightStatus] DL2711 2026-07-26 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5789" 2026-07-26
[flightStatus] DL5789 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5789 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:12Z","local":"2026-07-26 14:12-04:00"},"revisedTime":{"utc":"2026-07-26 18:21Z","local":"2026-07-26 14:21-04:00"},"runwayTime":{"utc":"2026-07-26 18:21Z","local":"2026-07-26 14:21-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5789 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:12Z","revisedTime":"2026-07-26 18:21Z","runwayTime":"2026-07-26 18:21Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for DL5789
[flightStatus] DL5789 2026-07-26 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2143" 2026-07-26
[flightStatus] DL2143 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2143 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 21:51Z","local":"2026-07-26 16:51-05:00"},"revisedTime":{"utc":"2026-07-26 22:07Z","local":"2026-07-26 17:07-05:00"},"runwayTime":{"utc":"2026-07-26 22:07Z","local":"2026-07-26 17:07-05:00"},"terminal":"E","runway":"17R","quality":["Basic","Live"]}
[flightStatus] DL2143 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 21:51Z","revisedTime":"2026-07-26 22:07Z","runwayTime":"2026-07-26 22:07Z","terminal":"E","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for DL2143
[flightStatus] DL2143 2026-07-26 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA110" 2026-07-26
[flightStatus] AA110 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA110 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 22:00Z","local":"2026-07-26 17:00-05:00"},"revisedTime":{"utc":"2026-07-26 22:16Z","local":"2026-07-26 17:16-05:00"},"runwayTime":{"utc":"2026-07-26 22:16Z","local":"2026-07-26 17:16-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA110 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 22:00Z","revisedTime":"2026-07-26 22:16Z","runwayTime":"2026-07-26 22:16Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AA110
[flightStatus] AA110 2026-07-26 status=EnRoute dep_delay=16 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL806" 2026-07-26
[flightStatus] DL806 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL806 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 21:00Z","local":"2026-07-26 17:00-04:00"},"revisedTime":{"utc":"2026-07-26 21:34Z","local":"2026-07-26 17:34-04:00"},"runwayTime":{"utc":"2026-07-26 21:34Z","local":"2026-07-26 17:34-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL806 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 21:00Z","revisedTime":"2026-07-26 21:34Z","runwayTime":"2026-07-26 21:34Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 34min for DL806
[flightStatus] DL806 2026-07-26 status=EnRoute dep_delay=34 inbound_delay=0 cancelled=false
[flightStatus] number lookup "WN2273" 2026-07-26
[flightStatus] WN2273 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN2273 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 20:55Z","local":"2026-07-26 13:55-07:00"},"revisedTime":{"utc":"2026-07-26 22:35Z","local":"2026-07-26 15:35-07:00"},"runwayTime":{"utc":"2026-07-26 22:35Z","local":"2026-07-26 15:35-07:00"},"terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] WN2273 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 20:55Z","revisedTime":"2026-07-26 22:35Z","runwayTime":"2026-07-26 22:35Z","terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 100min for WN2273
[flightStatus] computed inbound delay from revisedTime: 73min for WN2273
[flightStatus] WN2273 2026-07-26 status=Arrived dep_delay=100 inbound_delay=73 cancelled=false
[flightStatus] number lookup "WN2777" 2026-07-26
[flightStatus] WN2777 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN2777 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 20:45Z","local":"2026-07-26 16:45-04:00"},"revisedTime":{"utc":"2026-07-26 21:24Z","local":"2026-07-26 17:24-04:00"},"runwayTime":{"utc":"2026-07-26 21:24Z","local":"2026-07-26 17:24-04:00"},"terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] WN2777 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 20:45Z","revisedTime":"2026-07-26 21:24Z","runwayTime":"2026-07-26 21:24Z","terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 39min for WN2777
[flightStatus] WN2777 2026-07-26 status=Arrived dep_delay=39 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL1601" 2026-07-26
[flightStatus] DL1601 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL1601 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:48Z","local":"2026-07-26 22:48-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL1601 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:48Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL1601 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "SQ25" 2026-07-26
[flightStatus] SQ25 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] SQ25 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 00:55Z","local":"2026-07-26 20:55-04:00"},"revisedTime":{"utc":"2026-07-27 00:55Z","local":"2026-07-26 20:55-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] SQ25 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 00:55Z","revisedTime":"2026-07-27 00:55Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] SQ25 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5610" 2026-07-26
[flightStatus] DL5610 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL5610 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 00:25Z","local":"2026-07-26 20:25-04:00"},"revisedTime":{"utc":"2026-07-27 00:25Z","local":"2026-07-26 20:25-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5610 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 00:25Z","revisedTime":"2026-07-27 00:25Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5610 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA831" 2026-07-26
[flightStatus] AA831 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA831 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 12:00Z","local":"2026-07-26 07:00-05:00"},"revisedTime":{"utc":"2026-07-26 12:10Z","local":"2026-07-26 07:10-05:00"},"runwayTime":{"utc":"2026-07-26 12:10Z","local":"2026-07-26 07:10-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA831 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 12:00Z","revisedTime":"2026-07-26 12:10Z","runwayTime":"2026-07-26 12:10Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for AA831
[flightStatus] AA831 2026-07-26 status=EnRoute dep_delay=10 inbound_delay=0 cancelled=false
[flightStatus] number lookup "KG5745" 2026-07-26
[flightStatus] KG5745 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] KG5745 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 14:15-05:00"},"revisedTime":{"utc":"2026-07-26 19:44Z","local":"2026-07-26 14:44-05:00"},"runwayTime":{"utc":"2026-07-26 19:44Z","local":"2026-07-26 14:44-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] KG5745 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 19:15Z","revisedTime":"2026-07-26 19:44Z","runwayTime":"2026-07-26 19:44Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 29min for KG5745
[flightStatus] computed inbound delay from revisedTime: 12min for KG5745
[flightStatus] KG5745 2026-07-26 status=Arrived dep_delay=29 inbound_delay=12 cancelled=false
[flightStatus] number lookup "WN194" 2026-07-26
[flightStatus] WN194 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN194 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:05Z","local":"2026-07-26 14:05-04:00"},"revisedTime":{"utc":"2026-07-26 18:43Z","local":"2026-07-26 14:43-04:00"},"runwayTime":{"utc":"2026-07-26 18:43Z","local":"2026-07-26 14:43-04:00"},"terminal":"N","runway":"26L","quality":["Basic","Live"]}
[flightStatus] WN194 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:05Z","revisedTime":"2026-07-26 18:43Z","runwayTime":"2026-07-26 18:43Z","terminal":"N","runway":"26L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 38min for WN194
[flightStatus] computed inbound delay from revisedTime: 11min for WN194
[flightStatus] WN194 2026-07-26 status=Arrived dep_delay=38 inbound_delay=11 cancelled=false
[flightStatus] number lookup "AA4453" 2026-07-26
[flightStatus] AA4453 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA4453 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 16:59Z","local":"2026-07-26 12:59-04:00"},"revisedTime":{"utc":"2026-07-26 17:08Z","local":"2026-07-26 13:08-04:00"},"runwayTime":{"utc":"2026-07-26 17:08Z","local":"2026-07-26 13:08-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA4453 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 16:59Z","revisedTime":"2026-07-26 17:08Z","runwayTime":"2026-07-26 17:08Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for AA4453
[flightStatus] AA4453 2026-07-26 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2766" 2026-07-26
[flightStatus] AA2766 dep keys: airport,scheduledTime,revisedTime,quality
[flightStatus] AA2766 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:30Z","local":"2026-07-26 18:30-05:00"},"revisedTime":{"utc":"2026-07-27 00:00Z","local":"2026-07-26 19:00-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA2766 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:30Z","revisedTime":"2026-07-27 00:00Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 30min for AA2766
[flightStatus] AA2766 2026-07-26 status=Scheduled dep_delay=30 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA970" 2026-07-26
[flightStatus] UA970 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA970 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:45Z","local":"2026-07-26 15:45-05:00"},"revisedTime":{"utc":"2026-07-26 21:12Z","local":"2026-07-26 16:12-05:00"},"runwayTime":{"utc":"2026-07-26 21:12Z","local":"2026-07-26 16:12-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA970 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:45Z","revisedTime":"2026-07-26 21:12Z","runwayTime":"2026-07-26 21:12Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for UA970
[flightStatus] UA970 2026-07-26 status=EnRoute dep_delay=27 inbound_delay=0 cancelled=false
[flightStatus] number lookup "WN158" 2026-07-26
[flightStatus] WN158 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN158 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 14:05Z","local":"2026-07-26 10:05-04:00"},"revisedTime":{"utc":"2026-07-26 14:39Z","local":"2026-07-26 10:39-04:00"},"runwayTime":{"utc":"2026-07-26 14:39Z","local":"2026-07-26 10:39-04:00"},"terminal":"N","quality":["Basic","Live"]}
[flightStatus] WN158 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 14:05Z","revisedTime":"2026-07-26 14:39Z","runwayTime":"2026-07-26 14:39Z","terminal":"N","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 34min for WN158
[flightStatus] WN158 2026-07-26 status=Arrived dep_delay=34 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2" 2026-07-26
[flightStatus] AA2 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA2 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 14:00Z","local":"2026-07-26 07:00-07:00"},"revisedTime":{"utc":"2026-07-26 14:20Z","local":"2026-07-26 07:20-07:00"},"runwayTime":{"utc":"2026-07-26 14:20Z","local":"2026-07-26 07:20-07:00"},"terminal":"3","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA2 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 14:00Z","revisedTime":"2026-07-26 14:20Z","runwayTime":"2026-07-26 14:20Z","terminal":"3","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for AA2
[flightStatus] AA2 2026-07-26 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2501" 2026-07-26
[flightStatus] AA2501 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2501 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 17:46Z","local":"2026-07-26 12:46-05:00"},"revisedTime":{"utc":"2026-07-26 17:50Z","local":"2026-07-26 12:50-05:00"},"runwayTime":{"utc":"2026-07-26 17:50Z","local":"2026-07-26 12:50-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2501 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 17:46Z","revisedTime":"2026-07-26 17:50Z","runwayTime":"2026-07-26 17:50Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 4min for AA2501
[flightStatus] AA2501 2026-07-26 status=Arrived dep_delay=4 inbound_delay=0 cancelled=false
[flightStatus] number lookup "HY102" 2026-07-26
[flightStatus] HY102 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] HY102 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 16:55Z","local":"2026-07-26 12:55-04:00"},"revisedTime":{"utc":"2026-07-26 17:12Z","local":"2026-07-26 13:12-04:00"},"runwayTime":{"utc":"2026-07-26 17:12Z","local":"2026-07-26 13:12-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] HY102 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 16:55Z","revisedTime":"2026-07-26 17:12Z","runwayTime":"2026-07-26 17:12Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for HY102
[flightStatus] HY102 2026-07-26 status=EnRoute dep_delay=17 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AS6" 2026-07-26
[flightStatus] AS6 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS6 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 18:48Z","local":"2026-07-26 11:48-07:00"},"revisedTime":{"utc":"2026-07-26 18:58Z","local":"2026-07-26 11:58-07:00"},"runwayTime":{"utc":"2026-07-26 18:58Z","local":"2026-07-26 11:58-07:00"},"terminal":"6","runway":"24L","quality":["Basic","Live"]}
[flightStatus] AS6 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 18:48Z","revisedTime":"2026-07-26 18:58Z","runwayTime":"2026-07-26 18:58Z","terminal":"6","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for AS6
[flightStatus] AS6 2026-07-26 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3843" 2026-07-26
[flightStatus] AA3843 dep keys: airport,scheduledTime,quality
[flightStatus] AA3843 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:30Z","local":"2026-07-26 18:30-05:00"},"quality":["Basic"]}
[flightStatus] AA3843 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:30Z","quality":["Basic"]}
[flightStatus] AA3843 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3846" 2026-07-26
[flightStatus] AA3846 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3846 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 22:00Z","local":"2026-07-26 17:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3846 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 22:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3846 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2345" 2026-07-26
[flightStatus] DL2345 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2345 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 19:25Z","local":"2026-07-26 15:25-04:00"},"revisedTime":{"utc":"2026-07-26 19:51Z","local":"2026-07-26 15:51-04:00"},"runwayTime":{"utc":"2026-07-26 19:51Z","local":"2026-07-26 15:51-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2345 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 19:25Z","revisedTime":"2026-07-26 19:51Z","runwayTime":"2026-07-26 19:51Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for DL2345
[flightStatus] computed inbound delay from revisedTime: 4min for DL2345
[flightStatus] DL2345 2026-07-26 status=Arrived dep_delay=26 inbound_delay=4 cancelled=false
[flightStatus] number lookup "AA4065" 2026-07-26
[flightStatus] AA4065 dep keys: airport,scheduledTim ~/workspace$ pkill -f "tsx" 2>/dev/null; sleep 1; npm run dev

> rest-express@1.0.1 dev
> NODE_ENV=development tsx --watch server/index.ts & NODE_ENV=development tsx --watch server2/index.ts & wait

[migrations] applied 0002_agency_disruption_system.sql
[migrations] applied 0003_travelers_health.sql
[migrations] applied 0004_confirmation_alert.sql
[migrations] applied 0005_aircraft_data.sql
[migrations] applied 0006_test_flight_seeder.sql
[migrations] applied 0007_user_monitored_flights.sql
[migrations] applied 0008_resolved_flight_status.sql
[Duffel] Initialized (testMode=false)
[migrations] applied 0002_agency_disruption_system.sql
[migrations] applied 0003_travelers_health.sql
[migrations] applied 0004_confirmation_alert.sql
[migrations] applied 0005_aircraft_data.sql
[migrations] applied 0006_test_flight_seeder.sql
[migrations] applied 0007_user_monitored_flights.sql
[migrations] applied 0008_resolved_flight_status.sql
[migrations] applied 001_create_v2_tables.sql
[Duffel] Initialized (testMode=false)
12:07:40 AM [express] serving on port 5000
Initializing Stripe schema...
[monitor] starting engine interval=3600000ms
[seeder] starting for 2026-07-27
[seeder] next run at 2026-07-27T06:00:00.000Z (in 352 min)
[seeder] run failed: SEED_AIRPORTS is not defined
12:07:40 AM [express] serving on port 5001
Initializing Stripe schema...
[monitor] starting engine interval=3600000ms
[seeder] starting for 2026-07-27
[seeder] next run at 2026-07-27T06:00:00.000Z (in 352 min)
Stripe schema ready
Stripe schema ready
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
{ autoExpandLists: undefined, stripeApiVersion: undefined } StripeSync initialized
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced
Stripe webhook configured: https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev
Stripe data synced
[seeder] HTTP 429 (rate limited) for JFK 06:00-10:59 — skipped to save quota
[seeder] HTTP 9 (rate limited) for ORD 11:00-14:59 — skipped to save quota
[seeder] HTTP 429 (rate limited) for BOS 11:00-14:59 — skipped to save quota
[seeder] HTTP 429 (rate limited) for JFK 15:00-18:59 — skipped to save quota
[seeder] DFW: inserted 5 flights
[seeder] HTTP 429 (rate limited) for ORD 19:00-23:59 — skipped to save quota
[seeder] ORD: inserted 5 flights
[seeder] ATL: inserted 7 flights
[seeder] JFK: inserted 1 flights
[seeder] LAX: inserted 3 flights
[seeder] HTTP 429 (rate limited) for BOS 19:00-23:59 — skipped to save quota
[seeder] BOS: inserted 3 flights
[seeder] total inserted: 24
[seeder] archived 0 old test flights
[monitor] cycle start
[monitor] no active flights found for 2026-07-27..2026-07-28 — nothing to score (seeder may have failed or API key may be invalid)
[monitor] cycle end checked=0 alerts=0 elapsed_ms=15
[monitor] cycle start
[monitor] scoring flight_id=1444 UA4568 ORD->SCE 2026-07-27
[historicalOtp] UA4568 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/UA45ecent
[historicalOtp] UA4568 HTTP 404 Not Found
[historicalOtp] UA4568 raw response (first 500 chars): 
[historicalOtp] UA4568 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "UA4568" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching SCE (KSCE)
[carrierHealth] computing UA
[carrierHealth] UA sample=244 cancelRate=0.016 avgDelay=0.0 healthScore=1 reliable=true
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] UA4568 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA4568 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 15:25Z","local":"2026-07-27 10:25-05:00"},"terminal":"2","quality":["Basic"]}
[flightStatus] UA4568 d extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 15:25Z","terminal":"2","quality":["Basic"]}
[flightStatus] UA4568 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] fetch failed for KSCE: Unexpected end of JSON input
[riskScorer] UA4568 2026-07-27 horizon=medium hours_out=10.3 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1444 score=9 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1445 BW521 JFK->POS 2026-07-27
[historicalOtp] BW521 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/BW521/history/recent
[historicalOtp] BW521 HTTP 404 Not Found
[historicalOtp] BW521 raw response (first 500 chars): 
[historicalOtp] BW521 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "BW521" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching POS (KPOS)
[carrierHealth] computing BW
[nasStatus] JFK active programs: Departure Delay avgDelay=0min
[carrierHealth] BW sample=1 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[flightStatus] BW521 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] BW521 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 11:00Z","local":"2026-07-27 07:00-04:00"},"terminal":"4","quality":["Basic"]}
[flightStatus] BW521 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kendy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 11:00Z","terminal":"4","quality":["Basic"]}
[flightStatus] BW521 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] fetch failed for KPOS: Unexpected end of JSON input
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] BW521 2026-07-27 horizon=medium hours_out=6.9 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":0,"carrierHealth":3,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":0}
[monitor] stored flight_id=1445 score=15 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1450 AA238 LAX->JFK 2026-07-27
[historicalOtp] AA238 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA238/history/recent
[historicalOtp] AA238 HTTP 404 Not Found
[historicalOtp] AA238 raw response (first 500 chars): 
[historicalOtp] AA238 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AA238" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching JFK (KJFK)
[nasStatus] cache hit JFK
[carrierHealth] computing AA
[carrierHealth] AA sample=278 cancelRate=0.040 avgDelay=0.0 healthScore=4 reliable=true
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA238 dep keys: airport,scheduledTime,quality
[flightStatus] AA238 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 17:11Z","local":"2026-07-27 10:11-07:00"},"quality":["Basic"]}
[flightStatus] AA238 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles",ocation":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 17:11Z","quality":["Basic"]}
[flightStatus] AA238 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA238 2026-07-27 horizon=medium hours_out=10.1 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":1,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1450 score=18 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1451 DL5703 BOS->BWI 2026-07-27
[historicalOtp] DL5703 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL5703/history/recent
[historicalOtp] DL5703 HTTP 404 Not Found
[historicalOtp] DL5703 raw response (first 500 chars): 
[historicalOtp] DL5703 HTTP 404 error — falack fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL5703" 2026-07-27
[weather] fetching BOS (KBOS)
[weather] fetching BWI (KBWI)
[carrierHealth] computing DL
[carrierHealth] DL sample=357 cancelRate=0.008 avgDelay=0.0 healthScore=1 reliable=true
[weather] BOS cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[weather] BWI cat=VFR vis=10 ceil=11000 ts=false fz=false contrib=2
[flightStatus] DL5703 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL5703 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 10:35Z","local":"2026-07-27 06:35-04:00"},"terminal":"A","quality":["Basic"]}
[flightStatus] DL5703 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 10:35Z","terminal":"A","quality":["Basic"]}
[flightStatus] DL5703 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL5703 2026-07-27 horizon=medium hours_out=6.4 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":0}
[monitor] stored flight_id=1451 score=9 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1452 AA2501 DFW->VPS 2026-07-27
[historicalOtp] AA2501 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA2501/history/recent
[historicalOtp] AA2501 HTTP 404 Not Found
[historicalOtp] AA2501 raw response (first 500 chars): 
[historicalOtp] AA2501 HTTP 404 error — fallback fired samplize=0 onTimeRate=0.750
[flightStatus] number lookup "AA2501" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching VPS (KVPS)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] VPS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2501 dep keys: airport,scheduledTime,quality
[flightStatus] AA2501 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 17:46Z","local":"2026-07-27 12:46-05:00"},"quality":["Basic"]}
[flightStatus] AA2501 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 17:46Z","quality":["Basic"]}
[flightStatus] AA2501 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA2501 2026-07-27 horizon=medium hours_out=12.6 raw_total=13 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1452 score=13 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1455 UA1226 ATL->EWR 2026-07-27
[historicalOtp] UA1226 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/UA1226/history/recent
[historicalOtp] UA1226 HTTP 404 Not Found
[historicalOtp] UA1226 raw response (first 500 chars): 
[historicalOtp] UA1226 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "UA1226" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching EWR (KEWR)
[carrierHealth] cache hit UA
[nasStatus] EWR activerograms: Arrival Delay, Departure Delay avgDelay=0min
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] EWR cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] UA1226 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA1226 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 16:40Z","local":"2026-07-27 12:40-04:00"},"terminal":"N","quality":["Basic"]}
[flightStatus] UA1226 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 16:40Z","terminal":"N","quality":["Basic"]}
[flightStatus] UA1226 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA1226 2026-07-27 horizon=medium hours_out=12.5 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1455 score=15 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1458 UA2189 ORD->LGA 2026-07-27
[historicalOtp] UA2189 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/UA2189/history/recent
[historicalOtp] UA2189 HTTP 404 Not Found
[historicalOtp] UA2189 raw response (first 500 chars): 
[historicalOtp] UA2189 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "UA2189" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[nasStatus] cache hit ORD
[carrierHealth] cache hit UA
[nasStatus] LGA active programs: Departure Delay avgDelay=0m
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] UA2189 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA2189 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 18:00Z","local":"2026-07-27 13:00-05:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] UA2189 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 18:00Z","terminal":"1","quality":["Basic"]}
[flightStatus] UA2189 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA2189 2026-07-27 horizon=medium hours_out=12.9 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1458 score=15 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1461 AA4453 JFK->CLE 2026-07-27
[historicalOtp] AA4453 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA4453/history/recent
[historicalOtp] AA4453 HTTP 404 Not Found
[historicalOtp] AA4453 raw response (first 500 chars): 
[historicalOtp] AA4453 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AA4453" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching CLE (KCLE)
[nasStatus] cache hit JFK
[carrierHealth] cache hit AA
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4453 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA4453 depAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 16:59Z","local":"2026-07-27 12:59-04:00"},"terminal":"8","quality":["Basic"]}
[flightStatus] AA4453 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 16:59Z","terminal":"8","quality":["Basic"]}
[flightStatus] AA4453 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] CLE cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA4453 2026-07-27 horizon=medium hours_out=12.8 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":1,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1461 score=18 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1462 AS6 LAX->DCA 2026-07-27
[historicalOtp] AS6 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AS6/history/recent
[historicalOtp] AS6 HTTP 404 Not Found
[historicalOtp] AS6 raw response (first 500 chars): 
[historicalOtp] AS6 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AS6" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching DCA (KDCA)
[nasStatus] cache hit LAX
[carrierHealth] computing AS
[carrierHealth] AS sample=7 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] DCA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AS6 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AS6 dep W: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 18:48Z","local":"2026-07-27 11:48-07:00"},"terminal":"6","quality":["Basic"]}
[flightStatus] AS6 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 18:48Z","terminal":"6","quality":["Basic"]}
[flightStatus] AS6 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AS6 2026-07-27 horizon=medium hours_out=11.7 raw_total=10 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1462 score=10 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1468 AA2401 DFW->TPA 2026-07-27
[historicalOtp] AA2401 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA2401/history/recent
[historicalOtp] AA2401 HTTP 404 Not Found
[historicalOtp] AA2401 raw response (first 500 chars): 
[historicalOtp] AA2401 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AA2401" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching TPA (KTPA)
[nasStatus] cache hit DFW
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2401 dep keys: airport,scheduledTime,quality
[flightStatus] AA2401 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},cheduledTime":{"utc":"2026-07-27 23:30Z","local":"2026-07-27 18:30-05:00"},"quality":["Basic"]}
[flightStatus] AA2401 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 23:30Z","quality":["Basic"]}
[flightStatus] AA2401 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] TPA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[riskScorer] AA2401 2026-07-27 horizon=medium hours_out=18.4 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1468 score=18 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1469 UA516 ATL->ORD 2026-07-27
[historicalOtp] UA516 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/UA516/history/recent
[historicalOtp] UA516 HTTP 404 Not Found
[historicalOtp] UA516 raw response (first 500 chars): 
[historicalOtp] UA516 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "UA516" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching ORD (KORD)
[nasStatus] cache hit ATL
[nasStatus] cache hit ORD
[carrierHealth] cache hit UA
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] UA516 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA516 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 19:30Z","local":"2026-07-27 130-04:00"},"terminal":"N","quality":["Basic"]}
[flightStatus] UA516 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 19:30Z","terminal":"N","quality":["Basic"]}
[flightStatus] UA516 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA516 2026-07-27 horizon=medium hours_out=15.4 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1469 score=12 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1474 UA1583 ORD->RIC 2026-07-27
[historicalOtp] UA1583 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/UA1583/history/recent
[historicalOtp] UA1583 HTTP 404 Not Found
[historicalOtp] UA1583 raw response (first 500 chars): 
[historicalOtp] UA1583 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "UA1583" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching RIC (KRIC)
[nasStatus] cache hit ORD
[carrierHealth] cache hit UA
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[weather] RIC cat=MVFR vis=3 ceil=7500 ts=false fz=false contrib=10
[flightStatus] HTTP 429 for "UA1583" 2026-07-27
[flightStatus] number lookup "UA 1583" 2026-07-27
[flightStatus] UA1583 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA1583 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 23:10Z","local":"2026-07-27 18:10-05:00"},"terminal":"1","quality":["Basic"][flightStatus] UA1583 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 23:10Z","terminal":"1","quality":["Basic"]}
[flightStatus] UA1583 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA1583 2026-07-27 horizon=medium hours_out=18.0 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":4,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1474 score=18 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1475 DL1638 JFK->PBI 2026-07-27
[historicalOtp] DL1638 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL1638/history/recent
[historicalOtp] DL1638 HTTP 404 Not Found
[historicalOtp] DL1638 raw response (first 500 chars): 
[historicalOtp] DL1638 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL1638" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching PBI (KPBI)
[nasStatus] cache hit JFK
[carrierHealth] cache hit DL
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KPBI: Unexpected end of JSON input
[flightStatus] DL1638 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL1638 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 19:45Z","local":"2026-07-27 15:45-04:00"},"terminal":"4","quality":["Basic"]}
[flightStatus] DL1638 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityme":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 19:45Z","terminal":"4","quality":["Basic"]}
[flightStatus] DL1638 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL1638 2026-07-27 horizon=medium hours_out=15.6 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":0,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1475 score=16 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1480 AS1397 LAX->PDX 2026-07-27
[historicalOtp] AS1397 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AS1397/history/recent
[historicalOtp] AS1397 HTTP 429 Too Many Requests
[historicalOtp] AS1397 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] AS1397 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AS1397" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching PDX (KPDX)
[nasStatus] cache hit LAX
[carrierHealth] cache hit AS
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AS1397 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AS1397 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-28 01:27Z","local":"2026-07-27 18:27-07:00"},"terminal":"6","quality":["Basic"]}
[flightStatus] AS1397 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles""scheduledTime":"2026-07-28 01:27Z","terminal":"6","quality":["Basic"]}
[flightStatus] AS1397 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] PDX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AS1397 2026-07-27 horizon=medium hours_out=18.3 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1480 score=15 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1481 DL5814 BOS->JFK 2026-07-27
[historicalOtp] DL5814 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL5814/history/recent
[historicalOtp] DL5814 HTTP 404 Not Found
[historicalOtp] DL5814 raw response (first 500 chars): 
[historicalOtp] DL5814 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL58" 2026-07-27
[weather] fetching BOS (KBOS)
[weather] fetching JFK (KJFK)
[nasStatus] cache hit BOS
[nasStatus] cache hit JFK
[carrierHealth] cache hit DL
[weather] BOS cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL5814 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL5814 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 21:05Z","local":"2026-07-27 17:05-04:00"},"terminal":"A","quality":["Basic"]}
[flightStatus] DL5814 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 21:05Z","terminal":"A","quality":["Basic"]}
[flightStatus] DL5814 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL5814 2026-07-27 horizon=medium hours_out=16.9 raw_total=17 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1481 score=17 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1482 AA2992 DFW->GSP 2026-07-27
[historicalOtp] AA2992 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA2992/history/recent
[historicalOtp] AA2992 HTTP 429 Too Many Requests
[historicalOtp] AA2992 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] AA2992 HTTP 429 error — fallback fired sampleSe=0 onTimeRate=0.750
[flightStatus] number lookup "AA2992" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching GSP (KGSP)
[nasStatus] cache hit DFW
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2992 dep keys: airport,scheduledTime,quality
[flightStatus] AA2992 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-28 00:50Z","local":"2026-07-27 19:50-05:00"},"quality":["Basic"]}
[flightStatus] AA2992 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-28 00:50Z","quality":["Basic"]}
[flightStatus] AA2992 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] GSP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA2992 2026-07-27 horizon=medium hours_out=19.7 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1482 score=18 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1487 DL3117 ATL->JAN 2026-07-27
[historicalOtp] DL3117 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL3117/history/recent
[historicalOtp] DL3117 HTTP 404 Not Found
[historicalOtp] DL3117 raw response (first 500 chars): 
[historicalOtp] DL3117 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL3117" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching JAN (KJAN)
[nasStatus] cache hit ATL
[rrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] JAN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL3117 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL3117 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-28 02:48Z","local":"2026-07-27 22:48-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL3117 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-28 02:48Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL3117 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL3117 2026-07-27 horizon=medium hours_out=22.7 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":3,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1487 score=16 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1488 UA1580 ORD->YVR 2026-07-27
[historicalOtp] UA1580 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/UA1580/history/recent
[historicalOtp] UA1580 HTTP 404 Not Found
[historicalOtp] UA1580 raw response (first 500 chars): 
[historicalOtp] UA1580 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "UA1580" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching YVR (CYVR)
[nasStatus] cache hit ORD
[carrierHealth] cache hit UA
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[weather] YVR cat=VFRis=15 ceil=5800 ts=false fz=false contrib=2
[flightStatus] HTTP 429 for "UA1580" 2026-07-27
[flightStatus] number lookup "UA 1580" 2026-07-27
[flightStatus] UA1580 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA1580 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-28 00:45Z","local":"2026-07-27 19:45-05:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] UA1580 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-28 00:45Z","terminal":"1","quality":["Basic"]}
[flightStatus] UA1580 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA1580 2026-07-27 horizon=medium hours_out=19.6 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1488 score=15 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1491 AA292 JFK->DEL 2026-07-27
[historicalOtp] AA292 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA292/history/recent
[historicalOtp] AA292 HTTP 404 Not Found
[historicalOtp] AA292 raw response (first 500 chars): 
[historicalOtp] AA292 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AA292" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching DEL (KDEL)
[nasStatus] cache hit JFK
[carrierHealth] cache hit AA
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KDEL: Unexpected end of JSON input
[flightStatus] AA292 dep keys: airpt,scheduledTime,revisedTime,terminal,quality
[flightStatus] AA292 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 00:55Z","local":"2026-07-26 20:55-04:00"},"revisedTime":{"utc":"2026-07-27 00:55Z","local":"2026-07-26 20:55-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA292 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 00:55Z","revisedTime":"2026-07-27 00:55Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA292 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA292 2026-07-27 horizon=medium hours_out=20.8 raw_total=23 tier=amber cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":0,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":3,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1491 score=23 tier=amber cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1446 DL1955 JFK->MBJ 2026-07-27
[historicalOtp] DL1955 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL1955/history/recent
[historicalOtp] DL1955 HTTP 429 Too Many Requests
[historicalOtp] DL1955 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] DL1955 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL1955" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching MBJ (KMBJ)
[nasStatus] cache hit JFK
[carrierHealth] cache hit DL
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contb=2
[flightStatus] DL1955 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL1955 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 12:20Z","local":"2026-07-27 08:20-04:00"},"terminal":"4","quality":["Basic"]}
[flightStatus] DL1955 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 12:20Z","terminal":"4","quality":["Basic"]}
[flightStatus] DL1955 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] fetch failed for KMBJ: Unexpected end of JSON input
[riskScorer] DL1955 2026-07-27 horizon=medium hours_out=8.2 raw_total=13 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":0,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":0}
[monitor] stored flight_id=1446 score=13 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1448 UA1941 LAX->ORD 2026-07-27
[historicalOtp] UA1941 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/UA1941/history/recent
[historicalOtp] UA1941 HTTP 404 Not Found
[historicalOtp] UA1941 raw response (first 500 chars): 
[historicalOtp] UA1941 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "UA1941" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching ORD (KORD)
[nasStatus] cache hit LAX
[nasStatus] cache hit ORD
[carrierHealth] cache hit UA
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] UA1941 dep keys: airpt,scheduledTime,terminal,quality
[flightStatus] UA1941 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 14:00Z","local":"2026-07-27 07:00-07:00"},"terminal":"7","quality":["Basic"]}
[flightStatus] UA1941 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 14:00Z","terminal":"7","quality":["Basic"]}
[flightStatus] UA1941 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA1941 2026-07-27 horizon=medium hours_out=6.9 raw_total=9 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":0}
[monitor] stored flight_id=1448 score=9 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1456 DL2467 ATL->MYR 2026-07-27
[historicalOtp] DL2467 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL2467/history/recent
[historicalOtp] DL2467 HTTP 404 Not Found
[historicalOtp] DL2467 raw response (first 500 chars): 
[historicalOtp] DL2467 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL2467" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching MYR (KMYR)
[nasStatus] cache hit ATL
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] MYR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2467 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL2467 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortNa":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 18:12Z","local":"2026-07-27 14:12-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL2467 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 18:12Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL2467 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL2467 2026-07-27 horizon=medium hours_out=14.1 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1456 score=12 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1457 AA1743 ORD->PHL 2026-07-27
[historicalOtp] AA1743 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA1743/history/recent
[historicalOtp] AA1743 HTTP 404 Not Found
[historicalOtp] AA1743 raw response (first 500 chars): 
[historicalOtp] AA1743 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AA1743" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching PHL (KPHL)
[nasStatus] cache hit ORD
[carrierHealth] cache hit AA
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] AA1743 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA1743 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 16:40Z","local":"2026-07-27 140-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA1743 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 16:40Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA1743 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[resolution] cycle start targets=200 date=2026-07-27
[flightStatus] number lookup "AF25" 2026-07-26
[flightStatus] AF25 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] AF25 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 01:25Z","local":"2026-07-26 18:25-07:00"},"revisedTime":{"utc":"2026-07-27 01:25Z","local":"2026-07-26 18:25-07:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AF25 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 01:25Z","revisedTime":"2026-07-27 01:25Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] AF25 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA4008" 2026-07-26
[flightStatus] AA4008 dep keys: airport,scheduledTime,quality
[flightStatus] AA4008 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:43Z","local":"2026-07-26 15:43-05:00"},"quality":["Basic"]}
[flightStatus] AA4008 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:43Z","quality":["Basic"]}
[flightStatus] AA4008 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2343" 2026-07-26
[flightStatus] DL2343 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2343 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 16:59Z","local":"2026-07-26 12:59-04:00"},"revisedTime":{"utc":"2026-07-26 17:17Z","local":"2026-07-26 13:17-04:00"},"runwayTime":{"utc":"2026-07-26 17:17Z","local":"2026-07-26 13:17-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL2343 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 16:59Z","revisedTime":"2026-07-26 17:17Z","runwayTime":"2026-07-26 17:17Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for DL2343
[flightStatus] DL2343 2026-07-26 status=Arrived dep_delay=18 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5704" 2026-07-26
[flightStatus] HTTP 429 for "DL5704" 2026-07-26
[flightStatus] number lookup "DL 5704" 2026-07-26
[flightStatus] DL5704 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL5704 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 01:48Z","local":"2026-07-26 21:48-04:00"},"terminal":"A","quality":["Basic"]}
[flightStatus] DL5704 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 01:48Z","terminal":"A","quality":["Basic"]}
[flightStatus] DL5704 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA707" 2026-07-26
[flightStatus] AA707 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA707 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 12:10Z","local":"2026-07-26 07:10-05:00"},"revisedTime":{"utc":"2026-07-26 12:30Z","local":"2026-07-26 07:30-05:00"},"runwayTime":{"utc":"2026-07-26 12:30Z","local":"2026-07-26 07:30-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA707 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 12:10Z","revisedTime":"2026-07-26 12:30Z","runwayTime":"2026-07-26 12:30Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for AA707
[flightStatus] AA707 2026-07-26 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA4382" 2026-07-26
[weather] HTTP 504 for KPHL
[riskScorer] AA1743 2026-07-27 horizon=medium hours_out=11.5 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1457 score=12 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1464 WN3225 LAX->HOU 2026-07-27
[historicalOtp] WN3225 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/WN3225/history/recent
[flightStatus] UA4382 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA4382 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 15:25Z","local":"2026-07-26 10:25-05:00"},"revisedTime":{"utc":"2026-07-26 16:39Z","local":"2026-07-26 11:39-05:00"},"runwayTime":{"utc":"2026-07-26 16:39Z","local":"2026-07-26 11:39-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA4382 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 15:25Z","revisedTime":"2026-07-26 16:39Z","runwayTime":"2026-07-26 16:39Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 74min for UA4382
[flightStatus] computed inbound delay from revisedTime: 34min for UA4382
[flightStatus] UA4382 2026-07-26 status=Arrived dep_delay=74 inbound_delay=34 cancelled=false
[flightStatus] number lookup "DL699" 2026-07-26
[historicalOtp] WN3225 HTTP 429 Too Many Requests
[historicalOtp] WN3225 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] WN3225 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "WN3225" 2026-077
[weather] fetching LAX (KLAX)
[weather] fetching HOU (KHOU)
[nasStatus] cache hit LAX
[carrierHealth] computing WN
[carrierHealth] WN sample=80 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[weather] HOU cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL699 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL699 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 11:00Z","local":"2026-07-26 07:00-04:00"},"revisedTime":{"utc":"2026-07-26 11:51Z","local":"2026-07-26 07:51-04:00"},"runwayTime":{"utc":"2026-07-26 11:51Z","local":"2026-07-26 07:51-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL699 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 11:00Z","revisedTime":"2026-07-26 11:51Z","runwayTime":"2026-07-26 11:51Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 51min for DL699
[flightStatus] computed inbound delay from revisedTime: 18min for DL699
[flightStatus] DL699 2026-07-26 status=Arrived dep_delay=51 inbound_delay=18 cancelled=false
[flightStatus] number lookup "DL1564" 2026-07-26
[flightStatus] WN3225 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] WN3225 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 21:10Z","local":"2026-07-27 14:10-07:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] WN3225 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 21:10Z","terminal":"1","quality":["Basic"]}
[flightStatus] WN3225 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] WN3225 2026-07-27 horizon=medium hours_out=14.0 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1464 score=12 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1465 WN4208 BOS->DEN 2026-07-27
[historicalOtp] WN4208 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/WN4208/history/recent
[flightStatus] DL1564 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1564 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 18:00Z","local":"2026-07-26 13:00-05:00"},"revisedTime":{"utc":"2026-07-26 18:12Z","local":"2026-07-26 13:12-05:00"},"runwayTime":{"utc":"2026-07-26 18:12Z","local":"2026-07-26 13:12-05:00"},"terminal":"5","quality":["Basic","Live"]}
[flightStatus] DL1564 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 18:00Z","revisedTime":"2026-07-26 18:12Z","runwayTime":"2026-07-26 18:12Z","terminal":"5","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL1564
[flightStatus] DL1564 2026-07-26 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3717" 2026-07-26
[historicalOtp] WN4208 HTTP 429 Too Many Requests
[historicalOtp] WN4208 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] WN4208 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "WN4208" 2026-07-27
[weather] fetching BOS (KBOS)
[weather] fetching DEN (KDEN)
[nasStatus] cache hit BOS
[carrierHealth] cache hit WN
[weather] BOS cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[weather] DEN cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[flightStatus] AA3717 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3717 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.86,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 22:00Z","local":"2026-07-26 17:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3717 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 22:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3717 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2243" 2026-07-26
[flightStatus] WN4208 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] WN4208 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 15:35Z","local":"2026-07-27 11:35-04:00"},"terminal":"B","quality":["Basic"]}
[flightStatus] WN4208 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 15:35Z","terminal":"B","quality":["Basic"]}
[flightStatus] WN4208 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] WN4208 2026-07-27 horizon=medium hours_out=11.4 raw_total=10 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1465 score=10 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1466 AA2194 DFW->MSY 2026-07-27
[historicalOtp] AA2194 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA2194/history/recent
[flightStatus] DL2243 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL2243 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 01:25Z","local":"2026-07-26 18:25-07:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] DL2243 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 01:25Z","terminal":"3","quality":["Basic"]}
[flightStatus] DL2243 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2889" 2026-07-26
[historicalOtp] AA2194 HTTP 429 Too Many Requests
[historicalOtp] AA2194 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] AA2194 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AA2194" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching MSY (KMSY)
[nasStatus] cache hit DFW
[carrierHealth] cache hit AA
[weather] MSY cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2889 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2889 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 19:40Z","local":"2026-07-26 15:40-04:00"},"revisedTime":{"utc":"2026-07-26 19:51Z","local":"2026-07-26 15:51-04:00"},"runwayTime":{"utc"2026-07-26 19:51Z","local":"2026-07-26 15:51-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL2889 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 19:40Z","revisedTime":"2026-07-26 19:51Z","runwayTime":"2026-07-26 19:51Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for DL2889
[flightStatus] DL2889 2026-07-26 status=EnRoute dep_delay=11 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3817" 2026-07-26
[flightStatus] AA2194 dep keys: airport,scheduledTime,quality
[flightStatus] AA2194 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 20:39Z","local":"2026-07-27 15:39-05:00"},"quality":["Basic"]}
[flightStatus] AA2194 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 20:39Z","quality":["Basic"]}
[flightStatus] AA2194 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA2194 2026-07-27 horizon=medium hours_out=15.5 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1466 score=15 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1471 DL743 ATL->SMF 2026-07-27
[historicalOtp] DL743 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL743/history/recent
[flightStatus] AA3817 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3817 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 01:59Z","local":"2026-07-26 20:59-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3817 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 01:59Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3817 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2416" 2026-07-26
[historicalOtp] DL743 HTTP 429 Too Many Requests
[historicalOtp] DL743 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] DL743 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL743" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching SMF (KSMF)
[nasStatus] cache hit ATL
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] SMF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL2416 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL2416 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 01:15Z","local":"2026-07-26 215-04:00"},"terminal":"I","quality":["Basic"]}
[flightStatus] DL2416 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 01:15Z","terminal":"I","quality":["Basic"]}
[flightStatus] computed inbound delay from revisedTime: 2min for DL2416
[flightStatus] DL2416 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=2 cancelled=false
[flightStatus] number lookup "DL114" 2026-07-26
[flightStatus] DL743 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL743 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 21:59Z","local":"2026-07-27 17:59-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL743 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 21:59Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL743 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL743 2026-07-27 horizon=medium hours_out=17.8 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1471 score=12 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1473 BA294 ORD->LHR 2026-07-27
[historicalOtp] BA294 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/BA294/history/recent
[flightStatus] DL114 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL114 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:20Z","local":"2026-07-26 22:20-04:00"},"revisedTime":{"utc":"2026-07-27 02:20Z","local":"2026-07-26 22:20-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL114 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:20Z","revisedTime":"2026-07-27 02:20Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL114 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA4100" 2026-07-26
[historicalOtp] BA294 HTTP 429 Too Many Requests
[historicalOtp] BA294 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] BA294 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "BA294" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching LHR (EGLL)
[nasStatus] cache hit ORD
[carrierHealth] computing BA
[carrierHealth] BA sample=24 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[weather] LHR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4100 dep keys: airport,scheduledTime,quality
[flightStatus] AA4100 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 12:05Z","local":"2026-07-26 07:05-05:00"},"qualy":["Basic"]}
[flightStatus] AA4100 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 12:05Z","quality":["Basic"]}
[flightStatus] AA4100 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA5479" 2026-07-26
[flightStatus] BA294 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] BA294 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 22:00Z","local":"2026-07-27 17:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] BA294 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 22:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] BA294 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[riskScorer] BA294 2026-07-27 horizon=medium hours_out=16.9 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1473 score=12 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1476 SK924 JFK->OSL 2026-07-27
[historicalOtp] SK924 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/SK924/history/recent
[flightStatus] AA5479 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA5479 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 15:14Z","local":"2026-07-26 10:14-05:00"},"revisedTime":{"utc":"2026-07-26 15:25Z","local":"2026-07-26 10:25-05:00"},"runwayTime":{"utc":"2026-07-26 15:25Z","local":"2026-07-26 10:25-05:00"},"terminal":"E","runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA5479 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 15:14Z","revisedTime":"2026-07-26 15:25Z","runwayTime":"2026-07-26 15:25Z","terminal":"E","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for AA5479
[flightStatus] AA5479 2026-07-26 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA5589" 2026-07-26
[historicalOtp] SK924 HTTP 429 Too Many Requests
[historicalOtp] SK924 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] SK924 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "SK924" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching OSL (KOSL)
[nasStatus] cache hit JFK
[carrierHealth] computing SK
[carrierHealth] SK sample=1 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] fetch failed for KOSL: Unexpected end of JSON input
[flightStatus] UA5589 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5589 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"cntryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 15:25Z","local":"2026-07-26 10:25-05:00"},"revisedTime":{"utc":"2026-07-26 15:35Z","local":"2026-07-26 10:35-05:00"},"runwayTime":{"utc":"2026-07-26 15:35Z","local":"2026-07-26 10:35-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5589 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 15:25Z","revisedTime":"2026-07-26 15:35Z","runwayTime":"2026-07-26 15:35Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for UA5589
[flightStatus] UA5589 2026-07-26 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL1585" 2026-07-26
[flightStatus] SK924 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] SK924 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 21:10Z","local":"2026-07-27 17:10-04:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] SK924 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 21:10Z","terminal":"1","quality":["Basic"]}
[flightStatus] SK924 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] SK924 2026-07-27 horizon=medium hours_out=17.0 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":0,"carrierHealth":3,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1476 score=18 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1479 WN1571 LAX->LAS 2026-07-27
[historicalOtp] WN1571 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/WN1571/history/recent
[flightStatus] DL1585 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1585 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 11:30Z","local":"2026-07-26 07:30-04:00"},"revisedTime":{"utc":"2026-07-26 11:42Z","local":"2026-07-26 07:42-04:00"},"runwayTime":{"utc":"2026-07-26 11:42Z","local":"2026-07-26 07:42-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL1585 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 11:30Z","revisedTime":"2026-07-26 11:42Z","runwayTime":"2026-07-26 11:42Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL1585
[flightStatus] DL1585 2026-07-26 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA1894" 2026-07-26
[historicalOtp] WN1571 HTTP 429 Too Many Requests
[historicalOtp] WN1571 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] WN1571 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "WN1571" 2026-07-27
[weather] fetching LAX (KLAX)
[weather] fetching LAS (KLAS)
[nasStatus] cache hit LAX
[carrierHealth]ache hit WN
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1894 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1894 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 19:25Z","local":"2026-07-26 14:25-05:00"},"revisedTime":{"utc":"2026-07-26 19:37Z","local":"2026-07-26 14:37-05:00"},"runwayTime":{"utc":"2026-07-26 19:37Z","local":"2026-07-26 14:37-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1894 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 19:25Z","revisedTime":"2026-07-26 19:37Z","runwayTime":"2026-07-26 19:37Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for AA1894
[flightStatus] AA1894 2026-07-26 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA2189" 2026-07-26
[flightStatus] WN1571 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] WN1571 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-28 00:00Z","local":"2026-07-27 17:00-07:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] WN1571 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-28 00:00Z","terminal":"1","quality":["Basic"]}
[flightStatus] WN1571 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] LAS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[riskScorer] WN1571 2026-07-27 horizon=medium hours_out=16.9 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1479 score=12 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1483 AA2346 DFW->ORD 2026-07-27
[historicalOtp] AA2346 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA2346/history/recent
[flightStatus] UA2189 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2189 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 18:00Z","local":"2026-07-26 13:00-05:00"},"revisedTime":{"utc":"2026-07-26 18:48Z","local":"2026-07-26 13:48-05:00"},"runwayTime":{"utc":"2026-07-26 18:48Z","local":"2026-07-26 13:48-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2189 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 18:00Z","revisedTime":"2026-07-26 18:48Z","runwayTime":"2026-07-26 18:48Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 48min for UA2189
[flightStatus] computed inbound delay from revisedTime: 2min for UA2189
[flightStatus] UA2189 2026-07-26 status=Arrived dep_delay=48 inbound_delay=2 cancelled=false
[flightStatus] number lookup "DL2827" 2026-07-26
[historicalOtp] AA2346 HTTP 429 Too Many Requests
[historicalOtp] AA2346 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] AA2346 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AA2346" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching ORD (KORD)
[nasStatus] cache hit DFW
[nasStatus] cache hit ORD
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] AA2346 dep keys: airport,scheduledTime,quality
[flightStatus] AA2346 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-28 02:00Z","local":"2026-07-27 21:00-05:00"},"quality":["Basic"]}
[flightStatu AA2346 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-28 02:00Z","quality":["Basic"]}
[flightStatus] AA2346 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA2346 2026-07-27 horizon=medium hours_out=20.9 raw_total=19 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":3,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1483 score=19 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1485 DL4722 ATL->CHA 2026-07-27
[historicalOtp] DL4722 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL4722/history/recent
[historicalOtp] DL4722 HTTP 404 Not Found
[historicalOtp] DL4722 raw response (first 500 chars): 
[historicalOtp] DL4722 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL4722" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching CHA (KCHA)
[nasStatus] cache hit ATL
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[weather] CHA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL2827 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2827 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 16:40Z","local":"2026-07-26 12:40-04:00"},"revisedTime":{"utc":"2026-07-26 16:55Z","local":"2026-07-26 12:55-04:00"},"runwayTime":{"utc":"2026-07-26 16:55Z","local":"2026-07-26 12:55-04:00"},"tminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2827 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 16:40Z","revisedTime":"2026-07-26 16:55Z","runwayTime":"2026-07-26 16:55Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for DL2827
[flightStatus] DL2827 2026-07-26 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL363" 2026-07-26
[flightStatus] HTTP 429 for "DL4722" 2026-07-27
[flightStatus] number lookup "DL 4722" 2026-07-27
[flightStatus] DL363 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL363 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 15:15Z","local":"2026-07-26 11:15-04:00"},"revisedTime":{"utc":"2026-07-26 15:43Z","local":"2026-07-26 11:43-04:00"},"runwayTime":{"utc":"2026-07-26 15:43Z","local":"2026-07-26 11:43-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL363 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 15:15Z","revisedTime":"2026-07-26 15:43Z","runwayTime":"2026-07-26 15:43Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 28min for DL363
[flightStatus] DL363 2026-07-26 status=Arrived dep_delay=28 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL3842" 2026-07-26
[flightStatus] DL4722 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL4722 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 23:45Z","local":"2026-07-27 19:45-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL4722 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 23:45Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL4722 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL4722 2026-07-27 horizon=medium hours_out=19.6 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1485 score=15 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1492 DL114 JFK->OPO 2026-07-27
[historicalOtp] DL114 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL114/history/recent
[flightStatus] DL3842 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3842 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 19:57Z","local":"2026-07-26 12:57-07:00"},"revisedTime":{"utc":"2026-07-26 20:18Z","local":"2026-07-26 13:18-07:00"},"runwayTime":{"utc":"2026-07-26 20:18Z","local":"2026-07-26 13:18-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL3842 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 19:57Z","revisedTime":"2026-07-26 20:18Z","runwayTime":"2026-07-26 20:18Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for DL3842
[flightStatus] DL3842 2026-07-26 status=Arrived dep_delay=21 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA5475" 2026-07-26
[historicalOtp] DL114 HTTP 429 Too Many Requests
[historicalOtp] DL114 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] DL114 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL114" 2026-07-27
[weather] fetching JFK (KJFK)
[weatr] fetching OPO (KOPO)
[nasStatus] cache hit JFK
[carrierHealth] cache hit DL
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA5475 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA5475 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 21:57Z","local":"2026-07-26 16:57-05:00"},"revisedTime":{"utc":"2026-07-26 22:05Z","local":"2026-07-26 17:05-05:00"},"runwayTime":{"utc":"2026-07-26 22:05Z","local":"2026-07-26 17:05-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA5475 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 21:57Z","revisedTime":"2026-07-26 22:05Z","runwayTime":"2026-07-26 22:05Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 8min for AA5475
[flightStatus] AA5475 2026-07-26 status=Arrived dep_delay=8 inbound_delay=0 cancelled=false
[flightStatus] number lookup "LF3054" 2026-07-26
[flightStatus] DL114 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL114 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:20Z","local":"2026-07-26 22:20-04:00"},"revisedTime":{"utc":"2026-07-27 02:20Z","local":"2026-07-26 22:20-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL114 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:20Z","revisedTime":"2026-07-27 02:20Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL114 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] LF3054 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] LF3054 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 21:00Z","local":"2026-07-26 16:00-05:00"},"revisedTime":{"utc":"2026-07-26 21:25Z","local":"2026-07-26 16:25-05:00"},"runwayTime":{"utc":"2026-07-26 21:25Z","local":"2026-07-26 16:25-05:00"},"terminal":"3","runway":"22L","quality":["Basic","Live"]}
[flightStatus] LF3054 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 21:00Z","revisedTime":"2026-07-26 21:25Z","runwayTime":"2026-07-26 21:25Z","terminal":"3","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 25min for LF3054
[flightStatus] LF3054 2026-07-26 status=EnRoute dep_delay=25 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL3119" 2026-07-26
[weather] fetch failed for KOPO: Unexpected end of JSON input
[riskScorer] DL114 2026-07-27 horizon=medium hours_out=22.3 raw_total=20 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":0,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":3,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1492 score=20 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1496 PD618 BOS->YYZ 2026-07-27
[historicalOtp] PD618 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/PD618/history/recent
[flightStatus] HTTP 429 for "DL3119" 2026-07-26
[flightStatus] number lookup "DL 3119" 2026-07-26
[historicalOtp] PD618 HTTP 404 Not Found
[historicalOtp] PD618 raw response (first 500 chars): 
[historicalOtp] PD618 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "PD618" 2026-07-27
[weather] fetching BOS (KBOS)
[weather] fetching YYZ (CYYZ)
[nasStatus] cache hit BOS
[carrierHealth] computing PD
[carrierHealth] PD sample=9 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[flightStatus] DL3119 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL3119 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_Yor},"scheduledTime":{"utc":"2026-07-26 21:59Z","local":"2026-07-26 17:59-04:00"},"revisedTime":{"utc":"2026-07-26 22:26Z","local":"2026-07-26 18:26-04:00"},"runwayTime":{"utc":"2026-07-26 22:26Z","local":"2026-07-26 18:26-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL3119 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 21:59Z","revisedTime":"2026-07-26 22:26Z","runwayTime":"2026-07-26 22:26Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for DL3119
[flightStatus] DL3119 2026-07-26 status=Arrived dep_delay=27 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2937" 2026-07-26
[flightStatus] PD618 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] PD618 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 23:30Z","local":"2026-07-27 19:30-04:00"},"terminal":"E","quality":["Basic"]}
[flightStatus] PD618 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 23:30Z","terminal":"E","quality":["Basic"]}
[flightStatus] PD618 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] HTTP 429 for "AA2937" 2026-07-26
[flightStatus] number lookup "AA 2937" 2026-07-26
[weather] YYZ cat=VFR vis=15 ceil=7000 ts=false fz=false contrib=2
[flightStatus] AA2937 dep keys: airport,scheduledTime,quality
[flightStatus] AA2937 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:49Z","local":"2026-07-26 19:49-05:00"},"quality":["Basic"]}
[flightStatus] AA2937 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:49Z","quality":["Basic"]}
[flightStatus] AA2937 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL1057" 2026-07-26
[weather] BOS cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[riskScorer] PD618 2026-07-27 horizon=medium hours_out=19.3 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":2,"dayOfWeekRisk":3,"connectionRisk":4}
[monitor] stored flight_id=1496 score=15 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1453 AA1894 DFW->GSO 2026-07-27
[historicalOtp] AA1894 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA1894/history/recent
[flightStatus] DL1057 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL1057 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 01:15Z","local":"2026-07-26 21:15-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL1057 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 01:15Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL1057 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AS207" 2026-07-26
[historicalOtp] AA1894 HTTP 404 Not Found
[historicalOtp] AA1894 raw response (first 500 chars): 
[historicalOtp] AA1894 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AA1894" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching GSO (KGSO)
[nasStatus] cache hit DFW
[carrierHealth] cache hit AA
[flightStatus] HTTP 429 for "AS207" 2026-07-26
[flightStatus] number lookup "AS 207" 2026-07-26
[flightStatus] AA1894 dep keys: airport,scheduledTime,quality
[flightStatus] AA1894 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 19:25Z","local":"2026-07-27 14:25-05:00"},"quality":["Basic"]}
[flightStatus] AA1894 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 19:25Z","quality":["Basic"]}
[flightStatus] AA1894 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] AS207 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AS207 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 04:35Z","local":"2026-07-26 21:35-07:00"},"terminal":"6","quality":["Basic"]}
[flightStatus] AS207 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 04:35Z","terminal":"6","quality":["Basic"]}
[flightStatus] AS207 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2814" 2026-07-26
[flightStatus] AA2814 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2814 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 12:10Z","local":"2026-07-26 07:10-05:00"},"revisedTime":{"utc":"2026-07-26 12:22Z","local":"2026-07-26 07:22-05:00"},"runwayTime":{"utc":"2026-07-26 12:22Z","local":"2026-07-26 07:22-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2814 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 12:10Z","revisedTime":"2026-07-26 12:22Z","runwayTime":"2026-07-26 12:22Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for AA2814
[flightStatus] AA2814 2026-07-26 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[flightStatus] number lookup "MQ3554" 2026-07-26
[flightStatus] HTTP 429 for "MQ3554" 2026-07-26
[flightStatus] number lookup "MQ 3554" 2026-07-26
[flightStatus] MQ3554 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] MQ3554 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 14:52Z","local":"2026-07-26 09:52-05:00"},"revisedTime":{"utc":"2026-07-26 15:13Z","local":"2026-07-26 10:13-05:00"},"runwayTime":{"utc":"2026-07-26 15:13Z","local":"2026-07-26 10:13-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] MQ3554 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 14:52Z","revisedTime":"2026-07-26 15:13Z","runwayTime":"2026-07-26 15:13Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for MQ3554
[flightStatus] computed inbound delay from revisedTime: 30min for MQ3554
[flightStatus] MQ3554 2026-07-26 status=Arrived dep_delay=21 inbound_delay=30 cancelled=false
[flightStatus] number lookup "AA471" 2026-07-26
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA471 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA471 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:29Z","local":"2026-07-26 08:29-05:00"},"revisedTime":{"utc":"2026-07-26 13:45Z","local":"2026-07-26 08:45-05:00"},"runwayTime":{"utc":"2026-07-26 13:45Z","local":"2026-07-26 08:45-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA471 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:29Z","revisedTime":"2026-07-26 13:45Z","runwayTime":"2026-07-26 13:45Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AA471
[flightStatus] AA471 2026-07-26 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL1917" 2026-07-26
[weather] GSO cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[riskScorer] AA1894 2026-07-27 horizon=medium hours_out=14.3 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1453 score=15 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1454 DL3507 ATL->SHV 2026-07-27
[historicalOtp] DL3507 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL3507/history/recent
[flightStatus] DL1917 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1917 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 12:30Z","local":"2026-07-26 08:30-04:00"},"revisedTime":{"utc":"2026-07-26 12:51Z","local":"2026-07-26 08:51-04:00"},"runwayTime":{"utc":"2026-07-26 12:51Z","local":"2026-07-26 08:51-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL1917 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 12:30Z","revisedTime":"2026-07-26 12:51Z","runwayTime":"2026-07-26 12:51Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for DL1917
[flightStatus] DL1917 2026-07-26 status=EnRoute dep_delay=21 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL3700" 2026-07-26
[historicalOtp] DL3507 HTTP 429 Too Many Requests
[historicalOtp] DL3507 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] DL3507 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL3507" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching SHV (KSHV)
[nasStatus] cache hit ATL
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL3700 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL3700 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 14:10Z","local":026-07-26 07:10-07:00"},"revisedTime":{"utc":"2026-07-26 14:18Z","local":"2026-07-26 07:18-07:00"},"runwayTime":{"utc":"2026-07-26 14:18Z","local":"2026-07-26 07:18-07:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] DL3700 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 14:10Z","revisedTime":"2026-07-26 14:18Z","runwayTime":"2026-07-26 14:18Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 8min for DL3700
[flightStatus] DL3700 2026-07-26 status=Arrived dep_delay=8 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA4825" 2026-07-26
[flightStatus] DL3507 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL3507 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 15:21Z","local":"2026-07-27 11:21-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL3507 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 15:21Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL3507 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] SHV cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] DL3507 2026-07-27 horizon=medium hours_out=11.2 raw_total=10 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1454 score=10 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1459 UA2451 ORD->IAH 2026-07-27
[historicalOtp] UA2451 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/UA2451/history/recent
[flightStatus] AA4825 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA4825 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 18:29Z","local":"2026-07-26 13:29-05:00"},"revisedTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 14:15-05:00"},"runwayTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 14:15-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA4825 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 18:29Z","revisedTime":"2026-07-26 19:15Z","runwayTime":"2026-07-26 19:15Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 46min for AA4825
[flightStatus] computed inbound delay from revisedTime: 5min for AA4825
[flightStatus] AA4825 2026-07-26 status=Arrived dep_delay=46 inbound_delay=5 cancelled=false
[flightStatus] number lookup "DL2094" 2026-07-26
[historicalOtp] UA2451 HTTP 429 Too Many Requests
[historicalOtp] UA2451 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] UA2451 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "UA2451" 2026-07-27
[weather] fetching ORD (KORD)
[weather] fetching IAH (KIAH)
[nasStatus] cache hit ORD
[carrierHealth] cache hit UA
[weather] IAH cat=VFR vis=10 ceil=999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] DL2094 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL2094 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 16:25Z","local":"2026-07-26 12:25-04:00"},"revisedTime":{"utc":"2026-07-26 16:45Z","local":"2026-07-26 12:45-04:00"},"runwayTime":{"utc":"2026-07-26 16:45Z","local":"2026-07-26 12:45-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL2094 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 16:25Z","revisedTime":"2026-07-26 16:45Z","runwayTime":"2026-07-26 16:45Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for DL2094
[flightStatus] DL2094 2026-07-26 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2779" 2026-07-26
[flightStatus] UA2451 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA2451 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 19:15Z","local":"2026-07-27 14:15-05:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] UA2451 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 19:15Z","terminal":"1","quality":["Basic"]}
[flightStatus] UA2451 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] UA2451 2026-07-27 horizon=medium hours_out=14.1 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1459 score=12 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1460 DL2775 JFK->MCO 2026-07-27
[historicalOtp] DL2775 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL2775/history/recent
[flightStatus] DL2779 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2779 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 16:30Z","local":"2026-07-26 12:30-04:00"},"revisedTime":{"utc":"2026-07-26 17:02Z","local":"2026-07-26 13:02-04:00"},"runwayTime":{"utc":"2026-07-26 17:02Z","local":"2026-07-26 13:02-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL2779 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 16:30Z","revisedTime":"2026-07-26 17:02Z","runwayTime":"2026-07-26 17:02Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 32min for DL2779
[flightStatus] DL2779 2026-07-26 status=Arrived dep_delay=32 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2136" 2026-07-26
[historicalOtp] DL2775 HTTP 429 Too Many Requests
[historicalOtp] DL2775 raw response (first 500 chars): {"message":"You have exceeded the rate limit per second for your plan, ULTRA, by the API provider"}
[historicalOtp] DL2775 HTTP 429 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL2775" 2026-07-27
[weather] fetching JFK (KJFK)
[weather] fetching MCO (KMCO)
[nasStatus] cache hit JFK
[carrierHealth] cache hit DL
[weather] MCO cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA2136 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2136 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:31Z","local":"2026-07-26 15:31-05:00"},"revisedTime":{"utc":"2026-07-26 20:44Z","local":"2026-07-26 15:44-05:00"},"runwayTime":{"utc":"2026-07-26 204Z","local":"2026-07-26 15:44-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2136 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:31Z","revisedTime":"2026-07-26 20:44Z","runwayTime":"2026-07-26 20:44Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for AA2136
[flightStatus] AA2136 2026-07-26 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[flightStatus] number lookup "XP422" 2026-07-26
[flightStatus] DL2775 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL2775 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 15:27Z","local":"2026-07-27 11:27-04:00"},"terminal":"4","quality":["Basic"]}
[flightStatus] DL2775 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 15:27Z","terminal":"4","quality":["Basic"]}
[flightStatus] DL2775 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] XP422 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] XP422 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:13Z","local":"2026-07-26 18:13-05:00"},"revisedTime":{"utc":"2026-07-26 23:31Z","local":"2026-07-26 18:31-05:00"},"runwayTime":{"utc":"2026-07-26 23:31Z","local":"2026-07-26 18:31-05:00"},"quality":["Basic","Live"]}
[flightStatus] XP422 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:13Z","revisedTime":"2026-07-26 23:31Z","runwayTime":"2026-07-26 23:31Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for XP422
[flightStatus] XP422 2026-07-26 status=EnRoute dep_delay=18 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL1480" 2026-07-26
[flightStatus] HTTP 429 for "DL1480" 2026-07-26
[flightStatus] number lookup "DL 1480" 2026-07-26
[flightStatus] DL1480 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1480 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 19:41Z","local":"2026-07-26 15:41-04:00"},"revisedTime":{"utc":"2026-07-26 20:03Z","local":"2026-07-26 16:03-04:00"},"runwayTime":{"utc":"2026-07-26 20:03Z","local":"2026-07-26 16:03-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL1480 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 19:41Z","revisedTime":"2026-07-26 20:03Z","runwayTime":"2026-07-26 20:03Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL1480
[flightStatus] DL1480 2026-07-26 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DE2081" 2026-07-26
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] DL2775 2026-07-27 horizon=medium hours_out=11.3 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1460 score=15 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1463 DL3794 LAX->GEG 2026-07-27
[historicalOtp] DL3794 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL3794/history/recent
[flightStatus] DE2081 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DE2081 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 23:45Z","local":"2026-07-26 16:45-07:00"},"revisedTime":{"utc":"2026-07-27 00:04Z","local":"2026-07-26 17:04-07:00"},"runwayTime":{"utc":"2026-07-27 00:04Z","local":"2026-07-26 17:04-07:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] DE2081 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 23:45Z","revisedTime":"2026-07-27 00:04Z","runwayTime":"2026-07-27 00:04Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for DE2081
[flightStatus] DE2081 2026-07-26 status=EnRoute dep_delay=19 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5641" 2026-07-26
[historicalOtp] DL3794 HTTP 404 Not Found
[historicalOtp] DL3794 raw response (first 500 chars): 
[historicalOtp] DL3794 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL3794" 2026-07-27
[weather] fehing LAX (KLAX)
[weather] fetching GEG (KGEG)
[nasStatus] cache hit LAX
[carrierHealth] cache hit DL
[weather] GEG cat=VFR vis=8 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] HTTP 429 for "DL5641" 2026-07-26
[flightStatus] number lookup "DL 5641" 2026-07-26
[flightStatus] DL3794 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL3794 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 20:00Z","local":"2026-07-27 13:00-07:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] DL3794 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 20:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] DL3794 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] DL3794 2026-07-27 horizon=medium hours_out=12.8 raw_total=10 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":0,"dayOfWeekRisk":3,"connectionRisk":1}
[monitor] stored flight_id=1463 score=10 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1467 AA1137 DFW->BOG 2026-07-27
[historicalOtp] AA1137 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/AA1137/history/recent
[flightStatus] DL5641 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5641 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:54Z","local":"2026-07-26 14:54-04:00"},"revisedTime":{"utc":"2026-07-26 19:57Z","local":"2026-07-26 15:57-04:00"},"runwayTime":{"utc":"2026-07-26 19:57Z","local":"2026-07-26 15:57-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL5641 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:54Z","revisedTime":"2026-07-26 19:57Z","runwayTime":"2026-07-26 19:57Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 63min for DL5641
[flightStatus] computed inbound delay from revisedTime: 17min for DL5641
[flightStatus] DL5641 2026-07-26 status=Arrived dep_delay=63 inbound_delay=17 cancelled=false
[flightStatus] number lookup "AS748" 2026-07-26
[historicalOtp] AA1137 HTTP 404 Not Found
[historicalOtp] AA1137 raw response (first 500 chars): 
[historicalOtp] AA1137 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "AA1137" 2026-07-27
[weather] fetching DFW (KDFW)
[weather] fetching BOG (KBOG)
[nasStatus] cache hit DFW
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] fetch failed for KBOG: Unexpected end of JSON input
[flightStatus] HTTP 429 for "AS748" 2026-07-26
[flightStatus] number lookup "AS 748" 2026-07-26
[flightStatus] AA1137 dep keys: airport,scheduledTime,quality
[flightStatus] AA1137 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 21:56Z","local":"2026-07-27 16:56-05:00"},"quality":["Basic"]}
[flightStatus] AA1137 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 21:56Z","quality":["Basic"]}
[flightStatus] AA1137 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[riskScorer] AA1137 2026-07-27 horizon=medium hours_out=16.8 raw_total=14 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":0,"carrierHealth":4,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1467 score=14 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] scoring flight_id=1470 DL472 ATL->SEA 2026-07-27
[historicalOtp] DL472 fetching url=https://aerodatabox.p.rapidapi.com/flights/number/DL472/history/rece
[flightStatus] AS748 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS748 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 14:00Z","local":"2026-07-26 07:00-07:00"},"revisedTime":{"utc":"2026-07-26 14:19Z","local":"2026-07-26 07:19-07:00"},"runwayTime":{"utc":"2026-07-26 14:19Z","local":"2026-07-26 07:19-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS748 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 14:00Z","revisedTime":"2026-07-26 14:19Z","runwayTime":"2026-07-26 14:19Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AS748
[flightStatus] AS748 2026-07-26 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA4918" 2026-07-26
[historicalOtp] DL472 HTTP 404 Not Found
[historicalOtp] DL472 raw response (first 500 chars): 
[historicalOtp] DL472 HTTP 404 error — fallback fired sampleSize=0 onTimeRate=0.750
[flightStatus] number lookup "DL472" 2026-07-27
[weather] fetching ATL (KATL)
[weather] fetching SEA (KSEA)
[nasStatus] cache hit ATL
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] HTTP 429 for "AA4918" 2026-07-26
[flightStatus] number lookup "AA 4918" 2026-07-26
[flightStatus] DL472 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL472 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCe":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 20:45Z","local":"2026-07-27 16:45-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL472 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 20:45Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL472 2026-07-27 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[weather] SEA cat=VFR vis=10 ceil=5000 ts=false fz=false contrib=2
[riskScorer] DL472 2026-07-27 horizon=medium hours_out=16.6 raw_total=12 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":1,"destinationWeather":1,"carrierHealth":1,"historicalOtp":3,"timeOfDayRisk":1,"dayOfWeekRisk":3,"connectionRisk":2}
[monitor] stored flight_id=1470 score=12 tier=green cancelled=false delay_min=0 inbound_delay=0
[monitor] cycle end checked=41 alerts=0 elapsed_ms=89690
[flightStatus] AA4918 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA4918 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:51Z","local":"2026-07-26 08:51-05:00"},"revisedTime":{"utc":"2026-07-26 14:14Z","local":"2026-07-26 09:14-05:00"},"runwayTime":{"utc":"2026-07-26 14:14Z","local":"2026-07-26 09:14-05:00"},"terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA4918 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:51Z","revisedTime":"2026-07-26 14:14Z","runwayTime":"2026-07-26 14:14Z","terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for AA4918
[flightStatus] AA4918 2026-07-26 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA1484" 2026-07-26
[flightStatus] UA1484 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA1484 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:40Z","local":"2026-07-26 08:40-05:00"},"revisedTime":{"utc":"2026-07-26 13:55Z","local":"2026-07-26 08:55-05:00"},"runwayTime":{"utc":"2026-07-26 13:55Z","local":"2026-07-26 08:55-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1484 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:40Z","revisedTime":"2026-07-26 13:55Z","runwayTime":"2026-07-26 13:55Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for UA1484
[flightStatus] UA1484 2026-07-26 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[flightStatus] number lookup "VS26" 2026-07-26
[flightStatus] HTTP 429 for "VS26" 2026-07-26
[flightStatus] number lookup "VS 26" 2026-07-26
[flightStatus] VS26 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] VS26 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 12:15Z","local":"2026-07-26 08:15-04:00"},"revisedTime":{"utc":"2026-07-26 12:24Z","local":"2026-07-26 08:24-04:00"},"runwayTime":{"utc":"2026-07-26 12:24Z","local":"2026-07-26 08:24-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] VS26 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 12:15Z","revisedTime":"2026-07-26 12:24Z","runwayTime":"2026-07-26 12:24Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for VS26
[flightStatus] VS26 2026-07-26 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA703" 2026-07-26
[flightStatus] UA703 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA703 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 14:00Z","local":"2026-07-26 07:00-07:00"},"revisedTime":{"utc":"2026-07-26 14:16Z","local":"2026-07-26 07:16-07:00"},"runwayTime":{"utc":"2026-07-26 14:16Z","local":"2026-07-26 07:16-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA703 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 14:00Z","revisedTime":"2026-07-26 14:16Z","runwayTime":"2026-07-26 14:16Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for UA703
[flightStatus] UA703 2026-07-26 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL695" 2026-07-26
[flightStatus] DL695 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL695 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 10:45Z","local":"2026-07-26 06:45-04:00"},"revisedTime":{"utc":"2026-07-26 10:48Z","local":"2026-07-26 06:48-04:00"},"runwayTime":{"utc":"2026-07-26 10:48Z","local":"2026-07-26 06:48-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL695 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 10:45Z","revisedTime":"2026-07-26 10:48Z","runwayTime":"2026-07-26 10:48Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 3min for DL695
[flightStatus] DL695 2026-07-26 status=Arrived dep_delay=3 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA1743" 2026-07-26
[flightStatus] HTTP 429 for "AA1743" 2026-07-26
[flightStatus] number lookup "AA 1743" 2026-07-26
[flightStatus] AA1743 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA1743 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 16:40Z","local":"2026-07-26 11:40-05:00"},"revisedTime":{"utc":"2026-07-26 18:53Z","local":"2026-07-26 13:53-05:00"},"runwayTime":{"utc":"2026-07-26 18:53Z","local":"2026-07-26 13:53-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1743 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 16:40Z","revisedTime":"2026-07-26 18:53Z","runwayTime":"2026-07-26 18:53Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 133min for AA1743
[flightStatus] computed inbound delay from revisedTime: 94min for AA1743
[flightStatus] AA1743 2026-07-26 status=Arrived dep_delay=133 inbound_delay=94 cancelled=false
[flightStatus] number lookup "UA2202" 2026-07-26
[flightStatus] UA2202 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2202 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:09Z","local":"2026-07-26 18:09-05:00"},"revisedTime":{"utc":"2026-07-26 23:40Z","local":"2026-07-26 18:40-05:00"},"runwayTime":{"utc":"2026-07-26 23:40Z","local":"2026-07-26 18:40-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2202 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:09Z","revisedTime":"2026-07-26 23:40Z","runwayTime":"2026-07-26 23:40Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for UA2202
[flightStatus] UA2202 2026-07-26 status=EnRoute dep_delay=31 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA5459" 2026-07-26
[flightStatus] UA5459 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA5459 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 23:55Z","local":"2026-07-26 16:55-07:00"},"revisedTime":{"utc":"2026-07-26 23:53Z","local":"2026-07-26 16:53-07:00"},"runwayTime":{"utc":"2026-07-26 23:53Z","local":"2026-07-26 16:53-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA5459 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 23:55Z","revisedTime":"2026-07-26 23:53Z","runwayTime":"2026-07-26 23:53Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 4min for UA5459
[flightStatus] UA5459 2026-07-26 status=EnRoute dep_delay=0 inbound_delay=4 cancelled=false
[flightStatus] number lookup "UA3543" 2026-07-26
[flightStatus] UA3543 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA3543 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 22:05Z","local":"2026-07-26 18:05-04:00"},"revisedTime":{"utc":"2026-07-26 22:25Z","local":"2026-07-26 18:25-04:00"},"runwayTime":{"utc":"2026-07-26 22:25Z","local":"2026-07-26 18:25-04:00"},"terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] UA3543 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 22:05Z","revisedTime":"2026-07-26 22:25Z","runwayTime":"2026-07-26 22:25Z","terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for UA3543
[flightStatus] UA3543 2026-07-26 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA1156" 2026-07-26
[flightStatus] UA1156 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA1156 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 19:45-05:00"},"terminal":"1","quality":["Basic"]}
[flightStatus] UA1156 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:45Z","terminal":"1","quality":["Basic"]}
[flightStatus] computed inbound delay from revisedTime: 53min for UA1156
[flightStatus] UA1156 2026-07-26 status=Delayed dep_delay=0 inbound_delay=53 cancelled=false
[flightStatus] number lookup "DL4441" 2026-07-26
[flightStatus] DL4441 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL4441 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:49Z","local":"2026-07-26 22:49-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL4441 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:49Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL4441 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA236" 2026-07-26
[flightStatus] AA236 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] AA236 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 23:30Z","local":"2026-07-26 19:30-04:00"},"revisedTime":{"utc":"2026-07-27 00:15Z","local":"2026-07-26 20:15-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA236 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 23:30Z","revisedTime":"2026-07-27 00:15Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 45min for AA236
[flightStatus] AA236 2026-07-26 status=Scheduled dep_delay=45 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3451" 2026-07-26
[flightStatus] AA3451 dep keys: airport,scheduledTime,quality
[flightStatus] AA3451 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:40Z","local":"2026-07-26 08:40-05:00"},"quality":["Basic"]}
[flightStatus] AA3451 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:40Z","quality":["Basic"]}
[flightStatus] AA3451 2026-07-26 status=Arrived dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2952" 2026-07-26
[flightStatus] DL2952 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2952 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 13:03Z","local":"2026-07-26 09:03-04:00"},"revisedTime":{"utc":"2026-07-26 13:20Z","local":"2026-07-26 09:20-04:00"},"runwayTime":{"utc":"2026-07-26 13:20Z","local":"2026-07-26 09:20-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2952 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 13:03Z","revisedTime":"2026-07-26 13:20Z","runwayTime":"2026-07-26 13:20Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for DL2952
[flightStatus] DL2952 2026-07-26 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AS1418" 2026-07-26
[flightStatus] AS1418 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS1418 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 17:18Z","local":"2026-07-26 10:18-07:00"},"revisedTime":{"utc":"2026-07-26 17:34Z","local":"2026-07-26 10:34-07:00"},"runwayTime":{"utc":"2026-07-26 17:34Z","local":"2026-07-26 10:34-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS1418 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 17:18Z","revisedTime":"2026-07-26 17:34Z","runwayTime":"2026-07-26 17:34Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AS1418
[flightStatus] AS1418 2026-07-26 status=EnRoute dep_delay=16 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AS256" 2026-07-26
[flightStatus] AS256 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AS256 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 12:28Z","local":"2026-07-26 08:28-04:00"},"revisedTime":{"utc":"2026-07-26 12:42Z","local":"2026-07-26 08:42-04:00"},"runwayTime":{"utc":"2026-07-26 12:42Z","local":"2026-07-26 08:42-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AS256 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 12:28Z","revisedTime":"2026-07-26 12:42Z","runwayTime":"2026-07-26 12:42Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 14min for AS256
[flightStatus] AS256 2026-07-26 status=Arrived dep_delay=14 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2861" 2026-07-26
[flightStatus] AA2861 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2861 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 16:47Z","local":"2026-07-26 11:47-05:00"},"revisedTime":{"utc":"2026-07-26 17:48Z","local":"2026-07-26 12:48-05:00"},"runwayTime":{"utc":"2026-07-26 17:48Z","local":"2026-07-26 12:48-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2861 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 16:47Z","revisedTime":"2026-07-26 17:48Z","runwayTime":"2026-07-26 17:48Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 61min for AA2861
[flightStatus] computed inbound delay from revisedTime: 44min for AA2861
[flightStatus] AA2861 2026-07-26 status=Arrived dep_delay=61 inbound_delay=44 cancelled=false
[flightStatus] number lookup "AA6221" 2026-07-26
[flightStatus] AA6221 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA6221 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 21:00Z","local":"2026-07-26 14:00-07:00"},"revisedTime":{"utc":"2026-07-26 21:26Z","local":"2026-07-26 14:26-07:00"},"runwayTime":{"utc":"2026-07-26 21:26Z","local":"2026-07-26 14:26-07:00"},"runway":"24L","quality":["Basic","Live"]}
[flightStatus] AA6221 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 21:00Z","revisedTime":"2026-07-26 21:26Z","runwayTime":"2026-07-26 21:26Z","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for AA6221
[flightStatus] AA6221 2026-07-26 status=Arrived dep_delay=26 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3532" 2026-07-26
[flightStatus] AA3532 dep keys: airport,scheduledTime,quality
[flightStatus] AA3532 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:43Z","local":"2026-07-26 15:43-05:00"},"quality":["Basic"]}
[flightStatus] AA3532 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:43Z","quality":["Basic"]}
[flightStatus] AA3532 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL3117" 2026-07-26
[flightStatus] DL3117 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL3117 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:48Z","local":"2026-07-26 22:48-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL3117 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:48Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL3117 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2457" 2026-07-26
[flightStatus] DL2457 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL2457 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 03:00Z","local":"2026-07-26 20:00-07:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] DL2457 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 03:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] DL2457 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA644" 2026-07-26
[flightStatus] UA644 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA644 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:45Z","local":"2026-07-26 08:45-05:00"},"revisedTime":{"utc":"2026-07-26 14:02Z","local":"2026-07-26 09:02-05:00"},"runwayTime":{"utc":"2026-07-26 14:02Z","local":"2026-07-26 09:02-05:00"},"terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] UA644 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:45Z","revisedTime":"2026-07-26 14:02Z","runwayTime":"2026-07-26 14:02Z","terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for UA644
[flightStatus] UA644 2026-07-26 status=Arrived dep_delay=17 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA5477" 2026-07-26
[flightStatus] UA5477 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5477 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 11:45Z","local":"2026-07-26 06:45-05:00"},"revisedTime":{"utc":"2026-07-26 12:20Z","local":"2026-07-26 07:20-05:00"},"runwayTime":{"utc":"2026-07-26 12:20Z","local":"2026-07-26 07:20-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5477 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 11:45Z","revisedTime":"2026-07-26 12:20Z","runwayTime":"2026-07-26 12:20Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 35min for UA5477
[flightStatus] UA5477 2026-07-26 status=Arrived dep_delay=35 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5733" 2026-07-26
[flightStatus] HTTP 429 for "DL5733" 2026-07-26
[flightStatus] number lookup "DL 5733" 2026-07-26
[flightStatus] DL5733 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5733 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 13:50Z","local":"2026-07-26 09:50-04:00"},"revisedTime":{"utc":"2026-07-26 14:16Z","local":"2026-07-26 10:16-04:00"},"runwayTime":{"utc":"2026-07-26 14:16Z","local":"2026-07-26 10:16-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] DL5733 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 13:50Z","revisedTime":"2026-07-26 14:16Z","runwayTime":"2026-07-26 14:16Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for DL5733
[flightStatus] DL5733 2026-07-26 status=Arrived dep_delay=26 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2954" 2026-07-26
[flightStatus] AA2954 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2954 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 15:36Z","local":"2026-07-26 08:36-07:00"},"revisedTime":{"utc":"2026-07-26 16:03Z","local":"2026-07-26 09:03-07:00"},"runwayTime":{"utc":"2026-07-26 16:03Z","local":"2026-07-26 09:03-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA2954 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 15:36Z","revisedTime":"2026-07-26 16:03Z","runwayTime":"2026-07-26 16:03Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for AA2954
[flightStatus] computed inbound delay from revisedTime: 9min for AA2954
[flightStatus] AA2954 2026-07-26 status=EnRoute dep_delay=27 inbound_delay=9 cancelled=false
[flightStatus] number lookup "AA1509" 2026-07-26
[flightStatus] AA1509 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA1509 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 11:00Z","local":"2026-07-26 07:00-04:00"},"revisedTime":{"utc":"2026-07-26 11:02Z","local":"2026-07-26 07:02-04:00"},"runwayTime":{"utc":"2026-07-26 11:02Z","local":"2026-07-26 07:02-04:00"},"terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] AA1509 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 11:00Z","revisedTime":"2026-07-26 11:02Z","runwayTime":"2026-07-26 11:02Z","terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 2min for AA1509
[flightStatus] AA1509 2026-07-26 status=Arrived dep_delay=2 inbound_delay=0 cancelled=false
[flightStatus] number lookup "OO456R" 2026-07-26
[flightStatus] OO456R dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] OO456R dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 17:30Z","local":"2026-07-26 12:30-05:00"},"revisedTime":{"utc":"2026-07-26 18:05Z","local":"2026-07-26 13:05-05:00"},"runwayTime":{"utc":"2026-07-26 18:05Z","local":"2026-07-26 13:05-05:00"},"quality":["Basic","Live"]}
[flightStatus] OO456R dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 17:30Z","revisedTime":"2026-07-26 18:05Z","runwayTime":"2026-07-26 18:05Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 35min for OO456R
[flightStatus] computed inbound delay from revisedTime: 35min for OO456R
[flightStatus] OO456R 2026-07-26 status=EnRoute dep_delay=35 inbound_delay=35 cancelled=false
[flightStatus] number lookup "DL2711" 2026-07-26
[flightStatus] DL2711 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2711 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 15:10Z","local":"2026-07-26 11:10-04:00"},"revisedTime":{"utc":"2026-07-26 15:32Z","local":"2026-07-26 11:32-04:00"},"runwayTime":{"utc":"2026-07-26 15:32Z","local":"2026-07-26 11:32-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2711 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 15:10Z","revisedTime":"2026-07-26 15:32Z","runwayTime":"2026-07-26 15:32Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL2711
[flightStatus] DL2711 2026-07-26 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5789" 2026-07-26
[flightStatus] DL5789 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5789 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:12Z","local":"2026-07-26 14:12-04:00"},"revisedTime":{"utc":"2026-07-26 18:21Z","local":"2026-07-26 14:21-04:00"},"runwayTime":{"utc":"2026-07-26 18:21Z","local":"2026-07-26 14:21-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5789 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:12Z","revisedTime":"2026-07-26 18:21Z","runwayTime":"2026-07-26 18:21Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for DL5789
[flightStatus] DL5789 2026-07-26 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2143" 2026-07-26
[flightStatus] DL2143 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2143 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 21:51Z","local":"2026-07-26 16:51-05:00"},"revisedTime":{"utc":"2026-07-26 22:07Z","local":"2026-07-26 17:07-05:00"},"runwayTime":{"utc":"2026-07-26 22:07Z","local":"2026-07-26 17:07-05:00"},"terminal":"E","runway":"17R","quality":["Basic","Live"]}
[flightStatus] DL2143 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 21:51Z","revisedTime":"2026-07-26 22:07Z","runwayTime":"2026-07-26 22:07Z","terminal":"E","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for DL2143
[flightStatus] DL2143 2026-07-26 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA110" 2026-07-26
[flightStatus] AA110 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA110 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 22:00Z","local":"2026-07-26 17:00-05:00"},"revisedTime":{"utc":"2026-07-26 22:16Z","local":"2026-07-26 17:16-05:00"},"runwayTime":{"utc":"2026-07-26 22:16Z","local":"2026-07-26 17:16-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA110 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 22:00Z","revisedTime":"2026-07-26 22:16Z","runwayTime":"2026-07-26 22:16Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AA110
[flightStatus] AA110 2026-07-26 status=EnRoute dep_delay=16 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL806" 2026-07-26
[flightStatus] DL806 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL806 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 21:00Z","local":"2026-07-26 17:00-04:00"},"revisedTime":{"utc":"2026-07-26 21:34Z","local":"2026-07-26 17:34-04:00"},"runwayTime":{"utc":"2026-07-26 21:34Z","local":"2026-07-26 17:34-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL806 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 21:00Z","revisedTime":"2026-07-26 21:34Z","runwayTime":"2026-07-26 21:34Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 34min for DL806
[flightStatus] DL806 2026-07-26 status=EnRoute dep_delay=34 inbound_delay=0 cancelled=false
[flightStatus] number lookup "WN2273" 2026-07-26
[flightStatus] WN2273 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN2273 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 20:55Z","local":"2026-07-26 13:55-07:00"},"revisedTime":{"utc":"2026-07-26 22:35Z","local":"2026-07-26 15:35-07:00"},"runwayTime":{"utc":"2026-07-26 22:35Z","local":"2026-07-26 15:35-07:00"},"terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] WN2273 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 20:55Z","revisedTime":"2026-07-26 22:35Z","runwayTime":"2026-07-26 22:35Z","terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 100min for WN2273
[flightStatus] computed inbound delay from revisedTime: 73min for WN2273
[flightStatus] WN2273 2026-07-26 status=Arrived dep_delay=100 inbound_delay=73 cancelled=false
[flightStatus] number lookup "WN2777" 2026-07-26
[flightStatus] WN2777 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN2777 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 20:45Z","local":"2026-07-26 16:45-04:00"},"revisedTime":{"utc":"2026-07-26 21:24Z","local":"2026-07-26 17:24-04:00"},"runwayTime":{"utc":"2026-07-26 21:24Z","local":"2026-07-26 17:24-04:00"},"terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] WN2777 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 20:45Z","revisedTime":"2026-07-26 21:24Z","runwayTime":"2026-07-26 21:24Z","terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 39min for WN2777
[flightStatus] WN2777 2026-07-26 status=Arrived dep_delay=39 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL1601" 2026-07-26
[flightStatus] DL1601 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL1601 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:48Z","local":"2026-07-26 22:48-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL1601 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:48Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL1601 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "SQ25" 2026-07-26
[flightStatus] SQ25 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] SQ25 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 00:55Z","local":"2026-07-26 20:55-04:00"},"revisedTime":{"utc":"2026-07-27 00:55Z","local":"2026-07-26 20:55-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] SQ25 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 00:55Z","revisedTime":"2026-07-27 00:55Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] SQ25 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5610" 2026-07-26
[flightStatus] DL5610 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL5610 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 00:25Z","local":"2026-07-26 20:25-04:00"},"revisedTime":{"utc":"2026-07-27 00:25Z","local":"2026-07-26 20:25-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5610 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 00:25Z","revisedTime":"2026-07-27 00:25Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5610 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA831" 2026-07-26
[flightStatus] AA831 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA831 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 12:00Z","local":"2026-07-26 07:00-05:00"},"revisedTime":{"utc":"2026-07-26 12:10Z","local":"2026-07-26 07:10-05:00"},"runwayTime":{"utc":"2026-07-26 12:10Z","local":"2026-07-26 07:10-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA831 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 12:00Z","revisedTime":"2026-07-26 12:10Z","runwayTime":"2026-07-26 12:10Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for AA831
[flightStatus] AA831 2026-07-26 status=EnRoute dep_delay=10 inbound_delay=0 cancelled=false
[flightStatus] number lookup "KG5745" 2026-07-26
[flightStatus] KG5745 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] KG5745 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 14:15-05:00"},"revisedTime":{"utc":"2026-07-26 19:44Z","local":"2026-07-26 14:44-05:00"},"runwayTime":{"utc":"2026-07-26 19:44Z","local":"2026-07-26 14:44-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] KG5745 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 19:15Z","revisedTime":"2026-07-26 19:44Z","runwayTime":"2026-07-26 19:44Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 29min for KG5745
[flightStatus] computed inbound delay from revisedTime: 12min for KG5745
[flightStatus] KG5745 2026-07-26 status=Arrived dep_delay=29 inbound_delay=12 cancelled=false
[flightStatus] number lookup "WN194" 2026-07-26
[flightStatus] WN194 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN194 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:05Z","local":"2026-07-26 14:05-04:00"},"revisedTime":{"utc":"2026-07-26 18:43Z","local":"2026-07-26 14:43-04:00"},"runwayTime":{"utc":"2026-07-26 18:43Z","local":"2026-07-26 14:43-04:00"},"terminal":"N","runway":"26L","quality":["Basic","Live"]}
[flightStatus] WN194 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:05Z","revisedTime":"2026-07-26 18:43Z","runwayTime":"2026-07-26 18:43Z","terminal":"N","runway":"26L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 38min for WN194
[flightStatus] computed inbound delay from revisedTime: 11min for WN194
[flightStatus] WN194 2026-07-26 status=Arrived dep_delay=38 inbound_delay=11 cancelled=false
[flightStatus] number lookup "AA4453" 2026-07-26
[flightStatus] AA4453 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA4453 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 16:59Z","local":"2026-07-26 12:59-04:00"},"revisedTime":{"utc":"2026-07-26 17:08Z","local":"2026-07-26 13:08-04:00"},"runwayTime":{"utc":"2026-07-26 17:08Z","local":"2026-07-26 13:08-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA4453 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 16:59Z","revisedTime":"2026-07-26 17:08Z","runwayTime":"2026-07-26 17:08Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for AA4453
[flightStatus] AA4453 2026-07-26 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2766" 2026-07-26
[flightStatus] AA2766 dep keys: airport,scheduledTime,revisedTime,quality
[flightStatus] AA2766 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:30Z","local":"2026-07-26 18:30-05:00"},"revisedTime":{"utc":"2026-07-27 00:00Z","local":"2026-07-26 19:00-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA2766 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:30Z","revisedTime":"2026-07-27 00:00Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 30min for AA2766
[flightStatus] AA2766 2026-07-26 status=Scheduled dep_delay=30 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA970" 2026-07-26
[flightStatus] UA970 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA970 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:45Z","local":"2026-07-26 15:45-05:00"},"revisedTime":{"utc":"2026-07-26 21:12Z","local":"2026-07-26 16:12-05:00"},"runwayTime":{"utc":"2026-07-26 21:12Z","local":"2026-07-26 16:12-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA970 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:45Z","revisedTime":"2026-07-26 21:12Z","runwayTime":"2026-07-26 21:12Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for UA970
[flightStatus] UA970 2026-07-26 status=EnRoute dep_delay=27 inbound_delay=0 cancelled=false
[flightStatus] number lookup "WN158" 2026-07-26
[flightStatus] WN158 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN158 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 14:05Z","local":"2026-07-26 10:05-04:00"},"revisedTime":{"utc":"2026-07-26 14:39Z","local":"2026-07-26 10:39-04:00"},"runwayTime":{"utc":"2026-07-26 14:39Z","local":"2026-07-26 10:39-04:00"},"terminal":"N","quality":["Basic","Live"]}
[flightStatus] WN158 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 14:05Z","revisedTime":"2026-07-26 14:39Z","runwayTime":"2026-07-26 14:39Z","terminal":"N","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 34min for WN158
[flightStatus] WN158 2026-07-26 status=Arrived dep_delay=34 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2" 2026-07-26
[flightStatus] AA2 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA2 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 14:00Z","local":"2026-07-26 07:00-07:00"},"revisedTime":{"utc":"2026-07-26 14:20Z","local":"2026-07-26 07:20-07:00"},"runwayTime":{"utc":"2026-07-26 14:20Z","local":"2026-07-26 07:20-07:00"},"terminal":"3","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA2 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 14:00Z","revisedTime":"2026-07-26 14:20Z","runwayTime":"2026-07-26 14:20Z","terminal":"3","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for AA2
[flightStatus] AA2 2026-07-26 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2501" 2026-07-26
[flightStatus] AA2501 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2501 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 17:46Z","local":"2026-07-26 12:46-05:00"},"revisedTime":{"utc":"2026-07-26 17:50Z","local":"2026-07-26 12:50-05:00"},"runwayTime":{"utc":"2026-07-26 17:50Z","local":"2026-07-26 12:50-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2501 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 17:46Z","revisedTime":"2026-07-26 17:50Z","runwayTime":"2026-07-26 17:50Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 4min for AA2501
[flightStatus] AA2501 2026-07-26 status=Arrived dep_delay=4 inbound_delay=0 cancelled=false
[flightStatus] number lookup "HY102" 2026-07-26
[flightStatus] HY102 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] HY102 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 16:55Z","local":"2026-07-26 12:55-04:00"},"revisedTime":{"utc":"2026-07-26 17:12Z","local":"2026-07-26 13:12-04:00"},"runwayTime":{"utc":"2026-07-26 17:12Z","local":"2026-07-26 13:12-04:00"},"terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] HY102 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 16:55Z","revisedTime":"2026-07-26 17:12Z","runwayTime":"2026-07-26 17:12Z","terminal":"4","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for HY102
[flightStatus] HY102 2026-07-26 status=EnRoute dep_delay=17 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AS6" 2026-07-26
[flightStatus] AS6 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS6 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 18:48Z","local":"2026-07-26 11:48-07:00"},"revisedTime":{"utc":"2026-07-26 18:58Z","local":"2026-07-26 11:58-07:00"},"runwayTime":{"utc":"2026-07-26 18:58Z","local":"2026-07-26 11:58-07:00"},"terminal":"6","runway":"24L","quality":["Basic","Live"]}
[flightStatus] AS6 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 18:48Z","revisedTime":"2026-07-26 18:58Z","runwayTime":"2026-07-26 18:58Z","terminal":"6","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for AS6
[flightStatus] AS6 2026-07-26 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3843" 2026-07-26
[flightStatus] AA3843 dep keys: airport,scheduledTime,quality
[flightStatus] AA3843 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:30Z","local":"2026-07-26 18:30-05:00"},"quality":["Basic"]}
[flightStatus] AA3843 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:30Z","quality":["Basic"]}
[flightStatus] AA3843 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3846" 2026-07-26
[flightStatus] AA3846 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3846 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 22:00Z","local":"2026-07-26 17:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3846 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 22:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3846 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2345" 2026-07-26
[flightStatus] DL2345 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2345 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 19:25Z","local":"2026-07-26 15:25-04:00"},"revisedTime":{"utc":"2026-07-26 19:51Z","local":"2026-07-26 15:51-04:00"},"runwayTime":{"utc":"2026-07-26 19:51Z","local":"2026-07-26 15:51-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2345 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 19:25Z","revisedTime":"2026-07-26 19:51Z","runwayTime":"2026-07-26 19:51Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for DL2345
[flightStatus] computed inbound delay from revisedTime: 4min for DL2345
[flightStatus] DL2345 2026-07-26 status=Arrived dep_delay=26 inbound_delay=4 cancelled=false
[flightStatus] number lookup "AA4065" 2026-07-26
[flightStatus] AA4065 dep keys: airport,scheduledTime,quality
[flightStatus] AA4065 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 03:38Z","local":"2026-07-26 22:38-05:00"},"quality":["Basic"]}
[flightStatus] AA4065 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 03:38Z","quality":["Basic"]}
[flightStatus] AA4065 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA1325" 2026-07-26
[flightStatus] UA1325 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] UA1325 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 19:45-05:00"},"revisedTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 19:45-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1325 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:45Z","revisedTime":"2026-07-27 00:45Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA1325 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL819" 2026-07-26
[flightStatus] DL819 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL819 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 23:49Z","local":"2026-07-26 19:49-04:00"},"revisedTime":{"utc":"2026-07-27 00:06Z","local":"2026-07-26 20:06-04:00"},"runwayTime":{"utc":"2026-07-27 00:06Z","local":"2026-07-26 20:06-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL819 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 23:49Z","revisedTime":"2026-07-27 00:06Z","runwayTime":"2026-07-27 00:06Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for DL819
[flightStatus] DL819 2026-07-26 status=EnRoute dep_delay=17 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA1730" 2026-07-26
[flightStatus] UA1730 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA1730 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 06:04Z","local":"2026-07-26 23:04-07:00"},"terminal":"7","quality":["Basic"]}
[flightStatus] UA1730 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 06:04Z","terminal":"7","quality":["Basic"]}
[flightStatus] UA1730 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2250" 2026-07-26
[flightStatus] AA2250 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA2250 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 15:10Z","local":"2026-07-26 10:10-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA2250 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 15:10Z","terminal":"3","quality":["Basic"]}
[flightStatus] computed inbound delay from revisedTime: 383min for AA2250
[flightStatus] AA2250 2026-07-26 status=Arrived dep_delay=0 inbound_delay=383 cancelled=false
[flightStatus] number lookup "BW521" 2026-07-26
[flightStatus] BW521 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] BW521 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 11:00Z","local":"2026-07-26 07:00-04:00"},"revisedTime":{"utc":"2026-07-26 11:19Z","local":"2026-07-26 07:19-04:00"},"runwayTime":{"utc":"2026-07-26 11:19Z","local":"2026-07-26 07:19-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] BW521 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 11:00Z","revisedTime":"2026-07-26 11:19Z","runwayTime":"2026-07-26 11:19Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for BW521
[flightStatus] BW521 2026-07-26 status=EnRoute dep_delay=19 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA5980" 2026-07-26
[flightStatus] UA5980 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA5980 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 17:02Z","local":"2026-07-26 10:02-07:00"},"revisedTime":{"utc":"2026-07-26 17:24Z","local":"2026-07-26 10:24-07:00"},"runwayTime":{"utc":"2026-07-26 17:24Z","local":"2026-07-26 10:24-07:00"},"terminal":"7","runway":"24L","quality":["Basic","Live"]}
[flightStatus] UA5980 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 17:02Z","revisedTime":"2026-07-26 17:24Z","runwayTime":"2026-07-26 17:24Z","terminal":"7","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for UA5980
[flightStatus] UA5980 2026-07-26 status=EnRoute dep_delay=22 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5703" 2026-07-26
[flightStatus] DL5703 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5703 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 12:11Z","local":"2026-07-26 08:11-04:00"},"revisedTime":{"utc":"2026-07-26 12:32Z","local":"2026-07-26 08:32-04:00"},"runwayTime":{"utc":"2026-07-26 12:32Z","local":"2026-07-26 08:32-04:00"},"terminal":"A","quality":["Basic","Live"]}
[flightStatus] DL5703 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 12:11Z","revisedTime":"2026-07-26 12:32Z","runwayTime":"2026-07-26 12:32Z","terminal":"A","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for DL5703
[flightStatus] DL5703 2026-07-26 status=Arrived dep_delay=21 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA581" 2026-07-26
[flightStatus] UA581 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA581 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 15:54Z","local":"2026-07-26 10:54-05:00"},"revisedTime":{"utc":"2026-07-26 16:33Z","local":"2026-07-26 11:33-05:00"},"runwayTime":{"utc":"2026-07-26 16:33Z","local":"2026-07-26 11:33-05:00"},"terminal":"1","runway":"22L","quality":["Basic","Live"]}
[flightStatus] UA581 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 15:54Z","revisedTime":"2026-07-26 16:33Z","runwayTime":"2026-07-26 16:33Z","terminal":"1","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 39min for UA581
[flightStatus] UA581 2026-07-26 status=Arrived dep_delay=39 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5288" 2026-07-26
[flightStatus] DL5288 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5288 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 17:13Z","local":"2026-07-26 13:13-04:00"},"revisedTime":{"utc":"2026-07-26 18:17Z","local":"2026-07-26 14:17-04:00"},"runwayTime":{"utc":"2026-07-26 18:17Z","local":"2026-07-26 14:17-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL5288 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 17:13Z","revisedTime":"2026-07-26 18:17Z","runwayTime":"2026-07-26 18:17Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 64min for DL5288
[flightStatus] computed inbound delay from revisedTime: 42min for DL5288
[flightStatus] DL5288 2026-07-26 status=Arrived dep_delay=64 inbound_delay=42 cancelled=false
[flightStatus] number lookup "AA3161" 2026-07-26
[flightStatus] AA3161 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA3161 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 15:20Z","local":"2026-07-26 11:20-04:00"},"revisedTime":{"utc":"2026-07-26 15:40Z","local":"2026-07-26 11:40-04:00"},"runwayTime":{"utc":"2026-07-26 15:40Z","local":"2026-07-26 11:40-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] AA3161 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 15:20Z","revisedTime":"2026-07-26 15:40Z","runwayTime":"2026-07-26 15:40Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for AA3161
[flightStatus] AA3161 2026-07-26 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA1329" 2026-07-26
[flightStatus] AA1329 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1329 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 22:50Z","local":"2026-07-26 17:50-05:00"},"revisedTime":{"utc":"2026-07-27 00:02Z","local":"2026-07-26 19:02-05:00"},"runwayTime":{"utc":"2026-07-27 00:02Z","local":"2026-07-26 19:02-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1329 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 22:50Z","revisedTime":"2026-07-27 00:02Z","runwayTime":"2026-07-27 00:02Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 72min for AA1329
[flightStatus] computed inbound delay from revisedTime: 42min for AA1329
[flightStatus] AA1329 2026-07-26 status=EnRoute dep_delay=72 inbound_delay=42 cancelled=false
[flightStatus] number lookup "AA6229" 2026-07-26
[flightStatus] AA6229 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA6229 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:15Z","local":"2026-07-26 15:15-05:00"},"revisedTime":{"utc":"2026-07-26 20:44Z","local":"2026-07-26 15:44-05:00"},"runwayTime":{"utc":"2026-07-26 20:44Z","local":"2026-07-26 15:44-05:00"},"terminal":"3","runway":"28R","quality":["Basic","Live"]}
[flightStatus] AA6229 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:15Z","revisedTime":"2026-07-26 20:44Z","runwayTime":"2026-07-26 20:44Z","terminal":"3","runway":"28R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 29min for AA6229
[flightStatus] AA6229 2026-07-26 status=Arrived dep_delay=29 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA4390" 2026-07-26
[flightStatus] AA4390 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA4390 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 22:00Z","local":"2026-07-26 18:00-04:00"},"revisedTime":{"utc":"2026-07-26 22:28Z","local":"2026-07-26 18:28-04:00"},"runwayTime":{"utc":"2026-07-26 22:28Z","local":"2026-07-26 18:28-04:00"},"terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] AA4390 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 22:00Z","revisedTime":"2026-07-26 22:28Z","runwayTime":"2026-07-26 22:28Z","terminal":"B","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 28min for AA4390
[flightStatus] AA4390 2026-07-26 status=Arrived dep_delay=28 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA3707" 2026-07-26
[flightStatus] UA3707 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] UA3707 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 19:45-05:00"},"revisedTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 19:45-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA3707 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:45Z","revisedTime":"2026-07-27 00:45Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA3707 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2388" 2026-07-26
[flightStatus] DL2388 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL2388 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 23:48Z","local":"2026-07-26 19:48-04:00"},"revisedTime":{"utc":"2026-07-27 00:10Z","local":"2026-07-26 20:10-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL2388 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 23:48Z","revisedTime":"2026-07-27 00:10Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL2388
[flightStatus] DL2388 2026-07-26 status=Scheduled dep_delay=22 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2644" 2026-07-26
[flightStatus] AA2644 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2644 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 12:10Z","local":"2026-07-26 07:10-05:00"},"revisedTime":{"utc":"2026-07-26 12:55Z","local":"2026-07-26 07:55-05:00"},"runwayTime":{"utc":"2026-07-26 12:55Z","local":"2026-07-26 07:55-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2644 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 12:10Z","revisedTime":"2026-07-26 12:55Z","runwayTime":"2026-07-26 12:55Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 45min for AA2644
[flightStatus] computed inbound delay from revisedTime: 5min for AA2644
[flightStatus] AA2644 2026-07-26 status=Arrived dep_delay=45 inbound_delay=5 cancelled=false
[flightStatus] number lookup "AA1902" 2026-07-26
[flightStatus] AA1902 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1902 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:38Z","local":"2026-07-26 08:38-05:00"},"revisedTime":{"utc":"2026-07-26 13:38Z","local":"2026-07-26 08:38-05:00"},"runwayTime":{"utc":"2026-07-26 13:38Z","local":"2026-07-26 08:38-05:00"},"runway":"22L","quality":["Basic","Live"]}
[flightStatus] AA1902 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:38Z","revisedTime":"2026-07-26 13:38Z","runwayTime":"2026-07-26 13:38Z","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 56min for AA1902
[flightStatus] AA1902 2026-07-26 status=Arrived dep_delay=0 inbound_delay=56 cancelled=false
[flightStatus] number lookup "UA2451" 2026-07-26
[flightStatus] UA2451 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2451 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 14:15-05:00"},"revisedTime":{"utc":"2026-07-26 19:38Z","local":"2026-07-26 14:38-05:00"},"runwayTime":{"utc":"2026-07-26 19:38Z","local":"2026-07-26 14:38-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2451 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 19:15Z","revisedTime":"2026-07-26 19:38Z","runwayTime":"2026-07-26 19:38Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for UA2451
[flightStatus] UA2451 2026-07-26 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL3193" 2026-07-26
[flightStatus] DL3193 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL3193 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:05Z","local":"2026-07-26 14:05-04:00"},"revisedTime":{"utc":"2026-07-26 18:14Z","local":"2026-07-26 14:14-04:00"},"runwayTime":{"utc":"2026-07-26 18:14Z","local":"2026-07-26 14:14-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL3193 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:05Z","revisedTime":"2026-07-26 18:14Z","runwayTime":"2026-07-26 18:14Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for DL3193
[flightStatus] DL3193 2026-07-26 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA1074" 2026-07-26
[flightStatus] UA1074 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA1074 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 15:35Z","local":"2026-07-26 11:35-04:00"},"revisedTime":{"utc":"2026-07-26 16:50Z","local":"2026-07-26 12:50-04:00"},"runwayTime":{"utc":"2026-07-26 16:50Z","local":"2026-07-26 12:50-04:00"},"terminal":"B","runway":"04R","quality":["Basic","Live"]}
[flightStatus] UA1074 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 15:35Z","revisedTime":"2026-07-26 16:50Z","runwayTime":"2026-07-26 16:50Z","terminal":"B","runway":"04R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 75min for UA1074
[flightStatus] computed inbound delay from revisedTime: 32min for UA1074
[flightStatus] UA1074 2026-07-26 status=Arrived dep_delay=75 inbound_delay=32 cancelled=false
[flightStatus] number lookup "AA3477" 2026-07-26
[flightStatus] AA3477 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3477 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 22:00Z","local":"2026-07-26 17:00-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA3477 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 22:00Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA3477 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL418" 2026-07-26
[flightStatus] DL418 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL418 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 23:55Z","local":"2026-07-26 16:55-07:00"},"revisedTime":{"utc":"2026-07-26 23:55Z","local":"2026-07-26 16:55-07:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] DL418 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 23:55Z","revisedTime":"2026-07-26 23:55Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] DL418 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3309" 2026-07-26
[flightStatus] AA3309 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA3309 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 21:05Z","local":"2026-07-26 17:05-04:00"},"terminal":"B","quality":["Basic"]}
[flightStatus] AA3309 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 21:05Z","terminal":"B","quality":["Basic"]}
[flightStatus] AA3309 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA5719" 2026-07-26
[flightStatus] UA5719 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA5719 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 19:45-05:00"},"terminal":"2","quality":["Basic"]}
[flightStatus] UA5719 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:45Z","terminal":"2","quality":["Basic"]}
[flightStatus] UA5719 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "XP394" 2026-07-26
[flightStatus] XP394 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] XP394 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 15:20Z","local":"2026-07-26 11:20-04:00"},"revisedTime":{"utc":"2026-07-26 15:41Z","local":"2026-07-26 11:41-04:00"},"runwayTime":{"utc":"2026-07-26 15:41Z","local":"2026-07-26 11:41-04:00"},"runway":"27R","quality":["Basic","Live"]}
[flightStatus] XP394 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 15:20Z","revisedTime":"2026-07-26 15:41Z","runwayTime":"2026-07-26 15:41Z","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for XP394
[flightStatus] XP394 2026-07-26 status=Arrived dep_delay=21 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA5285" 2026-07-26
[flightStatus] HTTP 429 for "UA5285" 2026-07-26
[flightStatus] number lookup "UA 5285" 2026-07-26
[flightStatus] UA5285 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA5285 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 15:25Z","local":"2026-07-26 10:25-05:00"},"revisedTime":{"utc":"2026-07-26 15:41Z","local":"2026-07-26 10:41-05:00"},"runwayTime":{"utc":"2026-07-26 15:41Z","local":"2026-07-26 10:41-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5285 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 15:25Z","revisedTime":"2026-07-26 15:41Z","runwayTime":"2026-07-26 15:41Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for UA5285
[flightStatus] computed inbound delay from revisedTime: 115min for UA5285
[flightStatus] UA5285 2026-07-26 status=Arrived dep_delay=16 inbound_delay=115 cancelled=false
[flightStatus] number lookup "AA3210" 2026-07-26
[flightStatus] AA3210 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA3210 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 11:00Z","local":"2026-07-26 07:00-04:00"},"revisedTime":{"utc":"2026-07-26 11:15Z","local":"2026-07-26 07:15-04:00"},"runwayTime":{"utc":"2026-07-26 11:15Z","local":"2026-07-26 07:15-04:00"},"terminal":"8","runway":"13R","quality":["Basic","Live"]}
[flightStatus] AA3210 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 11:00Z","revisedTime":"2026-07-26 11:15Z","runwayTime":"2026-07-26 11:15Z","terminal":"8","runway":"13R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for AA3210
[flightStatus] AA3210 2026-07-26 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5035" 2026-07-26
[flightStatus] DL5035 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5035 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 18:00Z","local":"2026-07-26 13:00-05:00"},"revisedTime":{"utc":"2026-07-26 18:44Z","local":"2026-07-26 13:44-05:00"},"runwayTime":{"utc":"2026-07-26 18:44Z","local":"2026-07-26 13:44-05:00"},"terminal":"5","quality":["Basic","Live"]}
[flightStatus] DL5035 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 18:00Z","revisedTime":"2026-07-26 18:44Z","runwayTime":"2026-07-26 18:44Z","terminal":"5","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 44min for DL5035
[flightStatus] DL5035 2026-07-26 status=Arrived dep_delay=44 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2661" 2026-07-26
[flightStatus] AA2661 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA2661 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 01:59Z","local":"2026-07-26 20:59-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA2661 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 01:59Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA2661 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA292" 2026-07-26
[flightStatus] HTTP 429 for "AA292" 2026-07-26
[flightStatus] number lookup "AA 292" 2026-07-26
[flightStatus] AA292 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] AA292 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 00:55Z","local":"2026-07-26 20:55-04:00"},"revisedTime":{"utc":"2026-07-27 00:55Z","local":"2026-07-26 20:55-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA292 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 00:55Z","revisedTime":"2026-07-27 00:55Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA292 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL1994" 2026-07-26
[flightStatus] DL1994 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL1994 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 12:20Z","local":"2026-07-26 08:20-04:00"},"revisedTime":{"utc":"2026-07-26 12:37Z","local":"2026-07-26 08:37-04:00"},"runwayTime":{"utc":"2026-07-26 12:37Z","local":"2026-07-26 08:37-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL1994 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 12:20Z","revisedTime":"2026-07-26 12:37Z","runwayTime":"2026-07-26 12:37Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 17min for DL1994
[flightStatus] DL1994 2026-07-26 status=EnRoute dep_delay=17 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2306" 2026-07-26
[flightStatus] DL2306 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL2306 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 01:15Z","local":"2026-07-26 21:15-04:00"},"terminal":"S","quality":["Basic"]}
[flightStatus] DL2306 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 01:15Z","terminal":"S","quality":["Basic"]}
[flightStatus] DL2306 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2689" 2026-07-26
[flightStatus] AA2689 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA2689 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 23:30Z","local":"2026-07-26 19:30-04:00"},"revisedTime":{"utc":"2026-07-27 00:05Z","local":"2026-07-26 20:05-04:00"},"runwayTime":{"utc":"2026-07-27 00:05Z","local":"2026-07-26 20:05-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA2689 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 23:30Z","revisedTime":"2026-07-27 00:05Z","runwayTime":"2026-07-27 00:05Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 35min for AA2689
[flightStatus] AA2689 2026-07-26 status=EnRoute dep_delay=35 inbound_delay=0 cancelled=false
[flightStatus] number lookup "MQ4153" 2026-07-26
[flightStatus] MQ4153 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] MQ4153 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 13:29Z","local":"2026-07-26 08:29-05:00"},"revisedTime":{"utc":"2026-07-26 13:45Z","local":"2026-07-26 08:45-05:00"},"runwayTime":{"utc":"2026-07-26 13:45Z","local":"2026-07-26 08:45-05:00"},"runway":"22L","quality":["Basic","Live"]}
[flightStatus] MQ4153 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 13:29Z","revisedTime":"2026-07-26 13:45Z","runwayTime":"2026-07-26 13:45Z","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for MQ4153
[flightStatus] computed inbound delay from revisedTime: 26min for MQ4153
[flightStatus] MQ4153 2026-07-26 status=Arrived dep_delay=16 inbound_delay=26 cancelled=false
[flightStatus] number lookup "DL1462" 2026-07-26
[flightStatus] DL1462 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1462 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 11:36Z","local":"2026-07-26 07:36-04:00"},"revisedTime":{"utc":"2026-07-26 11:46Z","local":"2026-07-26 07:46-04:00"},"runwayTime":{"utc":"2026-07-26 11:46Z","local":"2026-07-26 07:46-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1462 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 11:36Z","revisedTime":"2026-07-26 11:46Z","runwayTime":"2026-07-26 11:46Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for DL1462
[flightStatus] DL1462 2026-07-26 status=Arrived dep_delay=10 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2813" 2026-07-26
[flightStatus] AA2813 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2813 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 18:32Z","local":"2026-07-26 13:32-05:00"},"revisedTime":{"utc":"2026-07-26 19:19Z","local":"2026-07-26 14:19-05:00"},"runwayTime":{"utc":"2026-07-26 19:19Z","local":"2026-07-26 14:19-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2813 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 18:32Z","revisedTime":"2026-07-26 19:19Z","runwayTime":"2026-07-26 19:19Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 47min for AA2813
[flightStatus] computed inbound delay from revisedTime: 27min for AA2813
[flightStatus] AA2813 2026-07-26 status=Arrived dep_delay=47 inbound_delay=27 cancelled=false
[flightStatus] number lookup "UA2061" 2026-07-26
[flightStatus] UA2061 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA2061 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 17:55Z","local":"2026-07-26 10:55-07:00"},"revisedTime":{"utc":"2026-07-26 18:31Z","local":"2026-07-26 11:31-07:00"},"runwayTime":{"utc":"2026-07-26 18:31Z","local":"2026-07-26 11:31-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA2061 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 17:55Z","revisedTime":"2026-07-26 18:31Z","runwayTime":"2026-07-26 18:31Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for UA2061
[flightStatus] UA2061 2026-07-26 status=Arrived dep_delay=36 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5508" 2026-07-26
[flightStatus] DL5508 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5508 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 21:54Z","local":"2026-07-26 17:54-04:00"},"revisedTime":{"utc":"2026-07-26 22:17Z","local":"2026-07-26 18:17-04:00"},"runwayTime":{"utc":"2026-07-26 22:17Z","local":"2026-07-26 18:17-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL5508 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 21:54Z","revisedTime":"2026-07-26 22:17Z","runwayTime":"2026-07-26 22:17Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 23min for DL5508
[flightStatus] DL5508 2026-07-26 status=Arrived dep_delay=23 inbound_delay=0 cancelled=false
[flightStatus] number lookup "CI5382" 2026-07-26
[flightStatus] CI5382 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] CI5382 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 23:14Z","local":"2026-07-26 16:14-07:00"},"revisedTime":{"utc":"2026-07-26 22:40Z","local":"2026-07-26 15:40-07:00"},"runwayTime":{"utc":"2026-07-26 22:40Z","local":"2026-07-26 15:40-07:00"},"runway":"25L","quality":["Basic","Live"]}
[flightStatus] CI5382 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 23:14Z","revisedTime":"2026-07-26 22:40Z","runwayTime":"2026-07-26 22:40Z","runway":"25L","quality":["Basic","Live"]}
[flightStatus] CI5382 2026-07-26 status=EnRoute dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3314" 2026-07-26
[flightStatus] AA3314 dep keys: airport,scheduledTime,quality
[flightStatus] AA3314 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 01:59Z","local":"2026-07-26 20:59-05:00"},"quality":["Basic"]}
[flightStatus] AA3314 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 01:59Z","quality":["Basic"]}
[flightStatus] AA3314 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2289" 2026-07-26
[flightStatus] AA2289 dep keys: airport,scheduledTime,quality
[flightStatus] AA2289 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 06:04Z","local":"2026-07-26 23:04-07:00"},"quality":["Basic"]}
[flightStatus] AA2289 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 06:04Z","quality":["Basic"]}
[flightStatus] AA2289 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2723" 2026-07-26
[flightStatus] AA2723 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA2723 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 12:00Z","local":"2026-07-26 07:00-05:00"},"revisedTime":{"utc":"2026-07-26 12:20Z","local":"2026-07-26 07:20-05:00"},"runwayTime":{"utc":"2026-07-26 12:20Z","local":"2026-07-26 07:20-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA2723 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 12:00Z","revisedTime":"2026-07-26 12:20Z","runwayTime":"2026-07-26 12:20Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for AA2723
[flightStatus] AA2723 2026-07-26 status=Arrived dep_delay=20 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2376" 2026-07-26
[flightStatus] AA2376 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2376 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 18:40Z","local":"2026-07-26 13:40-05:00"},"revisedTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 14:15-05:00"},"runwayTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 14:15-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2376 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 18:40Z","revisedTime":"2026-07-26 19:15Z","runwayTime":"2026-07-26 19:15Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 35min for AA2376
[flightStatus] computed inbound delay from revisedTime: 1min for AA2376
[flightStatus] AA2376 2026-07-26 status=Arrived dep_delay=35 inbound_delay=1 cancelled=false
[flightStatus] number lookup "UA360" 2026-07-26
[flightStatus] HTTP 429 for "UA360" 2026-07-26
[flightStatus] number lookup "UA 360" 2026-07-26
[flightStatus] UA360 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA360 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 19:46Z","local":"2026-07-26 12:46-07:00"},"revisedTime":{"utc":"2026-07-26 19:59Z","local":"2026-07-26 12:59-07:00"},"runwayTime":{"utc":"2026-07-26 19:59Z","local":"2026-07-26 12:59-07:00"},"terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] UA360 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 19:46Z","revisedTime":"2026-07-26 19:59Z","runwayTime":"2026-07-26 19:59Z","terminal":"7","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for UA360
[flightStatus] UA360 2026-07-26 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[flightStatus] number lookup "MQ3653" 2026-07-26
[flightStatus] MQ3653 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] MQ3653 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:36Z","local":"2026-07-26 15:36-05:00"},"revisedTime":{"utc":"2026-07-26 20:51Z","local":"2026-07-26 15:51-05:00"},"runwayTime":{"utc":"2026-07-26 20:51Z","local":"2026-07-26 15:51-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] MQ3653 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:36Z","revisedTime":"2026-07-26 20:51Z","runwayTime":"2026-07-26 20:51Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for MQ3653
[flightStatus] computed inbound delay from revisedTime: 16min for MQ3653
[flightStatus] MQ3653 2026-07-26 status=Arrived dep_delay=15 inbound_delay=16 cancelled=false
[flightStatus] number lookup "DL1295" 2026-07-26
[flightStatus] DL1295 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1295 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 20:39Z","local":"2026-07-26 16:39-04:00"},"revisedTime":{"utc":"2026-07-26 21:01Z","local":"2026-07-26 17:01-04:00"},"runwayTime":{"utc":"2026-07-26 21:01Z","local":"2026-07-26 17:01-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1295 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 20:39Z","revisedTime":"2026-07-26 21:01Z","runwayTime":"2026-07-26 21:01Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL1295
[flightStatus] DL1295 2026-07-26 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[flightStatus] number lookup "OO498W" 2026-07-26
[flightStatus] HTTP 429 for "OO498W" 2026-07-26
[flightStatus] FIDS fallback ORD 2026-07-26 for OO498W
[flightStatus] OO498W dep keys: scheduledTime,revisedTime,runwayTime,quality
[flightStatus] OO498W dep RAW: {"scheduledTime":{"utc":"2026-07-26 22:50Z","local":"2026-07-26 17:50-05:00"},"revisedTime":{"utc":"2026-07-26 23:12Z","local":"2026-07-26 18:12-05:00"},"runwayTime":{"utc":"2026-07-26 23:12Z","local":"2026-07-26 18:12-05:00"},"quality":["Basic","Live"]}
[flightStatus] OO498W dep extracted: {"scheduledTime":"2026-07-26 22:50Z","revisedTime":"2026-07-26 23:12Z","runwayTime":"2026-07-26 23:12Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for OO498W
[flightStatus] computed inbound delay from revisedTime: 22min for OO498W
[flightStatus] OO498W 2026-07-26 status=Departed dep_delay=22 inbound_delay=22 cancelled=false
[flightStatus] number lookup "AM643" 2026-07-26
[flightStatus] AM643 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] AM643 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 01:24Z","local":"2026-07-26 18:24-07:00"},"revisedTime":{"utc":"2026-07-27 01:24Z","local":"2026-07-26 18:24-07:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AM643 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 01:24Z","revisedTime":"2026-07-27 01:24Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] AM643 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5831" 2026-07-26
[flightStatus] DL5831 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5831 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 22:00Z","local":"2026-07-26 18:00-04:00"},"revisedTime":{"utc":"2026-07-26 22:27Z","local":"2026-07-26 18:27-04:00"},"runwayTime":{"utc":"2026-07-26 22:27Z","local":"2026-07-26 18:27-04:00"},"terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] DL5831 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 22:00Z","revisedTime":"2026-07-26 22:27Z","runwayTime":"2026-07-26 22:27Z","terminal":"A","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for DL5831
[flightStatus] DL5831 2026-07-26 status=Arrived dep_delay=27 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2251" 2026-07-26
[flightStatus] AA2251 dep keys: airport,scheduledTime,revisedTime,quality
[flightStatus] AA2251 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:37Z","local":"2026-07-26 19:37-05:00"},"revisedTime":{"utc":"2026-07-27 00:37Z","local":"2026-07-26 19:37-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA2251 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:37Z","revisedTime":"2026-07-27 00:37Z","quality":["Basic","Live"]}
[flightStatus] AA2251 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL3091" 2026-07-26
[flightStatus] DL3091 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3091 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 13:00Z","local":"2026-07-26 09:00-04:00"},"revisedTime":{"utc":"2026-07-26 13:13Z","local":"2026-07-26 09:13-04:00"},"runwayTime":{"utc":"2026-07-26 13:13Z","local":"2026-07-26 09:13-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL3091 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 13:00Z","revisedTime":"2026-07-26 13:13Z","runwayTime":"2026-07-26 13:13Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for DL3091
[flightStatus] DL3091 2026-07-26 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA6299" 2026-07-26
[flightStatus] AA6299 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA6299 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 16:24Z","local":"2026-07-26 11:24-05:00"},"revisedTime":{"utc":"2026-07-26 16:40Z","local":"2026-07-26 11:40-05:00"},"runwayTime":{"utc":"2026-07-26 16:40Z","local":"2026-07-26 11:40-05:00"},"terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA6299 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 16:24Z","revisedTime":"2026-07-26 16:40Z","runwayTime":"2026-07-26 16:40Z","terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 16min for AA6299
[flightStatus] AA6299 2026-07-26 status=Arrived dep_delay=16 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3124" 2026-07-26
[flightStatus] AA3124 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA3124 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 19:25Z","local":"2026-07-26 12:25-07:00"},"revisedTime":{"utc":"2026-07-26 21:18Z","local":"2026-07-26 14:18-07:00"},"runwayTime":{"utc":"2026-07-26 21:18Z","local":"2026-07-26 14:18-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA3124 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 19:25Z","revisedTime":"2026-07-26 21:18Z","runwayTime":"2026-07-26 21:18Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 113min for AA3124
[flightStatus] computed inbound delay from revisedTime: 95min for AA3124
[flightStatus] AA3124 2026-07-26 status=EnRoute dep_delay=113 inbound_delay=95 cancelled=false
[flightStatus] number lookup "AA3274" 2026-07-26
[flightStatus] AA3274 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA3274 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 21:55Z","local":"2026-07-26 16:55-05:00"},"revisedTime":{"utc":"2026-07-26 22:08Z","local":"2026-07-26 17:08-05:00"},"runwayTime":{"utc":"2026-07-26 22:08Z","local":"2026-07-26 17:08-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA3274 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 21:55Z","revisedTime":"2026-07-26 22:08Z","runwayTime":"2026-07-26 22:08Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for AA3274
[flightStatus] AA3274 2026-07-26 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA5985" 2026-07-26
[flightStatus] UA5985 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA5985 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:35Z","local":"2026-07-26 15:35-05:00"},"revisedTime":{"utc":"2026-07-26 20:44Z","local":"2026-07-26 15:44-05:00"},"runwayTime":{"utc":"2026-07-26 20:44Z","local":"2026-07-26 15:44-05:00"},"terminal":"2","runway":"22L","quality":["Basic","Live"]}
[flightStatus] UA5985 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:35Z","revisedTime":"2026-07-26 20:44Z","runwayTime":"2026-07-26 20:44Z","terminal":"2","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for UA5985
[flightStatus] UA5985 2026-07-26 status=Arrived dep_delay=9 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL1150" 2026-07-26
[flightStatus] DL1150 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] DL1150 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 21:04Z","local":"2026-07-26 17:04-04:00"},"revisedTime":{"utc":"2026-07-26 21:04Z","local":"2026-07-26 17:04-04:00"},"runwayTime":{"utc":"2026-07-26 21:04Z","local":"2026-07-26 17:04-04:00"},"runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1150 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 21:04Z","revisedTime":"2026-07-26 21:04Z","runwayTime":"2026-07-26 21:04Z","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 88min for DL1150
[flightStatus] DL1150 2026-07-26 status=Arrived dep_delay=0 inbound_delay=88 cancelled=false
[flightStatus] number lookup "KL604" 2026-07-26
[flightStatus] KL604 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] KL604 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 23:45Z","local":"2026-07-26 16:45-07:00"},"revisedTime":{"utc":"2026-07-26 23:31Z","local":"2026-07-26 16:31-07:00"},"runwayTime":{"utc":"2026-07-26 23:43Z","local":"2026-07-26 16:43-07:00"},"terminal":"B","runway":"24L","quality":["Basic","Live"]}
[flightStatus] KL604 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 23:45Z","revisedTime":"2026-07-26 23:31Z","runwayTime":"2026-07-26 23:43Z","terminal":"B","runway":"24L","quality":["Basic","Live"]}
[flightStatus] KL604 2026-07-26 status=EnRoute dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "SVL7" 2026-07-26
[flightStatus] SVL7 dep keys: airport,scheduledTime,revisedTime,quality
[flightStatus] SVL7 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 22:30Z","local":"2026-07-26 18:30-04:00"},"revisedTime":{"utc":"2026-07-26 22:30Z","local":"2026-07-26 18:30-04:00"},"quality":["Basic","Live"]}
[flightStatus] SVL7 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 22:30Z","revisedTime":"2026-07-26 22:30Z","quality":["Basic","Live"]}
[flightStatus] SVL7 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "BA192" 2026-07-26
[flightStatus] BA192 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] BA192 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:40Z","local":"2026-07-26 19:40-05:00"},"revisedTime":{"utc":"2026-07-27 00:40Z","local":"2026-07-26 19:40-05:00"},"terminal":"D","quality":["Basic","Live"]}
[flightStatus] BA192 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:40Z","revisedTime":"2026-07-27 00:40Z","terminal":"D","quality":["Basic","Live"]}
[flightStatus] BA192 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA219" 2026-07-26
[flightStatus] UA219 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA219 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 14:25Z","local":"2026-07-26 09:25-05:00"},"revisedTime":{"utc":"2026-07-26 15:10Z","local":"2026-07-26 10:10-05:00"},"runwayTime":{"utc":"2026-07-26 15:10Z","local":"2026-07-26 10:10-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA219 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 14:25Z","revisedTime":"2026-07-26 15:10Z","runwayTime":"2026-07-26 15:10Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 45min for UA219
[flightStatus] UA219 2026-07-26 status=Arrived dep_delay=45 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA650" 2026-07-26
[flightStatus] AA650 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA650 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 17:00Z","local":"2026-07-26 10:00-07:00"},"revisedTime":{"utc":"2026-07-26 17:24Z","local":"2026-07-26 10:24-07:00"},"runwayTime":{"utc":"2026-07-26 17:24Z","local":"2026-07-26 10:24-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA650 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 17:00Z","revisedTime":"2026-07-26 17:24Z","runwayTime":"2026-07-26 17:24Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 24min for AA650
[flightStatus] AA650 2026-07-26 status=Arrived dep_delay=24 inbound_delay=0 cancelled=false
[flightStatus] number lookup "MQ3536" 2026-07-26
[flightStatus] MQ3536 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] MQ3536 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 17:26Z","local":"2026-07-26 12:26-05:00"},"revisedTime":{"utc":"2026-07-26 17:45Z","local":"2026-07-26 12:45-05:00"},"runwayTime":{"utc":"2026-07-26 17:45Z","local":"2026-07-26 12:45-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] MQ3536 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 17:26Z","revisedTime":"2026-07-26 17:45Z","runwayTime":"2026-07-26 17:45Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for MQ3536
[flightStatus] computed inbound delay from revisedTime: 19min for MQ3536
[flightStatus] MQ3536 2026-07-26 status=Arrived dep_delay=19 inbound_delay=19 cancelled=false
[flightStatus] number lookup "AA36" 2026-07-26
[flightStatus] AA36 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA36 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 21:40Z","local":"2026-07-26 16:40-05:00"},"revisedTime":{"utc":"2026-07-26 22:16Z","local":"2026-07-26 17:16-05:00"},"runwayTime":{"utc":"2026-07-26 22:16Z","local":"2026-07-26 17:16-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA36 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 21:40Z","revisedTime":"2026-07-26 22:16Z","runwayTime":"2026-07-26 22:16Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for AA36
[flightStatus] AA36 2026-07-26 status=EnRoute dep_delay=36 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL1169" 2026-07-26
[flightStatus] DL1169 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1169 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 19:05Z","local":"2026-07-26 15:05-04:00"},"revisedTime":{"utc":"2026-07-26 19:45Z","local":"2026-07-26 15:45-04:00"},"runwayTime":{"utc":"2026-07-26 19:45Z","local":"2026-07-26 15:45-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1169 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 19:05Z","revisedTime":"2026-07-26 19:45Z","runwayTime":"2026-07-26 19:45Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 40min for DL1169
[flightStatus] computed inbound delay from revisedTime: 14min for DL1169
[flightStatus] DL1169 2026-07-26 status=Arrived dep_delay=40 inbound_delay=14 cancelled=false
[flightStatus] number lookup "AA3928" 2026-07-26
[flightStatus] AA3928 dep keys: airport,scheduledTime,quality
[flightStatus] AA3928 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 03:38Z","local":"2026-07-26 22:38-05:00"},"quality":["Basic"]}
[flightStatus] AA3928 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 03:38Z","quality":["Basic"]}
[flightStatus] AA3928 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA4603" 2026-07-26
[flightStatus] UA4603 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA4603 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 03:00Z","local":"2026-07-26 22:00-05:00"},"terminal":"2","quality":["Basic"]}
[flightStatus] UA4603 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 03:00Z","terminal":"2","quality":["Basic"]}
[flightStatus] UA4603 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "EK206" 2026-07-26
[flightStatus] EK206 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] EK206 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 02:20Z","local":"2026-07-26 22:20-04:00"},"revisedTime":{"utc":"2026-07-27 02:20Z","local":"2026-07-26 22:20-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] EK206 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 02:20Z","revisedTime":"2026-07-27 02:20Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] EK206 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "WN900" 2026-07-26
[flightStatus] WN900 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] WN900 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 02:50Z","local":"2026-07-26 19:50-07:00"},"revisedTime":{"utc":"2026-07-27 02:50Z","local":"2026-07-26 19:50-07:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] WN900 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 02:50Z","revisedTime":"2026-07-27 02:50Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] WN900 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "WN382" 2026-07-26
[flightStatus] WN382 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] WN382 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 13:25Z","local":"2026-07-26 09:25-04:00"},"revisedTime":{"utc":"2026-07-26 14:25Z","local":"2026-07-26 10:25-04:00"},"runwayTime":{"utc":"2026-07-26 14:25Z","local":"2026-07-26 10:25-04:00"},"terminal":"N","quality":["Basic","Live"]}
[flightStatus] WN382 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 13:25Z","revisedTime":"2026-07-26 14:25Z","runwayTime":"2026-07-26 14:25Z","terminal":"N","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 60min for WN382
[flightStatus] computed inbound delay from revisedTime: 33min for WN382
[flightStatus] WN382 2026-07-26 status=Arrived dep_delay=60 inbound_delay=33 cancelled=false
[flightStatus] number lookup "AS1360" 2026-07-26
[flightStatus] AS1360 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AS1360 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 14:05Z","local":"2026-07-26 07:05-07:00"},"revisedTime":{"utc":"2026-07-26 14:18Z","local":"2026-07-26 07:18-07:00"},"runwayTime":{"utc":"2026-07-26 14:18Z","local":"2026-07-26 07:18-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] AS1360 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 14:05Z","revisedTime":"2026-07-26 14:18Z","runwayTime":"2026-07-26 14:18Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for AS1360
[flightStatus] AS1360 2026-07-26 status=EnRoute dep_delay=13 inbound_delay=0 cancelled=false
[flightStatus] number lookup "MQ3847" 2026-07-26
[flightStatus] MQ3847 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] MQ3847 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 17:36Z","local":"2026-07-26 12:36-05:00"},"revisedTime":{"utc":"2026-07-26 17:46Z","local":"2026-07-26 12:46-05:00"},"runwayTime":{"utc":"2026-07-26 17:49Z","local":"2026-07-26 12:49-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] MQ3847 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 17:36Z","revisedTime":"2026-07-26 17:46Z","runwayTime":"2026-07-26 17:49Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 10min for MQ3847
[flightStatus] computed inbound delay from revisedTime: 104min for MQ3847
[flightStatus] MQ3847 2026-07-26 status=Arrived dep_delay=10 inbound_delay=104 cancelled=false
[flightStatus] number lookup "MX709" 2026-07-26
[flightStatus] MX709 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] MX709 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 19:39Z","local":"2026-07-26 12:39-07:00"},"revisedTime":{"utc":"2026-07-26 20:01Z","local":"2026-07-26 13:01-07:00"},"runwayTime":{"utc":"2026-07-26 20:01Z","local":"2026-07-26 13:01-07:00"},"terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] MX709 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 19:39Z","revisedTime":"2026-07-26 20:01Z","runwayTime":"2026-07-26 20:01Z","terminal":"6","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for MX709
[flightStatus] MX709 2026-07-26 status=EnRoute dep_delay=22 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA6076" 2026-07-26
[flightStatus] HTTP 429 for "UA6076" 2026-07-26
[flightStatus] number lookup "UA 6076" 2026-07-26
[flightStatus] UA6076 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA6076 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 21:20Z","local":"2026-07-26 16:20-05:00"},"revisedTime":{"utc":"2026-07-26 22:18Z","local":"2026-07-26 17:18-05:00"},"runwayTime":{"utc":"2026-07-26 22:18Z","local":"2026-07-26 17:18-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA6076 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 21:20Z","revisedTime":"2026-07-26 22:18Z","runwayTime":"2026-07-26 22:18Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 58min for UA6076
[flightStatus] computed inbound delay from revisedTime: 11min for UA6076
[flightStatus] UA6076 2026-07-26 status=EnRoute dep_delay=58 inbound_delay=11 cancelled=false
[flightStatus] number lookup "WN331" 2026-07-26
[flightStatus] WN331 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN331 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 15:15-04:00"},"revisedTime":{"utc":"2026-07-26 19:46Z","local":"2026-07-26 15:46-04:00"},"runwayTime":{"utc":"2026-07-26 19:46Z","local":"2026-07-26 15:46-04:00"},"terminal":"N","runway":"27R","quality":["Basic","Live"]}
[flightStatus] WN331 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 19:15Z","revisedTime":"2026-07-26 19:46Z","runwayTime":"2026-07-26 19:46Z","terminal":"N","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for WN331
[flightStatus] WN331 2026-07-26 status=Arrived dep_delay=31 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA531" 2026-07-26
[flightStatus] AA531 dep keys: airport,scheduledTime,quality
[flightStatus] AA531 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 03:38Z","local":"2026-07-26 22:38-05:00"},"quality":["Basic"]}
[flightStatus] AA531 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 03:38Z","quality":["Basic"]}
[flightStatus] AA531 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL4083" 2026-07-26
[flightStatus] HTTP 429 for "DL4083" 2026-07-26
[flightStatus] number lookup "DL 4083" 2026-07-26
[flightStatus] DL4083 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] DL4083 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 04:35Z","local":"2026-07-26 21:35-07:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] DL4083 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 04:35Z","terminal":"3","quality":["Basic"]}
[flightStatus] DL4083 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2221" 2026-07-26
[flightStatus] AA2221 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA2221 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 20:55Z","local":"2026-07-26 16:55-04:00"},"revisedTime":{"utc":"2026-07-26 22:10Z","local":"2026-07-26 18:10-04:00"},"runwayTime":{"utc":"2026-07-26 22:10Z","local":"2026-07-26 18:10-04:00"},"terminal":"N","quality":["Basic","Live"]}
[flightStatus] AA2221 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 20:55Z","revisedTime":"2026-07-26 22:10Z","runwayTime":"2026-07-26 22:10Z","terminal":"N","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 75min for AA2221
[flightStatus] computed inbound delay from revisedTime: 21min for AA2221
[flightStatus] AA2221 2026-07-26 status=EnRoute dep_delay=75 inbound_delay=21 cancelled=false
[flightStatus] number lookup "DL1306" 2026-07-26
[flightStatus] DL1306 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL1306 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:12Z","local":"2026-07-26 18:12-05:00"},"revisedTime":{"utc":"2026-07-26 22:19Z","local":"2026-07-26 17:19-05:00"},"terminal":"5","quality":["Basic","Live"]}
[flightStatus] DL1306 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:12Z","revisedTime":"2026-07-26 22:19Z","terminal":"5","quality":["Basic","Live"]}
[flightStatus] DL1306 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3378" 2026-07-26
[flightStatus] AA3378 dep keys: airport,scheduledTime,quality
[flightStatus] AA3378 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 01:50Z","local":"2026-07-26 20:50-05:00"},"quality":["Basic"]}
[flightStatus] AA3378 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 01:50Z","quality":["Basic"]}
[flightStatus] AA3378 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2600" 2026-07-26
[flightStatus] AA2600 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA2600 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 01:59Z","local":"2026-07-26 20:59-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] AA2600 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 01:59Z","terminal":"3","quality":["Basic"]}
[flightStatus] AA2600 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL568" 2026-07-26
[flightStatus] DL568 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL568 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 23:29Z","local":"2026-07-26 19:29-04:00"},"revisedTime":{"utc":"2026-07-27 00:01Z","local":"2026-07-26 20:01-04:00"},"runwayTime":{"utc":"2026-07-27 00:01Z","local":"2026-07-26 20:01-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL568 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 23:29Z","revisedTime":"2026-07-27 00:01Z","runwayTime":"2026-07-27 00:01Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 32min for DL568
[flightStatus] DL568 2026-07-26 status=EnRoute dep_delay=32 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA2056" 2026-07-26
[flightStatus] HTTP 429 for "UA2056" 2026-07-26
[flightStatus] number lookup "UA 2056" 2026-07-26
[flightStatus] UA2056 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] UA2056 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-27 04:34Z","local":"2026-07-26 21:34-07:00"},"terminal":"7","quality":["Basic"]}
[flightStatus] UA2056 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-27 04:34Z","terminal":"7","quality":["Basic"]}
[flightStatus] UA2056 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL963" 2026-07-26
[flightStatus] DL963 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL963 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 11:35Z","local":"2026-07-26 07:35-04:00"},"revisedTime":{"utc":"2026-07-26 11:46Z","local":"2026-07-26 07:46-04:00"},"runwayTime":{"utc":"2026-07-26 11:46Z","local":"2026-07-26 07:46-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL963 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 11:35Z","revisedTime":"2026-07-26 11:46Z","runwayTime":"2026-07-26 11:46Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for DL963
[flightStatus] DL963 2026-07-26 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[flightStatus] number lookup "MQ3691" 2026-07-26
[flightStatus] MQ3691 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] MQ3691 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 22:07Z","local":"2026-07-26 17:07-05:00"},"revisedTime":{"utc":"2026-07-26 22:16Z","local":"2026-07-26 17:16-05:00"},"runwayTime":{"utc":"2026-07-26 22:16Z","local":"2026-07-26 17:16-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] MQ3691 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 22:07Z","revisedTime":"2026-07-26 22:16Z","runwayTime":"2026-07-26 22:16Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for MQ3691
[flightStatus] computed inbound delay from revisedTime: 10min for MQ3691
[flightStatus] MQ3691 2026-07-26 status=Arrived dep_delay=9 inbound_delay=10 cancelled=false
[flightStatus] number lookup "UA4519" 2026-07-26
[flightStatus] HTTP 429 for "UA4519" 2026-07-26
[flightStatus] number lookup "UA 4519" 2026-07-26
[flightStatus] UA4519 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA4519 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 21:25Z","local":"2026-07-26 16:25-05:00"},"revisedTime":{"utc":"2026-07-26 22:22Z","local":"2026-07-26 17:22-05:00"},"runwayTime":{"utc":"2026-07-26 22:22Z","local":"2026-07-26 17:22-05:00"},"terminal":"2","runway":"22L","quality":["Basic","Live"]}
[flightStatus] UA4519 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 21:25Z","revisedTime":"2026-07-26 22:22Z","runwayTime":"2026-07-26 22:22Z","terminal":"2","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 57min for UA4519
[flightStatus] computed inbound delay from revisedTime: 14min for UA4519
[flightStatus] UA4519 2026-07-26 status=Arrived dep_delay=57 inbound_delay=14 cancelled=false
[flightStatus] number lookup "DL2595" 2026-07-26
[flightStatus] DL2595 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL2595 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 15:15-04:00"},"revisedTime":{"utc":"2026-07-26 19:44Z","local":"2026-07-26 15:44-04:00"},"runwayTime":{"utc":"2026-07-26 19:44Z","local":"2026-07-26 15:44-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL2595 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 19:15Z","revisedTime":"2026-07-26 19:44Z","runwayTime":"2026-07-26 19:44Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 29min for DL2595
[flightStatus] DL2595 2026-07-26 status=Arrived dep_delay=29 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA5168" 2026-07-26
[flightStatus] AA5168 dep keys: airport,scheduledTime,quality
[flightStatus] AA5168 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 03:35Z","local":"2026-07-26 22:35-05:00"},"quality":["Basic"]}
[flightStatus] AA5168 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 03:35Z","quality":["Basic"]}
[flightStatus] AA5168 2026-07-26 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA5392" 2026-07-26
[flightStatus] HTTP 429 for "UA5392" 2026-07-26
[flightStatus] number lookup "UA 5392" 2026-07-26
[flightStatus] UA5392 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] UA5392 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 19:45-05:00"},"revisedTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 19:45-05:00"},"terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5392 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:45Z","revisedTime":"2026-07-27 00:45Z","terminal":"2","quality":["Basic","Live"]}
[flightStatus] UA5392 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2669" 2026-07-26
[flightStatus] DL2669 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL2669 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 23:37Z","local":"2026-07-26 19:37-04:00"},"revisedTime":{"utc":"2026-07-26 23:41Z","local":"2026-07-26 19:41-04:00"},"runwayTime":{"utc":"2026-07-26 23:41Z","local":"2026-07-26 19:41-04:00"},"terminal":"I","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL2669 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 23:37Z","revisedTime":"2026-07-26 23:41Z","runwayTime":"2026-07-26 23:41Z","terminal":"I","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 4min for DL2669
[flightStatus] DL2669 2026-07-26 status=EnRoute dep_delay=4 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL52" 2026-07-26
[flightStatus] DL52 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] DL52 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 20:45-04:00"},"revisedTime":{"utc":"2026-07-27 00:45Z","local":"2026-07-26 20:45-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL52 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 00:45Z","revisedTime":"2026-07-27 00:45Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL52 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "UA2136" 2026-07-26
[flightStatus] HTTP 429 for "UA2136" 2026-07-26
[flightStatus] number lookup "UA 2136" 2026-07-26
[flightStatus] UA2136 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2136 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 23:24Z","local":"2026-07-26 19:24-04:00"},"revisedTime":{"utc":"2026-07-26 23:33Z","local":"2026-07-26 19:33-04:00"},"runwayTime":{"utc":"2026-07-26 23:33Z","local":"2026-07-26 19:33-04:00"},"terminal":"B","quality":["Basic","Live"]}
[flightStatus] UA2136 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 23:24Z","revisedTime":"2026-07-26 23:33Z","runwayTime":"2026-07-26 23:33Z","terminal":"B","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 9min for UA2136
[flightStatus] UA2136 2026-07-26 status=EnRoute dep_delay=9 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2704" 2026-07-26
[flightStatus] AA2704 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2704 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 18:14Z","local":"2026-07-26 13:14-05:00"},"revisedTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 14:15-05:00"},"runwayTime":{"utc":"2026-07-26 19:15Z","local":"2026-07-26 14:15-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA2704 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 18:14Z","revisedTime":"2026-07-26 19:15Z","runwayTime":"2026-07-26 19:15Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 61min for AA2704
[flightStatus] computed inbound delay from revisedTime: 38min for AA2704
[flightStatus] AA2704 2026-07-26 status=Arrived dep_delay=61 inbound_delay=38 cancelled=false
[flightStatus] number lookup "DL1708" 2026-07-26
[flightStatus] DL1708 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1708 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 13:05Z","local":"2026-07-26 09:05-04:00"},"revisedTime":{"utc":"2026-07-26 15:32Z","local":"2026-07-26 11:32-04:00"},"runwayTime":{"utc":"2026-07-26 15:32Z","local":"2026-07-26 11:32-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1708 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 13:05Z","revisedTime":"2026-07-26 15:32Z","runwayTime":"2026-07-26 15:32Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 147min for DL1708
[flightStatus] computed inbound delay from revisedTime: 125min for DL1708
[flightStatus] DL1708 2026-07-26 status=Arrived dep_delay=147 inbound_delay=125 cancelled=false
[flightStatus] number lookup "AA5002" 2026-07-26
[flightStatus] HTTP 429 for "AA5002" 2026-07-26
[flightStatus] number lookup "AA 5002" 2026-07-26
[flightStatus] AA5002 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA5002 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 19:21Z","local":"2026-07-26 14:21-05:00"},"revisedTime":{"utc":"2026-07-26 20:50Z","local":"2026-07-26 15:50-05:00"},"runwayTime":{"utc":"2026-07-26 20:50Z","local":"2026-07-26 15:50-05:00"},"terminal":"E","runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA5002 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 19:21Z","revisedTime":"2026-07-26 20:50Z","runwayTime":"2026-07-26 20:50Z","terminal":"E","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 89min for AA5002
[flightStatus] computed inbound delay from revisedTime: 59min for AA5002
[flightStatus] AA5002 2026-07-26 status=Arrived dep_delay=89 inbound_delay=59 cancelled=false
[flightStatus] number lookup "AA1559" 2026-07-26
[flightStatus] AA1559 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA1559 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:18Z","local":"2026-07-26 18:18-05:00"},"revisedTime":{"utc":"2026-07-26 23:59Z","local":"2026-07-26 18:59-05:00"},"runwayTime":{"utc":"2026-07-26 23:59Z","local":"2026-07-26 18:59-05:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] AA1559 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:18Z","revisedTime":"2026-07-26 23:59Z","runwayTime":"2026-07-26 23:59Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 41min for AA1559
[flightStatus] AA1559 2026-07-26 status=EnRoute dep_delay=41 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL3043" 2026-07-26
[flightStatus] DL3043 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3043 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 20:30Z","local":"2026-07-26 16:30-04:00"},"revisedTime":{"utc":"2026-07-26 20:58Z","local":"2026-07-26 16:58-04:00"},"runwayTime":{"utc":"2026-07-26 20:58Z","local":"2026-07-26 16:58-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL3043 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 20:30Z","revisedTime":"2026-07-26 20:58Z","runwayTime":"2026-07-26 20:58Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 28min for DL3043
[flightStatus] computed inbound delay from revisedTime: 11min for DL3043
[flightStatus] DL3043 2026-07-26 status=Arrived dep_delay=28 inbound_delay=11 cancelled=false
[flightStatus] number lookup "AA3120" 2026-07-26
[flightStatus] HTTP 429 for "AA3120" 2026-07-26
[flightStatus] number lookup "AA 3120" 2026-07-26
[flightStatus] AA3120 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] AA3120 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 21:00Z","local":"2026-07-26 17:00-04:00"},"revisedTime":{"utc":"2026-07-26 21:19Z","local":"2026-07-26 17:19-04:00"},"runwayTime":{"utc":"2026-07-26 21:19Z","local":"2026-07-26 17:19-04:00"},"terminal":"8","quality":["Basic","Live"]}
[flightStatus] AA3120 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 21:00Z","revisedTime":"2026-07-26 21:19Z","runwayTime":"2026-07-26 21:19Z","terminal":"8","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 19min for AA3120
[flightStatus] AA3120 2026-07-26 status=Arrived dep_delay=19 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL2166" 2026-07-26
[flightStatus] DL2166 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL2166 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-07-26 22:20Z","local":"2026-07-26 15:20-07:00"},"revisedTime":{"utc":"2026-07-26 22:40Z","local":"2026-07-26 15:40-07:00"},"runwayTime":{"utc":"2026-07-26 22:40Z","local":"2026-07-26 15:40-07:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] DL2166 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-07-26 22:20Z","revisedTime":"2026-07-26 22:40Z","runwayTime":"2026-07-26 22:40Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for DL2166
[flightStatus] DL2166 2026-07-26 status=EnRoute dep_delay=20 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AS1319" 2026-07-26
[flightStatus] AS1319 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AS1319 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 20:54Z","local":"2026-07-26 16:54-04:00"},"revisedTime":{"utc":"2026-07-26 21:20Z","local":"2026-07-26 17:20-04:00"},"runwayTime":{"utc":"2026-07-26 21:20Z","local":"2026-07-26 17:20-04:00"},"runway":"09","quality":["Basic","Live"]}
[flightStatus] AS1319 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 20:54Z","revisedTime":"2026-07-26 21:20Z","runwayTime":"2026-07-26 21:20Z","runway":"09","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for AS1319
[flightStatus] AS1319 2026-07-26 status=Departed dep_delay=26 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA2587" 2026-07-26
[flightStatus] AA2587 dep keys: airport,scheduledTime,revisedTime,quality
[flightStatus] AA2587 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-27 00:34Z","local":"2026-07-26 19:34-05:00"},"revisedTime":{"utc":"2026-07-27 00:34Z","local":"2026-07-26 19:34-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA2587 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-27 00:34Z","revisedTime":"2026-07-27 00:34Z","quality":["Basic","Live"]}
[flightStatus] AA2587 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AF331" 2026-07-26
[flightStatus] AF331 dep keys: airport,scheduledTime,revisedTime,terminal,quality
[flightStatus] AF331 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-27 01:45Z","local":"2026-07-26 21:45-04:00"},"revisedTime":{"utc":"2026-07-27 01:45Z","local":"2026-07-26 21:45-04:00"},"terminal":"E","quality":["Basic","Live"]}
[flightStatus] AF331 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-27 01:45Z","revisedTime":"2026-07-27 01:45Z","terminal":"E","quality":["Basic","Live"]}
[flightStatus] AF331 2026-07-26 status=Scheduled dep_delay=0 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA3251" 2026-07-26
[flightStatus] AA3251 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA3251 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 23:15Z","local":"2026-07-26 18:15-05:00"},"revisedTime":{"utc":"2026-07-26 23:27Z","local":"2026-07-26 18:27-05:00"},"runwayTime":{"utc":"2026-07-26 23:27Z","local":"2026-07-26 18:27-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA3251 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 23:15Z","revisedTime":"2026-07-26 23:27Z","runwayTime":"2026-07-26 23:27Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for AA3251
[flightStatus] AA3251 2026-07-26 status=EnRoute dep_delay=12 inbound_delay=0 cancelled=false
[flightStatus] number lookup "AA4834" 2026-07-26
[flightStatus] HTTP 429 for "AA4834" 2026-07-26
[flightStatus] number lookup "AA 4834" 2026-07-26
[flightStatus] AA4834 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA4834 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-07-26 20:22Z","local":"2026-07-26 15:22-05:00"},"revisedTime":{"utc":"2026-07-26 20:43Z","local":"2026-07-26 15:43-05:00"},"runwayTime":{"utc":"2026-07-26 20:43Z","local":"2026-07-26 15:43-05:00"},"terminal":"3","runway":"22L","quality":["Basic","Live"]}
[flightStatus] AA4834 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-07-26 20:22Z","revisedTime":"2026-07-26 20:43Z","runwayTime":"2026-07-26 20:43Z","terminal":"3","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 21min for AA4834
[flightStatus] AA4834 2026-07-26 status=EnRoute dep_delay=21 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL14" 2026-07-26
[flightStatus] DL14 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL14 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 22:00Z","local":"2026-07-26 18:00-04:00"},"revisedTime":{"utc":"2026-07-26 22:08Z","local":"2026-07-26 18:08-04:00"},"runwayTime":{"utc":"2026-07-26 22:08Z","local":"2026-07-26 18:08-04:00"},"terminal":"I","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL14 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 22:00Z","revisedTime":"2026-07-26 22:08Z","runwayTime":"2026-07-26 22:08Z","terminal":"I","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 8min for DL14
[flightStatus] DL14 2026-07-26 status=EnRoute dep_delay=8 inbound_delay=0 cancelled=false
[flightStatus] number lookup "DL5460" 2026-07-26
[flightStatus] DL5460 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5460 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-07-26 18:40Z","local":"2026-07-26 14:40-04:00"},"revisedTime":{"utc":"2026-07-26 20:02Z","local":"2026-07-26 16:02-04:00"},"runwayTime":{"utc":"2026-07-26 20:02Z","local":"2026-07-26 16:02-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL5460 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-07-26 18:40Z","revisedTime":"2026-07-26 20:02Z","runwayTime":"2026-07-26 20:02Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 82min for DL5460
[flightStatus] computed inbound delay from revisedTime: 31min for DL5460
[flightStatus] DL5460 2026-07-26 status=Arrived dep_delay=82 inbound_delay=31 cancelled=false
[resolution] cycle end resolved=144 unresolvable=56 pending=0 date=2026-07-27 

/workspace$ ^[[200~cd server2 && npx tsx scripts/rescore_historical_v2.ts archived-only^[[201~
cd server2 &&cd server2 && npx tsx scripts/rescore_historical_v2.ts archived-only
[rescore] Found 1409 archived/resolved flights to rescore
[rescore] [1/1409] AA4551 2026-05-19
[rescore] AA4551 2026-05-19 ORD->LGA
[flightStatus] number lookup "AA4551" 2026-05-19
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] computing AA
[carrierHealth] AA sample=279 cancelRate=0.039 avgDelay=0.0 healthScore=4 reliable=true
[nasStatus] fetched airport-events: 10 airports
[nasStatus] LGA active programs: Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 10 airports
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] AA4551 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] AA4551 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-05-19 11:00Z","local":"2026-05-19 06:00-05:00"},"terminal":"5","quality":["Basic"]}
[flightStatus] AA4551 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-05-19 11:00Z","terminal":"5","quality":["Basic"]}
[flightStatus] AA4551 2026-05-19 status=Unknown dep_delay=0 inbound_delay=0 cancelled=false
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[riskScorer] AA4551 2026-05-19 horizon=short hours_out=-1645.3 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[rescore] OK AA4551 score=15 tier=green delay=0
[rescore] [2/1409] UA2267 2026-05-20
[rescore] UA2267 2026-05-20 ORD->LGA
[flightStatus] number lookup "UA2267" 2026-05-20
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] computing UA
[carrierHealth] UA sample=243 cancelRate=0.016 avgDelay=0.0 healthScore=1 reliable=true
[nasStatus] fetched airport-events: 10 airports
[nasStatus] LGA active programs: Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 10 airports
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] UA2267 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA2267 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-05-20 17:00Z","local":"2026-05-20 12:00-05:00"},"revisedTime":{"utc":"2026-05-20 18:01Z","local":"2026-05-20 13:01-05:00"},"runwayTime":{"utc":"2026-05-20 18:01Z","local":"2026-05-20 13:01-05:00"},"terminal":"1","runway":"10L","quality":["Basic","Live"]}
[flightStatus] UA2267 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-05-20 17:00Z","revisedTime":"2026-05-20 18:01Z","runwayTime":"2026-05-20 18:01Z","terminal":"1","runway":"10L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 61min for UA2267
[flightStatus] computed inbound delay from revisedTime: 22min for UA2267
[flightStatus] UA2267 2026-05-20 status=Arrived dep_delay=61 inbound_delay=22 cancelled=false
[riskScorer] UA2267 2026-05-20 horizon=short hours_out=-1615.3 raw_total=55 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":1,"connectionRisk":2}
[rescore] OK UA2267 score=55 tier=amber delay=61
[rescore] [3/1409] UA586 2026-05-20
[rescore] UA586 2026-05-20 ORD->LGA
[flightStatus] number lookup "UA586" 2026-05-20
[weather] fetching ORD (KORD)
[weather] fetching LGA (KLGA)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[nasStatus] LGA active programs: Departure Delay avgDelay=0min
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] UA586 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA586 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-05-20 11:00Z","local":"2026-05-20 06:00-05:00"},"revisedTime":{"utc":"2026-05-20 11:18Z","local":"2026-05-20 06:18-05:00"},"runwayTime":{"utc":"2026-05-20 11:18Z","local":"2026-05-20 06:18-05:00"},"terminal":"1","runway":"10L","quality":["Basic","Live"]}
[flightStatus] UA586 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-05-20 11:00Z","revisedTime":"2026-05-20 11:18Z","runwayTime":"2026-05-20 11:18Z","terminal":"1","runway":"10L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for UA586
[flightStatus] UA586 2026-05-20 status=Arrived dep_delay=18 inbound_delay=0 cancelled=false
[weather] LGA cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[riskScorer] UA586 2026-05-20 horizon=short hours_out=-1621.3 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":1,"connectionRisk":1}
[rescore] OK UA586 score=29 tier=amber delay=18
[rescore] [4/1409] AA1517 2026-05-19
[rescore] AA1517 2026-05-19 DFW->ORD
[flightStatus] number lookup "AA1517" 2026-05-19
[weather] fetching DFW (KDFW)
[weather] fetching ORD (KORD)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] AA1517 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1517 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-05-20 02:20Z","local":"2026-05-19 21:20-05:00"},"revisedTime":{"utc":"2026-05-20 03:19Z","local":"2026-05-19 22:19-05:00"},"runwayTime":{"utc":"2026-05-20 03:19Z","local":"2026-05-19 22:19-05:00"},"runway":"35L","quality":["Basic","Live"]}
[flightStatus] AA1517 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-05-20 02:20Z","revisedTime":"2026-05-20 03:19Z","runwayTime":"2026-05-20 03:19Z","runway":"35L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 59min for AA1517
[flightStatus] computed inbound delay from revisedTime: 11min for AA1517
[flightStatus] AA1517 2026-05-19 status=Arrived dep_delay=59 inbound_delay=11 cancelled=false
[riskScorer] AA1517 2026-05-19 horizon=short hours_out=-1629.9 raw_total=37 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK AA1517 score=37 tier=amber delay=59
[rescore] [5/1409] AA1279 2026-06-09
[rescore] AA1279 2026-06-09 DFW->CMH
[flightStatus] number lookup "AA1279" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching CMH (KCMH)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] AA1279 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1279 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 12:15Z","local":"2026-06-09 07:15-05:00"},"revisedTime":{"utc":"2026-06-09 12:28Z","local":"2026-06-09 07:28-05:00"},"runwayTime":{"utc":"2026-06-09 12:28Z","local":"2026-06-09 07:28-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1279 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 12:15Z","revisedTime":"2026-06-09 12:28Z","runwayTime":"2026-06-09 12:28Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for AA1279
[flightStatus] AA1279 2026-06-09 status=Arrived dep_delay=13 inbound_delay=0 cancelled=false
[weather] CMH cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[riskScorer] AA1279 2026-06-09 horizon=short hours_out=-1140.0 raw_total=18 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[rescore] OK AA1279 score=18 tier=green delay=13
[rescore] [6/1409] UA644 2026-06-09
[rescore] UA644 2026-06-09 DFW->DEN
[flightStatus] number lookup "UA644" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching DEN (KDEN)
[carrierHealth] cache hit UA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] DEN cat=VFR vis=10 ceil=14000 ts=false fz=false contrib=2
[flightStatus] UA644 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA644 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 13:45Z","local":"2026-06-09 08:45-05:00"},"revisedTime":{"utc":"2026-06-09 14:07Z","local":"2026-06-09 09:07-05:00"},"runwayTime":{"utc":"2026-06-09 14:07Z","local":"2026-06-09 09:07-05:00"},"terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] UA644 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 13:45Z","revisedTime":"2026-06-09 14:07Z","runwayTime":"2026-06-09 14:07Z","terminal":"E","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for UA644
[flightStatus] UA644 2026-06-09 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[riskScorer] UA644 2026-06-09 horizon=short hours_out=-1138.5 raw_total=23 tier=green cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[rescore] OK UA644 score=23 tier=green delay=22
[rescore] [7/1409] AA1963 2026-06-09
[rescore] AA1963 2026-06-09 DFW->YUL
[flightStatus] number lookup "AA1963" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching YUL (CYUL)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] AA1963 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1963 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 15:00Z","local":"2026-06-09 10:00-05:00"},"revisedTime":{"utc":"2026-06-09 15:24Z","local":"2026-06-09 10:24-05:00"},"runwayTime":{"utc":"2026-06-09 15:24Z","local":"2026-06-09 10:24-05:00"},"runway":"17R","quality":["Basic","Live"]}
[flightStatus] AA1963 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 15:00Z","revisedTime":"2026-06-09 15:24Z","runwayTime":"2026-06-09 15:24Z","runway":"17R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 24min for AA1963
[flightStatus] AA1963 2026-06-09 status=Arrived dep_delay=24 inbound_delay=0 cancelled=false
[weather] YUL cat=VFR vis=30 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA1963 2026-06-09 horizon=short hours_out=-1137.3 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK AA1963 score=28 tier=amber delay=24
[rescore] [8/1409] DL1592 2026-06-09
[rescore] DL1592 2026-06-09 ATL->BWI
[flightStatus] number lookup "DL1592" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching BWI (KBWI)
[carrierHealth] computing DL
[carrierHealth] DL sample=359 cancelRate=0.008 avgDelay=0.0 healthScore=1 reliable=true
[nasStatus] fetched airport-events: 10 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[weather] BWI cat=VFR vis=10 ceil=11000 ts=false fz=false contrib=2
[flightStatus] DL1592 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1592 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 11:35Z","local":"2026-06-09 07:35-04:00"},"revisedTime":{"utc":"2026-06-09 11:50Z","local":"2026-06-09 07:50-04:00"},"runwayTime":{"utc":"2026-06-09 11:50Z","local":"2026-06-09 07:50-04:00"},"terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] DL1592 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 11:35Z","revisedTime":"2026-06-09 11:50Z","runwayTime":"2026-06-09 11:50Z","terminal":"S","runway":"27R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for DL1592
[flightStatus] DL1592 2026-06-09 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[riskScorer] DL1592 2026-06-09 horizon=short hours_out=-1140.7 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[rescore] OK DL1592 score=15 tier=green delay=15
[rescore] [9/1409] DL1687 2026-06-09
[rescore] DL1687 2026-06-09 ATL->BTR
[flightStatus] number lookup "DL1687" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching BTR (KBTR)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] DL1687 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1687 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 13:10Z","local":"2026-06-09 09:10-04:00"},"revisedTime":{"utc":"2026-06-09 13:18Z","local":"2026-06-09 09:18-04:00"},"runwayTime":{"utc":"2026-06-09 13:18Z","local":"2026-06-09 09:18-04:00"},"terminal":"S","runway":"09L","quality":["Basic","Live"]}
[flightStatus] DL1687 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 13:10Z","revisedTime":"2026-06-09 13:18Z","runwayTime":"2026-06-09 13:18Z","terminal":"S","runway":"09L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 8min for DL1687
[flightStatus] DL1687 2026-06-09 status=Arrived dep_delay=8 inbound_delay=0 cancelled=false
[weather] BTR cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] DL1687 2026-06-09 horizon=short hours_out=-1139.1 raw_total=15 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[rescore] OK DL1687 score=15 tier=green delay=8
[rescore] [10/1409] DL1682 2026-06-09
[rescore] DL1682 2026-06-09 ATL->IAH
[flightStatus] number lookup "DL1682" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching IAH (KIAH)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] DL1682 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1682 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 14:10Z","local":"2026-06-09 10:10-04:00"},"revisedTime":{"utc":"2026-06-09 14:22Z","local":"2026-06-09 10:22-04:00"},"runwayTime":{"utc":"2026-06-09 14:22Z","local":"2026-06-09 10:22-04:00"},"terminal":"S","runway":"08R","quality":["Basic","Live"]}
[flightStatus] DL1682 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 14:10Z","revisedTime":"2026-06-09 14:22Z","runwayTime":"2026-06-09 14:22Z","terminal":"S","runway":"08R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL1682
[flightStatus] DL1682 2026-06-09 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[weather] IAH cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] DL1682 2026-06-09 horizon=short hours_out=-1138.1 raw_total=17 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK DL1682 score=17 tier=green delay=12
[rescore] [11/1409] UA4471 2026-06-09
[rescore] UA4471 2026-06-09 ORD->SDF
[flightStatus] number lookup "UA4471" 2026-06-09
[weather] fetching ORD (KORD)
[weather] fetching SDF (KSDF)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[weather] SDF cat=MVFR vis=10 ceil=2700 ts=false fz=false contrib=10
[flightStatus] UA4471 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA4471 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 11:59Z","local":"2026-06-09 06:59-05:00"},"revisedTime":{"utc":"2026-06-09 12:17Z","local":"2026-06-09 07:17-05:00"},"runwayTime":{"utc":"2026-06-09 12:17Z","local":"2026-06-09 07:17-05:00"},"terminal":"2","runway":"28R","quality":["Basic","Live"]}
[flightStatus] UA4471 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 11:59Z","revisedTime":"2026-06-09 12:17Z","runwayTime":"2026-06-09 12:17Z","terminal":"2","runway":"28R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 18min for UA4471
[flightStatus] UA4471 2026-06-09 status=Arrived dep_delay=18 inbound_delay=0 cancelled=false
[riskScorer] UA4471 2026-06-09 horizon=short hours_out=-1140.3 raw_total=28 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":6,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[rescore] OK UA4471 score=28 tier=amber delay=18
[rescore] [12/1409] OO6232 2026-06-09
[rescore] OO6232 2026-06-09 ORD->FWA
[flightStatus] number lookup "OO6232" 2026-06-09
[weather] fetching ORD (KORD)
[weather] fetching FWA (KFWA)
[carrierHealth] computing OO
[carrierHealth] OO sample=3 cancelRate=1.000 avgDelay=0.0 healthScore=10 reliable=true
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] OO6232 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] OO6232 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 13:30Z","local":"2026-06-09 08:30-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] OO6232 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 13:30Z","terminal":"3","quality":["Basic"]}
[flightStatus] OO6232 2026-06-09 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[weather] FWA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] OO6232 2026-06-09 horizon=short hours_out=-1138.8 raw_total=56 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":1}
[rescore] OK OO6232 score=75 tier=red delay=0
[rescore] [13/1409] UA5668 2026-06-09
[rescore] UA5668 2026-06-09 ORD->RDU
[flightStatus] number lookup "UA5668" 2026-06-09
[weather] fetching ORD (KORD)
[weather] fetching RDU (KRDU)
[carrierHealth] cache hit UA
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] UA5668 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA5668 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 14:10Z","local":"2026-06-09 09:10-05:00"},"revisedTime":{"utc":"2026-06-09 15:18Z","local":"2026-06-09 10:18-05:00"},"runwayTime":{"utc":"2026-06-09 15:18Z","local":"2026-06-09 10:18-05:00"},"terminal":"2","runway":"22L","quality":["Basic","Live"]}
[flightStatus] UA5668 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 14:10Z","revisedTime":"2026-06-09 15:18Z","runwayTime":"2026-06-09 15:18Z","terminal":"2","runway":"22L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 68min for UA5668
[flightStatus] computed inbound delay from revisedTime: 19min for UA5668
[flightStatus] UA5668 2026-06-09 status=Arrived dep_delay=68 inbound_delay=19 cancelled=false
[weather] RDU cat=VFR vis=10 ceil=8000 ts=false fz=false contrib=2
[riskScorer] UA5668 2026-06-09 horizon=short hours_out=-1138.1 raw_total=49 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK UA5668 score=49 tier=amber delay=68
[rescore] [14/1409] AM649 2026-06-09
[rescore] AM649 2026-06-09 LAX->MEX
[flightStatus] number lookup "AM649" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching MEX (MMMX)
[carrierHealth] computing AM
[carrierHealth] AM sample=1 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AM649 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AM649 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-09 14:00Z","local":"2026-06-09 07:00-07:00"},"revisedTime":{"utc":"2026-06-09 14:13Z","local":"2026-06-09 07:13-07:00"},"runwayTime":{"utc":"2026-06-09 14:13Z","local":"2026-06-09 07:13-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] AM649 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-09 14:00Z","revisedTime":"2026-06-09 14:13Z","runwayTime":"2026-06-09 14:13Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 13min for AM649
[flightStatus] AM649 2026-06-09 status=EnRoute dep_delay=13 inbound_delay=0 cancelled=false
[weather] MEX cat=MVFR vis=8 ceil=2000 ts=true fz=false contrib=20
[riskScorer] AM649 2026-06-09 horizon=short hours_out=-1138.3 raw_total=29 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":11,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK AM649 score=29 tier=amber delay=13
[rescore] [15/1409] DL6330 2026-06-09
[rescore] DL6330 2026-06-09 LAX->SFO
[flightStatus] number lookup "DL6330" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching SFO (KSFO)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[nasStatus] SFO active programs: Ground Delay Program avgDelay=67min
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL6330 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] DL6330 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-09 16:22Z","local":"2026-06-09 09:22-07:00"},"revisedTime":{"utc":"2026-06-09 17:17Z","local":"2026-06-09 10:17-07:00"},"runwayTime":{"utc":"2026-06-09 17:37Z","local":"2026-06-09 10:37-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] DL6330 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-09 16:22Z","revisedTime":"2026-06-09 17:17Z","runwayTime":"2026-06-09 17:37Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 55min for DL6330
[flightStatus] DL6330 2026-06-09 status=Departed dep_delay=55 inbound_delay=0 cancelled=false
[weather] SFO cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=5
[riskScorer] DL6330 2026-06-09 horizon=short hours_out=-1135.9 raw_total=54 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":15,"originWeather":2,"destinationWeather":3,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK DL6330 score=54 tier=amber delay=55
[rescore] [16/1409] DL1514 2026-06-09
[rescore] DL1514 2026-06-09 JFK->MIA
[flightStatus] number lookup "DL1514" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching MIA (KMIA)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 10 airports
[nasStatus] MIA active programs: Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 10 airports
[nasStatus] JFK active programs: Departure Delay avgDelay=0min
[weather] MIA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL1514 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1514 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 15:05Z","local":"2026-06-09 11:05-04:00"},"revisedTime":{"utc":"2026-06-09 15:32Z","local":"2026-06-09 11:32-04:00"},"runwayTime":{"utc":"2026-06-09 15:32Z","local":"2026-06-09 11:32-04:00"},"terminal":"4","runway":"22R","quality":["Basic","Live"]}
[flightStatus] DL1514 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 15:05Z","revisedTime":"2026-06-09 15:32Z","runwayTime":"2026-06-09 15:32Z","terminal":"4","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for DL1514
[flightStatus] DL1514 2026-06-09 status=Arrived dep_delay=27 inbound_delay=0 cancelled=false
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] DL1514 2026-06-09 horizon=short hours_out=-1137.2 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK DL1514 score=30 tier=amber delay=27
[rescore] [17/1409] TJ433 2026-06-09
[rescore] TJ433 2026-06-09 JFK->GFL
[flightStatus] number lookup "TJ433" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching GFL (KGFL)
[carrierHealth] computing TJ
[carrierHealth] TJ sample=1 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] JFK active programs: Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 10 airports
[flightStatus] TJ433 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] TJ433 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 18:20Z","local":"2026-06-09 14:20-04:00"},"revisedTime":{"utc":"2026-06-09 18:19Z","local":"2026-06-09 14:19-04:00"},"runwayTime":{"utc":"2026-06-09 18:19Z","local":"2026-06-09 14:19-04:00"},"runway":"22R","quality":["Basic","Live"]}
[flightStatus] TJ433 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 18:20Z","revisedTime":"2026-06-09 18:19Z","runwayTime":"2026-06-09 18:19Z","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 5min for TJ433
[flightStatus] TJ433 2026-06-09 status=Arrived dep_delay=0 inbound_delay=5 cancelled=false
[weather] fetch failed for KGFL: Unexpected end of JSON input
[riskScorer] TJ433 2026-06-09 horizon=short hours_out=-1133.9 raw_total=25 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":0,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK TJ433 score=25 tier=amber delay=0
[rescore] [18/1409] MQ3549 2026-06-09
[rescore] MQ3549 2026-06-09 DFW->GRK
[flightStatus] number lookup "MQ3549" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching GRK (KGRK)
[carrierHealth] computing MQ
[carrierHealth] MQ sample=3 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[nasStatus] fetched airport-events: 10 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[weather] GRK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] MQ3549 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] MQ3549 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 16:28Z","local":"2026-06-09 11:28-05:00"},"revisedTime":{"utc":"2026-06-09 16:43Z","local":"2026-06-09 11:43-05:00"},"runwayTime":{"utc":"2026-06-09 16:43Z","local":"2026-06-09 11:43-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] MQ3549 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 16:28Z","revisedTime":"2026-06-09 16:43Z","runwayTime":"2026-06-09 16:43Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for MQ3549
[flightStatus] computed inbound delay from revisedTime: 12min for MQ3549
[flightStatus] MQ3549 2026-06-09 status=Arrived dep_delay=15 inbound_delay=12 cancelled=false
[riskScorer] MQ3549 2026-06-09 horizon=short hours_out=-1135.8 raw_total=17 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK MQ3549 score=17 tier=green delay=15
[rescore] [19/1409] AA2239 2026-06-09
[rescore] AA2239 2026-06-09 DFW->ONT
[flightStatus] number lookup "AA2239" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching ONT (KONT)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] ONT cat=VFR vis=10 ceil=23000 ts=false fz=false contrib=2
[flightStatus] AA2239 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2239 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 17:20Z","local":"2026-06-09 12:20-05:00"},"revisedTime":{"utc":"2026-06-09 17:52Z","local":"2026-06-09 12:52-05:00"},"runwayTime":{"utc":"2026-06-09 17:52Z","local":"2026-06-09 12:52-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2239 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 17:20Z","revisedTime":"2026-06-09 17:52Z","runwayTime":"2026-06-09 17:52Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 32min for AA2239
[flightStatus] computed inbound delay from revisedTime: 6min for AA2239
[flightStatus] AA2239 2026-06-09 status=Arrived dep_delay=32 inbound_delay=6 cancelled=false
[riskScorer] AA2239 2026-06-09 horizon=short hours_out=-1134.9 raw_total=40 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK AA2239 score=40 tier=amber delay=32
[rescore] [20/1409] AA1405 2026-06-09
[rescore] AA1405 2026-06-09 DFW->AUS
[flightStatus] number lookup "AA1405" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching AUS (KAUS)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA1405 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1405 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 18:47Z","local":"2026-06-09 13:47-05:00"},"revisedTime":{"utc":"2026-06-09 19:14Z","local":"2026-06-09 14:14-05:00"},"runwayTime":{"utc":"2026-06-09 19:14Z","local":"2026-06-09 14:14-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA1405 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 18:47Z","revisedTime":"2026-06-09 19:14Z","runwayTime":"2026-06-09 19:14Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 27min for AA1405
[flightStatus] AA1405 2026-06-09 status=Arrived dep_delay=27 inbound_delay=0 cancelled=false
[weather] AUS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA1405 2026-06-09 horizon=short hours_out=-1133.5 raw_total=30 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK AA1405 score=30 tier=amber delay=27
[rescore] [21/1409] AA3249 2026-06-09
[rescore] AA3249 2026-06-09 ATL->DFW
[flightStatus] number lookup "AA3249" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching DFW (KDFW)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA3249 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] AA3249 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 15:20Z","local":"2026-06-09 11:20-04:00"},"revisedTime":{"utc":"2026-06-09 15:31Z","local":"2026-06-09 11:31-04:00"},"runwayTime":{"utc":"2026-06-09 15:31Z","local":"2026-06-09 11:31-04:00"},"terminal":"N","runway":"08R","quality":["Basic","Live"]}
[flightStatus] AA3249 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 15:20Z","revisedTime":"2026-06-09 15:31Z","runwayTime":"2026-06-09 15:31Z","terminal":"N","runway":"08R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for AA3249
[flightStatus] AA3249 2026-06-09 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] AA3249 2026-06-09 horizon=short hours_out=-1136.9 raw_total=20 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK AA3249 score=20 tier=green delay=11
[rescore] [22/1409] DL1437 2026-06-09
[rescore] DL1437 2026-06-09 ATL->RIC
[flightStatus] number lookup "DL1437" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching RIC (KRIC)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] RIC cat=MVFR vis=3 ceil=7500 ts=false fz=false contrib=10
[flightStatus] DL1437 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1437 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 16:35Z","local":"2026-06-09 12:35-04:00"},"revisedTime":{"utc":"2026-06-09 16:43Z","local":"2026-06-09 12:43-04:00"},"runwayTime":{"utc":"2026-06-09 16:43Z","local":"2026-06-09 12:43-04:00"},"terminal":"S","runway":"09L","quality":["Basic","Live"]}
[flightStatus] DL1437 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 16:35Z","revisedTime":"2026-06-09 16:43Z","runwayTime":"2026-06-09 16:43Z","terminal":"S","runway":"09L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 8min for DL1437
[flightStatus] DL1437 2026-06-09 status=Arrived dep_delay=8 inbound_delay=0 cancelled=false
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[riskScorer] DL1437 2026-06-09 horizon=short hours_out=-1135.7 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":6,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK DL1437 score=22 tier=green delay=8
[rescore] [23/1409] DL1642 2026-06-09
[rescore] DL1642 2026-06-09 ATL->MCO
[flightStatus] number lookup "DL1642" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching MCO (KMCO)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] MCO cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] DL1642 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1642 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 18:00Z","local":"2026-06-09 14:00-04:00"},"revisedTime":{"utc":"2026-06-09 18:22Z","local":"2026-06-09 14:22-04:00"},"runwayTime":{"utc":"2026-06-09 18:22Z","local":"2026-06-09 14:22-04:00"},"terminal":"S","runway":"09L","quality":["Basic","Live"]}
[flightStatus] DL1642 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 18:00Z","revisedTime":"2026-06-09 18:22Z","runwayTime":"2026-06-09 18:22Z","terminal":"S","runway":"09L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL1642
[flightStatus] DL1642 2026-06-09 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[riskScorer] DL1642 2026-06-09 horizon=short hours_out=-1134.3 raw_total=27 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK DL1642 score=27 tier=amber delay=22
[rescore] [24/1409] WN4943 2026-06-09
[rescore] WN4943 2026-06-09 LAX->ABQ
[flightStatus] number lookup "WN4943" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching ABQ (KABQ)
[carrierHealth] computing WN
[carrierHealth] WN sample=80 cancelRate=0.000 avgDelay=0.0 healthScore=1 reliable=true
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] WN4943 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] WN4943 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-09 18:00Z","local":"2026-06-09 11:00-07:00"},"revisedTime":{"utc":"2026-06-09 18:38Z","local":"2026-06-09 11:38-07:00"},"runwayTime":{"utc":"2026-06-09 18:38Z","local":"2026-06-09 11:38-07:00"},"terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] WN4943 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-09 18:00Z","revisedTime":"2026-06-09 18:38Z","runwayTime":"2026-06-09 18:38Z","terminal":"1","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 38min for WN4943
[flightStatus] computed inbound delay from revisedTime: 14min for WN4943
[flightStatus] WN4943 2026-06-09 status=Arrived dep_delay=38 inbound_delay=14 cancelled=false
[weather] ABQ cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] WN4943 2026-06-09 horizon=short hours_out=-1134.3 raw_total=39 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK WN4943 score=39 tier=amber delay=38
[rescore] [25/1409] DL3842 2026-06-09
[rescore] DL3842 2026-06-09 LAX->SJC
[flightStatus] number lookup "DL3842" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching SJC (KSJC)
[carrierHealth] cache hit DL
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] SJC cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL3842 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3842 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-09 19:57Z","local":"2026-06-09 12:57-07:00"},"revisedTime":{"utc":"2026-06-09 20:01Z","local":"2026-06-09 13:01-07:00"},"runwayTime":{"utc":"2026-06-09 20:01Z","local":"2026-06-09 13:01-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL3842 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-09 19:57Z","revisedTime":"2026-06-09 20:01Z","runwayTime":"2026-06-09 20:01Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 4min for DL3842
[flightStatus] DL3842 2026-06-09 status=Arrived dep_delay=4 inbound_delay=0 cancelled=false
[riskScorer] DL3842 2026-06-09 horizon=short hours_out=-1132.3 raw_total=19 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK DL3842 score=19 tier=green delay=4
[rescore] [26/1409] DL3894 2026-06-09
[rescore] DL3894 2026-06-09 LAX->PHX
[flightStatus] number lookup "DL3894" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching PHX (KPHX)
[carrierHealth] cache hit DL
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[weather] PHX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[flightStatus] DL3894 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL3894 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-09 20:48Z","local":"2026-06-09 13:48-07:00"},"revisedTime":{"utc":"2026-06-09 21:19Z","local":"2026-06-09 14:19-07:00"},"runwayTime":{"utc":"2026-06-09 21:19Z","local":"2026-06-09 14:19-07:00"},"terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] DL3894 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-09 20:48Z","revisedTime":"2026-06-09 21:19Z","runwayTime":"2026-06-09 21:19Z","terminal":"3","runway":"24L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 31min for DL3894
[flightStatus] computed inbound delay from revisedTime: 3min for DL3894
[flightStatus] DL3894 2026-06-09 status=Arrived dep_delay=31 inbound_delay=3 cancelled=false
[riskScorer] DL3894 2026-06-09 horizon=short hours_out=-1131.5 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK DL3894 score=41 tier=amber delay=31
[rescore] [27/1409] DL322 2026-06-09
[rescore] DL322 2026-06-09 BOS->ATL
[flightStatus] number lookup "DL322" 2026-06-09
[weather] fetching BOS (KBOS)
[weather] fetching ATL (KATL)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[weather] BOS cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[flightStatus] DL322 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL322 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 17:55Z","local":"2026-06-09 13:55-04:00"},"revisedTime":{"utc":"2026-06-09 18:17Z","local":"2026-06-09 14:17-04:00"},"runwayTime":{"utc":"2026-06-09 18:17Z","local":"2026-06-09 14:17-04:00"},"terminal":"A","runway":"22R","quality":["Basic","Live"]}
[flightStatus] DL322 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 17:55Z","revisedTime":"2026-06-09 18:17Z","runwayTime":"2026-06-09 18:17Z","terminal":"A","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for DL322
[flightStatus] DL322 2026-06-09 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[riskScorer] DL322 2026-06-09 horizon=short hours_out=-1134.4 raw_total=25 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK DL322 score=25 tier=amber delay=22
[rescore] [28/1409] CM812 2026-06-09
[rescore] CM812 2026-06-09 JFK->PTY
[flightStatus] number lookup "CM812" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching PTY (KPTY)
[carrierHealth] computing CM
[carrierHealth] CM sample=1 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] JFK active programs: Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 10 airports
[flightStatus] CM812 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] CM812 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 19:32Z","local":"2026-06-09 15:32-04:00"},"revisedTime":{"utc":"2026-06-09 19:43Z","local":"2026-06-09 15:43-04:00"},"runwayTime":{"utc":"2026-06-09 19:43Z","local":"2026-06-09 15:43-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] CM812 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 19:32Z","revisedTime":"2026-06-09 19:43Z","runwayTime":"2026-06-09 19:43Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for CM812
[flightStatus] CM812 2026-06-09 status=EnRoute dep_delay=11 inbound_delay=0 cancelled=false
[weather] fetch failed for KPTY: Unexpected end of JSON input
[riskScorer] CM812 2026-06-09 horizon=short hours_out=-1132.8 raw_total=25 tier=amber cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":0,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK CM812 score=25 tier=amber delay=11
[rescore] [29/1409] NO785 2026-06-09
[rescore] NO785 2026-06-09 JFK->PMO
[flightStatus] number lookup "NO785" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching PMO (KPMO)
[carrierHealth] computing NO
[carrierHealth] NO sample=1 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[nasStatus] JFK active programs: Departure Delay avgDelay=0min
[weather] fetch failed for KPMO: Unexpected end of JSON input
[flightStatus] NO785 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] NO785 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 21:00Z","local":"2026-06-09 17:00-04:00"},"revisedTime":{"utc":"2026-06-09 21:20Z","local":"2026-06-09 17:20-04:00"},"runwayTime":{"utc":"2026-06-09 21:20Z","local":"2026-06-09 17:20-04:00"},"terminal":"1","runway":"22R","quality":["Basic","Live"]}
[flightStatus] NO785 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 21:00Z","revisedTime":"2026-06-09 21:20Z","runwayTime":"2026-06-09 21:20Z","terminal":"1","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for NO785
[flightStatus] NO785 2026-06-09 status=EnRoute dep_delay=20 inbound_delay=0 cancelled=false
[riskScorer] NO785 2026-06-09 horizon=short hours_out=-1131.3 raw_total=35 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":0,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK NO785 score=35 tier=amber delay=20
[rescore] [30/1409] DL3026 2026-06-09
[rescore] DL3026 2026-06-09 ATL->HSV
[flightStatus] number lookup "DL3026" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching HSV (KHSV)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] DL3026 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL3026 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 19:30Z","local":"2026-06-09 15:30-04:00"},"revisedTime":{"utc":"2026-06-09 19:45Z","local":"2026-06-09 15:45-04:00"},"runwayTime":{"utc":"2026-06-09 19:45Z","local":"2026-06-09 15:45-04:00"},"terminal":"S","quality":["Basic","Live"]}
[flightStatus] DL3026 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 19:30Z","revisedTime":"2026-06-09 19:45Z","runwayTime":"2026-06-09 19:45Z","terminal":"S","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 15min for DL3026
[flightStatus] DL3026 2026-06-09 status=Arrived dep_delay=15 inbound_delay=0 cancelled=false
[weather] HSV cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] DL3026 2026-06-09 horizon=short hours_out=-1132.8 raw_total=19 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK DL3026 score=19 tier=green delay=15
[rescore] [31/1409] DL5105 2026-06-09
[rescore] DL5105 2026-06-09 ATL->CRW
[flightStatus] number lookup "DL5105" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching CRW (KCRW)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] CRW cat=VFR vis=10 ceil=18000 ts=false fz=false contrib=2
[flightStatus] DL5105 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL5105 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 20:45Z","local":"2026-06-09 16:45-04:00"},"revisedTime":{"utc":"2026-06-09 20:57Z","local":"2026-06-09 16:57-04:00"},"runwayTime":{"utc":"2026-06-09 20:57Z","local":"2026-06-09 16:57-04:00"},"terminal":"S","runway":"08R","quality":["Basic","Live"]}
[flightStatus] DL5105 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 20:45Z","revisedTime":"2026-06-09 20:57Z","runwayTime":"2026-06-09 20:57Z","terminal":"S","runway":"08R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 12min for DL5105
[flightStatus] DL5105 2026-06-09 status=Arrived dep_delay=12 inbound_delay=0 cancelled=false
[riskScorer] DL5105 2026-06-09 horizon=short hours_out=-1131.5 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK DL5105 score=21 tier=green delay=12
[rescore] [32/1409] DL2086 2026-06-09
[rescore] DL2086 2026-06-09 ATL->DSM
[flightStatus] number lookup "DL2086" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching DSM (KDSM)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] DSM cat=VFR vis=10 ceil=17000 ts=false fz=false contrib=2
[flightStatus] DL2086 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] DL2086 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 22:11Z","local":"2026-06-09 18:11-04:00"},"revisedTime":{"utc":"2026-06-09 22:11Z","local":"2026-06-09 18:11-04:00"},"runwayTime":{"utc":"2026-06-09 22:11Z","local":"2026-06-09 18:11-04:00"},"quality":["Basic","Live"]}
[flightStatus] DL2086 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 22:11Z","revisedTime":"2026-06-09 22:11Z","runwayTime":"2026-06-09 22:11Z","quality":["Basic","Live"]}
[flightStatus] computed inbound delay from revisedTime: 68min for DL2086
[flightStatus] DL2086 2026-06-09 status=Arrived dep_delay=0 inbound_delay=68 cancelled=false
[riskScorer] DL2086 2026-06-09 horizon=short hours_out=-1130.1 raw_total=53 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK DL2086 score=53 tier=amber delay=0
[rescore] [33/1409] OO6200 2026-06-09
[rescore] OO6200 2026-06-09 ORD->BNA
[flightStatus] number lookup "OO6200" 2026-06-09
[weather] fetching ORD (KORD)
[weather] fetching BNA (KBNA)
[carrierHealth] cache hit OO
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[flightStatus] OO6200 dep keys: airport,scheduledTime,terminal,quality
[flightStatus] OO6200 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 18:36Z","local":"2026-06-09 13:36-05:00"},"terminal":"3","quality":["Basic"]}
[flightStatus] OO6200 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 18:36Z","terminal":"3","quality":["Basic"]}
[flightStatus] OO6200 2026-06-09 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[weather] BNA cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] OO6200 2026-06-09 horizon=short hours_out=-1133.7 raw_total=60 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":10,"historicalOtp":2,"timeOfDayRisk":2,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK OO6200 score=75 tier=red delay=0
[rescore] [34/1409] UA5591 2026-06-09
[rescore] UA5591 2026-06-09 ORD->YYZ
[flightStatus] number lookup "UA5591" 2026-06-09
[weather] fetching ORD (KORD)
[weather] fetching YYZ (CYYZ)
[carrierHealth] cache hit UA
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] UA5591 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] UA5591 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 21:37Z","local":"2026-06-09 16:37-05:00"},"revisedTime":{"utc":"2026-06-09 22:13Z","local":"2026-06-09 17:13-05:00"},"runwayTime":{"utc":"2026-06-09 22:13Z","local":"2026-06-09 17:13-05:00"},"terminal":"2","runway":"27L","quality":["Basic","Live"]}
[flightStatus] UA5591 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 21:37Z","revisedTime":"2026-06-09 22:13Z","runwayTime":"2026-06-09 22:13Z","terminal":"2","runway":"27L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for UA5591
[flightStatus] UA5591 2026-06-09 status=Arrived dep_delay=36 inbound_delay=0 cancelled=false
[weather] YYZ cat=VFR vis=15 ceil=7000 ts=false fz=false contrib=2
[riskScorer] UA5591 2026-06-09 horizon=short hours_out=-1130.7 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK UA5591 score=41 tier=amber delay=36
[rescore] [35/1409] UA2417 2026-06-09
[rescore] UA2417 2026-06-09 ORD->YUL
[flightStatus] number lookup "UA2417" 2026-06-09
[weather] fetching ORD (KORD)
[weather] fetching YUL (CYUL)
[carrierHealth] cache hit UA
[weather] ORD cat=VFR vis=10 ceil=5500 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[weather] YUL cat=VFR vis=30 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[flightStatus] UA2417 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] UA2417 dep RAW: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-09 23:04Z","local":"2026-06-09 18:04-05:00"},"revisedTime":{"utc":"2026-06-09 23:39Z","local":"2026-06-09 18:39-05:00"},"runwayTime":{"utc":"2026-06-09 23:39Z","local":"2026-06-09 18:39-05:00"},"terminal":"1","quality":["Basic","Live"]}
[flightStatus] UA2417 dep extracted: {"airport":{"icao":"KORD","iata":"ORD","name":"Chicago O'Hare","shortName":"O'Hare","municipalityName":"Chicago","location":{"lat":41.9786,"lon":-87.9048},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-09 23:04Z","revisedTime":"2026-06-09 23:39Z","runwayTime":"2026-06-09 23:39Z","terminal":"1","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 35min for UA2417
[flightStatus] UA2417 2026-06-09 status=Arrived dep_delay=35 inbound_delay=0 cancelled=false
[riskScorer] UA2417 2026-06-09 horizon=short hours_out=-1129.2 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK UA2417 score=41 tier=amber delay=35
[rescore] [36/1409] DL951 2026-06-09
[rescore] DL951 2026-06-09 LAX->JFK
[flightStatus] number lookup "DL951" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching JFK (KJFK)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 10 airports
[nasStatus] JFK active programs: Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 10 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL951 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL951 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-09 17:00Z","local":"2026-06-09 10:00-07:00"},"revisedTime":{"utc":"2026-06-09 22:43Z","local":"2026-06-09 15:43-07:00"},"runwayTime":{"utc":"2026-06-09 22:43Z","local":"2026-06-09 15:43-07:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] DL951 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-09 17:00Z","revisedTime":"2026-06-09 22:43Z","runwayTime":"2026-06-09 22:43Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 343min for DL951
[flightStatus] computed inbound delay from revisedTime: 312min for DL951
[flightStatus] DL951 2026-06-09 status=Arrived dep_delay=343 inbound_delay=312 cancelled=false
[riskScorer] DL951 2026-06-09 horizon=short hours_out=-1135.3 raw_total=54 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":1,"dayOfWeekRisk":0,"connectionRisk":2}
[rescore] OK DL951 score=54 tier=amber delay=343
[rescore] [37/1409] XE323 2026-06-09
[rescore] XE323 2026-06-09 LAX->LAS
[flightStatus] number lookup "XE323" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching LAS (KLAS)
[carrierHealth] computing XE
[carrierHealth] XE sample=1 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] LAS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[flightStatus] XE323 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] XE323 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-10 00:00Z","local":"2026-06-09 17:00-07:00"},"revisedTime":{"utc":"2026-06-10 00:29Z","local":"2026-06-09 17:29-07:00"},"runwayTime":{"utc":"2026-06-10 00:29Z","local":"2026-06-09 17:29-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] XE323 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-10 00:00Z","revisedTime":"2026-06-10 00:29Z","runwayTime":"2026-06-10 00:29Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 29min for XE323
[flightStatus] computed inbound delay from revisedTime: 44min for XE323
[flightStatus] XE323 2026-06-09 status=Arrived dep_delay=29 inbound_delay=44 cancelled=false
[riskScorer] XE323 2026-06-09 horizon=short hours_out=-1128.3 raw_total=36 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK XE323 score=36 tier=amber delay=29
[rescore] [38/1409] AA6515 2026-06-09
[rescore] AA6515 2026-06-09 LAX->ABQ
[flightStatus] number lookup "AA6515" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching ABQ (KABQ)
[carrierHealth] cache hit AA
[weather] ABQ cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] AA6515 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA6515 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-10 01:30Z","local":"2026-06-09 18:30-07:00"},"revisedTime":{"utc":"2026-06-10 01:38Z","local":"2026-06-09 18:38-07:00"},"runwayTime":{"utc":"2026-06-10 01:38Z","local":"2026-06-09 18:38-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA6515 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-10 01:30Z","revisedTime":"2026-06-10 01:38Z","runwayTime":"2026-06-10 01:38Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 8min for AA6515
[flightStatus] AA6515 2026-06-09 status=Arrived dep_delay=8 inbound_delay=0 cancelled=false
[riskScorer] AA6515 2026-06-09 horizon=short hours_out=-1126.8 raw_total=17 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK AA6515 score=17 tier=green delay=8
[rescore] [39/1409] LA533 2026-06-09
[rescore] LA533 2026-06-09 JFK->SCL
[flightStatus] number lookup "LA533" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching SCL (KSCL)
[carrierHealth] computing LA
[carrierHealth] LA sample=1 cancelRate=0.000 avgDelay=0.0 healthScore=3 reliable=false
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] JFK active programs: Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 10 airports
[weather] fetch failed for KSCL: Unexpected end of JSON input
[flightStatus] LA533 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] LA533 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 23:50Z","local":"2026-06-09 19:50-04:00"},"revisedTime":{"utc":"2026-06-10 00:10Z","local":"2026-06-09 20:10-04:00"},"runwayTime":{"utc":"2026-06-10 00:10Z","local":"2026-06-09 20:10-04:00"},"terminal":"4","runway":"22R","quality":["Basic","Live"]}
[flightStatus] LA533 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 23:50Z","revisedTime":"2026-06-10 00:10Z","runwayTime":"2026-06-10 00:10Z","terminal":"4","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 20min for LA533
[flightStatus] LA533 2026-06-09 status=Departed dep_delay=20 inbound_delay=0 cancelled=false
[riskScorer] LA533 2026-06-09 horizon=short hours_out=-1128.5 raw_total=35 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":0,"carrierHealth":3,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK LA533 score=35 tier=amber delay=20
[rescore] [40/1409] DL212 2026-06-09
[rescore] DL212 2026-06-09 JFK->ATH
[flightStatus] number lookup "DL212" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching ATH (KATH)
[carrierHealth] cache hit DL
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[nasStatus] JFK active programs: Departure Delay avgDelay=0min
[weather] fetch failed for KATH: Unexpected end of JSON input
[flightStatus] DL212 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL212 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-10 00:25Z","local":"2026-06-09 20:25-04:00"},"revisedTime":{"utc":"2026-06-10 01:55Z","local":"2026-06-09 21:55-04:00"},"runwayTime":{"utc":"2026-06-10 01:55Z","local":"2026-06-09 21:55-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL212 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-10 00:25Z","revisedTime":"2026-06-10 01:55Z","runwayTime":"2026-06-10 01:55Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 90min for DL212
[flightStatus] computed inbound delay from revisedTime: 26min for DL212
[flightStatus] DL212 2026-06-09 status=Arrived dep_delay=90 inbound_delay=26 cancelled=false
[riskScorer] DL212 2026-06-09 horizon=short hours_out=-1127.9 raw_total=50 tier=amber cancelled=false signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":0,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK DL212 score=50 tier=amber delay=90
[rescore] [41/1409] DL5481 2026-06-09
[rescore] DL5481 2026-06-09 JFK->BTV
[flightStatus] number lookup "DL5481" 2026-06-09
[weather] fetching JFK (KJFK)
[weather] fetching BTV (KBTV)
[carrierHealth] cache hit DL
[weather] JFK cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] JFK active programs: Departure Delay avgDelay=0min
[nasStatus] fetched airport-events: 10 airports
[weather] BTV cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[flightStatus] DL5481 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL5481 dep RAW: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-10 02:29Z","local":"2026-06-09 22:29-04:00"},"revisedTime":{"utc":"2026-06-10 02:34Z","local":"2026-06-09 22:34-04:00"},"runwayTime":{"utc":"2026-06-10 02:34Z","local":"2026-06-09 22:34-04:00"},"terminal":"4","quality":["Basic","Live"]}
[flightStatus] DL5481 dep extracted: {"airport":{"icao":"KJFK","iata":"JFK","name":"New York John F Kennedy","shortName":"John F Kennedy","municipalityName":"New York","location":{"lat":40.6398,"lon":-73.7789},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-10 02:29Z","revisedTime":"2026-06-10 02:34Z","runwayTime":"2026-06-10 02:34Z","terminal":"4","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 5min for DL5481
[flightStatus] DL5481 2026-06-09 status=Arrived dep_delay=5 inbound_delay=0 cancelled=false
[riskScorer] DL5481 2026-06-09 horizon=short hours_out=-1125.8 raw_total=19 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK DL5481 score=19 tier=green delay=5
[rescore] [42/1409] AA2709 2026-06-09
[rescore] AA2709 2026-06-09 DFW->PSP
[flightStatus] number lookup "AA2709" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching PSP (KPSP)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] PSP cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA2709 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA2709 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-10 00:39Z","local":"2026-06-09 19:39-05:00"},"revisedTime":{"utc":"2026-06-10 01:05Z","local":"2026-06-09 20:05-05:00"},"runwayTime":{"utc":"2026-06-10 01:05Z","local":"2026-06-09 20:05-05:00"},"runway":"18L","quality":["Basic","Live"]}
[flightStatus] AA2709 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-10 00:39Z","revisedTime":"2026-06-10 01:05Z","runwayTime":"2026-06-10 01:05Z","runway":"18L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 26min for AA2709
[flightStatus] AA2709 2026-06-09 status=Arrived dep_delay=26 inbound_delay=0 cancelled=false
[riskScorer] AA2709 2026-06-09 horizon=short hours_out=-1127.7 raw_total=25 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK AA2709 score=25 tier=amber delay=26
[rescore] [43/1409] AA1797 2026-06-09
[rescore] AA1797 2026-06-09 DFW->LAS
[flightStatus] number lookup "AA1797" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching LAS (KLAS)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] AA1797 dep keys: airport,scheduledTime,revisedTime,runwayTime,quality
[flightStatus] AA1797 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":{"utc":"2026-06-10 01:51Z","local":"2026-06-09 20:51-05:00"},"revisedTime":{"utc":"2026-06-10 02:13Z","local":"2026-06-09 21:13-05:00"},"runwayTime":{"utc":"2026-06-10 02:13Z","local":"2026-06-09 21:13-05:00"},"quality":["Basic","Live"]}
[flightStatus] AA1797 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"scheduledTime":"2026-06-10 01:51Z","revisedTime":"2026-06-10 02:13Z","runwayTime":"2026-06-10 02:13Z","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 22min for AA1797
[flightStatus] AA1797 2026-06-09 status=Arrived dep_delay=22 inbound_delay=0 cancelled=false
[weather] LAS cat=VFR vis=10 ceil=12000 ts=false fz=false contrib=2
[riskScorer] AA1797 2026-06-09 horizon=short hours_out=-1126.5 raw_total=25 tier=amber cancelled=false signals={"inboundAircraftDelay":16,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK AA1797 score=25 tier=amber delay=22
[rescore] [44/1409] AA5044 2026-06-09
[rescore] AA5044 2026-06-09 DFW->JAN
[flightStatus] number lookup "AA5044" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching JAN (KJAN)
[carrierHealth] cache hit AA
[weather] DFW cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] AA5044 dep keys: airport,quality
[flightStatus] AA5044 dep RAW: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"quality":[]}
[flightStatus] AA5044 dep extracted: {"airport":{"icao":"KDFW","iata":"DFW","name":"Dallas-Fort Worth","shortName":"Dallas-Fort Worth","municipalityName":"Dallas-Fort Worth","location":{"lat":32.8968,"lon":-97.038},"countryCode":"US","timeZone":"America/Chicago"},"quality":[]}
[flightStatus] AA5044 2026-06-09 status=Arrived dep_delay=0 inbound_delay=0 cancelled=false
[weather] JAN cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] AA5044 2026-06-09 horizon=short hours_out=-1129.6 raw_total=16 tier=green cancelled=false signals={"inboundAircraftDelay":0,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK AA5044 score=16 tier=green delay=0
[rescore] [45/1409] DL74 2026-06-09
[rescore] DL74 2026-06-09 ATL->AMS
[flightStatus] number lookup "DL74" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching AMS (EHAM)
[carrierHealth] cache hit DL
[nasStatus] fetched airport-events: 10 airports
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[weather] AMS cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL74 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL74 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 23:45Z","local":"2026-06-09 19:45-04:00"},"revisedTime":{"utc":"2026-06-09 23:52Z","local":"2026-06-09 19:52-04:00"},"runwayTime":{"utc":"2026-06-09 23:52Z","local":"2026-06-09 19:52-04:00"},"terminal":"I","runway":"09L","quality":["Basic","Live"]}
[flightStatus] DL74 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 23:45Z","revisedTime":"2026-06-09 23:52Z","runwayTime":"2026-06-09 23:52Z","terminal":"I","runway":"09L","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 7min for DL74
[flightStatus] DL74 2026-06-09 status=Arrived dep_delay=7 inbound_delay=0 cancelled=false
[riskScorer] DL74 2026-06-09 horizon=short hours_out=-1128.6 raw_total=21 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK DL74 score=21 tier=green delay=7
[rescore] [46/1409] DL1320 2026-06-09
[rescore] DL1320 2026-06-09 ATL->CLE
[flightStatus] number lookup "DL1320" 2026-06-09
[weather] fetching ATL (KATL)
[weather] fetching CLE (KCLE)
[carrierHealth] cache hit DL
[weather] ATL cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[flightStatus] DL1320 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL1320 dep RAW: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-10 02:49Z","local":"2026-06-09 22:49-04:00"},"revisedTime":{"utc":"2026-06-10 02:54Z","local":"2026-06-09 22:54-04:00"},"runwayTime":{"utc":"2026-06-10 02:54Z","local":"2026-06-09 22:54-04:00"},"terminal":"S","runway":"08R","quality":["Basic","Live"]}
[flightStatus] DL1320 dep extracted: {"airport":{"icao":"KATL","iata":"ATL","name":"Atlanta Hartsfield Jackson","shortName":"Hartsfield Jackson","municipalityName":"Atlanta","location":{"lat":33.6367,"lon":-84.4281},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-10 02:49Z","revisedTime":"2026-06-10 02:54Z","runwayTime":"2026-06-10 02:54Z","terminal":"S","runway":"08R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 5min for DL1320
[flightStatus] DL1320 2026-06-09 status=Arrived dep_delay=5 inbound_delay=0 cancelled=false
[weather] CLE cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[riskScorer] DL1320 2026-06-09 horizon=short hours_out=-1125.5 raw_total=14 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK DL1320 score=14 tier=green delay=5
[rescore] [47/1409] DL4148 2026-06-09
[rescore] DL4148 2026-06-09 LAX->BOI
[flightStatus] number lookup "DL4148" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching BOI (KBOI)
[carrierHealth] cache hit DL
[weather] BOI cat=IFR vis=2.5 ceil=3000 ts=false fz=false contrib=18
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] DL4148 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,quality
[flightStatus] DL4148 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-10 02:59Z","local":"2026-06-09 19:59-07:00"},"revisedTime":{"utc":"2026-06-10 03:35Z","local":"2026-06-09 20:35-07:00"},"runwayTime":{"utc":"2026-06-10 03:35Z","local":"2026-06-09 20:35-07:00"},"terminal":"3","quality":["Basic","Live"]}
[flightStatus] DL4148 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-10 02:59Z","revisedTime":"2026-06-10 03:35Z","runwayTime":"2026-06-10 03:35Z","terminal":"3","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 36min for DL4148
[flightStatus] computed inbound delay from revisedTime: 10min for DL4148
[flightStatus] DL4148 2026-06-09 status=Arrived dep_delay=36 inbound_delay=10 cancelled=false
[riskScorer] DL4148 2026-06-09 horizon=short hours_out=-1125.3 raw_total=43 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":10,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK DL4148 score=43 tier=amber delay=36
[rescore] [48/1409] AA4908 2026-06-09
[rescore] AA4908 2026-06-09 LAX->SMF
[flightStatus] number lookup "AA4908" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching SMF (KSMF)
[carrierHealth] cache hit AA
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[weather] SMF cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[flightStatus] AA4908 dep keys: airport,scheduledTime,quality
[flightStatus] AA4908 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-10 04:50Z","local":"2026-06-09 21:50-07:00"},"quality":["Basic"]}
[flightStatus] AA4908 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-10 04:50Z","quality":["Basic"]}
[flightStatus] AA4908 2026-06-09 status=Cancelled dep_delay=0 inbound_delay=0 cancelled=true
[riskScorer] AA4908 2026-06-09 horizon=short hours_out=-1123.5 raw_total=49 tier=red cancelled=true signals={"inboundAircraftDelay":40,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK AA4908 score=75 tier=red delay=0
[rescore] [49/1409] AA1221 2026-06-09
[rescore] AA1221 2026-06-09 LAX->MIA
[flightStatus] number lookup "AA1221" 2026-06-09
[weather] fetching LAX (KLAX)
[weather] fetching MIA (KMIA)
[carrierHealth] cache hit AA
[weather] LAX cat=VFR vis=10 ceil=99999 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[nasStatus] MIA active programs: Departure Delay avgDelay=0min
[weather] MIA cat=VFR vis=10 ceil=25000 ts=false fz=false contrib=2
[flightStatus] AA1221 dep keys: airport,scheduledTime,revisedTime,runwayTime,runway,quality
[flightStatus] AA1221 dep RAW: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":{"utc":"2026-06-10 06:17Z","local":"2026-06-09 23:17-07:00"},"revisedTime":{"utc":"2026-06-10 06:28Z","local":"2026-06-09 23:28-07:00"},"runwayTime":{"utc":"2026-06-10 06:28Z","local":"2026-06-09 23:28-07:00"},"runway":"25R","quality":["Basic","Live"]}
[flightStatus] AA1221 dep extracted: {"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles","shortName":"Los Angeles","municipalityName":"Los Angeles","location":{"lat":33.9425,"lon":-118.408},"countryCode":"US","timeZone":"America/Los_Angeles"},"scheduledTime":"2026-06-10 06:17Z","revisedTime":"2026-06-10 06:28Z","runwayTime":"2026-06-10 06:28Z","runway":"25R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 11min for AA1221
[flightStatus] AA1221 2026-06-09 status=Arrived dep_delay=11 inbound_delay=0 cancelled=false
[riskScorer] AA1221 2026-06-09 horizon=short hours_out=-1122.0 raw_total=22 tier=green cancelled=false signals={"inboundAircraftDelay":8,"atcGroundStop":0,"atcGroundDelay":5,"originWeather":2,"destinationWeather":1,"carrierHealth":4,"historicalOtp":2,"timeOfDayRisk":0,"dayOfWeekRisk":0,"connectionRisk":0}
[rescore] OK AA1221 score=22 tier=green delay=11
[rescore] [50/1409] DL324 2026-06-09
[rescore] DL324 2026-06-09 BOS->SEA
[flightStatus] number lookup "DL324" 2026-06-09
[weather] fetching BOS (KBOS)
[weather] fetching SEA (KSEA)
[carrierHealth] cache hit DL
[weather] SEA cat=VFR vis=10 ceil=5000 ts=false fz=false contrib=2
[nasStatus] fetched airport-events: 10 airports
[nasStatus] fetched airport-events: 10 airports
[weather] BOS cat=VFR vis=10 ceil=10000 ts=false fz=false contrib=2
[flightStatus] DL324 dep keys: airport,scheduledTime,revisedTime,runwayTime,terminal,runway,quality
[flightStatus] DL324 dep RAW: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":{"utc":"2026-06-09 23:25Z","local":"2026-06-09 19:25-04:00"},"revisedTime":{"utc":"2026-06-10 00:05Z","local":"2026-06-09 20:05-04:00"},"runwayTime":{"utc":"2026-06-10 00:05Z","local":"2026-06-09 20:05-04:00"},"terminal":"A","runway":"22R","quality":["Basic","Live"]}
[flightStatus] DL324 dep extracted: {"airport":{"icao":"KBOS","iata":"BOS","name":"Boston General Edward Lawrence Logan","shortName":"General Edward Lawrence Logan","municipalityName":"Boston","location":{"lat":42.3643,"lon":-71.0052},"countryCode":"US","timeZone":"America/New_York"},"scheduledTime":"2026-06-09 23:25Z","revisedTime":"2026-06-10 00:05Z","runwayTime":"2026-06-10 00:05Z","terminal":"A","runway":"22R","quality":["Basic","Live"]}
[flightStatus] computed delay from revisedTime: 40min for DL324
[flightStatus] DL324 2026-06-09 status=Arrived dep_delay=40 inbound_delay=0 cancelled=false
[riskScorer] DL324 2026-06-09 horizon=short hours_out=-1128.9 raw_total=41 tier=amber cancelled=false signals={"inboundAircraftDelay":28,"atcGroundStop":0,"atcGroundDelay":0,"originWeather":2,"destinationWeather":1,"carrierHealth":1,"historicalOtp":2,"timeOfDayRisk":4,"dayOfWeekRisk":0,"connectionRisk":3}
[rescore] OK DL324 score=41 tier=amber delay=40
[rescore] [51/1409] MQ3651 2026-06-09
[rescore] MQ3651 2026-06-09 DFW->MAF
[flightStatus] number lookup "MQ3651" 2026-06-09
[weather] fetching DFW (KDFW)
[weather] fetching MAF (KMAF)
[carrierHealth] cache hit MQ