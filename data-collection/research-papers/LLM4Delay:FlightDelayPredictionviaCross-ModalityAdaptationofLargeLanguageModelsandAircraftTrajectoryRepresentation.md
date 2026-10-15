JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 1
LLM4Delay: Flight Delay Prediction via Cross-Modality Adaptation
of Large Language Models and Aircraft Trajectory Representation
Thaweerath Phisannupawong, Joshua Julian Damanik, Graduate Student Member, IEEE,
and Han-Lim Choi, Senior Member, IEEE
Abstract—Flight delay prediction has become a key focus in
air traffic management (ATM), as delays reflect inefficiencies in
the system. This paper proposes LLM4Delay, a large language
model (LLM)-based framework for predicting flight delays from
the perspective of air traffic controllers monitoring aircraft after
they enter the terminal maneuvering area (TMA). LLM4Delay is
designed to integrate textual aeronautical information, including
flight data, weather reports, and aerodrome notices, together
with multiple trajectories that model airspace conditions, forming
a comprehensive delay-relevant context. By jointly leveraging
comprehensive textual and trajectory contexts via instance-level
projection, an effective cross-modality adaptation strategy that
maps multiple instance-level trajectory representations into the
language modality, the framework improves delay prediction
accuracy. LLM4Delay demonstrates superior performance compared to existing ATM frameworks and prior time-series-tolanguage adaptation methods. This highlights the complementary
roles of textual and trajectory data while leveraging knowledge
from both the pretrained trajectory encoder and the pretrained
LLM. The proposed framework enables continuous updates to
predictions as new information becomes available, indicating
potential operational relevance.
Index Terms—Air transportation, Artificial Intelligence, Data
Analytics and Data Science, Flight Delay Prediction, Large
Language Models
I. INTRODUCTION
T
HE volume of air traffic grows in parallel with economic
development. This growth can result in traffic density
that exceeds the capacity of current air traffic management
(ATM) systems, compromising both safety and operational
efficiency [1], [2]. The Federal Aviation Administration (FAA)
defines delay as excess time incurred during flight operations
and categorizes it into five phases: gate, taxi-out, en-route,
terminal, and taxi-in delays [3]. Delays can also be classified
by cause, including carrier, weather, security, and airspacerelated delays [4]. Delays across phases and causes originate
from different parts of the ATM system, each influenced by
distinct relevant factors. This paper focuses on delays after
the terminal phase, which are of particular interest to air
traffic controllers (ATCs), as monitoring and mitigating delays
within this phase is their direct responsibility. Additionally,
being aware of updated arrival delay estimates facilitates
coordination of post-landing ground services. ATCs monitor
Manuscript received XXX XX, XXXX; revised XXX XX, XXXX. This
work was supported by the Korea Agency for Infrastructure Technology
Advancement (KAIA) Grant funded by the Ministry of Land, Infrastructure
and Transport under Grant 22DATM-C163373-02. The work of Thaweerath
Phisannupawong was supported by the Hyundai Motor Chung Mong-Koo
Foundation Global Scholarship. (Corresponding Author: Han-Lim Choi)
Thaweerath Phisannupawong, Joshua Julian Damanik, and Han-Lim Choi
are with the Department of Aerospace Engineering, Korea Advanced Institute
of Science and Technology, Daejeon 34141, Republic of Korea. (e-mail:
petchthwr@kaist.ac.kr; joshuad@kaist.ac.kr; hanlimc@kaist.ac.kr)
and integrate information from multiple modalities. Textual
information, such as flight schedules, weather reports, and
temporary operational notices, provides essential operational
context, while trajectory data captures aircraft movement,
and multiple trajectories reflect congestion. Integrating and
understanding these contexts is essential for estimating delays
based on their underlying causes and contributing factors.
Although these data are human-interpretable, inference on
large-scale multimodal data remains challenging for ATCs,
motivating the development of predictive models.
Information in various modalities requires distinct handling
techniques; combining them necessitates effective data integration. Large language models (LLMs) have emerged as powerful tools for interpreting textual data and have demonstrated
strong capability in understanding aviation-related text [5], [6].
However, trajectory data, as time series, are not in a format
that recent LLMs were trained to handle directly; therefore,
integrating such data with LLMs requires additional adaptation
techniques [7]. We propose LLM4Delay, a framework that
integrates a pretrained LLM with a pretrained trajectory encoder by adapting learned instance-level semantics rather than
sub-instance-level encodings. The framework treats all inputs
as sequences of tokens to handle textual data and multiple
trajectories with varying numbers of instances. This contrasts
with existing frameworks that rely on fixed-size inputs, which
require rigid, handcrafted text parsers and are limited to a
single trajectory, thereby lacking detailed information about
airspace and operational context that do not conform to
predefined parsing rules. We formulate delay prediction as a
multimodal regression problem, leveraging both textual and
trajectory data. This paper’s contributions are as follows:
• We introduce LLM4Delay, a multimodal framework that
integrates aeronautical textual data and trajectory timeseries data within a pretrained LLM to predict flight
delays beyond the terminal phase.
• We propose instance-level projection, an effective crossmodality adaptation method that aligns multiple instancelevel trajectory representations to language modality.
• We construct a publicly available multimodal delayprediction dataset and demonstrate that integrating aeronautical textual and trajectory data provides complementary information, thereby improving prediction accuracy.
II. RELATED WORKS
A. Flight Delay Prediction
Early flight delay prediction studies employed tabular-based
approaches, in which flight details (e.g., carrier, route, schedule, delay history) and weather data (e.g., visibility, wind,
temperature) are extracted into structured tables and used as
arXiv:2510.23636v3 [cs.LG] 10 Apr 2026
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 2
fixed-dimensional numerical or categorical features for machine learning (ML) models. Many prior works have addressed
delay prediction using various ML models, formulating the
task as either classification or regression. For classification,
which predicts whether a delay will occur, studies have
compared models such as Logistic Regression, Support Vector
Machine (SVM), Decision Tree (DT), Random Forest (RF), KNearest Neighbor, Naive Bayes, gradient-boosted decision tree
(GBDT) models, such as XGBoost, LightGBM, and CatBoost,
and Multi-layer Perceptron (MLP) [8]–[14]. Delay duration
has been modeled as a regression problem, with models
including Linear Regression, Lasso, Ridge, SVM, tree-based
models, GBDTs, and MLP [10], [14]–[18].
As flight and weather features may be insufficient to characterize context contributing to delays, prior studies have
incorporated additional tabular features, such as traffic count
[19]. Some works focused on departure delay prediction,
introducing passenger-related features for delay distribution
estimation [20], as well as on IATA-coded delay causes,
modeled using an Adaptive Bidirectional Extreme Learning
Machine (AB-ELM) classification [21]. Many works have
incorporated sequences of tabular features that include prior
delay information. The methods proposed in [22], [23] both
employ long short-term memory (LSTM) models to classify
next-day delays. Khanal et al. [4] used a Gaussian Process
to model delay duration based on prior delay observations
and flight dates. The above frameworks require flight and
weather data to be fixed-size feature vectors or rely on rigid
manual parsers to convert text-coded data, such as Meteorological Aerodrome Report (METAR), into numerical inputs.
As a result, they are not readily applicable to variable-length
Terminal Aerodrome Forecast (TAF) reports or Notices to
Airmen (NOTAMs), which require semantic interpretation [5]
and cannot be naturally represented as fixed-size features.
Several recent works have applied spatiotemporal features
for delay prediction. Models, such as the LSTM-integrated RF
model [24] and the Convolutional Neural Network with LSTM
(CNN-LSTM) [25], were employed to predict delays based
on weather, delay propagation, and traffic count. Qu et al.
[26] modeled multi-flight delay propagation using attentionbased architectures that capture flight chain dependencies
across sequential operations of the same aircraft, accounting
for temporal coupling and propagation effects in aircraft
rotations. Several recent studies have adopted graph neural
networks. Cai et al. [27] employed a GCN-CNN architecture in
which a Graph Convolutional Network (GCN) captures spatial
dependencies in a time-evolving delay network of airports, and
a CNN models daily and weekly delay patterns. Similarly, a
hybrid framework proposed in [28] combines diffusion GCNs
with residual Gated Recurrent Units (GRUs) and incorporates
federated learning across airport networks to achieve accurate,
privacy-preserving forecasting from historical delay data. Li
et al. [29] proposed FAST-CA, a graph-based spatio-temporal
framework that incorporates arrival and departure delay relationships together with weather information in an airport network, and employs coupled attention to predict network-level
delay propagation. However, spatial-temporal approaches often
report relatively high prediction errors and exhibit limited
goodness-of-fit to the observed data. Moreover, graph-based
inputs are limited in capturing diverse delay-related factors
beyond inter-airport delay sequences and weather graphs,
such as detailed airport-level airspace congestion. To capture
detailed aircraft movement at airports, a recent trajectorybased approach presented in [30] employs an attention-based
LSTM model that combines aircraft trajectory data with flight
and weather data to classify delays as early, on-time, or late.
However, the framework considers only a single trajectory,
which does not fully reflect airspace conditions.
Prior works are limited by fixed-size features requiring
manual parsers and are inapplicable to texts such as TAF and
NOTAMs, as well as spatial inputs that model delay propagation rather than underlying causes or airport-level airspace
conditions. In addition, a single trajectory can be limited in
capturing airspace conditions. We address these gaps jointly
by modeling all information as tokens and incorporating
multi-trajectory-based airspace conditions via cross-modality
adaptation, enabling a more comprehensive context, which we
hypothesize will improve prediction accuracy.
B. Large Language Models
Following the introduction of the Transformer [31], early
pretrained language models such as GPT-1 and GPT-2 [32],
[33] adopted generative pretraining with a causal decoder-only
architecture, which was later advanced by GPT-3 [34] through
its demonstration of strong few-shot prompting without taskspecific fine-tuning. BERT [35] introduced masked language
modeling and next-sentence prediction using a bidirectional
encoder, while T5 [36] was an early encoder-decoder model
for unified text-to-text learning. With techniques such as
instruction tuning [37] and RLHF [38], models such as GPT3.5, GPT-4, GPT-4o, Gemini, Claude, and DeepSeek V3 were
released and remain proprietary, serving as high-performing
models for research and industry applications. Open-source
LLMs have been released, enabling broader access within
the communities, including Meta’s LLaMA series [39]–[41],
Mistral-7B [42] and Mixtral-8x7B [43], Google’s Gemma
series [44]–[46], Microsoft’s Phi models [47]–[49], the Qwen
series [50]–[54], Pythia [55], and DeepSeek-R1 [56]. These
models achieve performance comparable to proprietary models
while being modifiable, thereby enabling broader applications.
C. Cross-Modality Adaptation
Cross-modality adaptation is a technique for leveraging pretrained models from one modality and adapting them for use
in other modalities. LLM4TS [57] employs a two-stage finetuning approach that first aligns linguistic representations to
time-series data, and then fine-tunes the model for forecasting.
Later frameworks align time-series data with the language
modality, enabling LLM-based time-series forecasting without
requiring full fine-tuning of the pretrained LLM. LLMTIME
[58] tokenizes continuous-valued time series into discrete
tokens, enabling direct use of pretrained LLMs and their native
language modeling heads for forecasting. Time-LLM [7] reprograms time-series patches into word-prototype embeddings,
prepends a prompt prefix, and feeds them into a frozen
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 3
Fig. 1: Flight Delay Accumulation of Aircraft Operations from Departure to Arrival
LLM, followed by a learnable projection head to forecast
future states. AutoTimes [59] produces time-series segment
embeddings combined with text-based positional encodings
and applies a learnable output projection after the frozen LLM.
These works employed adaptation layers that encode featurewise subseries semantics and are designed for single-series
forecasting from historical context. In contrast, we propose
the instance-level projection, a technique that adapts learned
instance-level semantics produced by a pretrained encoder
across multiple trajectories, as modeling airspace conditions
inherently requires capturing cross-trajectory patterns.
D. Time-series Representation Learning
Time-series representation learning aims to pretrain an
encoder that can capture feature dependencies and temporal
dynamics in time-series data, such as aircraft trajectories, and
produce instance-level representations. Early work traces back
to autoencoders (AEs), widely used in the ATM field [60],
[61], in which an encoder compresses input sequences, and
a decoder is trained to reconstruct them. Contrastive learning
aligns similar samples and separates dissimilar ones in the embedding space, improving downstream performance. Notably,
recent works include TS2Vec [62], which employs hierarchical
contrastive learning between two randomly masked views,
and InfoTS [63], which leverages meta-learning to select data
augmentation strategies, including those used in T-Loss [64],
TS-TCC [65], and TNC [66]. ATSCC [67] is a framework
for aircraft trajectory data that ensures consistent embedding
of cumulative trajectory states within segments and generates
high-fidelity instance-level representations of complete trajectories that are consistent with aeronautical procedures.
III. METHODOLOGY
A. Problem Formulation
Considering a flight with identifier i, its operation is illustrated in Fig. 1. The key temporal markers defining a flight’s
timeline include scheduled or expected and actual departure
times, airborne times, terminal manoeuvring area (TMA) entry
times, landing times, and arrival times. The total delay can be
decomposed into phase-specific components [3], representing
the delays incurred throughout each stage of the flight. We
define the pre-terminal phase as all operations prior to entering
the TMA. Accordingly, the pre-terminal delay consists of
gate, taxi-out, and enroute delays. Gate delay may result
from service-related operations, delay of previous flights, or
other logistical factors. Taxi-out delay is commonly caused by
ground-holding. Enroute delay is influenced by factors such
as adverse enroute weather conditions and detours. The preterminal delay is characterized as follows:
Dpre,i = Dgate,i + Dtaxi-out,i + Denroute,i (1)
Dpre,i = Dgate,i + Dtaxi-out,i
+ (T
actual
entry,i − T
expect
entry,i − Dgate,i − Dtaxi-out,i) (2)
Dpre,i = T
actual
entry,i − T
expect
entry,i. (3)
We define the post-terminal phase as the aircraft’s operations
after entering the TMA. The post-terminal delay includes
terminal and taxi-in delays. Terminal delay typically arises
from air traffic congestion, weather disruptions, or airspace
restrictions. Taxi-in delay is generally attributed to ground
congestion at the destination airport. These delay components
can be rearranged as follows:
Dpost,i = Dterminal,i + Dtaxi-in,i (4)
Dpost,i = (T
actual
land,i − T
expect
land,i ) − (T
actual
entry,i − T
expect
entry,i)
+ (T
actual
arrival,i − T
schedule
arrival,i ) − (T
actual
land,i − T
expect
land,i ) (5)
Dpost,i = (T
actual
arrival,i − T
schedule
arrival,i ) − (T
actual
entry,i − T
expect
entry,i). (6)
While prior works studied phase-specific departure delays
[20], [21], our formulation focuses on the post-terminal phase
from the perspective of destination-airport ATC, tracking delays from the TMA entry at T
actual
entry,i until arrival at T
actual
arrival,i.
Since T
schedule
arrival,i is known, and T
actual
entry,i marks the start of monitoring, parts of the delay can be inferred from these known
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 4
values without explicit knowledge of gate, taxi-out, or enroute
delays, as the total delay can be rearranged as follows:
Dtotal,i = Dpre,i + Dpost,i (7)
Dtotal,i = (T
actual
entry,i − T
expect
entry,i) + (T
actual
arrival,i − T
schedule
arrival,i )
− (T
actual
entry,i − T
expect
entry,i) (8)
Dtotal,i = T
actual
entry,i − T
schedule
arrival,i + (T
actual
arrival,i − T
actual
entry,i) (9)
Dtotal,i = T
actual
entry,i − T
schedule
arrival,i + ∆tpost,i. (10)
The true post-terminal duration, denoted ∆tpost,i, remains
unknown for t ∈ [T
actual
entry,i, Tactual
arrival,i) since T
actual
arrival,i has not
yet been observed. Accordingly, we aim to estimate ∆tpost,i
using the available contextual information. Unlike prior spatiotemporal or temporal models, prior delays information and preentry delays are absorbed into the known term T
actual
entry,i−T
schedule
arrival,i
in Eq.3, leaving only ∆tpost,i to be predicted. Thus, the
estimated total delay is given by:
Dˆ
total,i = T
actual
entry,i − T
schedule
arrival,i + ∆tˆpost,i. (11)
Estimating ∆tpost,i is advantageous because it often aligns
with maneuvering procedures, where similar procedures yield
similar durations, though variations still arise from many
factors. We hypothesize that accurate estimation of ∆tpost,i
requires integrating flight information, weather conditions,
non-periodic operational events, and traffic congestion. Thus,
we define a scenario si,t of the flight i at time t as a set of
textual prompts encoding flight, METAR, TAF, NOTAMs, and
trajectory-based airspace information, such that:
si,t = {P
F
i,t, P M
t
, PT
t
, P N
t
, Xf
i,t, Xa
i,t, Xp
i,t},
P
F
i,t, P M
t
, PT
t
, P N
t ∈ Z
L
j
i,t , j ∈ {F, M, T, N},
X
f
i,t, Xa
i,t, Xp
i,t ∈ R
Nk
i,t×T k
i,t×9
, k ∈ {f, a, p}.
(12)
A scenario si,t consists of textual prompts that include
flight information (P
F
i,t), weather conditions via METAR (P
M
t
)
and TAF (P
T
t
), and NOTAMs (P
N
t
). This paper introduces
a trajectory-based representation of airspace conditions that
effectively captures congestion rather than the prior trafficcount feature used in [19], [24], [25]. A trajectory is represented as a time series of aircraft positions. To characterize
the airspace, we consider three trajectory groups namely the
focusing trajectory X
f
i,t, the active trajectories Xa
i,t of aircraft
operating in the TMA at time t, and the completed prior
trajectories X
p
i,t, which provide additional context. The model
is formulated as yˆi = fθ(si,t), where yˆi ≡ ∆tˆpost,i, and the two
notations are used interchangeably. The overall model fθ(·) is
trained as a regression task, minimizing the error between the
predicted post-terminal duration yˆi and the ground-truth yi
.
B. Dataset Preparation
The model training requires ground-truth pairs (yi
, si,t).
Monthly datasets (S) were constructed for flights arriving
at Incheon International Airport throughout 2022. We constructed comprehensive multimodal datasets by integrating
flight schedules, METAR, TAF, NOTAMs, and surveillance
data for post-terminal delay prediction.
1) Flight Information Features: The retrieved 2022 arrival records for Incheon Airport from Airportal [68] provide structured information, including scheduled arrival times,
airline names, flight identifiers, and airport details, including
departure and destination codes, as well as airport names.
We matched the airports to their geodetic latitude, longitude,
and altitude and calculated the great-circle distance between
the origin and destination. The flight haul type was categorized as short-haul, medium-haul, or long-haul based on
this distance, following the classification in Wragg’s aviation
dictionary [69]. The arrival date and corresponding day of
the week are defined in Korea Standard Time (KST). Certain
fields were synthesized to complete the datasets. Aircraft
type and registration were inferred from the most frequently
used aircraft models on each route. The wake turbulence
category was classified based on the aircraft type following
ICAO’s Procedures for Air Navigation Services - Air Traffic
Management Doc 4444 [70]. For each flight i, the flight
information features (F
F
i
), detailed in Table I, along with
T
actual
entry,i and the current time (t), were used to construct the
prompt P
F
i,t following one of ten predefined prompt formats
provided in the supplemental code implementation1
, randomly
selected to introduce variation in prompt formatting.
TABLE I: Flight Information Feature Descriptions
Flight Information Description Type
airline_name_english Airline name in English string
callsign_code_iata IATA-format callsign string
callsign_code_icao ICAO-format callsign string
haul Flight haul type string
dep_code_iata Departure airport IATA code string
dep_code_icao Departure airport ICAO code string
dep_name_english Departure airport name string
dep_lat Departure airport latitude float
dep_lon Departure airport longitude float
dep_altitude Departure airport altitude (ft) float
dest_code_iata Destination airport IATA code string
dest_code_icao Destination airport ICAO code string
dest_name_english Destination airport name string
dest_lat Destination airport latitude float
dest_lon Destination airport longitude float
dest_altitude Destination airport altitude (ft) float
distance Great-circle distance (km) float
actual_entry_time Time of first ADS-B appearance (UTC) datetime
sched_time_utc Scheduled arrival time (UTC) datetime
date Scheduled Flight Date of arrival (KST) datetime
day_of_week Scheduled Day of week of arrival (KST) string
aircraft_type Aircraft type string
aircraft_registration Aircraft registration code string
wake_turbulence_cat Wake turbulence category string
2) Textual Data: We retained the original aeronauticalcoded forms of METARs, TAFs, and NOTAMs to highlight
a design aspect in which the framework does not require
rigid rule-based parsing. The METARs and TAFs were massdownloaded from Ogimet [71], while NOTAMs were collected
from the AIM Korea [72]. The METAR was selected as the
most recent report released before time t, within the standard
30-minute update interval. TAFs and NOTAMs explicitly
define their active periods. TAFs are typically reported every
six hours, and multiple forecasts may overlap at a given time;
therefore, we selected the most recent valid TAF at time t. For
NOTAMs, multiple notices can be active concurrently, so we
collected all active notices. The METAR, TAF, and NOTAMs
queried at time t were directly used to construct the prompts
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 5
P
M
t
, P
T
t
, and P
N
t
, with the prefixes “METAR in effect:”, “TAF
in effect:”, and “Active NOTAMs:”, respectively.
3) Trajectory Data: The Automatic Dependent
Surveillance-Broadcast (ADS-B) data were sourced from
the OpenSky database [73]. ADS-B data for arrival and
departure flights were queried using flight identification
numbers from Airportal [68]and filtered within latitude
36.6-37.9 and longitude 125.1-127.5 to cover the Incheon
Airport TMA defined in the area chart. We extracted
positional time series from the ADS-B data, including
geodetic latitude, longitude, and altitude, and transformed
them to airport-centered Cartesian coordinates in the ENU
(East-North-Up) frame. The trajectories were resampled to
5-second intervals without interpolating into a fixed number
of timestamps. Each trajectory was scaled by dividing
by 120 kilometers, following ATFMTraj preprocessing
[74]. Unlike the intensively preprocessed pretraining data,
we avoided trajectory smoothing to preserve real-world
characteristics. A complete trajectory of flight i consists
of states xi,κ = {x
x
i,κ, x
y
i,κ, xz
i,κ} over all timestamps. To
enhance expressiveness, for each timestep κ in a time-series
instance, additional geometric features are computed as:
{x
ux
i,κ, x
uy
i,κ, x
uz
i,κ} =
xi,κ+1 − xi,κ
∥xi,κ+1 − xi,κ∥
, (13)
x
r
i,κ =
q
x
x
i,κ2
+

x
y
i,κ2
, (14)
x
sin θ
i,κ = sin
arctan 2(x
y
i,κ, xx
i,κ)

, (15)
x
cos θ
i,κ = cos
arctan 2(x
y
i,κ, xx
i,κ)

. (16)
Thus, at each time step κ, these trajectory features are collected into the feature set:
xi,κ = {x
x
i,κ, x
y
i,κ, xz
i,κ, x
ux
i,κ, x
uy
i,κ, x
uz
i,κ, xr
i,κ, xsin θ
i,κ , xcos θ
i,κ }.
(17)
In si,t, there are three types of trajectories: focusing, active,
and prior. Their temporal relationships are illustrated in Fig. 2,
and their definitions are as follows:
• Focusing trajectory: The trajectory of flight i comprises
the focusing aircraft states over the interval [T
actual
entry,i, t].
We define X
f
i,t ∈ R
1×T f
i,t×9
, where T
f
i,t denotes the
number of observed aircraft trajectory states.
• Active trajectories: The trajectories of other aircraft
in the TMA at time t, excluding the flight i. A trajectory of flight j is considered active at time t if its
state xj,t ∈ R
9
exists, with T
a
i,t/j observations over
the interval [T
actual
entry,j , t] or [T
actual
departure,j , t], where each active trajectory Xa
i,t/j ∈ Xa
i,t. We define the nan-paded
Xa
i,t ∈ R
Na
i,t×T a
i,t×9
, where Na
i,t is the number of active
trajectories, and T
a
i,t = maxXa
i,t/j∈Xa
i,t
(T
a
i,t/j ).
• Prior trajectories: Using minXi,t/j∈Xa
i,t∪X
f
i,t
(T
actual
entry,j )
as reference, we collect all completed prior trajectories
X
p
i,t/j ∈ X
p
i,t whose state xj,κ ∈ R
9
exists at this
reference time, each consisting of T
p
i,t/j observations
over the interval [T
actual
entry,j , Tactual
arrival,j ] or [T
actual
departure,j , Tactual
exit,j ].
We define the nan-padded X
p
i,t ∈ R
N
p
i,t×T p
i,t×9
, where
N
p
i,t denotes the number of prior trajectories, and T
p
i,t =
maxX
p
i,t/j∈X
p
i,t
(T
p
i,t/j ).
Fig. 2: Temporal Relationship Between Focusing, Active, and
Prior Trajectories
The trajectories X
f
i,t, Xa
i,t, and X
p
i,t represent the query
at time t for flight i under scenario si,t. Intuitively, these
trajectory groups provide a comprehensive semantic view of
the airspace, similar to the situational awareness of human
ATCs. X
f
i,t captures the target aircraft’s movement; Xa
i,t reflect
current congestion and airspace conditions; and X
p
i,t encode
historical patterns that may influence ongoing operations and
implicitly reflect ground traffic, enabling the model to directly
estimate the ∆tpost,i from trajectory information.
4) Dataset Annotation: For supervised training, we annotated the regression label yi corresponding to si,t as ∆tpost,i,
computed using T
actual
entry,i and T
actual
arrival,i. Here, T
actual
entry,i is defined
as the first ADS-B broadcast timestamp after the aircraft
enters Incheon Airport’s TMA based on OpenSky data [73],
following the definition in the ICAO Global Air Navigation
Plan (GANP) Doc 9750 [75], while T
actual
arrival,i is obtained from
official Airportal records [68]. The ground-truth label is:
yi ≡ ∆tpost,i = T
actual
arrival,i − T
actual
entry,i. (18)
Each si,t was paired with yi
that represents ∆tpost,i. We
repeated the preparation procedure for all flights i within
each month, sampling two time points t per flight, since any
t ∈ [T
actual
entry,i, Tactual
arrival,i] should yield the same yi
. This resulted
in 12 datasets, one for each month of 2022. For each dataset,
instances are first sorted by t. The most recent 10% form the
testing set, the second most recent 10% form the validation set,
and the remaining instances are used for training. All monthly
datasets are publicly available in the supplementary Hugging
Face repository2
accompanying this paper.
C. Neural Network Architecture
This section outlines the architecture of the LLM4Delay
model fθ(si,t) and describes how natural-language prompts
(P
F
i,t, P
M
t
, P
T
t
, P
N
t
) and time-series trajectory data (X
f
i,t, Xa
i,t,
X
p
i,t) are individually embedded, comparing existing crossmodality adaptation techniques and introduce our proposed
approach. We later describe the use of a frozen LLM with a
trainable regression head, along with its configuration.
1) Natural Language Prompt Embedding: To process P
F
i,t,
P
M
t
, P
T
t
, and P
N
t
, we use the tokenizer, T(·) and embedding
table, Emb[·] provided with the selected LLM. T(·) transforms
each combined prompt Pi,t, where Pi,t = P
F
i,t ∥ P
M
t ∥ P
T
t ∥ P
N
t
into the tokenized sequence T(Pi,t) ∈ N
Li,t
, where Li,t
denotes the length of the token sequence. Each subword
token is then mapped to a continuous embedding using the
embedding table Emb ∈ R
V ×d
, where V is the vocabulary
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 6
Fig. 3: Overall Architecture of the LLM4Delay Framework
size and d is the LLM’s embedding dimension. Accordingly,
the textual prompt embedding is given by:
Z
p
i,t = Emb[T(Pi,t)], (19)
where Z
p
i,t ∈ R
Li,t×d
is the sequence of token embeddings
for Pi,t. Emb[·] is kept fixed during training to preserve
the pretrained language understanding and ensure consistent
alignment with the LLM backbone.
2) Cross-Modality Adaptation of Trajectory Data: As illustrated in Fig. 4, the tokenization technique in LLMTIME
[58] serializes a time series into digit tokens for a pretrained
LLM, leaving the LLM to infer temporal dependencies from
digit-level semantics. The reprogramming layer in Time-LLM
[7] projects feature patches and performs attention over text
prototypes to produce feature-wise patch embeddings. The
segment embedding layer in AutoTimes [59] partitions the
time series into fixed-size feature-wise segments and projects
them into embeddings with text-based timestamp encodings.
These learnable adaptation layers assume channel independence [76] and encode feature-wise segment-level semantics
rather than instance-level semantics, thereby forcing the LLM
to infer inter-feature and inter-segment temporal relationships.
They are designed for single-time-series forecasting, where
reasoning over historical segments suffices for prediction.
However, ∆tpost,i depends on trajectory patterns reflecting
maneuvering procedures; thus, capturing instance-level trajectory semantics is preferable. Accordingly, instance-level
projection, our proposed cross-modality adaptation technique,
employs a frozen pretrained trajectory encoder that has already learned inter-feature correlations and such instance-level
semantics. Moreover, ∆tpost,i depends not only on its own
history but also on surrounding air traffic. Thus, our method
extracts instance-level semantics from multiple trajectories
within three trajectory groups and aligns their representations
with the LLM embedding space, enabling a direct mapping
from collective trajectory semantics to ∆tpost,i.
Prior to training fθ(·), we pretrain an encoder fenc(·) via
self-supervised learning on the ATFMTraj dataset [74], using
trajectories from Incheon Airport. Both arrival and departure
trajectories were used, with identical feature extraction as
in our dataset preparation and 5-second downsampling. The
candidate representation learning methods include a Temporal
Convolutional Network AE (TCN-AE) and contrastive approaches, namely TS2Vec [62], InfoTS [63], and ATSCC [67].
The pretrained encoder fenc(·) is used to extract trajectory
representations and remains frozen during training. Specifically, X
f
i,t, Xa
i,t, and X
p
i,t are compressed into instance-level
embeddings by fenc(·). The encoding process is given by:
Z
k
i,t = fenc(Xk
i,t), (20)
where Z
k
i,t ∈ R
Nk
i,t×320 and k ∈ {f, a, p}, representing
Nk
i,t instance-level embeddings, each with 320 dimensions,
following the reproduction details in [62], [63], [67]. As shown
in Fig. 3, fenc(·) is placed at the start of the pipeline and
kept frozen during training, allowing trajectories to be preencoded into instance-level representations Z
k
i,t, which are
then subjected to dropout with a rate of 0.3. This design
improves memory efficiency by avoiding nested sequence
encoding while retaining trajectory information. Then, we
employ a lightweight MLP-based cross-modality adaptation
network fxa(·) that projects instance-level embeddings Z
k
i,t
into the LLM embedding space, adapting the instance-level
embedding of each trajectory to the language modality. The
transformation of Z
k
i,t into an LLM dimension d is given by:
Z
k
i,t = fxa(Z
k
i,t), (21)
where Z
k
i,t ∈ R
Nk
i,t×d
is the embedding of trajectory group
k ∈ {f, a, p}. fxa(·) consists of two linear layers with Gaussian
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 7
Fig. 4: Comparison of Different Time-Series-to-Language Cross-Modality Adaptation Techniques
Error Linear Unit (GELU) activations and a dropout rate of
0.35 applied after each activation. The first layer maps the
320-dimensional embedding to the dimension of d, while
the second layer preserves this dimension. fxa(·) is simple
and effective, introducing minimal computational overhead
while bridging trajectory encoders and LLMs. Then, we insert
trajectory embeddings Z
k
i,t at designated positions between
guiding prompts to distinguish trajectory groups. The resulting
trajectory-informed sequence is denoted as:
Z
T
i,t = Concat
Emb[T(Pst,1)],
Z
f
i,t, Emb[T(Pst,2)],
Z
a
i,t, Emb[T(Pst,3)],
Z
p
i,t, Emb[T(Pst,4)]
, (22)
where Z
T
i,t ∈ R
(Lst,1+1+Lst,2+Na
i,t+Lst,3+N
p
i,t+Lst,4)×d
, and
Lst,k denotes the length of the k-th guiding prompt.
3) Large Language Model Backbone: The pretrained LLM
backbone fllm(·) is repurposed, with its language modeling
head replaced by a regression head to predict ∆tpost,i. We
consider open LLMs with one billion parameters or fewer, as
the task involves scalar-value regression and does not require
large generative capacity. These LLMs run efficiently on a
single consumer-grade GPU, supporting broader deployment.
The candidate LLMs include LLaMA3.2-1B, LLaMA3.2-1BInstruct, Qwen3-0.6B, Qwen3-0.6B-Base, and Pythia-1B. All
fllm(·) parameters are kept frozen to retain pretrained linguistic capabilities while maintaining memory efficiency. fllm(·)
processes multimodal inputs by concatenating Z
p
i,t and Z
T
i,t:
Zi,t = Concat
Z
p
i,t, Z
T
i,t
. (23)
The sequence Zi,t is then passed through the LLM backbone:
hi,t = fllm(Zi,t)[−1]. (24)
Due to the autoregressive nature of causal LLMs, we extract
only the last hidden state hi,t ∈ R
d
as the summary of Zi,t,
which is then used by the output regression head.
4) Output Regression Head: An MLP head fh(·) is attached to the backbone to map the multimodal hidden state
hi,t ∈ R
d
, which encodes the scenario si,t, into a scalar
prediction. The regression head comprises three linear layers:
the first maintains the LLM hidden size, the second halves the
dimensionality, and the third outputs a scalar prediction. Each
of the first two layers is followed by GELU activation and a
0.3 dropout rate. The model output is expressed as:
yˆi = fh(hi,t). (25)
This regression head allows pretrained LLMs to be repurposed
for the regression task, effectively producing a prediction yˆi
from the rich multimodal context encoded in hi,t.
D. Training Pipeline
With the encoder fenc(·) frozen, we pre-encode and cache
trajectory embeddings Z
k
i,t for all si,t ∈ S and k ∈ {f, a, p},
reducing computational overhead during training. During the
training loop, for each batch B = {(si,t, yi)}
B
i=1, the component, Pi,t is tokenized and embedded to form the prompt
embedding Z
p
i,t. Separately, Z
k
i,t is projected through the
trainable fxa(·) and combined with the embedded static guide
prompts to form the trajectory-informed sequence Z
T
i,t. These
are concatenated into Zi,t and processed by the frozen fllm(·)
to produce the final hidden state hi,t, which is fed to the
trainable fh(·) to output yˆi ≡ ∆tˆpost,i. The ground-truth
yi ≡ ∆tpost,i is standardized prior to training. The fθ(·) is
trained using the Smooth L1 Loss:
LsmoothL1(ˆy, y) = (
0.5 · (ˆy − y)
2
, if |yˆ − y| < 1
|yˆ − y| − 0.5, otherwise
, (26)
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 8
which is robust to outliers, well-suited, and in some cases,
prevents exploding gradients [77]. The training was performed
for 15 epochs using the AdamW optimizer with a learning
rate of 1 × 10−5
, weight decay of 1 × 10−5
, and a batch size
of 4. The pretrained components, namely Emb[·], fllm(·), and
fenc(·) are frozen during training, avoiding intensive gradient
computation and memory allocation. Only fxa(·) and fh(·) are
updated (Fig. 3). All training and evaluation are conducted
using Python 3.11.8 and PyTorch 2.0.1 with CUDA Toolkit
11.8, running on an NVIDIA GeForce RTX 4090 GPU.
Algorithm 1 Training Pipeline of LLM4Delay
1: Input: Scenario dataset S = {(si,t, yi)}
N
i=1, where
2: si,t = {P
F
i,t, P M
t
, PT
t
, P N
t
, Xf
i,t, Xa
i,t, Xp
i,t}
3: Output: Trained model parameter θ
4: for si,t in S do
5: Z
k
i,t = fenc(X
k
i,t), k ∈ {f, a, p}
6: end for
7: for each epoch do
8: for each batch B ⊂ S do
9: for each scenario (si,t, yi) in B do
10: Build prompt Pi,t = P
F
i,t ∥ P
M
t ∥ P
T
t ∥ P
N
t
11: Z
p
i,t = Emb[T(Pi,t)]
12: Z
k
i,t = fxa(Z
k
i,t), k ∈ {f, a, p}
13:
Z
T
i,t = Concat
Emb[T(Pst,1)],
Z
f
i,t, Emb[T(Pst,2)],
Z
a
i,t, Emb[T(Pst,3)],
Z
p
i,t, Emb[T(Pst,4)]
14: Zi,t = Concat
Z
p
i,t, Z
T
i,t
15: hi,t = fllm(Zi,t)[−1]
16: yˆi = fh(hi,t)
17: end for
18: L =
1
|B|
P
i LsmoothL1(ˆyi, yi)
19: Backpropagate and update parameters in fxa(·) and fh(·)
20: end for
21: end for
IV. RESULTS AND DISCUSSION
This section begins with a framework-level comparison,
evaluating LLM4Delay against existing delay prediction models in the ATM domain. We then move to the adaptation level,
where we compare alternative time-series-to-language adaptation strategies with our proposed instance-level projection.
We further compare trajectory encoders trained with different
methods and LLM backbones to assess the impact of representation effectiveness and linguistic capability. We also conduct
a prompt-structure analysis to evaluate the contribution of
each information type and visualize token-level importance
via perturbation analysis. Finally, we demonstrate how delay
predictions are updated as new information arrives, illustrating
the model’s deployment.
A. Comparison Study with Delay Prediction Baselines
This section evaluates LLM4Delay against baseline tabularand trajectory-based delay prediction models in the existing
ATM studies. Our task focuses on flight-wise delay estimation at a single airport; therefore, spatotemporal methods
were excluded from the comparison as they target multiairport, network-level prediction. Moreover, in our formulation
(Fig. 1), all past and pre-entry information is captured by
(T
actual
entry,i − T
schedule
arrival,i ), making temporal delay models unaligned
with our scope. Accordingly, we compared against baselines
that match our problem setting and data structure, enabling a
rigorous evaluation of LLM4Delay.
Experiments were conducted on 12 monthly datasets, training on each month’s split, and evaluating at the checkpoint
with the lowest validation loss. For each baseline, we provided
the most comprehensive set of inputs that the method supports,
subject to its modeling constraints. Performance is reported
over 12 monthly datasets using Mean Absolute Error (MAE),
Mean Squared Error (MSE), and Symmetric Mean Absolute
Percentage Error (SMAPE) evaluated on Dtotal,i, while the
coefficient of determination (R2
) is reported for ∆tpost,i.
Tabular-based models have been adopted in prior works
[8]–[18] due to their compatibility with tabular flight and
current weather information. The tabular flight information
F
F
i was derived from F
F
i
in Table I by converting strings into
categorical features and removing unnecessary attributes such
as aircraft registration, IATA-coded information, departure
airport names where ICAO codes suffice, and destination
airport details, as all flights arrive at Incheon. We appended
the traffic count feature Na
i,t to help the model capture airspace
congestion as in [19], [24], [25], and extracted current weather
features using METAR and parse them into tabular form F
M
t
with an open-source METAR parser [78]. Five tabular-methods
are considered, including Linear Regression, SVM, Random
Forest, and XGBoost implemented in scikit-learn, as well as
a four-hidden-layer MLP with 1024 units per layer, ReLU
activations, and a dropout rate of 0.1.
For trajectory-based methods, prior work [30] used only
the focusing trajectory. Following this setting, we retained
the tabular features and incorporated X
f
i,t as the time-series
trajectory input. All trajectory-based models consist of a
tabular feature extractor, a trajectory encoder, and a regression
bottleneck. The tabular feature extractor was implemented as
a two-layer MLP with 512 units per layer, ReLU activations,
and a 0.1 dropout rate. For each model, the trajectory encoder
varies across the architectures below:
• LSTM: An LSTM encoder following the architecture
described in [30], where the final hidden state serves as
the sequence representation.
• LSTM-Attention: The same LSTM architecture augmented with Bahdanau attention [79], where the output
is the attention-weighted sum of the LSTM hidden states.
• Transformer: A Transformer encoder following the architecture of [80] for the Incheon Airport trajectory
dataset, equipped with a causal mask to enable autoregressive modeling, where the final memory state is used
as the sequence representation.
• Inverted Transformer: An Inverted Transformer encoder
following the architecture of [80] for the Incheon Airport
trajectory dataset, where the memory states are concatenated and projected into the sequence representation.
• TCN: We followed the architecture and max-pooled
instance representation used in [62]–[64]. The parameters
were randomly initialized, without pretraining.
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 9
TABLE II: Performance of LLM4Delay Compared to Existing Baseline Frameworks in Air Traffic Management
Datasets
Metrices Baseline Frameworks JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC AVG
MAE↓
F
F
i
, F M
t
, Na
i,t
Linear Regression 2.3288 5.0626 3.6065 4.6326 2.9715 4.1762 2.7224 3.5705 3.7327 3.3628 3.6959 3.3840 3.6039
SVM 3.3362 3.9226 4.4374 3.6143 2.7354 4.3150 3.1979 3.7167 4.5773 3.6128 3.6603 3.1404 3.6889
Random Forest 1.8698 3.9847 2.6981 2.7696 2.5018 3.9416 3.1782 4.1258 2.5397 2.7006 2.2421 2.5549 2.9256
XGBoost 1.5301 4.0814 2.7675 2.6433 2.8061 3.6868 2.6081 3.3401 2.7166 2.6616 2.3605 2.4543 2.8047
MLP 2.1088 3.9551 4.0178 3.3816 2.4848 3.3094 2.5511 3.4941 3.9842 3.2098 3.1997 2.7108 3.2006
F
F
i
, F M
t
, Na
i,t, Xf
i,t
LSTM 1.8450 1.8376 1.5706 1.4682 1.2970 1.9256 1.3615 1.4797 1.8761 1.3822 1.4519 1.2411 1.5614
LSTM-Attention 1.5927 1.9572 1.6242 1.5456 1.3693 2.0494 1.5128 1.6129 2.1349 1.4748 1.6919 1.2573 1.6519
Transformer 1.5179 1.7082 1.4219 1.5921 1.2185 1.7882 1.3426 1.4932 1.6156 1.2592 1.4193 1.2135 1.4659
Inverted Transformer 1.5619 1.6226 1.4878 1.4415 1.3059 1.7794 1.3094 1.4946 1.4503 1.2988 1.4897 1.2412 1.4569
TCN 2.2473 1.7293 1.2566 1.2388 1.0689 1.6767 1.1582 1.3696 1.4118 1.2786 1.1896 1.1215 1.3956
P
F
i,t, P M
t
, PT
t
, P N
t
, Xf
i,t, Xa
i,t, Xp
i,t
LLM4Delay (Ours) 1.3134 1.1296 0.9468 1.0248 1.0370 1.4994 1.1790 1.0162 1.1470 1.0341 1.1344 1.0517 1.1261
MSE↓
F
F
i
, F M
t
, Na
i,t
Linear Regression 10.5743 37.8387 21.6914 36.2099 15.3911 27.6779 15.1147 21.8087 23.4525 18.9601 21.4376 19.1653 22.4435
SVM 16.1035 24.6755 30.5925 22.3557 13.7995 31.1163 18.1664 24.5053 33.7065 19.4848 23.1674 17.0171 22.8909
Random Forest 7.0316 27.0162 12.5990 16.5707 11.2390 26.5872 18.5718 26.9343 13.8467 13.3552 10.0289 12.2379 16.3349
XGBoost 4.7279 29.2474 12.8970 14.2009 12.4419 24.5775 13.4513 18.2157 13.6410 11.8070 10.4083 10.8973 14.7094
MLP 7.8610 24.7174 25.8329 21.1614 11.6389 20.3649 13.2979 22.0848 27.0943 17.5511 17.9052 12.9063 18.5347
F
F
i
, F M
t
, Na
i,t, Xf
i,t
LSTM 5.9152 7.1766 4.2926 3.9092 3.0825 9.0215 5.6562 4.7723 6.2364 3.9711 4.6929 3.4248 5.1793
LSTM-Attention 4.9053 7.7931 4.5120 4.1649 3.3592 10.4593 6.2982 4.9553 7.9232 4.4417 5.7616 3.6865 5.6884
Transformer 4.4415 5.7577 3.3427 4.8667 2.6303 7.7314 4.9695 4.6650 5.1773 3.2886 4.3975 3.2935 4.5468
Inverted Transformer 4.6605 5.2572 3.6432 3.9300 3.0164 7.7290 5.5960 4.7767 4.6546 3.5857 5.0118 3.5114 4.6144
TCN 7.8404 6.3228 2.9137 3.1690 2.1717 7.6281 4.6671 3.9255 4.2207 3.6307 3.3362 2.9935 4.4016
P
F
i,t, P M
t
, PT
t
, P N
t
, Xf
i,t, Xa
i,t, Xp
i,t
LLM4Delay (Ours) 3.1676 3.0012 1.6113 2.3870 1.9398 6.5747 4.6274 2.2915 3.7346 2.6495 2.9348 2.5216 3.1201
SMAPE↓
F
F
i
, F M
t
, Na
i,t
Linear Regression 16.8077 30.7965 25.8623 37.4309 25.2661 33.2467 23.3292 31.5866 33.2200 29.7453 36.5095 32.9640 29.7304
SVM 21.5990 26.8721 30.7100 31.1118 23.2693 33.5743 28.9473 31.1506 40.0770 33.1498 36.2046 30.6098 30.6063
Random Forest 14.7296 25.7700 20.4101 25.2565 21.0569 32.8810 27.6169 34.6812 22.9631 25.4415 24.8778 26.8059 25.2075
XGBoost 12.2635 26.5705 20.9169 24.4245 24.7133 31.0293 23.1822 29.5827 25.5480 26.7763 26.0681 26.4702 24.7955
MLP 15.7934 26.1965 28.3771 29.7682 21.5967 28.0108 23.6507 28.0030 35.4357 27.8553 32.6722 28.5558 27.1596
F
F
i
, F M
t
, Na
i,t, Xf
i,t
LSTM 13.8150 14.7805 13.6808 18.0820 13.2189 19.0659 14.1041 15.9006 20.3949 15.6174 18.0505 15.0885 15.9833
LSTM-Attention 12.1432 14.2967 13.9909 18.1500 13.9162 19.9357 15.0553 16.9827 22.8866 16.0926 21.4366 15.5181 16.7004
Transformer 11.5601 13.3490 12.4548 18.6489 13.1959 18.6443 14.2589 15.3973 17.8702 14.5728 17.6136 14.6287 15.1829
Inverted Transformer 12.3419 13.0623 13.2008 17.1905 13.1801 18.6871 13.5939 15.2141 16.6367 14.2949 18.6612 14.5021 15.0471
TCN 15.6943 13.4114 11.2816 15.4589 11.6679 16.7399 12.1869 15.0029 15.9127 14.0994 16.3456 14.3574 14.3466
P
F
i,t, P M
t
, PT
t
, P N
t
, Xf
i,t, Xa
i,t, Xp
i,t
LLM4Delay (Ours) 10.6527 9.5119 9.8541 13.3925 11.5636 15.6375 12.5378 12.2422 13.4020 13.0346 15.8712 12.9409 12.5534
R2∆t
↑
F
F
i
, F M
t
, Na
i,t
Linear Regression -0.3821 -0.4310 0.2684 -0.3912 0.4175 0.0338 0.4370 0.2733 0.2355 0.3662 0.2359 0.2495 0.1094
SVM -1.1048 0.0668 -0.0318 0.1411 0.4778 -0.0862 0.3233 0.1835 -0.0987 0.3486 0.1743 0.3336 0.0606
Random Forest 0.0809 -0.0217 0.5751 0.3633 0.5747 0.0719 0.3082 0.1026 0.5486 0.5535 0.6426 0.5207 0.3600
XGBoost 0.3820 -0.1061 0.5650 0.4544 0.5291 0.1420 0.4989 0.3931 0.5554 0.6053 0.6290 0.5732 0.4351
MLP -0.0275 0.0652 0.1288 0.1869 0.5595 0.2891 0.5047 0.2641 0.1168 0.4133 0.3618 0.4946 0.2798
F
F
i
, F M
t
, Na
i,t, Xf
i,t
LSTM 0.2269 0.7286 0.8552 0.8498 0.8833 0.6851 0.7893 0.8410 0.7967 0.8672 0.8327 0.8659 0.7685
LSTM-Attention 0.3589 0.7053 0.8478 0.8400 0.8729 0.6349 0.7654 0.8349 0.7417 0.8515 0.7946 0.8556 0.7586
Transformer 0.4195 0.7822 0.8873 0.8130 0.9005 0.7301 0.8149 0.8446 0.8312 0.8901 0.8433 0.8710 0.8023
Inverted Transformer 0.3908 0.8012 0.8771 0.8490 0.8858 0.7302 0.7915 0.8408 0.8483 0.8801 0.8214 0.8625 0.7982
TCN -0.0248 0.7609 0.9017 0.8782 0.9178 0.7337 0.8262 0.8692 0.8624 0.8786 0.8811 0.8828 0.7807
P
F
i,t, P M
t
, PT
t
, P N
t
, Xf
i,t, Xa
i,t, Xp
i,t
LLM4Delay (Ours) 0.5860 0.8865 0.9457 0.9083 0.9266 0.7705 0.8276 0.9236 0.8783 0.9114 0.8954 0.9012 0.8634
↓ Lower is better, ↑ Higher is better; LLM4Delay is equipped with TS2Vec and Pythia-1B.
All encoders include a linear layer that maps the encoder
outputs to Z
f
i,t ∈ R
320, which is then concatenated with the
extracted tabular features, yielding an 832-dimensional input.
This design restricts the model to incorporating only a single
or a fixed number of trajectories. The combined features are
then fed into a regression bottleneck implemented as a twolayer MLP with 1024 units per layer, ReLU activations, and
a dropout rate of 0.1, followed by a final scalar output layer.
All neural network-based baselines were trained for 15 epochs
using the AdamW optimizer with a learning rate of 1 × 10−5
and the SmoothL1 loss (Eq. 26).
According to Table II, a clear performance improvement is observed when moving from tabular-based models
to trajectory-based models, underscoring the importance of
X
f
i,t for ∆tpost,i prediction. Among trajectory-based models,
LSTM-Attention performs comparably to the vanilla LSTM.
Both Transformer-based models demonstrate stronger performance by preserving long-range dependencies and attending
to relevant parts of X
f
i,t. Although TCN employs the same architecture as the best-performing TS2Vec encoder, it is trained
in a fully supervised manner and performs competitively by
directly mapping trajectory semantics to ∆tpost,i. However,
trajectory-based models remain inferior to LLM4Delay, indicating that representations learned from X
f
i,t alone, even when
optimized with a regression objective, are insufficient without
additional operational and airspace context.
LLM4Delay encodes a comprehensive set of multimodal
inputs in a unified token-based format, enabling flexible in-
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 10
Fig. 5: Monthly parity plots of predicted versus ground-truth ∆tpost,i for LLM4Delay on the test dataset
TABLE III: Performance of LLM4Delay Compared to Existing Cross-Modality Adaptation Techniques
Datasets
Metrices Baseline Adaptations JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC AVG
MAE↓
Tokenization 2.4569 3.3775 3.6813 3.1706 3.0406 3.2649 3.4521 3.0392 3.3507 3.3281 2.7655 3.6929 3.2184
Patch Reprogramming 2.1771 3.6663 2.7218 2.2217 2.3924 3.0006 2.7047 2.2651 2.9557 2.4446 3.0968 1.7600 2.6172
Segment Embedding 2.0592 1.9910 1.3897 1.4285 1.3471 1.9210 1.5156 1.3022 1.3922 1.2521 1.3985 1.3005 1.5248
Instance-level Projection (Ours) 1.3134 1.1296 0.9468 1.0248 1.0370 1.4994 1.1790 1.0162 1.1470 1.0341 1.1344 1.0517 1.1261
MSE↓
Tokenization 10.4342 18.5717 22.6030 19.5203 15.0847 19.5760 23.6075 16.1507 19.9191 17.5957 13.7098 22.7574 18.2942
Patch Reprogramming 7.8320 21.9997 11.9019 9.1243 9.4781 17.4192 13.9960 10.2399 18.1153 10.3723 16.5644 6.3626 12.7838
Segment Embedding 7.7900 7.3849 3.6623 4.2979 3.4580 9.4851 6.8501 4.1459 5.3810 4.0613 4.3267 3.6439 5.3739
Instance-level Projection (Ours) 3.1676 3.0012 1.6113 2.3870 1.9398 6.5747 4.6274 2.2915 3.7346 2.6495 2.9348 2.5216 3.1201
SMAPE↓
Tokenization 18.1810 24.7604 26.3536 27.1845 26.4581 28.1051 29.4338 27.7498 29.9530 30.3120 28.7779 34.0949 27.6137
Patch Reprogramming 17.1532 24.5117 20.6895 21.5729 20.6083 26.0469 24.2069 21.9021 25.4685 23.4122 31.1910 19.7895 23.0461
Segment Embedding 16.0964 15.2557 12.4145 16.1486 13.2787 18.8943 15.2829 14.8685 14.5037 14.2479 17.3024 15.0703 15.2803
Instance-level Projection (Ours) 10.6527 9.5119 9.8541 13.3925 11.5636 15.6375 12.5378 12.2422 13.4020 13.0346 15.8712 12.9409 12.5534
R2∆t
↑
Tokenization -0.3638 0.2976 0.2377 0.2500 0.4291 0.3167 0.1206 0.4619 0.3507 0.4117 0.5114 0.1087 0.2610
Patch Reprogramming -0.0236 0.1680 0.5986 0.6494 0.6413 0.3919 0.4786 0.6588 0.4095 0.6532 0.4097 0.7508 0.4822
Segment Embedding -0.0181 0.7207 0.8765 0.8349 0.8691 0.6689 0.7449 0.8619 0.8246 0.8642 0.8458 0.8573 0.7459
Instance-level Projection (Ours) 0.5860 0.8865 0.9457 0.9083 0.9266 0.7705 0.8276 0.9236 0.8783 0.9114 0.8954 0.9012 0.8634
↓ Lower is better, ↑ Higher is better; LLM4Delay is equipped with TS2Vec. All adaptation techniques here were implemented with Pythia-1B.
tegration of diverse contextual information. Specifically, the
framework incorporates TAF in P
T
t
, NOTAMs in P
N
t
, and
additional trajectory information, namely Xa
i,t and X
p
i,t. These
sources provide additional weather information, operational
constraints, and airspace awareness, which influence ∆tpost,i
and thereby enable the model to better capture delay-driving
factors. As a result, LLM4Delay consistently achieves the best
performance across all monthly datasets when equipped with
the TS2Vec encoder and Pythia-1B. Notably, this performance
is achieved despite the framework not being fully trainable,
as it effectively leverages the generalizability of both the
pretrained trajectory encoder and the pretrained LLM. The
parity plot in Fig. 5 further shows strong agreement between
predicted and actual values on the test data, with predictions
closely aligning with the ideal line.
B. Comparison Study with Existing Adaptation Techniques
One of our core contributions is an effective cross-modality
adaptation method that maps trajectory time-series data to the
language modality for accurate delay prediction. To assess its
effectiveness, this section compares our approach with existing time-series-to-language adaptation techniques. Following
our evaluation protocol, we replaced the adaptation module
consisting of fenc(·) and fxa(·) with the techniques visualized
in Fig. 4. We first consider non-learnable approaches:
• Tokenization: Following LLMTIME [58], X
f
i,t, Xa
i,t,
and X
p
i,t are serialized using a function S(·), tokenized
and flattened along the sequence dimension, allowing
the LLM to attend to the all trajectories. The combined
context length of all trajectory components is limited to
2048 tokens to control the sequence length. Thus, the
trajectory-informed embedding is given by:
Z
T
i,t = Concat
Emb[T(Pst,1)],
Emb[T(S(X
f
i,t))], Emb[T(Pst,2)],
Emb[T(S(Xa
i,t))], Emb[T(Pst,3)],
Emb[T(S(X
p
i,t))], Emb[T(Pst,4)]
. (27)
For learnable baselines, multiple trajectories are not natively
supported. Therefore, for each si,t, X
f
i,t, Xa
i,t, and X
p
i,t are
concatenated into a single unified time series Xi,t. Moreover,
they do not handle unequal-length segments or patching with
nan-padding; zero-padding is inserted between trajectories
and at the end to separate individual sequences and ensure
divisibility of sub-series, respectively:
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 11
Xi,t = Concat
X
f
i,t, 0pad,
Xa
i,t,1
, 0pad, Xa
i,t,2
, 0pad, . . . , Xa
i,t,Na
i,t
, 0pad,
X
p
i,t,1
, 0pad, Xp
i,t,2
, 0pad, . . . , Xp
i,t,Np
i,t
, 0pad
,
(28)
where Xi,t ∈ R
T×9
and T = T
f
i,t +
PNa
i,t
j=1 T
a
i,t/j +
PN
p
i,t
j=1 T
p
i,t/j+
PNa
i,t+N
p
i,t+1
j=1 Tpad,j . We consider the following
embedding methods for femb(·):
• Patch Reprogramming: We adopted the patch reprogramming layer from TimeLLM [7] using the model
hyperparameters specified for the LTF-ILI dataset.
• Segment Embedding: Following AutoTimes [59], segments are embedded using an MLP with default hyperparameters from the public implementation, with positional
encoding supplied by the LLM backbone.
For learnable approaches, the segment length is set to 96.
Under channel independence [76], the 9 features in Xi,t,
as detailed in Eq. 17, are treated as independent univariate
time series. The embeddings are concatenated into a single
sequence, preceded by the prompt PNa
i,t,Np
i,t
, which encodes
Na
i,t and N
p
i,t, similar to [7], allowing the LLM backbone to
attend to embeddings from all features jointly. The trajectoryinformed embedding is:
Z
T
i,t = Concat
Emb
T(PNa
i,t,Np
i,t
)

,
femb
X
(1)
i,t 
, femb
X
(2)
i,t 
, . . . , femb
X
(9)
i,t 
,
Emb
T(Pst,4)
.
(29)
Comparative results are presented in Table III. Tokenization relies on non-learnable input serialization and requires
the LLM to infer time-series semantics from low-level digit
tokens. Learnable baselines, including patch reprogramming
and segment embedding, transform patch- or segment-level
inputs into embeddings, adapting feature-wise segment-level
semantics rather than digit-level semantics and thereby improving performance. However, they still rely on the LLM to
infer global trajectory meaning by relating multiple segments,
making them applicable to ∆tpost,i prediction only to a limited
extent, even though they are not designed for this task.
LLM4Delay improves prediction by using the proposed
instance-level projection approach that leverages pre-encoded
instance-level semantics from multiple trajectories and adapts
them to the LLM embedding space. This design avoids
requiring the LLM to reconstruct temporal structure from
fragmented inputs to infer trajectory-level meaning, thereby
enabling more effective adaptation for estimating ∆tpost,i. The
results provide empirical support for the superior effectiveness of LLM4Delay, demonstrating that accurate estimation
of ∆tpost,i relies on instance-level trajectory semantics. By
leveraging higher-level semantic representations than existing
methods, our approach aligns with the intuition that such
semantics capture underlying maneuvering procedures, whose
resulting maneuvering behaviors directly influence ∆tpost,i.
However, the instance-level projection relies on a pretrained
fenc(·), whose pretraining data may not be available for all
airports; although available for Incheon Airport via ATFMTraj
[74], constructing new pretraining datasets requires separate
data curation. Even with available pretraining data, effective
representation-learning techniques remain an important component of training fenc(·), as discussed in the following section.
C. Ablation Study of Trajectory Encoders
This section evaluates LLM4Delay when replacing the different frozen fenc(·) pretrained with candidate representation
learning frameworks on the ATFMTraj [74] Incheon Airport
dataset, highlighting the impact of the encoder in crossmodality adaptation, and supporting our choice of representation learning method. The encoders fenc(·) were pretrained
using the following reproduction details:
• TCN-AE: We adopt a TCN architecture, as in [62], for
both the encoder and decoder, following [81], [82], with
max-pooling and repetition-based upsampling between
them, and train the model using the MSE loss.
• TS2Vec [62]: learns time-series representations via hierarchical contrastive learning; we followed the authors’
reproduction settings for the UCR/UEA datasets.
• InfoTS [63]: applies meta-learning to select augmentations; we reproduced the same hyperparameter settings
as reported for the UCR/UEA datasets.
• ATSCC [67]: employs segmentation-based contrastive
learning; we followed the paper and performed a limited
grid search over segmentation threshold and loss temperature, with other hyperparameters fixed.
Fig. 6 shows t-SNE plots of instance-level trajectory embeddings from the prepared encoders, visualized on the pretraining dataset. The class separation indicates that the encoders
capture instance-level semantics aligned with maneuvering
procedures, with some runway-related ambiguity remaining.
(a) TCN-AE (b) TS2Vec
(c) InfoTS (d) ATSCC
Fig. 6: t-SNE Visualization of Learned Representations on the
ATFMTraj Incheon Airport Pretraining Dataset
According to Table IV, fenc(·) trained with TS2Vec achieves
the best performance for our delay prediction formulation,
while TCN-AE and InfoTS perform comparably with only
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 12
TABLE IV: Trajectory Encoders Ablation Results
fenc(·) MAE↓ MSE↓ SMAPE↓ R2
∆t
↑
TS2Vec 1.1261 3.1201 12.5534 0.8634
TCN-AE 1.1232 (-0.0029) 3.2982 (+0.1781) 12.3763 (-0.1771) 0.8501 (-0.0133)
InfoTS 1.2160 (+0.0899) 3.5050 (+0.3849) 13.3320 (+0.7786) 0.8427 (-0.0207)
ATSCC 1.4118 (+0.2857) 4.5745 (+1.4544) 15.0072 (+2.4538) 0.7994 (-0.0640)
↓ Lower is better, ↑ Higher is better.
slight degradation. TS2Vec employs a cropping-based objective that preserves contextual consistency between partial and
future states, enabling the inference of whole-trajectory semantics from incomplete trajectories. In contrast, TCN-AE relies
on reconstruction objectives applied to complete trajectories
during pretraining, whereas InfoTS selects augmentations
optimized for its meta-learning objective. These differences
may lead to mild misalignment with our data characteristics,
resulting in slightly less effective representations compared to
TS2Vec. Although ATSCC exhibits strong class separability
on the pretraining data, this does not translate into improved
effectiveness. As arrival trajectories situated on parallel runways typically yield similar ∆tpost,i, prediction remains reliable regardless of the inferred landing runway. By enforcing
dissimilarity between incomplete trajectories and unobserved
future states to separate runway usage, ATSCC limits inference
of full trajectory semantics from partial observations. This
experiment highlights the need for effective instance-level
trajectory representations, especially when fenc(·) is frozen to
reduce computational cost.
D. Ablation Study of LLM Backbone
To justify our choice of LLM backbone, this section evaluates our framework by replacing the LLM backbone fllm(·),
following the aforementioned evaluation protocol to assess
how varying linguistic capabilities affect prediction accuracy.
Table V lists the evaluated LLM backbone candidates and
presents their average performance. Pythia-1B outperforms
the others, achieving the best overall average performance,
indicating that it is a promising backbone despite its small
scale. We hypothesize that its pretraining corpus contributes
to its ability to generalize to aeronautical information [83].
Under our experimental setting and at this scale, models
trained primarily on English-language data, such as Pythia and
LLaMA, tend to outperform models designed for multilingual
tasks, such as the Qwen3 series, while instruction tuning has
a minimal impact on prediction accuracy.
TABLE V: LLM Backbones Ablation Results
fllm(·) MAE↓ MSE↓ SMAPE↓ R2∆t
↑
Pythia-1B 1.1261 3.1201 12.5534 0.8634
LLaMA3.2-1B 1.4092 (+0.2831) 4.4818 (+1.3617) 14.8472 (+2.2938) 0.7972 (-0.0662)
LLaMA3.2-1B-Instruct 1.3187 (+0.1926) 4.1222 (+1.0021) 14.0089 (+1.4555) 0.8214 (-0.0420)
Qwen3-0.6B-Base 1.4279 (+0.3018) 4.5710 (+1.4509) 15.0393 (+2.4859) 0.8005 (-0.0629)
Qwen3-0.6B 1.5252 (+0.3991) 5.0635 (+1.9434) 15.6822 (+3.1288) 0.7835 (-0.0799)
↓ Lower is better, ↑ Higher is better
Although all models are provided with the full context and
trained to align trajectory embeddings with the LLM embedding space, different LLM backbones still exhibit varying
performance. This highlights that accurate ∆tpost,i prediction
depends not only on comprehensive contextual inputs and
effective cross-modality adaptation, but also on the model’s
linguistic capability to interpret them effectively. We show
that LLM4Delay is compatible with arbitrary LLM backbones,
demonstrating its scalability to larger, more capable models.
E. Ablation Study on Context Inclusion
A key advantage of LLM4Delay is its ability to flexibly integrate diverse operational information without fixeddimensional feature preparation, thereby providing the model
with rich context. These contextual components vary in importance; therefore, we assessed their contributions by ablating
si,t, then retraining and evaluating with identical hyperparameters, using the best-performing configuration of the TS2Vec
encoder and the Pythia-1B backbone. This analysis quantifies the performance degradation caused by removing each
context type, providing empirical evidence of its contribution
to predictive performance. Moreover, this analysis provides
empirical justification for the design of the input elements in
si,t. The results are reported in Table VI.
TABLE VI: Context Removal Ablation Results
Input Configs MAE↓ MSE↓ SMAPE↓ R2∆t
↑
Full Context 1.1261 3.1201 12.5534 0.8634
Textual Data
w/o Textual Info. 1.1694 (+0.0433) 3.4121 (+0.2920) 12.9099 (+0.3565) 0.8428 (-0.0206)
w/o Flight Info. 1.1576 (+0.0315) 3.3221 (+0.2020) 12.6512 (+0.0978) 0.8531 (-0.0103)
w/o METAR 1.1571 (+0.0310) 3.2380 (+0.1179) 12.8622 (+0.3088) 0.8564 (-0.0070)
w/o TAF 1.1491 (+0.0230) 3.3021 (+0.1820) 12.7775 (+0.2241) 0.8527 (-0.0107)
w/o NOTAMs 1.1645 (+0.0384) 3.3191 (+0.1990) 12.8263 (+0.2729) 0.8519 (-0.0115)
Time-Series Data
w/o Trajectories 3.3257 (+2.1996) 19.2201 (+16.1000) 28.1464 (+15.5930) 0.2528 (-0.6106)
w/o Focusing Traj. 2.1272 (+1.0011) 9.7092 (+6.5891) 19.6249 (+7.0715) 0.5907 (-0.2727)
w/o Active Traj. 1.2075 (+0.0814) 3.6068 (+0.4867) 13.1786 (+0.6252) 0.8433 (-0.0201)
w/o Prior Traj. 1.1980 (+0.0719) 3.4082 (+0.2881) 13.0649 (+0.5115) 0.8504 (-0.0130)
↓ Lower is better, ↑ Higher is better.
First, removing textual inputs degrades performance, indicating that accurate prediction of ∆tpost,i depends on surrounding context in addition to trajectories. Excluding P
F
i,t, P
M
t
,
P
T
t
, and P
N
t
results in only mild performance degradation.
Specifically, P
F
i,t provides a general operational context, consistent with most prior studies. P
M
t
and P
T
t
capture meteorological conditions and forecasts affecting operations, while P
N
t
describes special airspace events and operational constraints.
These results align with intuition and prior findings, where
factors such as adverse weather, precipitation, runway closures, and equipment unavailability are known contributors
to delays [3]. This information is captured in the model’s
contextual inputs, which are encoded directly by the LLM
and subsequently used for prediction.
Removing all trajectories causes the largest performance
drop, indicating that it is more influential than textual components. Trajectories capture aircraft motion and surrounding
airspace conditions that dominantly affect ∆tpost,i, and their
removal also eliminates the learnable portion of the context.
Among trajectory types, removing the X
f
i,t causes the greatest
degradation, as it captures aircraft motion directly relevant to
∆tpost,i. Removing Xa
i,t also degrades performance due to the
loss of airspace congestion information, whereas removing
X
p
i,t results in only minor degradation, as they primarily
capture historical patterns rather than current conditions.
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 13
Fig. 7: Token-Level Importance of Multimodal Prompt Components Across 12 Months
The results indicate that performance benefits from incorporating rich contexts relevant to ∆tpost,i. Although aeronautical
data often contains long context that can degrade performance,
providing full context is preferable, as LLMs can selectively
ignore irrelevant tokens while leveraging useful information
when needed. Moreover, the results suggest that the framework
remains robust even when certain contexts are unavailable.
F. Visualization of Embedding Importance
To further demonstrate model explainability, we visualize
the importance of context using a perturbation-based sensitivity analysis, following prior LLM studies [84], in which each
token in a text sequence is perturbed, and the resulting change
in the model’s output is measured. We extend this approach
to our multimodal setting by perturbing the text-trajectory
embedding sequence Zi,t index-by-index and observing the
resulting shift in prediction. This enables us to quantify and
visualize the importance of each embedding in Zi,t. Since our
task is formulated as regression, token importance is defined
as the absolute change in the predicted value induced by
perturbation:
Ii,t/l =


fh(fllm(Z
pert
i,t/l)[−1]) − fh(fllm(Z
ori
i,t)[−1])


 , (30)
for each index l in the input sequence Zi,t. Specifically,
each embedding in Zi,t is perturbed individually, and the
corresponding change in predicted ∆tpost,i is recorded. The
magnitude of this change is visualized as a heat map, where
lighter regions indicate greater importance. For each month,
we sample 40 instances for visualization, and the resulting
importance heat maps are shown in Fig. 7.
In Fig. 3, the input sequence is constructed in order as
{P
F
i,t, P M
t
, PT
t
, P N
t
, Xf
i,t, Xa
i,t, Xp
i,t}, where trajectory inputs
occupy the latter portion of the sequence. At these positions,
the visualization shows concentrated, high-importance regions,
indicating that trajectory tokens contribute strongly to prediction and play an important role in estimating ∆tpost,i. Nevertheless, textual inputs remain relevant in certain samples, as
indicated by localized regions of high sensitivity. This suggests
that contextual text provides complementary information that
can assist prediction when needed.
G. Model Demonstration
We demonstrate the deployment of our model to update
delay predictions after aircraft enter the airspace. As new
operational information becomes available, delay predictions
are updated to reflect the evolving context observed by ATCs.
This section adopts a monitoring-style setting in which delay estimates are progressively updated as new information
becomes available. The model was trained on January data
and applied to sample flights from February to illustrate
the prediction update process. This setting challenges the
model with entirely unseen data and demonstrates its ability
to provide continuous predictions. For each sample flight i
trajectory, the full context si,t was constructed at each time t.
The trained model updated yˆi,t = fθ(si,t) sequentially as new
si,t becomes available. The sample trajectories, along with the
prediction results and absolute errors over [T
act
entry, T act
arrival], are
visualized in Fig. 8.
In these examples, the absolute error largely stays within
one minute as predictions adapt over time, indicating progressive refinement with updated context. Since delays are
recorded at the minute level in ATM [68], prediction errors
on the order of one minute indicate the practical relevance
of the proposed framework for post-terminal monitoring. Furthermore, since arrival delays influence turnaround and ground
operations [85], and scheduling of ground services depends
on arrival-time information [86], accurately estimating delays
in advance can improve operational planning. Moreover, predicting ∆tpost,i, which captures the total time spent in the
terminal airspace and taxi-in phase, supports monitoring of
ICAO GANP KPIs such as KPI08 (Additional time in terminal
airspace) and KPI13 (Taxi-in additional time) [75]. In this
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 14
(a) KAL672 (b) KAL742
Fig. 8: Demonstration of the LLM4Delay model. Each figure comprises three panels: (Left) full flight trajectory; (top right)
predicted versus actual delay; and (bottom right) absolute prediction error over time.
context, our framework provides advanced estimation of postterminal delay, thereby enabling proactive coordination of
ground services. Together, these results underscore both the
operational and practical value of the proposed framework.
V. CONCLUSION
This paper presents LLM4Delay, a framework that estimates
delays by predicting post-terminal duration to support ATC
operations at the destination airport. Unlike prior ATM approaches that are limited to fixed-size inputs or a single trajectory, LLM4Delay uses multimodal inputs, including aeronautical text and multiple trajectories, to better model complex
delay-related factors. We propose the instance-level projection,
an effective cross-modality adaptation technique that projects
instance-level trajectory embeddings into the LLM embedding space, outperforming prior techniques that use fixed
tokenization or feature-wise subseries encoding, and enables
the LLM to directly capture instance-level trajectory semantics rather than inferring them from feature-wise segments.
LLM4Delay leverages both a pretrained LLM and a trajectory
encoder, whose complementary contributions are empirically
validated, while updating only the adapter and regression
head, enabling scalable replacement with higher-performing
backbones. The framework demonstrates operational value for
ATM by allowing predictions to be updated as new information
becomes available. Future work may extend the framework to
delay prediction in other operational phases where contextual
information differs, explore broader ATM tasks beyond delay
prediction, and integrate additional modalities, such as images
or audio, to further advance multimodal aviation models.
Additionally, scaling to higher-performing backbone models
may further enhance performance.
REFERENCES
[1] G. Enea and M. Porretta, “A comparison of 4d-trajectory operations
envisioned for ’nextgen’ and ’sesar’, some preliminary findings,” in
Proceedings of the 28th Congress of the International Council of the
Aeronautical Sciences, Sep. 2012, pp. 23–28.
[2] M. Lopez-Lago, J. Serna, R. Casado, and A. Berm ´ udez, “Present and ´
future of air navigation: Pbn operations and supporting technologies,”
International Journal of Aeronautical and Space Sciences, vol. 21, no. 2,
p. 451–468, Oct. 2019.
[3] E. Mueller and G. Chatterji, “Analysis of aircraft arrival and departure
delay characteristics,” in AIAA’s Aircraft Technology, Integration, and
Operations (ATIO) 2002 Technical Forum. American Institute of
Aeronautics and Astronautics, Oct. 2002.
[4] A. Khanal, R. Bhusal, K. Subbarao, A. Chakravarthy, and W. A. Okolo,
“Gaussian processes for flight delay prediction: Learning a stochastic
process,” Journal of Aerospace Information Systems, vol. 22, no. 6, p.
457–476, Jun. 2025.
[5] M. Liu, Q. Fang, Y. Wu, C. Zhao, Y. Yang, and K. Cai, “Notam-evolve:
A knowledge-guided self-evolving optimization framework with llms for
notam interpretation,” arXiv preprint arXiv:2511.07982, 2025.
[6] J. Emmons, T. Sharma, B. Matthews, and M. Salloum, “Text summarization in aviation safety: A comparative study of large language models,”
in AIAA AVIATION FORUM AND ASCEND 2024. American Institute
of Aeronautics and Astronautics, Jul. 2024.
[7] M. Jin, S. Wang, L. Ma, Z. Chu, J. Y. Zhang, X. Shi, P.-Y. Chen,
Y. Liang, Y.-F. Li, S. Pan, and Q. Wen, “Time-LLM: Time series
forecasting by reprogramming large language models,” in International
Conference on Learning Representations (ICLR), 2024.
[8] R. Nigam and K. Govinda, “Cloud based flight delay prediction using
logistic regression,” in 2017 International Conference on Intelligent
Sustainable Systems (ICISS), 2017, pp. 662–667.
[9] Q. Li, R. Jing, and Z. S. Dong, “Flight delay prediction with priority
information of weather and non-weather features,” IEEE Transactions
on Intelligent Transportation Systems, vol. 24, no. 7, pp. 7149–7165,
2023.
[10] W. A. Khan, H.-L. Ma, S.-H. Chung, and X. Wen, “Hierarchical
integrated machine learning model for predicting flight departure delays
and duration in series,” Transportation Research Part C: Emerging
Technologies, vol. 129, p. 103225, Aug. 2021.
[11] Y. Tang, “Airline flight delay prediction using machine learning models,”
in Proceedings of the 2021 5th International Conference on E-Business
and Internet, ser. ICEBI ’21. New York, NY, USA: Association for
Computing Machinery, 2022, p. 151–154.
[12] M.-T. Vo, T.-V. Tran, D.-T. Pham, and T.-H. Do, “A practical real-time
flight delay prediction system using big data technology,” in 2022 IEEE
International Conference on Communication, Networks and Satellite
(COMNETSAT), 2022, pp. 160–167.
[13] I. Hatıpoglu and ˘ O. Tosun, “Predictive modeling of flight delays at ¨
an airport using machine learning methods,” Applied Sciences, vol. 14,
no. 13, p. 5472, 2024.
[14] M. Alfarhood, R. Alotaibi, B. Abdulrahim, A. Einieh, M. Almousa, and
A. Alkhanifer, “Predicting flight delays with machine learning: A case
study from saudi arabian airlines,” International Journal of Aerospace
Engineering, vol. 2024, p. 1–12, Mar. 2024.
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 15
[15] B. Yu, Z. Guo, S. Asian, H. Wang, and G. Chen, “Flight delay prediction
for commercial air transport: A deep learning approach,” Transportation
Research Part E: Logistics and Transportation Review, vol. 125, pp.
203–221, 2019.
[16] W. Wu, K. Cai, Y. Yan, and Y. Li, “An improved svm model for flight
delay prediction,” in 2019 IEEE/AIAA 38th Digital Avionics Systems
Conference (DASC), 2019, pp. 1–6.
[17] Z. Wang, C. Liao, X. Hang, L. Li, D. Delahaye, and M. Hansen,
“Distribution prediction of strategic flight delays via machine learning
methods,” Sustainability, vol. 14, no. 22, 2022.
[18] R. T. Reddy, P. Basa Pati, K. Deepa, and S. T. Sangeetha, “Flight delay
prediction using machine learning,” in 2023 IEEE 8th International
Conference for Convergence in Technology (I2CT), 2023, pp. 1–5.
[19] W. Shao, A. Prabowo, S. Zhao, S. Tan, P. Koniusz, J. Chan, X. Hei,
B. Feest, and F. D. Salim, “Flight delay prediction using airport
situational awareness map,” in Proceedings of the 27th ACM SIGSPATIAL International Conference on Advances in Geographic Information
Systems, ser. SIGSPATIAL ’19. New York, NY, USA: Association for
Computing Machinery, 2019, p. 432–435.
[20] M. Beltman, M. Ribeiro, J. de Wilde, and J. Sun, “Dynamically forecasting airline departure delay probability distributions for individual flights
using supervised learning,” Journal of Air Transport Management, vol.
126, p. 102788, Jun. 2025.
[21] W. A. Khan, S.-H. Chung, A. E. Eltoukhy, and F. Khurshid, “A novel
parallel series data-driven model for iata-coded flight delays prediction
and features analysis,” Journal of Air Transport Management, vol. 114,
p. 102488, Jan. 2024.
[22] Y. J. Kim, S. Choi, S. Briceno, and D. Mavris, “A deep learning approach
to flight delay prediction,” in 2016 IEEE/AIAA 35th Digital Avionics
Systems Conference (DASC), 2016, pp. 1–6.
[23] G. Gui, F. Liu, J. Sun, J. Yang, Z. Zhou, and D. Zhao, “Flight delay
prediction based on aviation big data and machine learning,” IEEE
Transactions on Vehicular Technology, vol. 69, no. 1, pp. 140–150, 2020.
[24] Q. Li and R. Jing, “Flight delay prediction from spatial and temporal
perspective,” Expert Systems with Applications, vol. 205, p. 117662,
Nov. 2022.
[25] Q. Li, X. Guan, and J. Liu, “A cnn-lstm framework for flight delay
prediction,” Expert Systems with Applications, vol. 227, p. 120287, Oct.
2023.
[26] J. Qu, S. Wu, and J. Zhang, “Flight delay propagation prediction based
on deep learning,” Mathematics, vol. 11, no. 3, p. 494, Jan. 2023.
[27] K. Cai, Y. Li, Y.-P. Fang, and Y. Zhu, “A deep learning approach for
flight delay prediction through time-evolving graphs,” IEEE Transactions on Intelligent Transportation Systems, vol. 23, no. 8, pp. 11 397–
11 407, 2022.
[28] X. Shen, J. Chen, and R. Yan, “A spatial–temporal model for networkwide flight delay prediction based on federated learning,” Applied Soft
Computing, vol. 154, p. 111380, Mar. 2024.
[29] C. Li, X. Qi, Y. Yang, Z. Zeng, L. Zhang, and J. Mao, “Fast-ca:
Fusion-based adaptive spatial–temporal learning with coupled attention
for airport network delay propagation prediction,” Information Fusion,
vol. 107, p. 102326, Jul. 2024.
[30] T. Chaudhuri, S. Zhang, and Y. Zhang, “Attention-based deep learning
model for flight delay prediction using real-time trajectory,” SESAR
Innovation Days Conference 2024, pp. 2024–006, 2024.
[31] A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez,
L. u. Kaiser, and I. Polosukhin, “Attention is all you need,” in Advances
in Neural Information Processing Systems, I. Guyon, U. V. Luxburg,
S. Bengio, H. Wallach, R. Fergus, S. Vishwanathan, and R. Garnett,
Eds., vol. 30. Curran Associates, Inc., 2017.
[32] A. Radford, K. Narasimhan, T. Salimans, I. Sutskever et al., “Improving
language understanding by generative pre-training,” 2018.
[33] A. Radford, J. Wu, R. Child, D. Luan, D. Amodei, and I. Sutskever,
“Language models are unsupervised multitask learners,” 2019.
[34] T. Brown, B. Mann, N. Ryder, M. Subbiah, J. D. Kaplan, P. Dhariwal,
A. Neelakantan, P. Shyam, G. Sastry, A. Askell, S. Agarwal, A. HerbertVoss, G. Krueger, T. Henighan, R. Child, A. Ramesh, D. Ziegler,
J. Wu, C. Winter, C. Hesse, M. Chen, E. Sigler, M. Litwin, S. Gray,
B. Chess, J. Clark, C. Berner, S. McCandlish, A. Radford, I. Sutskever,
and D. Amodei, “Language models are few-shot learners,” in Advances
in Neural Information Processing Systems, H. Larochelle, M. Ranzato,
R. Hadsell, M. Balcan, and H. Lin, Eds., vol. 33. Curran Associates,
Inc., 2020, pp. 1877–1901.
[35] J. Devlin, M.-W. Chang, K. Lee, and K. Toutanova, “BERT: Pretraining of deep bidirectional transformers for language understanding,”
in Proceedings of the 2019 Conference of the North American Chapter
of the Association for Computational Linguistics: Human Language
Technologies, Volume 1, J. Burstein, C. Doran, and T. Solorio, Eds.
Minneapolis, Minnesota: Association for Computational Linguistics,
Jun. 2019, pp. 4171–4186.
[36] C. Raffel, N. Shazeer, A. Roberts, K. Lee, S. Narang, M. Matena,
Y. Zhou, W. Li, and P. J. Liu, “Exploring the limits of transfer learning
with a unified text-to-text transformer,” Journal of machine learning
research, vol. 21, no. 140, pp. 1–67, Jan. 2020.
[37] J. Wei, M. Bosma, V. Y. Zhao, K. Guu, A. W. Yu, B. Lester, N. Du,
A. M. Dai, and Q. V. Le, “Finetuned language models are zero-shot
learners,” arXiv preprint arXiv:2109.01652, 2021.
[38] L. Ouyang, J. Wu, X. Jiang, D. Almeida, C. Wainwright, P. Mishkin,
C. Zhang, S. Agarwal, K. Slama, A. Ray et al., “Training language
models to follow instructions with human feedback,” arXiv preprint
arXiv:2203.02155, 2022.
[39] H. Touvron, T. Lavril, G. Izacard, X. Martinet, M.-A. Lachaux,
T. Lacroix, B. Roziere, N. Goyal, E. Hambro, F. Azhar ` et al.,
“Llama: Open and efficient foundation language models,” arXiv preprint
arXiv:2302.13971, 2023.
[40] H. Touvron, L. Martin, K. Stone, P. Albert, A. Almahairi, Y. Babaei,
N. Bashlykov, S. Batra, P. Bhargava, S. Bhosale et al., “Llama
2: Open foundation and fine-tuned chat models,” arXiv preprint
arXiv:2307.09288, 2023.
[41] A. Grattafiori, A. Dubey, A. Jauhri, A. Pandey, A. Kadian, A. Al-Dahle,
A. Letman, A. Mathur, A. Schelten, A. Vaughan et al., “The llama 3
herd of models,” arXiv preprint arXiv:2407.21783, 2024.
[42] A. Q. Jiang, A. Sablayrolles, A. Mensch, C. Bamford, D. S. Chaplot,
D. de las Casas, F. Bressand, G. Lengyel, G. Lample, L. Saulnier,
L. R. Lavaud, M.-A. Lachaux, P. Stock, T. L. Scao, T. Lavril,
T. Wang, T. Lacroix, and W. E. Sayed, “Mistral 7b,” arXiv preprint
arXiv:2310.06825, 2023.
[43] A. Q. Jiang, A. Sablayrolles, A. Roux, A. Mensch, B. Savary, C. Bamford, D. S. Chaplot, D. de las Casas, E. B. Hanna, F. Bressand,
G. Lengyel, G. Bour, G. Lample, L. R. Lavaud, L. Saulnier, M.-A.
Lachaux, P. Stock, S. Subramanian, S. Yang, S. Antoniak, T. L. Scao,
T. Gervet, T. Lavril, T. Wang, T. Lacroix, and W. E. Sayed, “Mixtral of
experts,” arXiv preprint arXiv:2401.04088, 2024.
[44] T. Mesnard et al., “Gemma: Open models based on gemini research and
technology,” arXiv preprint arXiv:2403.08295, 2024.
[45] M. Riviere et al., “Gemma 2: Improving open language models at a
practical size,” arXiv preprint arXiv:2408.00118, 2024.
[46] A. Kamath et al., “Gemma 3 technical report,” arXiv preprint
arXiv:2503.19786, 2025.
[47] S. Gunasekar, Y. Zhang, J. Aneja, C. C. T. Mendes, A. D. Giorno,
S. Gopi, M. Javaheripi, P. Kauffmann, G. de Rosa, O. Saarikivi,
A. Salim, S. Shah, H. S. Behl, X. Wang, S. Bubeck, R. Eldan, A. T.
Kalai, Y. T. Lee, and Y. Li, “Textbooks are all you need,” arXiv preprint
arXiv:2306.11644, 2023.
[48] M. Javaheripi et al., “Phi-2: The surprising power of small
language models,” https://www.microsoft.com/en-us/research/blog/
phi-2-the-surprising-power-of-small-language-models, 2023, accessed:
21 February 2025.
[49] M. Abdin et al., “Phi-3 technical report: A highly capable language
model locally on your phone,” arXiv preprint arXiv:2404.14219, 2024.
[50] J. Bai et al., “Qwen technical report,” arXiv preprint arXiv:2309.16609,
2023.
[51] Qwen Team, “Introducing qwen1.5,” https://qwenlm.github.io/blog/
qwen1.5/, February 2024.
[52] A. Yang et al., “Qwen2 technical report,” arXiv preprint
arXiv:2407.10671, 2024.
[53] ——, “Qwen2.5 technical report,” arXiv preprint arXiv:2412.15115,
2025.
[54] ——, “Qwen3 technical report,” arXiv preprint arXiv:2505.09388, 2025.
[55] S. Biderman et al., “Pythia: A suite for analyzing large language models
across training and scaling,” arXiv preprint arXiv:2304.01373, 2023.
[56] D. Guo et al., “Deepseek-r1: Incentivizing reasoning capability in llms
via reinforcement learning,” arXiv preprint arXiv:2501.12948, 2025.
[57] C. Chang, W.-Y. Wang, W.-C. Peng, and T.-F. Chen, “Llm4ts: Aligning
pre-trained llms as data-efficient time-series forecasters,” ACM Transactions on Intelligent Systems and Technology, vol. 16, no. 3, Apr. 2025.
[58] N. Gruver, M. Finzi, S. Qiu, and A. G. Wilson, “Large language
models are zero-shot time series forecasters,” in Proceedings of the 37th
International Conference on Neural Information Processing Systems, ser.
NIPS ’23. Red Hook, NY, USA: Curran Associates Inc., 2023.
[59] Y. Liu, G. Qin, X. Huang, J. Wang, and M. Long, “Autotimes: Autoregressive time series forecasters via large language models,” in Advances
in Neural Information Processing Systems, A. Globerson, L. Mackey,
JOURNAL OF LATEX CLASS FILES, VOL. 14, NO. 8, AUGUST 2021 16
D. Belgrave, A. Fan, U. Paquet, J. Tomczak, and C. Zhang, Eds., vol. 37.
Curran Associates, Inc., 2024, pp. 122 154–122 184.
[60] X. Olive, L. Basora, B. Viry, and R. Alligier, “Deep trajectory clustering
with autoencoders,” in ICRAT 2020, 9th International Conference for
Research in Air Transportation, 2020.
[61] W. Zeng, Z. Xu, Z. Cai, X. Chu, and X. Lu, “Aircraft trajectory clustering
in terminal airspace based on deep autoencoder and gaussian mixture
model,” Aerospace, vol. 8, no. 9, 2021.
[62] Z. Yue, Y. Wang, J. Duan, T. Yang, C. Huang, Y. Tong, and B. Xu,
“TS2vec: Towards universal representation of time series,” in Proceedings of the AAAI Conference on Artificial Intelligence, vol. 36, no. 8,
2022, pp. 8980–8987.
[63] D. Luo, W. Cheng, Y. Wang, D. Xu, J. Ni, W. Yu, X. Zhang,
Y. Liu, Y. Chen, H. Chen et al., “Time series contrastive learning
with information-aware augmentations,” in Proceedings of the AAAI
Conference on Artificial Intelligence, vol. 37, no. 4, 2023, pp. 4534–
4542.
[64] J.-Y. Franceschi, A. Dieuleveut, and M. Jaggi, “Unsupervised scalable
representation learning for multivariate time series,” in Advances in
Neural Information Processing Systems, H. Wallach, H. Larochelle,
A. Beygelzimer, F. d'Alche-Buc, E. Fox, and R. Garnett, Eds., vol. 32. ´
Curran Associates, Inc., 2019.
[65] E. Eldele, M. Ragab, Z. Chen, M. Wu, C. K. Kwoh, X. Li, and C. Guan,
“Time-series representation learning via temporal and contextual contrasting,” in Proceedings of the Thirtieth International Joint Conference
on Artificial Intelligence, IJCAI-21, 2021, pp. 2352–2359.
[66] S. Tonekaboni, D. Eytan, and A. Goldenberg, “Unsupervised representation learning for time series with temporal neighborhood coding,” in
International Conference on Learning Representations, sep 2020.
[67] T. Phisannupawong, J. J. Damanik, and H.-L. Choi, “Aircraft trajectory
segmentation-based contrastive coding: A framework for self-supervised
trajectory representation,” IEEE Open Journal of Intelligent Transportation Systems, pp. 1–1, 2025.
[68] Ministry of Land, Infrastructure and Transport, South Korea, “Airportal,”
https://www.airportal.go.kr/, 2024, accessed: 7 April 2023.
[69] D. W. Wragg, A Dictionary of Aviation, 1st ed. Reading, Berkshire,
UK: Osprey Publishing Ltd., 1973, p. 189.
[70] International Civil Aviation Organization, PANS-ATM Doc 4444: Procedures for Air Navigation Services - Air Traffic Management, sixteenth ed.
ICAO, 2016.
[71] G. B. Valor, “Ogimet: Weather data portal,” https://www.ogimet.com/
home.phtml.en, 2025, accessed: 9 June 2025.
[72] Ministry of Land, Infrastructure and Transport, “Aeronautical Information Management (AIM),” https://aim.koca.go.kr/xNotam/, 2025, accessed: 9 June 2025.
[73] M. Schafer, M. Strohmeier, V. Lenders, I. Martinovic, and M. Wilhelm, ¨
“Bringing up opensky: A large-scale ads-b sensor network for research,”
in IPSN-14 Proceedings of the 13th International Symposium on Information Processing in Sensor Networks, 2014, pp. 83–94.
[74] T. Phisannupawong, J. J. Damanik, and H.-L. Choi, “Atfmtraj: Aircraft trajectory classification data for air traffic management [dataset],”
hugging Face, v1, 2024. https://huggingface.co/datasets/petchthwr/
ATFMTraj.
[75] International Civil Aviation Organization, Doc 9750: Global Air Navigation Plan, 6th ed. ICAO, 2016.
[76] Y. Nie, N. H. Nguyen, P. Sinthong, and J. Kalagnanam, “A time
series is worth 64 words: Long-term forecasting with transformers,” in
International Conference on Learning Representations, 2023.
[77] R. Girshick, “Fast r-cnn,” in 2015 IEEE International Conference on
Computer Vision (ICCV), 2015, pp. 1440–1448.
[78] P. H. Tom Pollard, “python-metar,” https://python-metar.readthedocs.io/,
2014, accessed: 2025-12-10.
[79] D. Bahdanau, K. Cho, and Y. Bengio, “Neural machine translation by
jointly learning to align and translate,” in International Conference on
Learning Representations (ICLR), 2024.
[80] S. Yoon and K. Lee, “Aircraft trajectory prediction with inverted
transformer,” IEEE Access, vol. 13, pp. 26 318–26 330, 2025.
[81] R. Mo, Y. Pei, N. V. Venkatarayalu, P. Nathaniel Joseph, A. B. Premkumar, S. Sun, and S. K. K. Foo, “Unsupervised TCN-AE-Based Outlier
Detection for Time Series With Seasonality and Trend for Cellular
Networks,” IEEE Transactions on Wireless Communications, vol. 22,
no. 5, pp. 3114–3127, 2023.
[82] M. Thill, W. Konen, H. Wang, and T. Back, “Temporal convolutional ¨
autoencoder for unsupervised anomaly detection in time series,” Applied
Soft Computing, vol. 112, p. 107751, 2021.
[83] L. Gao et al., “The pile: An 800gb dataset of diverse text for language
modeling,” arXiv preprint arXiv:2101.00027, 2020.
[84] X. Wu, W. Yao, J. Chen, X. Pan, X. Wang, N. Liu, and D. Yu, “From
language modeling to instruction following: Understanding the behavior
shift in llms after instruction tuning,” arXiv preprint arXiv:2310.00492,
2024.
[85] C.-L. Wu and R. E. Caves, “The punctuality performance of aircraft
rotations in a network of airports,” Transportation Planning and Technology, vol. 26, no. 5, pp. 417–436, 2003.
[86] S. Yan and C. Chang, “A network model for gate assignment,” Journal
of Advanced Transportation, vol. 32, no. 2, p. 176–189, Jun. 1998.
Thaweerath Phisannupawong received a B.Eng.
degree in Aeronautical Engineering and Commercial
Pilot License from King Mongkut’s Institute of
Technology Ladkrabang (KMITL), Bangkok, Thailand, in 2021. He received an M.S. degree in
Aerospace Engineering from the Korea Advanced
Institute of Science and Technology (KAIST), Daejeon, South Korea, where he is currently pursuing
a Ph.D. degree in Aerospace Engineering. His research focuses on aerospace data applications and
representation learning.
Joshua J. Damanik received the B.S. degree in
engineering physics from Institut Teknologi Bandung, Indonesia, in 2018, and the M.S. and Ph.D.
degrees in aerospace engineering from the Korea Advanced Institute of Science and Technology
(KAIST), Daejeon, South Korea, in 2021 and 2025,
respectively. He was a postdoctoral researcher in
the AI-Transformed Aerospace Research Group until
2026. His research interests include robotics estimation and control, and data mining.
Han-Lim Choi (Senior Member, IEEE) received
the B.S. and M.S. degrees in aerospace engineering from the Korea Advanced Institute of Science
and Technology (KAIST), Daejeon, South Korea, in
2000 and 2002, respectively, and the Ph.D. degree in
aeronautics and astronautics from the Massachusetts
Institute of Technology (MIT), Cambridge, MA,
USA, in 2009. Then, he studied at MIT as a Postdoctoral Associate until he joined KAIST, in 2010.
He is currently a Professor of aerospace engineering
at KAIST. His research interests include estimation
and control for sensor networks and decision making for multi-agent systems.
He was a recipient of the Automatic Applications Prize, in 2011 (together with
Dr. Jonathan P. How).