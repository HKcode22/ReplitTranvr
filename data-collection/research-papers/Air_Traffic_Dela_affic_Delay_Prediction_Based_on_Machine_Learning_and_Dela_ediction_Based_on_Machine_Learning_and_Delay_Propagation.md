Purdue University
Purdue e-Pubs
Open Access Theses Theses and Dissertations
5-2018
Air Traffic Dela affic Delay Prediction Based on Machine Learning and Dela ediction Based on Machine Learning and Delay
Propagation
Meng Li
Purdue University
Follow this and additional works at: https://docs.lib.purdue.edu/open_access_theses
Recommended Citation
Li, Meng, "Air Traffic Delay Prediction Based on Machine Learning and Delay Propagation" (2018). Open
Access Theses. 1415.
https://docs.lib.purdue.edu/open_access_theses/1415
This document has been made available through Purdue e-Pubs, a service of the Purdue University Libraries.
Please contact epubs@purdue.edu for additional information. 
AIR TRAFFIC DELAY PREDICTION BASED ON MACHINE LEARNING AND
DELAY PROPAGATION
A Dissertation
Submitted to the Faculty
of
Purdue University
by
Meng Li
In Partial Fulfillment of the
Requirements for the Degree
of
Master of Science
May 2018
Purdue University
West Lafayette, Indiana
ii
THE PURDUE UNIVERSITY GRADUATE SCHOOL
STATEMENT OF DISSERTATION APPROVAL
Dr. Dengfeng Sun, Chair
School of Aeronautics and Astronautics
Dr. Shaoshuai Mou
School of Aeronautics and Astronautics
Dr. Inseok Hwang
School of Aeronautics and Astronautics
Dr. Lingsong Zhang
Department of Statistics
Approved by:
Dr. Weinong Chen
Head of the School Graduate Program
iii
ACKNOWLEDGMENTS
It is a genuine pleasure to express my sincere thanks to Dr. Dengfeng Sun for his
guidance and kindness. I would also like to express my appreciation to my committee
members for their advice. And thanks for the support from Purdue library.
Sincerely,
Meng Li
Purdue University
02/12/2018
iv
PREFACE
This dissertation is for the degree of Master of Science at Purdue University. The
research is under the supervision of Professor Dengfeng Sun in School of Aeronautics
and Astronautics.
v
TABLE OF CONTENTS
Page
LIST OF TABLES . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . vi
LIST OF FIGURES . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . vii
SYMBOLS . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ix
ABBREVIATIONS . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . x
ABSTRACT . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . xi
1 INTRODUCTION . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1
2 MODEL DESCRIPTION . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 11
2.1 Random Forest Classifier . . . . . . . . . . . . . . . . . . . . . . . . . . 13
2.2 Delay Propagation Model . . . . . . . . . . . . . . . . . . . . . . . . . 14
3 DATA ANALYST . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 20
3.1 Source of Data . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 20
3.2 Preprocessing of Data . . . . . . . . . . . . . . . . . . . . . . . . . . . 20
3.3 Oversampling of Imbalanced Data . . . . . . . . . . . . . . . . . . . . . 25
3.4 Quick Blending for Database . . . . . . . . . . . . . . . . . . . . . . . . 26
4 FEATURE SELECTION . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 28
4.1 Metrics of Accuracy . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 29
4.2 Recursive Feature Selection . . . . . . . . . . . . . . . . . . . . . . . . 31
4.3 Selected Features . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 32
5 APPLICATION . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 40
5.1 Chained Delay Prediction . . . . . . . . . . . . . . . . . . . . . . . . . 40
5.2 Impact of Iteration Number . . . . . . . . . . . . . . . . . . . . . . . . 43
6 CONCLUSIONS . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 47
REFERENCES . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 48
vi
LIST OF TABLES
Table Page
3.1 Reference table of delay groups . . . . . . . . . . . . . . . . . . . . . . . . 22
3.2 Abbreviation of major airports . . . . . . . . . . . . . . . . . . . . . . . . 25
4.1 Comparison of the accuracy . . . . . . . . . . . . . . . . . . . . . . . . . . 38
vii
LIST OF FIGURES
Figure Page
1.1 United States airlines on-time arrivals and delayed arrivals from 2008 to
2017. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 2
1.2 United States airlines on-time rate from 2008 to 2017. . . . . . . . . . . . . 3
1.3 Overview of the national air industry on-time performance of 2017. . . . . 4
1.4 5 itineraries for delay propagation through ORD. . . . . . . . . . . . . . . 5
1.5 Diagram of flights between the airports . . . . . . . . . . . . . . . . . . . . 6
2.1 Mixed approach for chained delay prediction. . . . . . . . . . . . . . . . . 11
2.2 An example of mixed delay prediction approach. . . . . . . . . . . . . . . . 12
2.3 An example of mixed delay prediction approach. . . . . . . . . . . . . . . . 13
2.4 Airport capacity curve of hourly departure and hourly arrival. . . . . . . . 16
2.5 Departure delay distribution with scheduled airport turn time. . . . . . . . 18
2.6 Approximation error with different minimum airport turn time. . . . . . . 19
3.1 Departure delay with LAAD of ORD airport on 2016/01/03. . . . . . . . . 21
3.2 Arrival delay with departure delay of ORD-CLT airline on 2016/01/03. . . 22
3.3 ORD related airports network. . . . . . . . . . . . . . . . . . . . . . . . . . 24
3.4 Quick blending algorithm. . . . . . . . . . . . . . . . . . . . . . . . . . . . 27
4.1 Binary classification confusion matrix. . . . . . . . . . . . . . . . . . . . . 29
4.2 Delay group confusion matrix. . . . . . . . . . . . . . . . . . . . . . . . . . 30
4.3 Feature selection process. . . . . . . . . . . . . . . . . . . . . . . . . . . . 31
4.4 Normalized feature importance for arrival delay prediction . . . . . . . . . 33
4.5 Optimal feature importance for arrival delay prediction . . . . . . . . . . . 34
4.6 Normalized feature importance for departure delay prediction. . . . . . . . 35
4.7 Optimal feature importance for departure delay prediction . . . . . . . . . 36
4.8 Optimal feature importance for minor airports arrival delay prediction . . 36
viii
Figure Page
4.9 Optimal feature importance for minor airports departure delay prediction . 37
4.10 Airport feature importance for delay prediction . . . . . . . . . . . . . . . 37
4.11 Arrival delay error distribution with error group . . . . . . . . . . . . . . . 39
4.12 Departure delay error distribution with error group . . . . . . . . . . . . . 39
5.1 Flights distribution with iteration number . . . . . . . . . . . . . . . . . . 41
5.2 Performance comparison . . . . . . . . . . . . . . . . . . . . . . . . . . . . 43
5.3 Relaxed accuracy with the iteration number . . . . . . . . . . . . . . . . . 44
5.4 Accuracy with the iteration number . . . . . . . . . . . . . . . . . . . . . . 45
5.5 Total number of the prediction error with the iteration number . . . . . . 45
5.6 Total severity of the prediction error with the iteration number . . . . . . 46
5.7 Normalized prediction error distribution . . . . . . . . . . . . . . . . . . . 46
ix
SYMBOLS
f a flight in an aircraft’s itinerary
f0 immediate predecessor flight
tmin minimum airport turn time in minutes
ts(f, f0
) scheduled airport turn time
tLAAD(f) late arriving aircraft delay of flight f in minutes
ta(f) arrival delay of f in minutes
SD(f) scheduled departure time
SA(f) scheduled arrival timef
x
ABBREVIATIONS
AD Arrival Delay
AND Approximate Network Delays model
ASPM Aviation System Performance Metrics
BTS Bureau of Transportation Statistics
CH Chain delay model
DD Departure Delay
FAA Federal Aviation Administration
FN False Negative
FP False Positive
LAAD Late Arriving Aircraft Delay
LCD Local Climatological Data
NAS National Airspace System
NextGen Next Generation Air Transportation System
NOAA National Oceanic and Atmospheric Administration
OD Origin-Destination
ORD O’Hare Airport
RF Random Forest
RFE Recursive Feature Elimination
SIS Susceptible-Infected-Susceptible
SMOTE Synthetic Minority Over-Sampling Technique
TN True Negative
TP True Positive
TRACON Terminal Radar Approach Control
WITI Weather Impacted Traffic Index
xi
ABSTRACT
Li, Meng MS, Purdue University, May 2018. Air Traffic Delay Prediction Based on
Machine Learning and Delay Propagation. Major Professor: Dengfeng Sun.
Flight Delay creates significant problems in the current aviation system. Methods
are needed to analyze the manner in which delay propagates in the airport networks.
Traditional methods are inadequate to the task. This paper presented a new machine
learning based air traffic delay prediction model that combined multi-label random
forest classification and approximated delay propagation model. To improve the prediction performance, an optimal feature selection process is introduced and demonstrated to have better performance than directly using all the features of available
datasets. Departure delay and late arriving aircraft delay are shown to be the most
critical features for delay prediction. To utilize these two features, a delay propagation model is proposed as a link to connect them to build a chained delay prediction
model. Given the initial departure delay, the chained model is demonstrated to have
the ability to predict the flight delay along the same aircrafts itinerary. By updating
the actual departure delay with the iteration number along with the itinerary, the
model’s accuracy can be further improved. Our application results demonstrate the
value of machine learning and delay propagation for analyzing and predicting the air
traffic delay in daily operation.
Keywords: Machine Learning, Delay Prediction, Delay Propagation
1
1. INTRODUCTION
A flight delay is defined when the actual time of flights departure or arrival within
airports is later than the scheduled operation time. In the United States, flight
delay is recorded if the real time is late more than 15 minutes. A flight delay is a
phenomenon raised with the world airline. The world airline industry is witnessing
an unprecedented developing period. As is shown in Figure 1.1,the total number of
commercial flights within the United States air traffic system fluctuates around 5
million from 2008 to 2017. Figure 1.2 provides the on-time rate of United States from
2008 to 2017. The on-time rate varies from 76.34% in 2014 to 82.32% in 2012. In the
past three years, the on-time rate is stable at 81%. In fact, apart from 2008 and 2014,
the on-time rate is relatively stable. The fluctuating rate is affected by many factors
such as airline companies, passengers, Federal Aviation Administrations. Based on
a report from Airbus, the commercial airlines will increase from 26 million to 48.7
million, and the total passenger-kilometers will be 13.5 trillion by 2030. With the
contrast between the rapid growth of air traffic and constrained air capacity, increasing
flight delays in the United States (US) have become a serious and prominent problem.
According to the Bureau of Transportation Statistics (BTS), nearly one in four
airline flights arrived at its destination over 15 minutes late [1]. It is reported that
the annual total cost of air transportation delays was over $30 billion, which poses
a significant challenge to the development of Next Generation Air Transportation
System (NextGen) [1–3].Air transportation delay is also a disturb and inconvenience
for the passengers. The passengers will have to choose to adjust travel arrangement
if the delayed flight is in travel plan. The passengers will suffer the economic loss and
the negative emotions. Apart from the direct impact to the airlines and passengers,
air transportation also has indirect effects. As a core part of modern transportation
system and economic system, the air transportation will influence the other down-
2
Figure 1.1.. United States airlines on-time arrivals and delayed arrivals
from 2008 to 2017.
stream industries which rely on flights for their commercial operations. This fact
motivates the need for accurate and practical prediction of flight delays, especially
for individual trips.
For the United States air traffic system, FAA provides the national air transportation performance overview. The annual operation of 2017 is shown in the pie chart of
figure 1.3. The percentage of on-time flights is 79.4%, which is common on-time rate
for most of the airlines. In the delayed flights, human-factors such as Aircraft arriving
late, National Aviation System Delay and Air Carrier Delay compose 88.15% of the
total delays. Aircraft arriving late is caused by the late arriving at a former airport.
National Aviation System Delay is under the control of the National Airspace System(NAS) including non-extreme weather conditions, airport operations, overloaded
sector volume and air traffic control. Air carrier Delay is from the leading airlines
such as aircraft repair and maintain, transfer of crew, passenger, baggage, fueling
3
Figure 1.2.. United States airlines on-time rate from 2008 to 2017.
and engineering inspection.Delay caused directly by weather, cancellation and divert
little compared to the delays caused by human factors. The delays caused by human
factors, overloaded on-route sectors and airports are still a severe problem to solve.
Beyond the delays directly created by limited airspace capacity, a third of the late
arrivals were caused by an aircraft arriving late and thus having to depart late on its
next flight, which is known as delay propagation [1, 4]. Given the fact that airlines
fly their aircraft on daily scheduled itineraries that require visits to a sequence of
airports, the late-arriving aircraft delay early in the day has a significant impact on
the downstream delay performance [5].For example, if an aircraft is delayed by one
hour in a departure from the first airport, it will almost certainly be late in arriving
at its next airport. The new arrival may also result in a subsequent late departure
of that aircraft, which will lead to a sequence of late-arriving aircraft delays [4].
Figure 1.4 demonstrated five actual examples to describe delay propagation through
OHare Airport(ORD) on 01/03/2016. These itineraries and data are not provided by
4
Figure 1.3.. Overview of the national air industry on-time performance of
2017.
BTS directly and are extracted from the airline on-time performance database. Since
most of the commercial flights will stop operation and rest between 2:00 am and 4:00
am for daily engineering inspection, the most extended period for delay propagation
will not be more than one day. By connecting the flight data at different airports of
the same day with the same tail number, the actual flight itineraries are shown with
late time. The number before and after the name of airports are delayed arrival time
and late departure time. A definite time means the actual operation time is later
than the scheduled time and negative time indicates the opposite condition. Since
it is assumed that the delay of the last day will not be propagated to the next day,
the primary airports only have departure delay time and terminal airports just have
arrival delay time.
The United States Air Traffic system has several hub airports such as ORD and
CLT. The above five itineraries cannot provide a statistics overview for delay prop-
5
agation. But it can still be noticed that ORD is a source for the delay. These can
be explained by two aspects, airport congestion and air traffic control from NAS or
carrier. Airport congestion indicates the arrival and departure times are more than
the scheduled airport capacity and the flights have to expand the gate in and gate
out time. ORD is the most significant airport in Chicago area and are responsible for
most of the air transportation of the adjacent states, for example, IL, IN, and WI.
Air traffic control indicates the delay is a result of the human strategy, which is under
control for an emergency. As a hub airport of US air traffic system, ORD can provide
flight service for airline companies and has plenty of space for flights retention. ORD
plays an indispensable role for the delay propagation of US air traffic system.
The delay propagation is inherent with the National Airspace System(NAS), which
includes a large number of connective resources, such as aircraft, crew, passengers
and gate space. Moreover, the increasing air traffic demand pushes the NextGen
to reduce the slack time between arrivals and departures, which will make the NAS
further suffering from severe delay propagation through the network. Therefore, the
modeling of delay propagation is a critical factor for the success of accurate flight
delay prediction.
Figure 1.4.. 5 itineraries for delay propagation through ORD.
6
Delay analysis has been a significant research topic, which attracts a great deal
of attention to delay prediction. Most of the flight delay research are launched from
two aspects, model or data. Analysis of model starts from analyzing the airline
operation mechanics and covering the majority of the operation data. The efficiency
of these research depends on how researchers understand the operation. Geographical
factors such as sector operation are considered in some research. Joseph et al. [6]use
a stochastic weather model to estimate and predict the airspace capacity. They
simulated the influence of stochastic convective weather to given airspace. AM Bayen
et al. [7] proposed a Lagrangian delay propagation model based on flight trajectories
interaction. This model follows the individual flights in sectors and can predict the
delay backpropagation through Terminal Radar Approach Control(TRACON) shown
in figure 1.5. But the accumulation of sector uncertainties limits its application in
the large-scale system.
Figure 1.5.. Diagram of flights between the airports .
Section operation requires the trajectory simulation for all the flights, which is
an excellent challenge for the computing ability and unpractical for current research.
Other research seeks the other factors to solve the delay propagation by simplifying
the en route process as a link. Shervin et al. [8]show re-allocating the scheduled slack
7
time while keeping the fleeting and crew schedule unchanged allows improvement in
air traffic systems. But modifying the departure time is not applicable in most of
the case for the whole system and doubts are cast toward this allocation. Sandip
Roy [9] developed an aggregated stochastic model for US 20 major air traffic control
centers. This model connects the control center into a network and simulates the air
traffic between the centers as a Poisson process. The macro simulation for the control
centers prevents it from delay prediction. Willy Vigneau [10] analyzed the delay
propagation in France and resented the high dependency between the arrival delay
and departure delay. To model the delay propagation, he divided the station stop
time into three categories, short, medium and long. This simple classification only
considered the airport capacity and the station stop time, which limits the model’s
prediction performance. Pablo Fleurquin [11] et al. simulated the airport congestion
delay in US air traffic system. But they assume that the delay will be constant during
the airport process. In fact, most of the delay fluctuation occurs in airports, and the
delay propagation between the air is relatively stable.
B.Baspinar et al. [12] utilized susceptible-infected-susceptible(SIS) models to simulate the delayed flights as infected units in air traffic system. Stephen Welman et
al. [13] decomposed the total delayed time into separate before airports of the same
flights and designed airport delay multiplier to calculate the delay propagation. But
the delay multiplier is a year averaged parameter and has little information for individual plane delay prediction. Mueller et al. [14] demonstrated the characterization
and distribution of the delay in a traditional statistical approach. Klein et al. [15]
integrated the convective weather forecasts, terminal airports weather forecasts and
scheduled flights information to predict the daily airport delay time based on a metric called Weather Impacted Traffic Index (WITI). Considering delay propagation,
Pyrgiotis et al. [4] proposed an Approximate Network Delays model (AND), which
analyses the delay propagation within the network of airports. By providing the demand and capacity of the airports and flight itineraries, AND computes a queuing
model and a delay propagation model to analyze the delay propagation phenomenon
8
within 30 main airports of US. These models can predict the flight delays within the
airport systems, but they can only compute the macro daily or hourly delay and fail to
predict the individual flight delay. A good model can match the existed phenomenon
and predicts the future operation in a short time. But the difference between the
model and the fact will constraints the highest performance of this method.
Apart from analyzing the delay from building a mathematical model, data-driven
research has also drawn a lot of attention in the past ten years. With the rapid development of computer and machine learning theory, analyzing the airline operation
directly from data is displaying an exciting research future. Data-driven research
starts from data and can discover many phenomena which are difficult for people to
understand and compute directly. By training the linear model in the Bayes network
with cancellations, the Bayesian network model can predict the delay propagation
within three significant airports [16]. Based on random forest classification and regression, Rebello et al. [17]] captured the macro delay patterns and dependencies of
airports within the network of air traffic systems. However, to predict the departure
delay, they considered the taxi in/out and wheel on/off time. These features are
inaccessible in actual practice, especially when predicting future individual flights.
For predicting arrival delays of individual flights, Choi et al. [18] proposed a machine
learning based model focused on weather-induced delay prediction of an individual
plane. By combining the weather data and air traffic data, this model improves the
binary classification accuracy for specific individual origin-destination pair. However,
this model is limited to provide the only binary classification of delay. Moreover, most
of the previous machine learning work have a problem of feature selection. Since these
research focus more on data and neglect the model of operation, they are relatively
time-consuming and may draw some strange conclusions because of overfitting.
Overall, most of the previous work has limitations. The traditional approaches
can model the delay propagation of air traffic operation, but they cannot analytically
analyze the enormous volume of traffic and weather dataset are not performing well
for individual flights. On the other side, the machine learning approaches can discover
9
the hidden patterns in the data, but they lack the inner relationships between different
airports, such as delay propagation. Most of these types of research can only analyze
the flights of one itinerary or just within a small group of airports. Therefore, a mixed
approach including the machine learning and air traffic operation is proposed with
feature selection to improve the performance of the prediction. Moreover, this new
approach can work as a chain model to provide sequence future delay predictions for
individual flights along with their scheduled itineraries and macro operation condition
for the main airports.
The significant contributions of this paper can be summarized in three parts.
First, a feature selection process is introduced for the multi-label classification algorithm, which supports both the departure and arrival delay prediction modules.
The predictable factors that can affect the air traffic include the weather data and
air traffic performance data. Based on the combinations of Bureau of Transportation
Statistics(BTS), the National Oceanic and Atmospheric Administration (NOAA) and
Aviation System Performance Metrics (ASPM), we design an algorithm to select the
optimal training features that predict the departure delay and arrival delay with the
highest accuracy. Second, a delay propagation model is proposed with a critical concept as Late Arriving Aircraft Delay (LAAD), which is one of the five leading causes
of airline delays in BTS. The LAAD describes the intimate relationship between a
previous arrival delay and the present departure delay using the same aircraft. LAAD
describes how much-delayed arrival time is from the late arrival at the former airport. It has to be pointed out that the delayed arrival time at the previous airport
will not fully propagate to the next arrival delayed time in most of the case. LAAD
will reduce due to the buffer function of airport turn time. Typically, the airline
companies will schedule enough airport turn time for flights, which will decrease the
effect of the unexpected delay. Finally, a chain model is built by using the LAAD
as the link connecting previous arrival delay and present departure delay. Given the
initial departure delay, the chain model works by iteratively predicting arrival delay, computing LAAD, and predicting next departure delay along the same aircrafts
10
itinerary. By updating the actual departure delay with the iteration number, the
model’s accuracy can be further improved.
The rest of this paper is organized as follows. Section 2 introduces a general
description of the chain model, outlines its overall frame and presents the details of
delay propagation model. Section 3 describes how the raw data is processed. Section 4
explains the details of feature selection. Section 5 presents application results to show
the performance of the chain model. Section 6 concludes this paper.
11
2. MODEL DESCRIPTION
The mixed approach for predicting arrival delay and departure delay of only flights
includes three modules: the arrival delay prediction module, the departure delay prediction module and the delay propagation module. The frame of the mixed approach
is shown in the Figure 2.1. The delay prediction model works as the link, which connects the arrival delay prediction module and the departure delay prediction module.
The chain model can be built by iteratively running the connected modules when
the initial departure delay is given. All the other inputs include the flight schedule,
and training set features. The arrival delay and departure delay prediction modules
are based on random forest model trained with selected features, where the detail
of feature selection is discussed in section 4. The delay propagation module is an
optimized function to fit the historical LAAD.
Figure 2.1.. Mixed approach for chained delay prediction.
The interaction between the flights in air traffic system is not computed directly
in mixed delay prediction approach. Mostly, the interaction between the flights refers
to the operation congestion in sectors and airport runways. Converting the air traffic
congestion to several variables allows all the flight itineraries can be modeled inde-
12
pendently and fast in parallel computing. This characteristic is suitable for air traffic
system which contains a significant amount of data. Since the interaction has been
extracted to the individual flights, the simulation of massive flights is converted to
the simulation of single plane through the scheduled airports.
To illustrate this mixed prediction approach more clearly, a specific example which
composes four airports in the whole itinerary is shown in figure 2.2.
Figure 2.2.. An example of mixed delay prediction approach.
As the original origin, airport 1 provides the real departure delay time. Then the
real departure delay time is processed by three modules mentioned above in order
and is converted to simulated departure time at airport 2. This simulated departure
can be utilized for a further simulation to airport 3 and airport4. This value can also
be substituted by actual departure delay time at airport 2. This depends on the how
the mixed prediction approach is used. The further prediction is feasible but is less
accurate without the updated actual data. In the final step from airport 3 to airport
4, only arrival delay module is utilized, and the whole model comes to an end.
13
2.1 Random Forest Classifier
As is shown in figure 2.3, The Random Forest (RF) classifier is an ensemble method
based on multiple decision trees [19]. The whole sample is divided into several subsets
of data. Each dataset will be regressed or classified by a decision tree. Then for the
test set of data, the model will generate the result of learning by trees independently.
After the generation of the results, the forest will vote for the most convincing result.
The corrected decision trees will be entrusted more significant weight, and the wrong
decision trees will be derived part of the weight. Keeping the tree of low accuracy is
helpful to avoid the model bias. The decision process of the convincing high tree will
return the feature importance automatically. The decision tree is a selection algorithm
based on a sequence of the binary tree and classifies the data. This algorithm is easy
to understand but has some disadvantages. Simple decision tree tends to overfit the
model and are incapable of handling missing and outlier data.
Figure 2.3.. An example of mixed delay prediction approach.
14
By combining the Bootstrap aggregating [20] and random space method [21],
RF overcomes the drawbacks of the individual decision tree. Bootstrap aggregating
selects the sample set of data randomly with replacement. This method can increase
the random of the trees and decrease the possibility of bias. Similar to bootstrap,
random space method selects random subsets of features and reduce the correlation
between the decision trees. These two techniques are also the source of random in RF.
RF is widely used in industry because it can classify high dimensional data in short
time with excellent performance and it has low sensitivity to outliers and missing
values in the training data [20].
Moreover, RF was chosen as the core for our prediction modules for two reasons. First, RF is tested to have superior performance than other classification models [17, 18]. Second, RF can output the importance of the features in its learning
process, which provides a benchmark automatically for our feature selection process
in 4.Although random forest algorithm can handle the high dimension dataset, the
descending dimension is still necessary to improve the performance of the model.
2.2 Delay Propagation Model
Delay propagation is difficult to describe because the propagation through the
airports is under the influence of many factors such as airlines, airports, NAS and
emergency. The interaction of these factors is an excellent challenge for delay research.
Converting the interaction of the air traffic elements simplifies the model of air traffic
system. But the pattern that how delay propagates inside airports still needs a logical
and computable interpretation.
Some key parameters and variables are defined to help describe the delay propagation model as follows:
15
f = a flight in an aircraft’s itinerary
f0 = the immediate predecessor flight of f
tmin = minimum airport turn time in minutes, which is unknown from the data
ts(f, f0
) = scheduled airport turn time between f and f’ in minutes
tLAAD(f) = late arriving aircraft delay of flight f in minutes
ta(f) = arrival delay of f in minutes
SD(f) = scheduled departure time of f
SA(f) = scheduled arrival time of f
Delay propagation in the air traffic system can be divided into two parts, propagation through the en route link between the airports and the ground propagation
inside the airport. Although the previous RF classifier can predict the departure
delay and arrival delay separately, the transition from the actual arrival delay to the
LAAD is not clear. According to BTS, the LAAD is one of the five main causes of
airline delays and it describes the intimate relationship between the previous arrival
delay and the present departure delay using the same aircraft. In other words, LAAD
is the parameter that indicates the delay propagation.
Although the real LAAD time is reported to FAA by humans and cannot be
computed strictly with formula, it can still be analyzed form the definition that the
LAAD is mainly under the effect of airport turn time and real arrival late time at
the former airport. To compute the LAAD, it is assumed that LAAD tLAAD(f) is a
function of the actual arrival delay ta(f) and scheduled airport turn time ts(f, f0
).
This assumption is based on a report from Jennifer et al. [22]. As is shown in figure 2.4,
most of the airport operation is under the airport capacity.
This figure indicates that almost all the flights will not suffer from the airport
runway congestion. And the queueing theory for flights in the airports can be simplified to the case when the service waiting time is zero. The time between Scheduled
time and the airport turn time is the computed slack time. Arrival delay minus this
computed slack time, then the LAAD can be computed. The formula is given as the
following:
16
Figure 2.4.. Airport capacity curve of hourly departure and hourly arrival.
tLAAD(f) = ta(f) − (ts(f, f0
) − tmin) (2.1)
ts(f, f0
) = SD(f0
) − SA(f) (2.2)
where scheduled airport turn time ts(f, f0
) is the time period that the aircraft will
stay in the airport. This value is not provided by the BTS and needs to be computed
from the scheduled departure time of the immediate predecessor flight f0 minus the
scheduled arrival time of flight f. Minimum airport turn time (tmin) is the minimum
17
necessary time for the aircraft to stay at the airport. Normally the flight needs to
complete the unloading/loading, cleaning, aircraft fueling, safety inspection, etc. We
assume the minimum turn time is a constant for all the flights in all the airports of
our air traffic system. By adjusting the minimum turn time, we can fit an optimized
approximation function to minimize the error with the actual LAAD.
In fact, we find that there is some negative scheduled airport turn time, which
indicates the SD(f0
) is earlier than the SA(f). Based on the definition of airport
turn time, this value should be positive. Otherwise, the scheduled departure time is
earlier than the scheduled arrival time, which will result in the delay. In fact, we did
observe that some delays are produced by these disordered schedules. These negative
values account for a small proportion of all the flight data, but they are responsible
for the emergence of the carrier and NAS delay.
The following Figure 2.5 provides the average departure delay distribution with
the scheduled airport turn time. In Figure 2.5,the horizontal axis is the scheduled
airport turn time intervals from -60 to 750 minutes. Left vertical axis is the average
departure delay time and is corresponding to the blue bars. The right vertical axis is
the total number of the flights and is corresponding to the red line. The departure
delay distribution follows the pattern with minimized value at 30-90 time intervals
with the most flights. This indicates that time interval of 30 - 90 minutes is ideal
to reduce the delayed time. Although only a few proportion of flights fall out of the
positive 0-120 time intervals, their averaged departure delay time cannot be neglected.
When the airport turn time is negative, the flight does not have the spare time to
absorb the delay and may cause further delay instead. This is part of the delay
source. The scheduled airport turn time is computed before the day of operation
and can be expected. Therefore, this type of delay should be avoided by the airline
companies. When the turn time is significant, there is a slight rise of the departure
delay. A possible explanation is that the flight stays at the airport too long and has
the corresponding delay.
18
Figure 2.5.. Departure delay distribution with scheduled airport turn
time.
To fix the negative airport turn time issue, a formula to compute the LAAD is
added to the MAX function.
tLAAD(f) = max(ta(f) − max(ts(f, f0
), 0) + tmin, 0) (2.3)
The LAAD approximation errors based on the propagation formula is shown in
figure 2.6 as a function of the minimum airport turn time. This best-fitting problem
is a simple convex optimization problem. To minimize the squared approximated
delay error, the optimal minimum turn time is chosen to be 28 minutes, which is
also identical to the common sense of the necessary time for flights. This minimum
airport turn time is applied in the later model.
19
Figure 2.6.. Approximation error with different minimum airport turn
time.
20
3. DATA ANALYST
3.1 Source of Data
Three databases are chosen to select the best combination of the features. The
databases are airline on-time performance database of the Bureau of Transportation Statistics (BTS)1, Local Climatological Data (LCD)2 at the National Oceanic
and Atmospheric Administration (NOAA) and Aviation System Performance Metrics
(ASPM)3.
These three databases provide the necessary information for air traffic operation.
The BTS provides the air traffic on-time performance data reported by certified US.
Air carriers including Alaska Airlines, American Airlines, Delta Air Lines, Frontier
Airlines, Hawaiian Airlines, JetBlue and Southwest Airlines. To explain the arrival
delay of the flights, causes of the delay are reported in five categories: air carrier,
extreme weather, national aviation system, late arriving aircraft, and security. LCD
contains weather summaries for significant airports that include a daily account of
temperature, ceiling, damp, precipitation amounts, winds and special weather by the
hour. ASPM data contains airport capacity and throughput data for main airports
of US. In our model, only the hourly departures and hourly arrivals are applied in
corresponding airports.
3.2 Preprocessing of Data
Air traffic data are selected from the database for the Chicago O’Hare International Airport (ORD) as origin or destination airport from 2016 July to 2017
1https://www.transtats.bts.gov
2https://www.ncdc.noaa.gov/cdo-web/datatools/lcd
3https://aspm.faa.gov/apm/sys/AnalysisAP.asp
21
June.Most of the airline delay research simply use binary classification or precise
delay time. Binary classification is simple and is sufficient to predict airline delay for
just one time and keep a high accuracy. But binary class is insufficient to indicate
the severity of the delay, which is a principal evaluation for delay propagation. The
method with precise delay time is a regression problem. However, the data in the
on-time region is too random to regress. As is shown in Figure 3.2 and Figure 3.1,
the region of the left lower corner is the on-time region, where both the arrival delay
and departure delay are lower than 15 minutes. The on-time region is random and
dense and different from the delayed region. This is caused by the regulation of FAA.
Whatever the precise delay time is, all the flights within the on-time is under normal
operation.
Figure 3.1.. Departure delay with LAAD of ORD airport on 2016/01/03.
Instead of the precise delay time, we use the delay group in our research for random
forest classification. The application of the delay group is suitable for the uncertainty
of the actual air traffic control. The delay groups are divided by 15 minutes from -2 to
12. All the non-positive delay groups are classified as on-time flights. The maximum
of the delay group is 12 (delay time greater than 180 minutes)4. The Details of the
delay groups are shown in Table 3.1.
The following delay-related data are extracted from the BTS database.
4The definition of delay group can be found on BTS (https://www.transtats.bts.gov/Fields.asp)
22
Figure 3.2.. Arrival delay with departure delay of ORD-CLT airline on
2016/01/03.
Table 3.1.. Reference table of delay groups
Delay groups Delayed time (min)
-2 (-inf, -15)
-1 [-15,0)
0 [0,15)
1 [15,30)
2 [30,45)
3 [45,60)
4 [60,75)
5 [75,90)
6 [90,105)
7 [105,120)
8 [120,135)
9 [135,150)
10 [150,165)
11 [165,180)
12 [180,+inf)
• Day of month
• Day of week
• Scheduled departure time
23
• Scheduled arrival time
• Scheduled elapsed time
• Departure delay group
• LAAD group: Divided by 15 minutes into groups from -2 to 12
• Arrival delay group
The following delay-related weather data are extracted for the origin and destination airports from the NOAA database.
• Hourly Visibility
• Hourly Present Weather Type: Special weather type including drizzle, mist,
thunderstorm/snowstorm and other special weathers are all set as one. Others
are set to zero.
• Hourly Dry Bulb Temperature
• Hourly Wet Bulb Temperature
• Hourly Dew Point Temperature
• Hourly Relative Humidity
• Hourly Wind Speed
• Hourly Wind Gust Speed
• Hourly Station Pressure
The following airport hourly departure and arrival flights data are extracted for
the origin and destination airports from the ASPM database.
• Scheduled departures: Number of the hourly departures of the airport
• Scheduled arrivals: Number of the hourly arrivals of the airport
The random forest algorithm is designed for numerical features and performs
poorly for non-numerical features. All the above data are converted to digital features. Moreover, some Non-numerical features are designed for the delay prediction.
To analyze the effect of ORD related airports in the research, we used the one-hot
encoding by converting the name of the airport into numerical features. There are 30
24
relevant airports selected based on the total number of the departures and arrivals
to ORD. The ORD related airport network is shown in Figure 3.3. The full name of
the airports is in Table 4.1. The relevant airports are converted to 30 airport features
and 1 direction features.
• Direction: 0 is from ORD to other airports; 1 is from other airports to ORD.
• Airport (30): 1 if this airport is active; 0 otherwise.
All BTS, LCD and ASPM data of the 30 ORD related airports are matched for
the same flight according to the time. The missing data of BTS is deleted directly.
While the data in LCD and ASPM is provided according to time. The missing data
in LCD and ASPM is filled by linear interpolation.
Figure 3.3.. ORD related airports network.
25
Table 3.2.. Abbreviation of major airports
Abbreviation Airports
ATL Hartsfield-Jackson Atlanta International Airport
BNA Nashville International Airport
BOS Gen. Edward Lawrence Logan International Airport
CLE Cleveland-Hopkins International Airport
CLT Charlotte/Douglas International Airport
DCA Ronald Reagan Washington National Airport
DEN Denver International Airport
DFW Dallas/Fort Worth International Airport
DTW Detroit Metropolitan Wayne County Airport
EWR Newark Liberty International Airport
FLL Fort LauderdaleHollywood International Airport
IAH George Bush Intercontinental Airport
LAS McCarran International Airport
LAX Los Angeles International Airport
LGA LaGuardia Airport
MCO Orlando International Airport
MIA Miami International Airport
MKE General Mitchell International Airport
MSN Dane County Regional Airport
MSP MinneapolisSt. Paul International Airport
PHL Philadelphia International Airport
PHX Phoenix Sky Harbor International Airport
RSW Southwest Florida International Airport
SAN San Diego International Airport
SEA SeattleTacoma International Airport
SFO San Francisco International Airport
SLC Salt Lake City International Airport
SNA John Wayne Airport
STL St. Louis Lambert International Airport
TPA Tampa International Airport
3.3 Oversampling of Imbalanced Data
The portion of on-time flight over delayed flight is about 80% to 20%, which
is not equally represented. The imbalanced data in air delay prediction will cause
26
the machine-learning model to predict biased results when dealing with the delayed
data. To make the model to be unbiased, we use the synthetic minority over-sampling
technique (SMOTE) method to deal with the imbalanced data [23]. This algorithm
generates the synthetic samples from the minority samples. This technique can improve the performance of the learning process effectively. The final proportion of
delayed flights are 50%, which is equal to the on-time flights.
3.4 Quick Blending for Database
All of the three databases cover a whole year and contain much information
which can exceed the maximum storage space and processing capability for computers. Blending the databases involves sorting, searching and writing data. This
is a significant challenge, especially for an extensive database. The previous work
just requires blending two databases of one route. But this research needs blending
threes databases for more than 270 routes. To solve this problem, a specific blending
algorithm is proposed called quick blending. The blending process includes two parts,
blending within the BTS database and blending the three databases. Blending within
the BTS provides the itineraries of the flights, which is not offered directly by BTS.
This process generates the itineraries of the same day according to the unique tail
number of the flights. Firstly, blend all the BTS database into a whole single BTS
database, which covers all the flights of the airports and the time range. Then, sort
the database according to the departure time, operation data, tail number in order.
The databases will be in the order of the daily itineraries of the individual flights.
The blending process, as is shown in Figure 3.4,the ASPM data and the LCD
data of the origin and destination airports will be connected to the sorted BTS flight
data. The only identifying feature to match correct data of ASPM and LCD is the
airport and the corresponding time. Both the ASPM and LCD databases record the
data strictly with the time. In other words, the hourly data generated from these
databases are stable, and there is a maximum range of data if the searching condition
27
Figure 3.4.. Quick blending algorithm.
is given. This maximum range is defined as searching scope. Therefore, by double
sorting the three databases with time and airport, we can acquire two series of data
with similar series of airport and time. By limiting the searching scope from the whole
dataset to the searching scope, algorithm time complexity is reduced from O(n2) to
O(n).The space complexity is also significantly reduced. In the actual blending test,
the computation speed is improved to more than five times of the initial speed.
28
4. FEATURE SELECTION
For a given data sample, there exists a maximum number of features. If the dimension of the dataset or the number of the feature is higher than this value, then the
machine learning model will be confused, and the performance will decrease instead of
increasing. This phenomenon is called the curse of dimensionality. The phenomenon
is essential when the number of features is high, and dimensionality reduction has to
be considered. In our case, there will be 60 features if no selection is applied. Since
the effect of the curse of dimensionality, training all the features from BTS, NOAA,
ASPM may not have the best performance [18].Usually, because the whole test data
set is too large to test all the combinations of features, feature selection is applied to
a portion of samples from the training set to improve the performance. Instead, to
pursue the best learning result, we select the best features for all the database with
5-fold cross-validation [20].
It is reported that the origin-destination (OD) airports pair may have considerable
effects on the flight delay [4]. To consider the impacts of the related airports, the
features for airports are added apart from the three databases (BTS, LCD, ASPM).
Based on the ORD related airports network, 30 features of airports and one direction
feature are applied to our model as the OD pair feature. The direction feature is set
to be 0 or 1 for ORD as origin or destination. For example, if the flight is from ORD
to LGA, then the direction feature is 0, LGA feature is 1, and all the other 29 airport
features are set to be zero. The introduction of the direction feature decreases the
dimensionality from 60 to 31.
29
4.1 Metrics of Accuracy
In the past research, accuracy is an important criterion to evaluate the binary
classification problem: delay or on-time. As is shown in Figure 4.1, accuracy is
defined on a 2-by-2 confusion matrix and it returns the correct prediction portion of
all the classifications.
Figure 4.1.. Binary classification confusion matrix.
accuracy = (T P + F N)/(T P + T N + F P + F N) (4.1)
As it is discussed in section 3, this paper uses multiple delay groups to represent
delays. The delays are strictly divided into 15 categories from -2 to 12. According to
the definition of delay group from Federal Aviation Administration, the relationship
between the group error and time error is not linear, and there is an overlapping
time zone. For example, if the predicted delay group is the same with the actual
delay group, it means the error gap of predicted delay time and the actual delay time
is between [0, 15] minutes. If the predicted group index and actual group index is
different for one index, it means the error gap in time is between [1, 30] minutes.
Only using the traditional accuracy may neglect the overlapping time zone between
30
[1, 15] minutes for one delay group index error, which is not very accurate to evaluate
the delay phenomenon.
To include the one delay group index error, we relaxed the prediction error standard slightly and raised a new criterion, called relaxed accuracy for our problem. As
it is shown in Figure 4.2, , all the non-positive delay group are computed as on-time
zone and reclassified as 0 (left top yellow square). The red squares with zero delay
group index error out of the yellow square are the accuracy. The orange squares with
one delay group index error are computed in the relaxed accuracy to include the error
time in the same delay group. Although these orange zones may increase the delay
time error with the range of [16, 30] out of the on-time group, we think this error is
acceptable. Relaxed accuracy will not affect the on-time performance and reflect the
actual prediction performance more practically. Relaxed accuracy is the sum of the
red, orange and yellow zones in the confusion matrix.
Figure 4.2.. Delay group confusion matrix.
31
4.2 Recursive Feature Selection
The objective of feature selection is reducing the dimension and improve the performance of the model. Feature selection process is shown in Figure 4.3. To find the
optimal global combination of the features, all the subsets of the feature set should
be tested on sample data set. But the algorithm complexity will be an exponential
distribution with the dimension, which is not applicable in the actual selection process. Therefore, a recursive feature elimination (RFE) algorithm is implemented for
our feature selection process [24].
Figure 4.3.. Feature selection process.
Algorithm 1 Recursive feature elimination
1: Initial: training set T
set of all features F
2: For iteration i in |F|:
compute feature importance with Random Forest
rank the feature set
find the last ranked feature f ∗ in F
3: Compute the performance with F − f ∗
if performance is improved:
update: F = F − f ∗
go back to Step 2 with new F
else: break
As it is shown in Algorithm 1, RFE starts from computing with all the features
and generates the feature importance in a random forest. Then the least essential
feature will be eliminated from the feature set. The performance of elimination will be
32
compared in the test data set with cross-validation. This procedure will be repeated
until the accuracy of the model reaches the highest performance. This algorithm is
recursive and may reach local optimized features.
4.3 Selected Features
The random forest can export the feature importance automatically during the
building of decision trees, which is a good standard for feature selection. By analyzing the feature importance of arrival and departure prediction individually, some
phenomenon corresponding to the flight delay is revealed with the key factors, which
could provide practical information for the delay prediction.
The normalized feature importance for arrival delay prediction is shown in Figure 4.4. For the arrival delay prediction, departure delay importance is much higher
than the other features. This is identical to the common sense of the delay propagation from origin to destination. Figure 4.5 demonstrates the optimal features after
feature selection. All the other features hold mostly the same importance. Most of
the weather features and half of the BTS features are filtered in the selection. All
the ASPM features are kept in the final feature set. These indicate that most of
the weather factors, such as the precipitation and wind gust speed have little impact
on the commercial airlines. The operation condition of the origin and destination
airports are essential for the flights. Therefore, the airport congestion conditions effect on the delay cannot be neglected. Compared to the features from three primary
databases, the airport features have little importance to the delay. The delay mechanism is almost the same for most of the OD pairs in arrival delay prediction and
most of the airports when predicting the departure delay. These prove the necessity of
feature selection and the introduction of the ASPM database to consider the terminal
congestion.
Figure 4.6 and 4.7shows the characterizing of departure delay. For the departure
delay prediction, LAAD is much higher than the other features. Although the LAAD
33
Figure 4.4.. Normalized feature importance for arrival delay prediction
is still the most critical feature for departure delay prediction, it doesn’t dominate
the feature importance chart like the departure delay importance does in arrival delay
prediction.Prediction through the air route is different from the prediction within the
airports. This difference is caused by several reasons. First, only LAAD, which is the
only computed cause of the five delay causes, is kept for the model. Although all the
five delay causes are used to explain the arrival delay, only LAAD can be acquired
before the flights take off and are directly related to the departure delay. Deficiency of
the other four features decreases the prediction accuracy, but in the actual prediction,
they are difficult to be acquired before the flight taking off. Second, LAAD is actually
a human explained data. As the carriers have to satisfy the requirement that the
sum of the five delay causes time should be equal to the final arrival delay, LAAD
may be inconsistent with the actual LAAD according to its definition. This difference
between LAAD and actual LAAD will be proved in the later section. Third, departure
delay prediction in the airport is more chaotic than the arrival delay prediction.
34
Figure 4.5.. Optimal feature importance for arrival delay prediction
Carriers prefer ground delays in the airport rather than airborne delays. The airport
congestion and schedule will have other effects on the departure delay.
Different from the blended dataset of 30 major airports, the dataset for the 108
minor airports only includes the BTS. Since the limited information provided by
BTS, the feature set of the minor airports is not influenced by the feature selection
process. This is shown in figure 4.8 and figure ??. The seven features keep the same
after the recursive feature elimination. Just as the major airports feature importance
distribution, the departure delay group is most important in arrival delay prediction.
And in departure delay prediction, the features share the similar importance.
To analyze the effect of airports, the importance of airports is shown in the Figure 4.10. Airport features include 1 direction feature and 30 ORD related airport
features. These features are of little importance compare to the other features. Most
of machine learning based air traffic systems would focus on some particular OD pairs
or airports. But this chart provides a credential that difference of the links can be
35
Figure 4.6.. Normalized feature importance for departure delay prediction.
abandoned if the dataset is not sufficient to support the classifier. Building the independent classifiers for each particular links may be less worthwhile than expected.
Since combination of direction and airport features is used to represent 1 OD pair,
the direction feature is the summary of the 30 OD pairs. The high importance of the
directions shows that different directions of the two airports have different impacts
on delay.
Figure 4.10 also proves the phenomenon that the more congested the airport is,
the more important of the airport feature is. Compare to the main airports of the
air traffic systems, small airports are less specified and can be unified as one airport.
The features of the small airports may decrease the performance of the classifier.
The departure delay and the arrival delay importance are consistent for most of the
airports, which proves that the airport effects on the two kinds of delay are similar.
Figure 4.11 and 4.12 provide the error distribution along the error group for both
predictions with all features and optimal features. Since most of the flights are on
36
Figure 4.7.. Optimal feature importance for departure delay prediction
Figure 4.8.. Optimal feature importance for minor airports arrival delay
prediction
time, the performance of the selection is not clear when high delayed groups are compared with the on-time flights. Recursive feature selection improves the performance
37
Figure 4.9.. Optimal feature importance for minor airports departure
delay prediction
Figure 4.10.. Airport feature importance for delay prediction
of the model in both accuracy and relaxed accuracy, as it is shown in Table 2. Especially for arrival delay prediction in error group five, the number of the flights of
38
this group is reduced 60%. In both of the figures, the improvement in error group
2 is not apparent. As the boundary group between the relaxed accuracy region and
error region, error group 2 is affected by both of the regions. With the improvement
of prediction, the number of high error group will reduce, and the data of the high
error will flow to the relaxed accuracy region. The improvement of arrival delay is
more notable than the departure delay prediction, which is because of the complexity of the departure delay. More uncertain and human factors in departure process
limit the departure delay prediction performance of the model. But in both cases of
prediction error group 12, the improvement does not make much difference. This is
partly caused by the max limit of the delay group. The delays more than 12 group are
the result of the reasons which cannot be implied by the given database. The above
prediction results prove that adding all the features for the classifier will confuse the
learning model, and it is necessary to implement the feature selection. The selected
optimal features are used in the later iteration model application.
Table 4.1.. Comparison of the accuracy
Arrival Delay Arrival Delay Departure Delay Departure Delay
all features optimal features all features optimal features
Relaxed Accuracy 0.87498 0.92669 0.88244 0.90354
Accuracy 0.85915 0.86727 0.82684 0.83050
39
Figure 4.11.. Arrival delay error distribution with error group
Figure 4.12.. Departure delay error distribution with error group
40
5. APPLICATION
In the chained delay prediction model, predictions of the departure delay and arrival
delay are achieved directly by random forest classification. The transition from the
arrival delay to LAAD can be considered as the delay propagation within the airports. The traditional airline arrival delay prediction requires the actual departure
delay time, which is a stable condition and can only predict one time of the flight.
Introducing the delay propagation can increase the time range of the prediction by
working as a chained model. Although the performance of the chained model will
decrease as the iteration number increases, this disadvantage can be fixed by dynamically updating the actual departure delay. An initial departure delay should be given
at the beginning of the daily operation as the initial input for the chained model to
work.
5.1 Chained Delay Prediction
To demonstrate the performance of our chained delay prediction model, we select
the ORD related flights for the application. The flights with ORD as origin or destination are defined as the ORD related flights. The flights operated in January 2017
within the ORD related airports network (see Figure 3.3) are chosen as the test set.
There are 26693 ORD related flights are satisfying the required condition.
In the set of ORD related flights, all the aircraft will arrive in or departure from
ORD in every flight. Every aircraft will follow its scheduled order of itinerary in the
traffic system. The order of the same aircraft during a day is defined as the iteration
number. The iteration number reflects the times the flight is operated in the air traffic
system of the day. The iteration number is also the critical parameter in the model
of the air traffic network. The total flight’s distribution with the iteration number is
41
shown in Figure 5.1. In the ORD related air traffic system, the maximum iteration
number is 10, and 97.52%of the flights have less than six iteration numbers.More than
half of the flights have just one iteration number and has no delay propagation within
the ORD air traffic system.
Figure 5.1.. Flights distribution with iteration number
In order to test the effect of the delay propagation, we defined three different test
models as following:
• CH10: Chained prediction model with all actual departure delays for up to
iteration number 10.
• CH1: Chained prediction model with initial actual departure delay and delay
propagation module
• CH1-NPRG: Chained prediction model with initial actual departure delay and
without delay propagation modification
42
CH10 predicts all the flight’s behavior along the itinerary with actual departure
delay. Delay propagation module, which is built for departure delay, is unnecessary
in CH10. This model represents the best performance of random forest classification,
which is the upper bound of the all the tested chained models. CH1 runs with the
initial departure delay to predict the first arrival delay and then predicts the following
flights with delay propagation. CH1 represents the lower bound of the delay propagation module because only the initial data is accurate. CH-NPRG runs with initial
departure delay without the delay propagation module, which means all the following
departures and arrivals are precisely right on time and will not be affected by actual
data. In other words, the LAAD feature for departure prediction and the departure
delay feature for arrival delay prediction are both set to zero. CH1NPRG is a contrast
to CH1 to show the performance of delay propagation module. The comparison of
three models can reflect the impact of the delay propagation by evaluating the total
counts of prediction error.
As it is shown in Figure 5.2, , the three models have similar distribution from error
group 0 to 12. But it still can be noticed that this is a little different in the region with
error group 0. This is caused by the accumulation of error in a region of error group
2 to 12. From the amplified region in right upper corner of Figure 5.2,the difference
is notable. As it is expected, model CH10, which is the complete classification with
the actual departure time of all the iteration numbers, has the lowest error and
highest accuracy. Model CH10 is also the upper bound of the prediction accuracy.
By comparing the model CH1 and CH1-NPRG, we can find that adding the effect of
the delay propagation will improve the performance of the prediction by decreasing
the error in a region of error group 2 to 12.
Although the effect of delay propagation is checked here, it can still be observed
that the difference of the CH1 and CH10 is more significant than the difference
between CH1 and CH1-NPRG. This is because only the initial input is actual and
correct. In other words, only the flights of iteration number 1 are updated into the
model.
43
Figure 5.2.. Performance comparison
5.2 Impact of Iteration Number
To check the effect of the iteration number of the flights in chained delay model,
we develop the definition of the CH to CHi, where ”i” represents how many previous
actual departure delays are updated into the chained delay model. Iteration number
i is from 1 to 10. By controlling the iteration number of the flight’s data updated into
the model, the impact of the iteration number can be revealed through the simulation
result. Four criterions include relaxed accuracy, accuracy, total counts of error and
total severity are set to analyze the model with the iteration number. Total counts
of error are the total number of the prediction error of each CHi, and total severity
of prediction error is the total number of prediction error multiplies the error class of
each CHi. The distribution of relaxed accuracy, accuracy, total counts of error and
total severity with the iteration number and error are shown in Figures 5.3 to 5.6.
As the actual departure delay is updated into the model, both the accuracy and
relaxed accuracy increase with the iteration number. Since the total number of data
44
points is constant, the data points in relaxed accuracy region (i.e. error group 0 and
1) will increase and the ones with error group 2 to 10 will decrease. The higher the
prediction error is, the faster the total number decreases with the iteration number.
The convergence speed decreases as the iteration number increases. All the criterions
converge as the iteration number increases.
To give a more direct conclusion of the prediction error distribution, normalized
prediction error distribution with iteration number and error class is shown in Figure 5.7. Since the number of error counts of high error class is too small to observe
if compared with that of lower error class, all the prediction errors are normalized by
the corresponding initial prediction error of CH1 to observe the distribution of high
error class more clearly. The error class of 0 and 1, which is also the relaxed accuracy
region, will increase slightly as the iteration number increases. On the contrary, the
other class will decrease with the iteration number. The higher the error class is, the
faster will the prediction error decrease. This also proves that by updating the actual
departure time, the prediction will be more and more accurate and the prediction
error will decrease.
Figure 5.3.. Relaxed accuracy with the iteration number
45
Figure 5.4.. Accuracy with the iteration number
Figure 5.5.. Total number of the prediction error with the iteration number
46
Figure 5.6.. Total severity of the prediction error with the iteration number
Figure 5.7.. Normalized prediction error distribution
47
6. CONCLUSIONS
This research presented a new machine learning based air traffic delay prediction
model that combined multi-label random forest classification and approximated delay
propagation model. Three databases of BTS, LCD, and ASPM provide the critical
information for air traffic control are blended. To improve the prediction performance,
an optimal feature selection process is introduced and demonstrated to have better
performance than directly using all the features of available datasets. Departure delay
and late arriving aircraft delay are shown to be the most critical features for delay
prediction. To utilize these two features, a delay propagation model is proposed as
a link to connect them to build a chained delay prediction model. Given the initial
departure delay, the chained model is demonstrated to have the ability to predict
the flight delay along the same aircrafts itinerary. This enables the model to enlarge
the time range of delay prediction for advanced air traffic control. By updating the
actual departure delay with the iteration number along with the itinerary, the model’s
accuracy can be further improved and approach the actual airline operation. Besides
the individual airline delay prediction, the mixed approach can also be applied to the
macro air traffic control. The congestion of an airport can be computed from the
arrival and departure flights. And the components of the delay in one airport can be
analyzed through the airlines. And the interaction between the hub airports initial
delay can be achieved by this mixed approach. This machine learning based method
has shown to be more accurate and practical for delay prediction in daily air traffic
operation.
REFERENCES
48
REFERENCES
[1] M. Ball, C. Barnhart, M. Dresner, M. Hansen, K. Neels, A. Odoni, E. Peterson, L. Sherry,
A. A. Trani, and B. Zou, “Total delay impact study: a comprehensive assessment of the costs
and impacts of flight delay in the united states, nextor,” 2010.
[2] J. Ferguson, A. Q. Kara, K. Hoffman, and L. Sherry, “Estimating domestic us airline cost
of delay based on european model,” Transportation Research Part C: Emerging Technologies,
vol. 33, pp. 311–323, 2013.
[3] J. Chen, L. Chen, and D. Sun, “Air traffic flow management under uncertainty using chanceconstrained optimization,” Transportation Research Part B: Methodological, vol. 102, pp. 124–
141, 2017.
[4] N. Pyrgiotis, K. M. Malone, and A. Odoni, “Modelling delay propagation within an airport
network,” Transportation Research Part C: Emerging Technologies, vol. 27, pp. 60–75, 2013.
[5] J. Chen, D. DeLaurentis, and D. Sun, “Dynamic stochastic model for converging inbound air
traffic,” Journal of Guidance, Control, and Dynamics, pp. 2273–2283, 2015.
[6] J. S. B. Mitchell and V. Polishchuk, “Airspace throughput analysis considering stochastic
weather,” 2006.
[7] A. M. Bayen, P. Grieder, G. Meyer, and C. J. Tomlin, “Lagrangian delay predictive model for
sector-based air traffic flow,” 2004.
[8] S. Ahmadbeygi, A. Cohn, and M. Lapp, “Decreasing airline delay propagation by re-allocating
scheduled slack,” IIE Transactions, vol. 42, no. 7, pp. 478–489, April 2010.
[9] S. Roy, B. Sridhar, and G. C. Verghese., “An aggregate dynamic stochastic model for an air
trac system,” in ATM Seminar, Baltimore, USA, 2005.
[10] W. Vigneau, “Flight delay propagation synthesis of the study,” in Flight Delay Propagation
Synthesis of the Study, October 2003.
[11] P. Fleurquin, J. J. Ramasco, and V. M. Eguiluz, “Systemic delay propagation in the us airport
network,” Scientific Reports, vol. 3, no. 1, January 2013.
[12] B. Baspinar, “A data-driven air transportation delay propagation model using epidemic process
models.” International Journal of Aerospace Engineering, pp. 1–12, August 2016.
[13] S. Welman, A. Williams, and D. Hechtman, “Calculating delay propagation multipliers for
cost-benefit analysis,” 2010.
[14] E. R. Mueller and G. B. Chatterji, “Analysis of aircraft arrival and departure delay characteristics,” in AIAA aircraft technology, integration and operations (ATIO) conference, 2002.
[15] A. Klein, “Airport delay prediction using weather-impacted traffic index (witi) model,” in
Digital Avionics Systems Conference (DASC), 2010 IEEE/AIAA 29th. IEEE, 2010, pp. 2–B.
[16] N. Xu, G. Donohue, K. B. Laskey, and C.-H. Chen, “Estimation of delay propagation in the
national aviation system using bayesian networks,” in 6th USA/Europe Air Traffic Management
Research and Development Seminar, 2005.
49
[17] J. J. Rebollo and H. Balakrishnan, “Characterization and prediction of air traffic delays,”
Transportation research part C: Emerging technologies, vol. 44, pp. 231–241, 2014.
[18] S. Choi, Y. J. Kim, S. Briceno, and D. Mavris, “Prediction of weather-induced airline delays
based on machine learning algorithms,” in Digital Avionics Systems Conference (DASC), 2016
IEEE/AIAA 35th. IEEE, 2016, pp. 1–6.
[19] L. Breiman, “Random forests,” Machine learning, vol. 45, no. 1, pp. 5–32, 2001.
[20] T. Hastie, R. Tibshirani, and J. Friedman, “Overview of supervised learning,” in The elements
of statistical learning. Springer, 2009, pp. 9–41.
[21] T. K. Ho, “The random subspace method for constructing decision forests,” IEEE transactions
on pattern analysis and machine intelligence, vol. 20, no. 8, pp. 832–844, 1998.
[22] J. Gentry, K. Duffy, and W. J. Swedish, “Airport capacity profiles,” May 2014.
[23] N. V. Chawla, K. W. Bowyer, L. O. Hall, and W. P. Kegelmeyer, “Smote: synthetic minority
over-sampling technique,” Journal of artificial intelligence research, vol. 16, pp. 321–357, 2002.
[24] P. M. Granitto, C. Furlanello, F. Biasioli, and F. Gasperi, “Recursive feature elimination with
random forest for ptr-ms analysis of agroindustrial products,” Chemometrics and Intelligent
Laboratory Systems, vol. 83, no. 2, pp. 83–90, 2006.