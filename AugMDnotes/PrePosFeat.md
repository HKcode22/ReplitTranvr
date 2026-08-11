Body
application/jsonapplication/xml

application/json
Flight notification contract

flights
array[object]
required
Modified/created flight notification

notificationSummary
string or null
Human-readable summary of the flight status update

notificationRemark
string or null
Human-readable remark to the flight status update

greatCircleDistance
object
meter
number<double>
required
Distance in meters

km
number<double>
required
Distance in kilometers

mile
number<double>
required
Distance in statute miles

nm
number<double>
required
Distance in nautical miles

feet
number<double>
required
Distance in feet

departure
object
required
Flight arrival or departure information

airport
object
required
Airport information

icao
string or null
ICAO code of the airport

iata
string or null
IATA code of the airport

localCode
string or null
Code of the airport within the local or national codification system

name
string
required
Name of the airport

>= 1 characters
shortName
string or null
Shortened name of the airport

municipalityName
string or null
Name of the municipality this airport belongs to

location
object
Location of the airport

lat
number<float>
required
Latitude, in degrees

>= -90
<= 90
lon
number<float>
required
Longitude, in degrees

>= -180
<= 180
countryCode
string or null
Two-letter country code of the airport

timeZone
string or null
Time zone of the airport in Olson format (e.g. "Europe/Amsterdam")

scheduledTime
object
Scheduled time of arrival or departure of the flight

utc
string<date-time>
required
UTC-time

local
string<date-time>
required
Local time

revisedTime
object
Actual /estimated time of arrival or departure the flight. If RunwayTime is specified and not equal to this field, this field stands for the time of departure/arrival to the gate. Otherwise, it may either be time at the gate or on the runway.

utc
string<date-time>
required
UTC-time

local
string<date-time>
required
Local time

predictedTime
object
Predicted time based on historical data (experimental). May significantly differ from RevisedTime. Only available for non-complete or unknown-status flights arriving, departing within a week and only via Flight Status endpoint. For arriving flights: Predicted time of arrival based on departure time. Not available if departure times are unavailable. For departing flights: Predicted time of departure based on arrival time. Only available if departure times are unavailable.

utc
string<date-time>
required
UTC-time

local
string<date-time>
required
Local time

runwayTime
object
Actual / estimated time on the runway: landing time for arriving flight; take-off time for the departing flight, if known.

utc
string<date-time>
required
UTC-time

local
string<date-time>
required
Local time

terminal
string or null
Terminal of the flight

checkInDesk
string or null
Check-in desk(s) for the flight (only for departing flights)

gate
string or null
Gate of (de)boarding for the flight

baggageBelt
string or null
Baggage belt(s) for the flight (only for arriving flights)

runway
string or null
Runway of landing (for arriving flights) or take-off (for departing flights), if known.

quality
array[string]
required
Array of quality characteristics of the data. Check this to know which information you can expect within this contract (basic, live and/or approximate data).

Allowed values:
Basic
Live
Approximate
arrival
object
required
Flight arrival or departure information

airport
object
required
Airport information

icao
string or null
ICAO code of the airport

iata
string or null
IATA code of the airport

localCode
string or null
Code of the airport within the local or national codification system

name
string
required
Name of the airport

>= 1 characters
shortName
string or null
Shortened name of the airport

municipalityName
string or null
Name of the municipality this airport belongs to

location
object
Location of the airport

lat
number<float>
required
Latitude, in degrees

>= -90
<= 90
lon
number<float>
required
Longitude, in degrees

>= -180
<= 180
countryCode
string or null
Two-letter country code of the airport

timeZone
string or null
Time zone of the airport in Olson format (e.g. "Europe/Amsterdam")

scheduledTime
object
Scheduled time of arrival or departure of the flight

utc
string<date-time>
required
UTC-time

local
string<date-time>
required
Local time

revisedTime
object
Actual /estimated time of arrival or departure the flight. If RunwayTime is specified and not equal to this field, this field stands for the time of departure/arrival to the gate. Otherwise, it may either be time at the gate or on the runway.

utc
string<date-time>
required
UTC-time

local
string<date-time>
required
Local time

predictedTime
object
Predicted time based on historical data (experimental). May significantly differ from RevisedTime. Only available for non-complete or unknown-status flights arriving, departing within a week and only via Flight Status endpoint. For arriving flights: Predicted time of arrival based on departure time. Not available if departure times are unavailable. For departing flights: Predicted time of departure based on arrival time. Only available if departure times are unavailable.

utc
string<date-time>
required
UTC-time

local
string<date-time>
required
Local time

runwayTime
object
Actual / estimated time on the runway: landing time for arriving flight; take-off time for the departing flight, if known.

utc
string<date-time>
required
UTC-time

local
string<date-time>
required
Local time

terminal
string or null
Terminal of the flight

checkInDesk
string or null
Check-in desk(s) for the flight (only for departing flights)

gate
string or null
Gate of (de)boarding for the flight

baggageBelt
string or null
Baggage belt(s) for the flight (only for arriving flights)

runway
string or null
Runway of landing (for arriving flights) or take-off (for departing flights), if known.

quality
array[string]
required
Array of quality characteristics of the data. Check this to know which information you can expect within this contract (basic, live and/or approximate data).

Allowed values:
Basic
Live
Approximate
flightPlan
object
Flight plan contract

flightRules
string
Allowed values:
IFR
VFR
flightType
string
Allowed values:
Other
General
Scheduled
NonScheduled
Military
revisionNo
integer<int32> or null
No. of revision of the flight plan

status
string
Allowed values:
Proposed
Active
Dropped
Cancelled
Completed
route
string
required
Route information for the flight as filed in the flight plan

>= 1 characters
altitude
object
Altitudes of the flight as filed in the flight plan and/or assigned by the ATC

requested
object
meter
number<double>
required
Distance in meters

km
number<double>
required
Distance in kilometers

mile
number<double>
required
Distance in statute miles

nm
number<double>
required
Distance in nautical miles

feet
number<double>
required
Distance in feet

assigned
object
meter
number<double>
required
Distance in meters

km
number<double>
required
Distance in kilometers

mile
number<double>
required
Distance in statute miles

nm
number<double>
required
Distance in nautical miles

feet
number<double>
required
Distance in feet

airspeed
object
Airspeed of the flight as filed in the flight plan and/or assigned by the ATC

requested
object
kt
number<double>
required
Speed in knots

kmPerHour
number<double>
required
Speed in km per hour

miPerHour
number<double>
required
Speed in miles per hour

meterPerSecond
number<double>
required
Speed in meters per second

assigned
object
kt
number<double>
required
Speed in knots

kmPerHour
number<double>
required
Speed in km per hour

miPerHour
number<double>
required
Speed in miles per hour

meterPerSecond
number<double>
required
Speed in meters per second

lastUpdatedUtc
string<date-time>
required
Time (UTC) of the latest known update to the flight plan

lastUpdatedUtc
string<date-time>
required
Time (UTC) of the latest update of flight information (excluding Location)

number
string
required
Flight Number

>= 1 characters
callSign
string or null
ATC call-sign of the flight

status
string
required
Flight progress status

Possible values:

0 - Unknown: Status is not available for this flight
1 - Expected: Expected
2 - EnRoute: En route
3 - CheckIn: Check-in is open
4 - Boarding: Boarding in progress / Last call
5 - GateClosed: Gate closed
6 - Departed: Departed
7 - Delayed: Delayed
8 - Approaching: On approach to destination
9 - Arrived: Arrived
10 - Canceled: Cancelled
11 - Diverted: Diverted to another destination
12 - CanceledUncertain: Status of the flight is uncertain, may be cancelled
Allowed values:
Unknown
Expected
EnRoute
CheckIn
Boarding
GateClosed
Departed
Delayed
Approaching
Arrived
Canceled
Diverted
CanceledUncertain
codeshareStatus
string
required
Flight code-share status

Possible values:

0 - Unknown: Code-sharing information is unavailable for this flight. Flight might be operated both by airline owning the flight number as well as by another airliner.
1 - IsOperator: Flight is operated by an airline owning the flight number (the same code)
2 - IsCodeshared: Flight is code-shared (operated by an airline other than airline owning the flight number)
Allowed values:
Unknown
IsOperator
IsCodeshared
isCargo
boolean
required
Is cargo flight

aircraft
object
Flight's aircraft reference contract

reg
string or null
Tail-number of the aircraft

modeS
string or null
ICAO 24 bit Mode-S hexadecimal transponder address

model
string or null
Aircraft name and model

image
object
Aircraft photo. Either actual (possible if aircraft registration is provided) or approximate based on airline name and model combination. Image data with medium-sized direct image URL and licence approved for commercial use is returned.

url
string
required
URL of the resource

>= 1 characters
webUrl
string or null
URL of web-page containing the resource

author
string or null
Author name of the resource

title
string or null
Title of the resource

description
string or null
Description of the resource

license
string
required
Possible values:

0 - AllRightsReserved: All Rights Reserved.
1 - AttributionNoncommercialShareAlikeCC: Creative Commons: Attribution Non-Commercial, Share-alike License.
2 - AttributionNoncommercialCC: Creative Commons: Attribution Non-Commercial License.
3 - AttributionNoncommercialNoDerivativesCC: Creative Commons: Attribution Non-Commercial, No Derivatives License.
4 - AttributionCC: Creative Commons: Attribution License.
5 - AttributionShareAlikeCC: Creative Commons: Attribution Share-alike License.
6 - AttributionNoDerivativesCC: Creative Commons: Attribution No Derivatives License.
7 - NoKnownCopyrightRestrictions: No Known Copyright Resitrctions (Flickr Commons).
8 - UnitedStatesGovernmentWork: United States Government Work
9 - PublicDomainDedicationCC0: Public Domain Dedication, CC0
10 - PublicDomainMark: Public Domain Mark
Allowed values:
AllRightsReserved
AttributionNoncommercialShareAlikeCC
AttributionNoncommercialCC
AttributionNoncommercialNoDerivativesCC
AttributionCC
AttributionShareAlikeCC
AttributionNoDerivativesCC
NoKnownCopyrightRestrictions
UnitedStatesGovernmentWork
PublicDomainDedicationCC0
PublicDomainMark
htmlAttributions
array[string] or null
Attributions maintaining copyright, ownership and other legal information adjusted for displaying as HTML. Each element represent one line.

airline
object
Flight's airline reference conract

name
string
required
Airline name

>= 1 characters
iata
string or null
IATA code of the airline

icao
string or null
ICAO code of the airline

location
object
Positional information about flight: location, altitude, speed and track

pressureAltitude
object
required
Pressure altitude adjusted to ISA

meter
number<double>
required
Distance in meters

km
number<double>
required
Distance in kilometers

mile
number<double>
required
Distance in statute miles

nm
number<double>
required
Distance in nautical miles

feet
number<double>
required
Distance in feet

altitude
object
required
Altitude adjusted to pressure setting (QNH) Gives approximately the altitude above mean sea level (MSL)

meter
number<double>
required
Distance in meters

km
number<double>
required
Distance in kilometers

mile
number<double>
required
Distance in statute miles

nm
number<double>
required
Distance in nautical miles

feet
number<double>
required
Distance in feet

pressure
object
required
Pressure setting (QNH) used to calculate altitude from pressure altitude

hPa
number<double>
required
Pressure in hectopascals

inHg
number<double>
required
Pressure in inches mercury

mmHg
number<double>
required
Pressure in millimeters mercury

groundSpeed
object
required
Ground speed

kt
number<double>
required
Speed in knots

kmPerHour
number<double>
required
Speed in km per hour

miPerHour
number<double>
required
Speed in miles per hour

meterPerSecond
number<double>
required
Speed in meters per second

trueTrack
object
required
True track

deg
number<double>
required
Angle in degrees (between 0 and 360)

>= 0
<= 360
rad
number<double>
required
Angle in radians (0 and 2 * Pi)

>= 0
<= 6.283185307179586
vsiFpm
integer<int32> or null
Vertical speed, in feet per minute Not set if unknown or zero.

reportedAtUtc
string<date-time>
required
Time (UTC) of when this positional data was reported

lat
number<float>
required
Latitude, in degrees

>= -90
<= 90
lon
number<float>
required
Longitude, in degrees

>= -180
<= 180
subscription
object
required
Describes subscription

id
string<uuid>
required
Identifier of a subscription. Use this ID to control the subscription in future (e.g. update or delete).

isActive
boolean
required
Specifies if the subscription is active

billingType
string
Flight alert subscription billing type

Possible values:

0 - LifetimeBased: Subscription billed upon creation based on the life-time with set expiration date-time (BEING DEPRECATED)
1 - CreditBased: Subscription with no expiration date, billed based on the amount of notifications sent
Allowed values:
LifetimeBased
CreditBased
activateBeforeUtc
string<date-time> or null
Time (UTC) before which subscription must be activated (may be applicable to some non-active newly created subscriptions)

expiresOnUtc
string<date-time> or null
Time (UTC) when subscription expires and will be removed.Show all...

createdOnUtc
string<date-time>
required
Time (UTC) when subscription was created

subject
object
required
Subscription subject (e.g. flight: such subscription will notify its consumer about flight updates).

type
string
required
Possible values:

0 - FlightByNumber
1 - FlightByAirportIcao
Allowed values:
FlightByNumber
FlightByAirportIcao
id
string or null
Subject ID of a subscription. Complements SubjectType.Show all...

subscriber
object
required
Subscription consumer: where notifications will be sent (e.g. web-hook with a URL)

type
string
required
Type of subscriber. Completemented by SubscriberId.

>= 1 characters
id
string
required
ID

>= 1 characters
notices
array[string] or null
Additional messages

balance
object
Represents the balance for all alert subscriptions associated with the user acount, including remaining credits and timestamps for the most recent refill and deduction operations.

creditsRemaining
integer<int64>
required
Alert credits remaining for the account.

lastRefilledUtc
string<date-time>
required
The datetime when the balance was last re-filled, in UTC.

lastDeductedUtc
string<date-time>
required
The datetime when the balance was last deducated, in UTC. Deduction typically occurs when an alert notification was dispatched for one of the alert subscriptions associated with the user account.

{
  "flights": [
    {
      "notificationSummary": "string",
      "notificationRemark": "string",
      "greatCircleDistance": {
        "meter": 0,
        "km": 0,
        "mile": 0,
        "nm": 0,
        "feet": 0
      },
      "departure": {
        "airport": {
          "icao": "string",
          "iata": "string",
          "localCode": "string",
          "name": "string",
          "shortName": "string",
          "municipalityName": "string",
          "location": {
            "lat": -90,
            "lon": -180
          },
          "countryCode": "string",
          "timeZone": "string"
        },
        "scheduledTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "revisedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "predictedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "runwayTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "terminal": "string",
        "checkInDesk": "string",
        "gate": "string",
        "baggageBelt": "string",
        "runway": "string",
        "quality": [
          "Basic"
        ]
      },
      "arrival": {
        "airport": {
          "icao": "string",
          "iata": "string",
          "localCode": "string",
          "name": "string",
          "shortName": "string",
          "municipalityName": "string",
          "location": {
            "lat": -90,
            "lon": -180
          },
          "countryCode": "string",
          "timeZone": "string"
        },
        "scheduledTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "revisedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "predictedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "runwayTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "terminal": "string",
        "checkInDesk": "string",
        "gate": "string",
        "baggageBelt": "string",
        "runway": "string",
        "quality": [
          "Basic"
        ]
      },
      "flightPlan": {
        "flightRules": "IFR",
        "flightType": "Other",
        "revisionNo": 0,
        "status": "Proposed",
        "route": "string",
        "altitude": {
          "requested": {
            "meter": 0,
            "km": 0,
            "mile": 0,
            "nm": 0,
            "feet": 0
          },
          "assigned": {
            "meter": 0,
            "km": 0,
            "mile": 0,
            "nm": 0,
            "feet": 0
          }
        },
        "airspeed": {
          "requested": {
            "kt": 0,
            "kmPerHour": 0,
            "miPerHour": 0,
            "meterPerSecond": 0
          },
          "assigned": {
            "kt": 0,
            "kmPerHour": 0,
            "miPerHour": 0,
            "meterPerSecond": 0
          }
        },
        "lastUpdatedUtc": "2019-08-24T14:15:22Z"
      },
      "lastUpdatedUtc": "2019-08-24T14:15:22Z",
      "number": "string",
      "callSign": "string",
      "status": "Unknown",
      "codeshareStatus": "Unknown",
      "isCargo": true,
      "aircraft": {
        "reg": "string",
        "modeS": "string",
        "model": "string",
        "image": {
          "url": "string",
          "webUrl": "string",
          "author": "string",
          "title": "string",
          "description": "string",
          "license": "AllRightsReserved",
          "htmlAttributions": [
            "string"
          ]
        }
      },
      "airline": {
        "name": "string",
        "iata": "string",
        "icao": "string"
      },
      "location": {
        "pressureAltitude": {
          "meter": 0,
          "km": 0,
          "mile": 0,
          "nm": 0,
          "feet": 0
        },
        "altitude": {
          "meter": 0,
          "km": 0,
          "mile": 0,
          "nm": 0,
          "feet": 0
        },
        "pressure": {
          "hPa": 0,
          "inHg": 0,
          "mmHg": 0
        },
        "groundSpeed": {
          "kt": 0,
          "kmPerHour": 0,
          "miPerHour": 0,
          "meterPerSecond": 0
        },
        "trueTrack": {
          "deg": 0,
          "rad": 0
        },
        "vsiFpm": 0,
        "reportedAtUtc": "2019-08-24T14:15:22Z",
        "lat": -90,
        "lon": -180
      }
    }
  ],
  "subscription": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "isActive": true,
    "billingType": "LifetimeBased",
    "activateBeforeUtc": "2019-08-24T14:15:22Z",
    "expiresOnUtc": "2019-08-24T14:15:22Z",
    "createdOnUtc": "2019-08-24T14:15:22Z",
    "subject": {
      "type": "FlightByNumber",
      "id": "string"
    },
    "subscriber": {
      "type": "string",
      "id": "string"
    },
    "notices": [
      "string"
    ]
  },
  "balance": {
    "creditsRemaining": 0,
    "lastRefilledUtc": "2019-08-24T14:15:22Z",
    "lastDeductedUtc": "2019-08-24T14:15:22Z"
  }
}

