Machine Learning for Air Traffic Flow Management: A Survey
Ali Akram
CliftonLarsonAllen (CLA), Minneapolis, MN 55435, USA
Email: aakramm989@gmail.com
ORCID: 0009-0004-2728-4127
Abstract
The global air traffic system is approaching a crisis point. Passenger demand hit record highs in
2024, yet the infrastructure managing that traffic—the airspace, the controllers, the decisionsupport tools—was designed for an era with half as many flights. European en-route delays
reached 2.13 minutes per flight in 2024, the worst in decades, costing an estimated €2.1 billion.
The United States faces parallel capacity constraints as operations exceed pre-pandemic levels.
Against this backdrop, artificial intelligence (AI) and machine learning (ML) have emerged as
transformative technologies for air traffic flow management (ATFM). This survey reviews the
rapidly expanding literature on AI/ML applications across seven core ATFM domains: trajectory
prediction, conflict detection and resolution, flight delay prediction, demand-capacity balancing,
airspace capacity forecasting, natural language processing for aviation text, and weather-integrated
routing optimization. Drawing on studies from IEEE, AIAA, Transportation Research, and
institutional work by EUROCONTROL, NASA, and SESAR, we categorize the methods by
algorithmic family—deep learning architectures (LSTM, Transformer, CNN), deep reinforcement
learning (MARL, PPO), graph neural networks, and hybrid approaches—and evaluate their
demonstrated performance improvements over traditional methods. Key findings include up to
80% reductions in trajectory prediction error with Transformer-based models, successful
autonomous conflict resolution using multi-agent reinforcement learning in simulated airspace
with dozens of aircraft, and significant delay prediction improvements through graph-based
network modeling. We identify critical challenges including certification barriers, controller trust,
real-time computational constraints, and the gap between simulation results and operational
deployment. The survey concludes with a research agenda emphasizing the path from laboratory
demonstrations to certified, operational AI systems in air traffic management.
Keywords: air traffic flow management; machine learning; deep learning; trajectory prediction;
conflict resolution; reinforcement learning; aviation safety; survey
1. Introduction
On any given day, more than 100,000 commercial flights crisscross the planet, carrying
millions of passengers through a three-dimensional airspace managed by human controllers using
tools that, in their essential architecture, have not fundamentally changed since the 1960s. The
system works—remarkably well, by most measures—but it is straining. Global air passenger
demand reached a record high in 2024, surpassing pre-pandemic levels by 3.8% (IATA, 2025).
EUROCONTROL projects 15.4 million flights in European airspace by 2050, a 52% increase over
2023. The U.S. Federal Aviation Administration forecasts commercial operations growing at 1.9%
annually through 2045.
The problem is not that airplanes cannot fly faster or that airports cannot pour more
concrete. The bottleneck is information—specifically, the human capacity to process it. An air
traffic controller monitoring a busy sector must simultaneously track dozens of aircraft, anticipate
conflicts minutes into the future, factor in weather that changes by the hour, coordinate with
adjacent sectors, and communicate instructions to pilots—all while maintaining the safety margins
that make commercial aviation the safest mode of transportation on Earth. There is a ceiling to
how much complexity a human mind can manage in real time, and the global air traffic system is
pressing against it.
This is where artificial intelligence enters the picture. Over the past decade, machine
learning methods have demonstrated remarkable capabilities in exactly the kinds of tasks that
constitute air traffic flow management: predicting where aircraft will be in the near future
(trajectory prediction), detecting when flight paths will come dangerously close (conflict
detection), determining how to reroute aircraft to resolve those conflicts (conflict resolution),
forecasting which airports and sectors will become congested (demand-capacity balancing), and
estimating how delays will propagate through the network (delay prediction). The question is no
longer whether AI can help manage air traffic—the research evidence is clear that it can—but how
quickly and safely these capabilities can be moved from research laboratories into operational
control rooms.
This survey maps that research landscape. We review studies spanning 2010 to 2025,
covering seven core application domains and drawing on work published in IEEE, AIAA,
Transportation Research journals, and institutional research from EUROCONTROL, NASA, and
the SESAR Joint Undertaking. Figure 1 presents our taxonomy of the field.
2. The Scale of the Problem
Before diving into what AI can do, it helps to understand why it is needed so urgently. The
numbers tell a stark story. In European airspace, en-route ATFM delays averaged 2.13 minutes per
flight in 2024—the highest level in decades—generating 22.4 million minutes of total delay at an
estimated cost of €2.1 billion (EUROCONTROL Performance Review Report, 2025). Fewer than
71% of European flights arrived within 15 minutes of schedule in 2023, the worst punctuality in
20 years. The situation is projected to worsen: EUROCONTROL forecasts delay costs reaching
€3.8 billion in 2025.
These delays are not simply inconveniences. They cascade through the network like falling
dominoes. A departure delay at London Heathrow propagates to connecting flights at Frankfurt,
which affects arrivals at Dubai, which disrupts schedules across Southeast Asia. Reactionary 
delays—those caused by the late arrival of a previous flight—accounted for 46% of all delay
minutes in Europe in 2024. The network effect means that a single disruption can amplify into
hundreds of delayed flights by the end of the day.
The root cause is a growing imbalance between demand and capacity. Air traffic is
increasing while the number of air traffic controllers is not keeping pace. Training a fully certified
controller takes three to five years, and several European air navigation service providers have
reported staffing shortfalls. The traditional response—building more runways, opening more
sectors, hiring more controllers—is reaching its practical and financial limits. AI offers a
fundamentally different approach: making the existing system dramatically more efficient.
3. Trajectory Prediction: Knowing Where Aircraft Will Be
If there is one capability that underpins everything else in air traffic management, it is
trajectory prediction—the ability to forecast where an aircraft will be at a given point in the future.
Every downstream task depends on it: conflict detection requires knowing which flight paths will
intersect, delay prediction requires knowing when aircraft will arrive, and demand-capacity
balancing requires knowing how many aircraft will occupy each sector.
Traditional trajectory prediction relied on kinematic models that projected current position
and velocity forward in time, occasionally updated by radar. These models struggle with the realworld complexity of wind variations, pilot behavior, ATC instructions, and weather-driven 
rerouting. Machine learning has transformed this domain. Zeng et al. (2020) demonstrated that a
sequence-to-sequence deep LSTM network could predict 4D trajectories in terminal airspace with
significantly lower lateral and vertical errors than kinematic baselines, using real ADS-B data from
Guangzhou Baiyun International Airport.
Shi et al. (2021) advanced the field by incorporating aviation domain constraints—
waypoints, airways, standard instrument departures—directly into the LSTM architecture. Rather
than treating trajectory prediction as a pure time-series problem, they encoded the structural rules
of airspace into the model's learning process, improving both accuracy and physical plausibility of
predictions.
The most dramatic leap came with Transformer-based architectures. Guo et al. (2023)
introduced FlightBERT, which reformulated trajectory prediction as a multi-binary classification
problem using a Transformer architecture with Attribute Correlation Attention blocks. By
encoding trajectory data as binary sequences—a technique inspired by how computers represent
information at the hardware level—FlightBERT achieved prediction accuracies that substantially
outperformed LSTM baselines while being more computationally efficient for inference.
Shafienya and Regan (2022) contributed a hybrid CNN-GRU model with Monte Carlo dropout for
uncertainty quantification, providing not just predictions but calibrated confidence intervals—a
critical feature for safety-critical applications where controllers need to know how much to trust a
prediction.
4. Conflict Detection and Resolution: The Hardest Problem
Predicting trajectories is valuable. Preventing aircraft from getting too close to each other
is essential. Conflict detection and resolution (CD&R) is arguably the most safety-critical
application of AI in air traffic management, and it is also one of the most technically challenging—
because it involves multiple agents (aircraft) interacting in a shared space, where the actions of
one affect the options available to all others.
Deep multi-agent reinforcement learning (MARL) has emerged as the dominant approach.
Brittain, Yang, and Wei (2021) developed a framework using Proximal Policy Optimization (PPO)
with attention networks that trained agents to maintain safe separation in simulated en-route
sectors. Each aircraft was treated as an independent learning agent that could observe nearby traffic
and issue heading or speed changes. The system was validated in the BlueSky open-source air
traffic simulator and demonstrated the ability to resolve conflicts between multiple aircraft
simultaneously—something that even experienced controllers find cognitively demanding.
Brittain and Wei (2022) extended this to heterogeneous multi-agent settings with
decentralized execution, addressing a critical scalability question: can the approach work when the
number of aircraft in a sector varies dynamically? Their results showed that agents trained on small
scenarios could generalize to larger, more complex traffic situations, a property essential for realworld deployment.
Papadopoulos et al. (2024) pushed the field further with ResoLver, a graph convolutional
reinforcement learning method designed specifically for the European airspace context. By
representing traffic situations as graphs—where aircraft are nodes and potential conflicts are
edges—the model could reason about the relational structure of traffic patterns. The study
addressed operational transparency by providing explanations for the model's decisions, a
requirement increasingly demanded by European regulators.
Sui, Ma, and Wei (2023) contributed a DRL-based tactical conflict solver designed
explicitly as an assistive tool for controllers rather than a replacement—a design philosophy that
reflects the current regulatory reality where full automation of separation assurance remains
decades away.
5. Delay Prediction: Seeing the Cascade Before It Happens
Flight delays are not isolated events—they are network phenomena. A thunderstorm over
Atlanta does not just delay flights at Hartsfield-Jackson; it sends ripples through the entire National
Airspace System that persist for hours. Predicting these cascading delays requires models that
understand the network structure of air traffic, not just the characteristics of individual flights.
Rebollo and Balakrishnan (2014) at MIT established the foundation with random forest
models for network-level delay prediction, demonstrating that aggregate delay patterns across the
U.S. airport network could be predicted hours in advance using weather forecasts and traffic data.
This foundational work, now cited over 240 times, showed that the problem was tractable and that
machine learning could capture the complex interactions between weather, traffic, and airport
capacity.
Yu et al. (2019) introduced deep belief networks for flight delay prediction at Beijing
Capital International Airport, combining unsupervised pre-training with supervised fine-tuning
using SVR. Gui et al. (2020) integrated ADS-B surveillance data with weather, schedule, and
airport operational data, comparing multiple ML architectures and finding that ensemble methods
and LSTMs consistently outperformed traditional statistical models.
The most innovative recent contribution came from Cai et al. (2022), who modeled the
airport network as a time-evolving graph and applied temporal convolutional blocks with adaptive 
graph generation to predict delay propagation patterns. By treating airports as nodes in a dynamic
network where connection weights change throughout the day based on traffic flows, the model
could capture the cascading nature of delays in ways that traditional approaches—which treat each
airport independently—could not.
6. Demand-Capacity Balancing and Flow Optimization
At its core, ATFM is an optimization problem: how do you route thousands of flights
through limited airspace and airport capacity while minimizing delays, fuel burn, and costs?
Traditional approaches rely on mixed-integer linear programming, which works well for small
instances but becomes computationally intractable at the scale of a continent's worth of traffic.
Chen et al. (2024) addressed this head-on with NN-DCB, a method that uses neural
branching and neural diving to solve large-scale demand-capacity balancing problems. Their
system handled scenarios with 15,927 flights across 287 airspace sectors within 15 minutes of
computation time—a dramatic improvement over exact solvers that could take hours for problems
of this size. De Giovanni, Lancia, and Lulli (2024) combined ML clustering and classification for
trajectory preferences with mathematical programming, tested on real EUROCONTROL data with
over 32,000 flights.
Taylor et al. (2023) applied Expert Iteration—a reinforcement learning technique that
combines policy networks with Monte Carlo tree search—to design traffic management strategies
during convective weather events. The approach is notable because it addresses one of the most
disruptive and unpredictable challenges in ATFM: thunderstorms that block major traffic corridors
and require rapid, large-scale rerouting.
Kim et al. (2021) demonstrated a data-driven approach for real-time flight path
optimization that combined supervised ML for wind forecast augmentation with unsupervised ML
for convective weather prediction, feeding into a graph-based pathfinding algorithm. The results
showed optimized trajectories that were 2% shorter than actual flown routes—a modest-sounding
improvement that, scaled across millions of flights per year, translates to enormous fuel savings
and emissions reductions.
7. NLP, Workload Forecasting, and Emerging Applications
Beyond the core ATFM domains, AI is making inroads in several supporting areas.
Maynard et al. (2021), working with NASA Ames, explored natural language processing
techniques for analyzing NOTAMs (Notices to Air Missions)—the text-based advisories that
communicate airspace restrictions, equipment outages, and other operational information to pilots
and controllers. NOTAMs are notoriously difficult to parse, written in a dense telegraphic format
that even experienced pilots find challenging. NLP techniques including named entity recognition
and text classification showed promise for automatically extracting actionable information from
NOTAM databases.
Gianazza (2010) contributed foundational work on forecasting air traffic controller
workload and optimizing airspace sector configurations using neural networks combined with tree
search methods—a hybrid approach that anticipated by a decade the current wave of AI-augmented
decision support tools. Gui et al. (2020b) applied LSTM networks to predict air traffic flow
between city pairs using ADS-B big data, demonstrating that ML could provide the demand
forecasts that feed into strategic ATFM planning.
8. Challenges: The Gap Between Research and Runway
8.1 Certification and Safety Assurance
The single largest barrier to deploying AI in operational ATFM is certification. Aviation
is, for good reason, the most heavily regulated industry on Earth. Every piece of software that
touches safety-critical functions must be certified, and current certification frameworks were not 
designed for machine learning systems that learn from data and whose behavior cannot be fully
specified in advance. The European Union Aviation Safety Agency (EASA) has published an AI
Roadmap, and SESAR has defined automation levels for ATM, targeting Level 2 automation by
2035—but the path from research prototype to certified system remains long and uncertain.
8.2 Controller Trust and Human Factors
Even if an AI system is technically superior, it is useless if controllers do not trust it.
Decades of human factors research in aviation have shown that automation trust is fragile—a
single failure can destroy confidence that took years to build. The most promising research designs
AI as an assistant rather than a replacement, providing recommendations that controllers can
accept, modify, or reject. This human-in-the-loop approach aligns with both regulatory
requirements and the practical reality that human judgment remains essential for handling novel,
unprecedented situations.
8.3 Real-Time Computational Constraints
Air traffic control operates in real time. A conflict resolution algorithm that takes five
minutes to compute is useless if the aircraft will collide in three. Many of the deep learning and
MARL methods reviewed here were evaluated in simulated environments where computation time
was not a binding constraint. Deploying these methods operationally requires either dramatic
improvements in inference speed or architectural designs that trade some accuracy for guaranteed
response times.
8.4 Simulation-to-Reality Transfer
Nearly all AI/ML research in ATFM relies on simulation for training and evaluation. The
BlueSky simulator, EUROCONTROL's DDR2 dataset, and various national surveillance datasets
provide valuable testing environments, but they cannot fully capture the complexity, noise, and
edge cases of real-world operations. Bridging the sim-to-real gap—ensuring that models trained
in simulation perform reliably in the messiness of actual airspace—remains a fundamental open
challenge.
9. Conclusions and Future Directions
This survey has reviewed a field that is simultaneously mature in its ambitions and young
in its deployments. The research evidence is compelling: machine learning methods can predict 
trajectories more accurately than kinematic models, resolve conflicts in scenarios that would
overwhelm human controllers, forecast delay cascades through airport networks, and optimize
traffic flows at continental scale. The performance improvements are not marginal—they represent
fundamental capability gains that could transform how airspace is managed.
Several research directions deserve priority. First, the development of certifiable AI
frameworks that satisfy aviation safety standards while preserving the flexibility that makes ML
valuable. Second, hybrid architectures that combine the strengths of physics-based models (which
encode known aerodynamic and regulatory constraints) with data-driven approaches (which
capture complex patterns in operational data). Third, multi-modal fusion methods that integrate
radar, ADS-B, weather, NOTAM, and voice communication data into unified prediction systems.
Fourth, explainable AI methods tailored specifically for the air traffic control context, where a
controller's ability to understand and override AI recommendations is not a nice-to-have but a
regulatory requirement.
The skies are getting more crowded. The tools managing them need to get smarter. The
research reviewed here shows a clear path forward—what remains is the engineering, regulatory,
and institutional work required to walk it.
Conflicts of Interest
The author declares no conflict of interest.
Data Availability Statement
No new data were created or analyzed in this study. This article is a review of existing published
literature.
References
Aditya, V., Aswin, D.S., Dhaneesh, S.V., et al. (2024). A review on air traffic flow management
optimization: Trends, challenges, and future directions. Discover Sustainability, 5, 519.
https://doi.org/10.1007/s43621-024-00781-7
Brittain, M.W., Yang, X., & Wei, P. (2021). Autonomous separation assurance with deep multi-agent
reinforcement learning. Journal of Aerospace Information Systems, 18(12), 890–905.
https://doi.org/10.2514/1.I010973
Brittain, M., & Wei, P. (2022). Scalable autonomous separation assurance with heterogeneous multi-agent
reinforcement learning. IEEE Transactions on Automation Science and Engineering, 19(2),
2837–2848. https://doi.org/10.1109/TASE.2022.3151607
Cai, K., Li, Y., Fang, Y., & Zhu, Y. (2022). A deep learning approach for flight delay prediction through
time-evolving graphs. IEEE Transactions on Intelligent Transportation Systems, 23(8), 11397–
11407. https://doi.org/10.1109/TITS.2021.3103502
Chen, Y., Zhao, Y., Fei, F., & Yang, H. (2024). Optimizing large-scale demand and capacity balancing in
air traffic flow management using deep neural networks. Aerospace, 11(12), 966.
https://doi.org/10.3390/aerospace11120966
De Giovanni, L., Lancia, C., & Lulli, G. (2024). Data-driven optimization for air traffic flow management
with trajectory preferences. Transportation Science, 58(2), 540–556.
https://doi.org/10.1287/trsc.2022.0309
Degas, A., Islam, M.R., Hurter, C., et al. (2022). A survey on artificial intelligence (AI) and eXplainable
AI in air traffic management. Applied Sciences, 12(3), 1295.
https://doi.org/10.3390/app12031295
Du, Z., Wu, J., Leng, Y., & Wandelt, S. (2025). AI4ATM: A review on how artificial intelligence paves
the way towards autonomous air traffic management. Journal of the Air Transport Research
Society, 5, 100077. https://doi.org/10.1016/j.jatrs.2025.100077
EUROCONTROL. (2025). Performance Review Report 2024. Brussels: EUROCONTROL.
https://www.eurocontrol.int/publication/performance-review-report-2024
Gianazza, D. (2010). Forecasting workload and airspace configuration with neural networks and tree
search methods. Artificial Intelligence, 174(7–8), 530–549.
https://doi.org/10.1016/j.artint.2010.03.001
Gui, G., Liu, F., Sun, J., et al. (2020). Flight delay prediction based on aviation big data and machine
learning. IEEE Transactions on Vehicular Technology, 69(1), 140–150.
https://doi.org/10.1109/TVT.2019.2954094
Gui, G., Zhou, Z., Wang, J., et al. (2020). Machine learning aided air traffic flow analysis based on
aviation big data. IEEE Transactions on Vehicular Technology, 69(5), 4817–4826.
https://doi.org/10.1109/TVT.2020.2981959
Guo, D., Wu, E.Q., Wu, Y., et al. (2023). FlightBERT: Binary encoding representation for flight
trajectory prediction. IEEE Transactions on Intelligent Transportation Systems, 24(2), 1828–
1842. https://doi.org/10.1109/TITS.2022.3219923
Kim, J., Justin, C., Briceno, S., & Mavris, D. (2021). Data-driven approach using machine learning for
real-time flight path optimization. Journal of Aerospace Information Systems, 18(11), 757–768.
https://doi.org/10.2514/1.I010940
Maynard, P., Clarke, S.S., Almache, J., et al. (2021). Natural language processing techniques for air
traffic management planning. AIAA AVIATION 2021 Forum, Paper 2021-2322.
https://doi.org/10.2514/6.2021-2322
Papadopoulos, G., Bastas, A., Vouros, G.A., et al. (2024). Deep reinforcement learning in service of air
traffic controllers to resolve tactical conflicts. Expert Systems with Applications, 236, 121234.
https://doi.org/10.1016/j.eswa.2023.121234
Pinto Neto, E.C., Baum, D.M., de Almeida Jr., J.R., et al. (2023). Deep learning in air traffic
management: A survey. Aerospace, 10(4), 358. https://doi.org/10.3390/aerospace10040358
Razzaghi, P., Tabrizian, A., Guo, W., et al. (2024). A survey on reinforcement learning in aviation
applications. Engineering Applications of Artificial Intelligence, 136(A), 108911.
https://doi.org/10.1016/j.engappai.2024.108911
Rebollo, J.J., & Balakrishnan, H. (2014). Characterization and prediction of air traffic delays.
Transportation Research Part C, 44, 231–241. https://doi.org/10.1016/j.trc.2014.04.007
Shafienya, H., & Regan, A.C. (2022). 4D flight trajectory prediction using a hybrid deep learning method
based on ADS-B technology. Transportation Research Part C, 144, 103878.
https://doi.org/10.1016/j.trc.2022.103878
Shi, Z., Xu, M., & Pan, Q. (2021). 4-D flight trajectory prediction with constrained LSTM network. IEEE
Transactions on Intelligent Transportation Systems, 22(11), 7242–7255.
https://doi.org/10.1109/TITS.2020.3004807
Sui, D., Ma, C., & Wei, C. (2023). Tactical conflict solver assisting air traffic controllers using deep
reinforcement learning. Aerospace, 10(2), 182. https://doi.org/10.3390/aerospace10020182
Taylor, C., Vargo, E., Bromberg, E., & Manderfield, T. (2023). Designing traffic management strategies
using reinforcement learning techniques. Journal of Air Transportation, 31(4), 199–212.
https://doi.org/10.2514/1.D0339
Yu, B., Guo, Z., Asian, S., et al. (2019). Flight delay prediction for commercial air transport: A deep
learning approach. Transportation Research Part E, 125, 203–221.
https://doi.org/10.1016/j.tre.2019.03.013
Zeng, W., Quan, Z., Zhao, Z., et al. (2020). A deep learning approach for aircraft trajectory prediction in
terminal airspace. IEEE Access, 8, 151250–151266.
https://doi.org/10.1109/ACCESS.2020.3016289