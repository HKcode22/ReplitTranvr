QUEUE UP FOR TAKEOFF: A TRANSFERABLE DEEP LEARNING
FRAMEWORK FOR FLIGHT DELAY PREDICTION
Nnamdi Daniel Aghanya, Ta Duong Vu
Cranfield University
Cranfield
{nnamdi.aghanya, duong.vu}@cranfield.ac.uk
Amaëlle Diop, Charlotte Deville, Nour Imane Kerroumi
Cranfield University
Cranfield
{amaelle.diop, charlotte.deville, nourimane.kerroumi}@cranfield.ac.uk
Dr. Irene Moulitsas, Dr. Jun Li, Dr. Desmond Bisandu
Cranfield University
Cranfield
{i.moulitsas, jun.li, desmond.bisandu}@cranfield.ac.uk
ABSTRACT
Air travel facilitates the movement of people and goods globally. However, flight delays remain
a significant issue, profoundly causing financial losses, operational inefficiencies, and passenger
dissatisfaction. Delay prediction remains a critical challenge in the aviation industry; and thus, several
approaches have been developed to model and predict flight time delays in recent decades. Therefore,
in order to provide great passenger experiences, boost revenue, and reduce unnecessary revenue loss,
flight delays most be precisely predicted and such models can be generalised across networks. In this
paper, a novel approach was developed that combines Queue-Theory and simple attention model,
referred to as the Queue-Theory SimAM (QT-SimAM) model to predict flight delays. To validate our
proposed model, we used data from the US Bureau of Transportation of Statistics. Our experiment
results show that the proposed QT-SimAM (Bidirectional) out-performed the existing methods with
accuracy of 0.927, precision of 0.946, recall of 0.927 and F1 score of 0.932. For transferability, we
tested our model using the EUROCONTROL dataset. Our experiment results show that the proposed
QT-SimAM (Bidirectional) has accuracy of 0.826, precision of 0.794, recall of 0.826 and F1 score of
0.791. Ultimately, the paper outlines an end-to-end methodology for predicting flight delays. Our
suggested method’s effectiveness in forecasting flight delays with the fewest possible errors is clearly
defined by all evaluation parameters. Additionally, passengers’ anxiety can be successfully reduced
by using our robust model’s prediction result to obtain information about the delayed flight ahead of
time from aviation decision systems across networks.
Keywords Flight delay · Queue-Theory · Simple attention model · Airport · Aviation.
1 Introduction
Flight delays remain a significant issue in the aviation industry, profoundly causing financial losses, operational
inefficiencies, and passenger dissatisfaction [1, 2, 3]. Predicting flight delays remains a very difficult challenge due
to their inherent, mostly inevitable uncertainty arising from a host of factors, such as weather conditions, air-traffic
congestion effects, technical problems, airspace capacity, and airline-level operational constraints [4, 5, 6]. Flight delays
can be defined as departures that leave more than 15 minutes after their scheduled time or aeroplane arrivals that land
arXiv:2507.09084v1 [cs.LG] 12 Jul 2025
over 15 minutes late, a benchmark set by the United States (US.) Department of Transportation and widely adopted in
the literature [7, 8, 9, 10, 11].
Airline delays result in significant financial and operational losses, costing the global industry billions annually [12,
13, 14]. A delay in one flight often disrupts subsequent flights due to the interconnected nature of airline schedules,
affecting aircraft utilisation and crew assignments [15]. Airlines incur additional costs from increased fuel consumption,
crew hours, and passenger compensation [16]. Furthermore, delays have an environmental impact due to increased
carbon emissions from extended taxiing or holding patterns [17].
Delay prediction has been a critical challenge for decades, with several approaches developed to model and predict
flight time delays [18, 19, 20, 21]. Fortunately, the modern aviation ecosystem generates vast amounts of data [22],
and researchers have increasingly turned to advanced computational approaches like Machine Learning (ML) and
Deep Learning (DL) to harness it [23]. These predictive models offer the potential to accurately forecast flight delays,
enabling proactive decision-making [6]. However, results can be limited by the absence of specific airline data [24],
and despite extensive research, mitigating flight delays remains a primary problem to be solved [25]. A significant gap
in existing research is the reliance on weather-delay features for forecasting. This affects the model’s utility for most
open datasets that lack such features (e.g., the EU dataset), rendering a universally applicable solution impractical and
highlighting the need for a transferable approach.
In response, this research predicts flight delays by developing a model that combines the Queue-Theory and simple
attention model, referred to as the Queue-Theory SimAM (QT-SimAM) model. This architecture innovatively modifies
the SimAM attention mechanism by biasing its energy function with proxies for an aircraft’s accumulated workload,
calculated using principles from Queue Theory. This integration allows the model to adaptively increase attention
to feature channels associated with congested flight chains, providing a more informed representation of how delays
cascade from one flight leg to the next. By addressing some key limitations in existing methodologies, such as the
lack of generalizability and limited understanding of delay propagation, the study offers a robust framework for more
accurate and transferable flight delay forecasting. The developed models provide technical information for airlines,
airports, and air traffic management, demonstrating the potential for a broader application in different aviation networks
(transferability). In addition, the research highlights the broader implications of advanced predictive technologies,
offering a path to improved operational efficiency, passenger experience, and environmental sustainability in the aviation
industry.
The rest of the paper is organised as follows. Chapter 2 establishes the flight delay methodology based on the QueueTheory SimAM (QT-SimAM) model. In Chapter 3, we present prediction results and discussions, while Chapter 4
presents conclusions with limitations. The Appendix Chapter summarises related literature on flight time delays.
2 Methodology
This chapter details the methodology employed to develop and evaluate an attention-based framework for predicting
flight delays, with a focus on assessing model transferability between the United States (US) and the European Union
(EU). The core of this framework is a novel integration of queue-theoretic principles with attention mechanisms.
The subsequent sections describe the data acquisition and feature harmonisation steps, followed by the construction of
flight chains for sequential modelling. The architectural details of the attention-based baseline models are then presented.
The chapter culminates in the introduction of our proposed Queue-Theory Simple Attention Module (QT-SimAM)
and its pairing with a Queue Mogrifier (QMogrifier) LSTM. An overview of the end-to-end workflow is provided in
Figure 1.
2.1 Data Acquisition and Feature Harmonisation
This study utilises flight operations data from the US Bureau of Transportation Statistics and EUROCONTROL. Data
from March, June, September, and December 2022 was selected to cover diverse operational and meteorological
seasons, providing a robust baseline for evaluating model generalisation and transferability between the US and EU.
Schema alignment The raw US and EU data files differ in scope and nomenclature. A notable asymmetry is a
weather_delay field in the US data with no counterpart in the European feed. A strictly comparable baseline, therefore,
rests on the intersection of the two schemas as defined by Equation (1),
Σ = Cols
DeUS
∩ Cols
DeEU
, (1)
which yields 38 shared features. To measure the incremental value of local features, an auxiliary set of US-only models
is also trained with the weather_delay feature reinstated.
2
Figure 1: Flight Delay Prediction Pipeline Overview.
Minor gaps were repaired by imputation: zeros for continuous variables and sentinel tokens for categoricals. No
rows were dropped, avoiding region-specific sampling bias. The final harmonised datasets comprised approximately
NUS = 384, 211 (US) and NEU = 327, 408 (EU) rows.
Feature catalogue In table 1, we list the key features comprising the harmonised set Σ. This selection ensures that all
variables are available in both US and EU feeds, making the schema suitable for transfer experiments. Further, the set is
consistent with the predictors used by Qu et al. [26], allowing for direct comparisons to sequence-based models that
have already proven effective.
Implications for transferability A core objective is to evaluate model transferability, defined as the ability of a
model trained on data from one region (e.g., the US) to predict outcomes accurately in another (e.g., the EU) using only
the shared feature set. The primary transfer experiments are conducted using this restricted schema, providing a strict
test of generalisation. The auxiliary US-only experiment with weather_delay serves to quantify the performance gain
from richer local data against the penalty incurred when such information is unavailable.
2.2 Flight-Chain Construction for Sequential Input
Attention mechanisms are highly effective when supplied with temporally ordered data. We therefore replace isolated
flight records with flight chains: short, fixed-length sequences that mirror the daily schedule of an individual aircraft,
adapting the method of Qu et al. [26]. Presenting consecutive flight legs in a single tensor allows the model to learn
how delay on an early sector propagates through the remainder of the roster.
Formal definition Let a be an airframe and t a date. The ordered set of sectors flown by a on t is
F
a
t =

f
a,t
1
, f a,t
2
, . . . , f a,t
|Fa
t
|

, (2)
3
Table 1: Unified feature catalogue after harmonised engineering
Feature name Type Role
distance Numerical Input
flight_date Datetime Input
tail_number Categorical Input
airline Categorical (label-encoded) Input
depart_from_iata Categorical (label-encoded) Input
arrive_at_iata Categorical (label-encoded) Input
scheduled_departure_utc Numerical Input
actual_departure_utc Numerical Input
departure_delay_minutes Numerical Input
scheduled_arrival_utc Numerical Input
scheduled_estimated_time Numerical Input
arrival_delay_minutes Numerical Output
where each leg f
a,t
k
has a feature vector x
a,t
k ∈ R
p
. A sliding window of length L = 3 with stride one extracts
overlapping subsequences
c
a,t
j =

f
a,t
j
, f a,t
j+1, f a,t
j+2
, j = 1, . . . , |Fa
t
| − L + 1. (3)
An aircraft completing at least three sectors thus yields |Fa
t
| − 2 chains (see Figure 2).
Figure 2: Sequential Flight Input Representation (Flight Chain, L = 3).
Operational feasibility filter A chain is considered valid only if consecutive ground times respect
Depj+1 ≥ Arrj + τmin, Depj+2 ≥ Arrj+1 + τmin,
∆j,j+1 ≤ τmax, ∆j+1,j+2 ≤ τmax, (4)
where τmin = 15 min and τmax = 12 h. These thresholds mirror standard airline practice and ensure fair model
comparisons.
Tensor representation and target For each feasible chain, the three feature vectors are stacked row-wise into a
tensor Xc ∈ R
3×p
.
Xc =



x
⊤
j
x
⊤
j+1
x
⊤
j+2


 . (5)
The target label yc ∈ {0, 1, 2, 3, 4} is derived from the arrival delay of the third leg, binned into five ordinal classes
based on 15, 60, 120, and 240-minute cut-offs. This preserves hierarchical error information and supports class-balanced
stratification. Table 2 summarises the ordinal target definition.
4
Table 2: Ordinal arrival-delay classes used for model training
Ordinal label yc Arrival-delay interval (min)
0 T ≤ 15
1 15 < T ≤ 60
2 60 < T ≤ 120
3 120 < T ≤ 240
4 T > 240
Chain-extraction algorithm and split The procedure outlined in Algorithm 1 yielded approximately 280k chains
from the US data and 15k from the EUROCONTROL data. Retaining identical preprocessing across regions is central
to our transferability study. The US data was split into approximately 198k training, 42k validation, and 42k test
examples. A robustness check using a stricter, non-overlapping split by tail-number-day confirmed equivalent accuracy,
validating the use of the simpler window-based split.
2.3 Attention models
We implement two lightweight attention-based architectures as baselines, drawing on the CBAM and SimAM mechanisms [27, 28, 26]. Model hyperparameters such as channel widths and kernel sizes are kept constant across all
experiments to ensure fair comparison.
CBAM–CNN feature extractor Our first baseline is a one-dimensional Convolutional Neural Network (CNN)
augmented with Convolutional Block Attention Modules (CBAM). The architecture consists of K stages, each stacking
a convolutional block and a CBAM gate [27]. A mini-batch x ∈ R
B×S×p
(batch size B, sequence length S = 3,
features p) is first permuted to z
(0) ∈ R
B×p×S to treat features as channels. Each stage then computes:
z
(ℓ) = CBAM
f
(ℓ)
CONV(z
(ℓ−1))

, ℓ = 1 . . . K. (6)
CBAM sequentially infers and applies channel and spatial attention maps (Mc and Ms) to refine the feature representation:
Mc = σ

MLP(AvgPool(z)) + MLP(MaxPool(z))
(7a)
z
′ = Mc ⊙ z (7b)
Ms = σ

gk

Meanc(z
′
), Maxc(z
′
)


(7c)
CBAM(z) = Ms ⊙ z
′
(7d)
After the final stage, global average pooling is applied across the sequence axis, followed by a fully connected layer to
produce five-class logits. Empirical tuning led to K = 3 stages with channel counts ⟨64, 128, 256⟩.
SimAM–CNN–LSTM Hybrid Model To better capture temporal dependencies, our second baseline couples a
convolutional front-end with a recurrent back-end. The convolutional stack is enhanced with the parameter-free SimAM
operator [28], which estimates saliency based on principles of neuronal inhibition. The architecture first passes the
input through K stages, each consisting of a convolution followed by SimAM:
z
(ℓ) = SimAM
f
(ℓ)
CONV
z
(ℓ−1)

, ℓ = 1 . . . K. (8)
The SimAM module assigns a saliency score to each neuron by calculating an energy function y =
(x−µc)
2
4

σ2
c+λ
 + 0.5,
where µc and σ
2
c
are the channel mean and variance. The refined features are zrefined = σ(y) ⊙ z. The final feature map
z
(K)
is reshaped and forwarded to a single-layer LSTM, whose final hidden state is mapped to five-class logits.
2.4 QTSimAM with QMogrifier LSTM
While the baseline models capture statistical patterns, they omit a key driver of cascading delays: the residual workload
an aircraft carries between sectors. Drawing from queueing theory, an aircraft can be modelled as a single-server system
whose workload evolves according to the Lindley recursion [29, 30]. Our proposed model injects a proxy for this
workload into both the attention mechanism (QT-SimAM) and the LSTM gating (QMogrifier LSTM).
5
Residual-delay proxy Since an aircraft’s complete history is often unavailable for real-time prediction, we compute
queueing surrogates for each flight leg using its great-circle distance dt and airborne time at. These serve as proxies
for service time and inter-arrival time, respectively. From these, we derive server utilisation ρ and, using an M/M/1
approximation, the expected waiting time W
(t)
q and queue length L
(t)
q :
W(t)
q =
ρ
1 − ρ + ε
ES, L(t)
q = λ W(t)
q
. (9)
These quantities are min-max normalised across the three-leg chain to produce (W
(t)
n , L(t)
n ) ∈
2
, providing a snapshot
of the aircraft’s congestion level.
Queue-Theory SimAM We modify the SimAM energy function to direct attention towards legs burdened by residual
delay. Let W¯
n and L¯
n be the chain-average normalised waiting time and queue length. The queue-aware energy
becomes:
e
⋆ = v(z) + W¯
n + 0.5L¯
n + ελ, ελ = 10−4
, (10)
where v(z) is the original variance term. This biases the attention mask σ(e
⋆
) to preserve high-impact channels that
signal a heavy workload, allowing the network to allocate capacity more effectively.
QMogrifier LSTM To make the recurrent head reactive to evolving queue dynamics, we adapt the LSTM cell. At
each time-step t, the cell first mixes the previous hidden state ht−1 with the current queue proxies W
(t)
n and L
(t)
n to
produce a gating mask mt.
mt = σ

[ ht−1; W(t)
n
;L
(t)
n
]
⊤Wm + bm

(11)
This mask modulates the input feature vector, x˜t = mt ⊙ xt, before it enters a conventional LSTM cell, giving the
recurrent layer direct sensitivity to workload fluctuations within the chain.
Back-propagation and Optimisation The complete network is trained end-to-end by minimising the Cross-Entropy
loss using the Adam optimiser. All custom components—the residual-delay layer, QT-SimAM, and QMogrifier
LSTM—are constructed from differentiable or sub-differentiable operations. This ensures that gradients can be
computed for the entire parameter set Θ via standard back-propagation, allowing the model to be tuned jointly. The
parameter update follows the standard stochastic gradient descent rule:
Θt+1 = Θt − ηt∇ΘLBt
(Θt) (12)
where LBt
is the loss on a mini-batch Bt and ηt is the learning rate.
3 Results
3.1 Environment Description
The experimental setup consists of the Crescent HPC cluster based on CentOS 7 and comprises compute nodes with
two Intel® Xeon® CPUs and NVIDIA® Tesla V100 GPUs. Each experimental run is allocated 96 CPU cores (six
16-core nodes) and can run up to two GPU-accelerated jobs in parallel.
3.2 Parameters Selection
The hybrid model (QTSimAM-CNN-LSTM) evaluated in this study is configured with several hyperparameters that
influence their training dynamics and predictive performance. General training parameters include the Adam optimiser
[31], a cross-entropy loss function, an initial learning rate of 10−4
, and L2 weight decay (regularisation term λ) set to
10−5
. The models were trained for a maximum of 50 epochs; this decision was informed by a careful review of related
studies, particularly the work by Qu et al. [26] indicated that similar model architectures often exhibit performance
convergence around 40 epochs, stabilising loss and accuracy values. Opting for 50 epochs provides a sufficient margin
for our models to reach a stable performance plateau. The training was carried out using the specified batch size of 32.
The architectural design incorporates a CNN component followed by an LSTM. The CNN typically consists of three
convolutional layers with [64, 128, 256] output channels, respectively, utilising 3×3 kernels and ReLU activation
functions. The subsequent LSTM component is characterised by key hyperparameters such as its hidden state size,
number of layers, bidirectionality, and dropout rate. While these hyperparameters offer avenues for optimisation through
systematic tuning to tailor the model to specific dataset characteristics, the experiments presented in this paper utilise a
6
consistent set of default values to ensure a fair baseline for model comparison. Specifically, for the LSTM, a hidden
size of 256, 2 layers, and a dropout rate of 0.2 (applied within LSTM layers and before the final classification layer)
were used.
The primary hyperparameters, including fixed training settings and default architectural choices used for this study,
are summarised in Table 3. The table also indicates which parameters are generally considered tunable for further
optimisation.
This standardised configuration allows for a focused evaluation of the model architectures themselves. Although
hyperparameter tuning could yield further performance gains, establishing this baseline with default values is a crucial
first step in understanding the inherent capabilities of the proposed models for flight delay prediction.
Table 3: Experimental Hyperparameters for LSTM-based Models.
Parameter Name Default Value Used Tunable
General Training Parameters
Loss Function Cross-Entropy Loss No
Optimizer Adam No
Learning Rate 1 × 10−4 Yes
Weight Decay (λ) 1 × 10−5 Yes
Batch Size 32 Yes
Maximum Training Epochs 50 Yes
CNN Architecture Parameters
Kernel Size 3×3 Yes
Output Channels [64, 128, 256] Yes
LSTM Architecture Parameters
Hidden Size 256 Yes
Number of Layers 2 Yes
Bidirectional False Yes
Dropout Rate 0.2 Yes
3.3 Performance Metrics
As mentioned earlier, this paper addresses the flight delay prediction task as a multiclass classification problem. Several
standard performance metrics are employed to systematically evaluate the transferability and effectiveness of the
proposed hybrid model. Primary metrics include overall accuracy, the confusion matrix, and per-class precision,
recall, and F1 score. These metrics are derived from the confusion matrix, which provides a detailed breakdown of
classification performance.
For a multiclass scenario with C classes, the confusion matrix cross-tabulates the true classes against the predicted
classes. For any given class c ∈ C:
• True Positives (TPc): The number of instances correctly predicted as belonging to class c.
• False Positives (FPc): The number of instances incorrectly predicted as class c (that is, they belong to another
class c
′ ̸= c).
• False Negatives (FNc): The number of instances belonging to class c but incorrectly predicted as another class
c
′ ̸= c.
• True Negatives (TNc): The number of instances correctly predicted as not belonging to class c. (TN is less
commonly used directly in multiclass P/R/F1 formulas for a specific class but is implicit in the sum of other
classes).
7
Accuracy.
Accuracy represents the proportion of correctly classified instances in all classes to the total number of instances (n). It
provides a general measure of the model’s overall correctness and is calculated as shown in Equation (13):
Accuracy =
Pn
i=1 1
h
ˆli = li
i
n
, (13)
where ˆli
is the predicted class for instance i, and li
is its ground-truth label. Although simple and intuitive, accuracy
alone may not provide a complete picture of model performance in cases of significant class imbalance.
Confusion Matrix.
In this study, a 5 × 5 confusion matrix is used, corresponding to the five defined flight delay categories: Early/Slight
Delay, Delayed, Significantly Delayed, Severely Delayed, Extremely Delayed (as detailed in §2.2). True classes are
matched against predicted classes. The diagonal elements of this matrix represent the correct classifications (TPc for
each class c), while the off-diagonal elements highlight systematic misclassifications (FPc and FNc).
Per-Class Metrics.
From the components of the confusion matrix for each class c, the following class-specific scores are reported, as
defined in Equation (14):
Precisionc =
TPc
TPc + FPc
,
Recallc =
TPc
TPc + FNc
,
F1-scorec =
2 × Precisionc × Recallc
Precisionc + Recallc
.
(14)
These metrics provide a nuanced understanding of performance for each specific delay category.
• Precisionc (Pc): For class c, this is the proportion of true positive predictions among all instances predicted as
class c. It answers the question: "When the model predicts class c, how often is it correct?"
• Recallc (Rc): For class c, this is the proportion of true positive predictions among all actual instances of class
c. It answers the question: "Of all true instances of class c, how many did the model correctly identify?"
• F1-scorec: This is the harmonic mean of Precisionc and Recallc. The F1 score considers false positives (via
precision) and false negatives (via recall). A high F1 score is achieved only when both precision and recall are
high, making it a robust measure, especially when there is an uneven class distribution or when the cost of
false positives and false negatives needs to be balanced.
Furthermore, macro-averaged and weighted-averaged scores for precision, recall, and F1 score are also computed from
the per-class metrics to provide an overall estimate that is not biased by class imbalance. It is important to note that we
chose the weighted-average scores because our dataset exhibits some notable class imbalance, and these scores more
accurately reflect the model’s overall performance by considering the proportion of each class in the actual data.
In summary, the combined use of accuracy, the detailed confusion matrix, and the per-class precision, recall, and F1
scores offer an informative and concise representation of the model’s performance across the different flight delay
categories.
3.4 Analysis of Experimental Results
This section analyses the experimental results, beginning with an in-region assessment of our proposed QTSIM
models against contemporary deep learning benchmarks. This establishes the baseline performance within the primary
operational domain before subsequent evaluations of model transferability.
8
3.4.1 In-Region Performance Evaluation
This in-region evaluation involves training and testing the models exclusively on the US domestic flight dataset.
Crucially, for this US-specific assessment, the input features for our QTSIM models include the weather_delay
feature, leveraging richer local information not available in the harmonised cross-regional schema. Table 4 presents a
comparative evaluation of our proposed QTSIM models against the CBAM-CondenseNet and SimAM-CNN-MLSTM
benchmarks reported by Qu et al. [26]. Our QTSIM with Bi-direction enabled (Bidir.) demonstrates superior
performance across all key metrics, achieving the highest accuracy (0.93), precision (0.96), recall (0.93), and F1-score
(0.93). This notably surpasses Qu et al.’s leading SimAM-CNN-MLSTM model, which reported an accuracy of 0.9136
and an F1-score of 0.849, while our QTSIM (Bidir.) also matches its optimal loss value of 0.20.
Table 4: Performance comparison of CBAM-CondenseNet, SimAM-CNN-MLSTM, and QTSIM models
Metric CBAM-CondenseNet SimAM-CNN-MLSTM QTSIM QTSIM (Bidir.)
Loss value 0.30 0.20 0.27 0.20
Accuracy 0.898 0.914 0.855 0.927
Precision 0.913 0.825 0.916 0.946
Recall 0.892 0.874 0.855 0.927
F1 score 0.904 0.849 0.870 0.932
Figure 3 shows the changes in loss and accuracy values for the QTSIM and QTSIM (Bidir.) models with the number
of training epochs. Our models typically converge after approximately 38 epochs, demonstrating efficient learning;
this convergence is slightly faster than the 40 epochs reported by Qu et al. for their CBAM-CondenseNet, while their
SimAM-CNN-MLSTM model converged more rapidly at 20 epochs.
Figure 3: Training loss and accuracy curves for QTSIM and QTSIM (Bidir.) models over 50 epochs on the US domestic
dataset.
To further contextualise the performance of our proposed approach, Table 5 extends this comparison to include a
variety of traditional machine learning algorithms alongside the aforementioned deep learning architectures. These
performance metrics for the benchmark models were taken from the work of Qu et al. [26]. The results show that in the
case of the task of predicting flight delays, deep learning approaches outperform traditional methods. In particular, our
9
Table 5: Accuracy Comparison with Traditional and Deep Learning Models.
Network Model Accuracy (%)
C4.5 Decision Tree [26] 78.05
Support Vector Machine [26] 80.00
ATD Bayesian Network [26] 80.00
Artificial Neural Network [26] 86.30
CBAM-CondenseNet [26] 89.80
SimAM-CNN-MLSTM [26] 91.36
QTSIM (Bidir.) 92.76
QTSIM (Bidir.) model outperforms traditional algorithms by a large margin and surpasses previously reported deep
learning models with a prediction accuracy of 93.00%. These results provide a substantial performance baseline for our
model architecture before we examine its ability to assess transferability.
3.4.2 Transferability Performance Evaluation
Having established in-region benchmarks (§3.4.1), we now assess model transferability: how well QTSIM models,
trained on US data using only the harmonised feature set (excluding weather_delay), generalise to the EU operational
context. This tests the robustness of learnt delay patterns on unseen data from a different region.
Table 6 details the performance of the QTSIM models trained and tested on US data using only these harmonised
features. As expected, excluding weather_delay slightly reduces performance compared to Table 4 (which included
it). The QTSIM model achieved an accuracy of 0.913 (F1: 0.918), and the QTSIM (Bidir.) model an accuracy of 0.912
(F1: 0.917). These results serve as the direct baseline for evaluating transfer to the EU.
Table 6: Performance of QTSIM models on US domestic dataset using only harmonised features.
Metric QTSIM QTSIM (Bidir.)
Loss value 0.25 0.26
Accuracy 0.913 0.912
Precision 0.941 0.918
Recall 0.913 0.912
F1 score 0.918 0.917
Table 7 contains the cross-regional evaluation results where models trained on US data were evaluated on previously
unseen EU data. The models were evaluated with and without the US-specific weather_delay feature. Using the
harmonised feature set, QTSIM achieved an accuracy of 0.835 (F1: 0.815) on EU data, and QTSIM (bidir) achieved
an accuracy of 0.826 (F1: 0.791). Models with the weather_delay feature achieved varying transfer performance
metrics (unidirectional: accuracy 0.819, F1 0.758; Bidirectional: accuracy 0.829, F1 0.827 on EU data). It is anticipated
that we will experience some performance loss when transferring models to wildly different contexts, and these results
suggest a good level of cross-regional generalisability. It should be noted that of the models trained on the harmonised
feature set, the QTSIM model produced the highest transfer F1 score, indicating some evidence that training without
region-specific features will perform better in "strict" transfer scenarios.
Table 7: Transferability performance: QTSIM models trained on US dataset and tested on EU dataset.
Model Configuration Weather Accuracy Precision Recall F1-score
QTSIM Yes 0.819 0.777 0.819 0.758
QTSIM (Bidir.) Yes 0.829 0.826 0.829 0.827
QTSIM No 0.835 0.812 0.835 0.815
QTSIM (Bidir.) No 0.826 0.794 0.826 0.791
To summarise, we found a decrease in performance when comparing models associated with the US domain and EU
domain, which was expected in cross-regional contexts. However, QTSIM models provided a meaningful ability to
generalise the learnt associations. To further evaluate the transferability of our models, we tested three established
10
models (GNN, GRU network, and Voting classifier) under the same transfer conditions as the US to EU studies to
provide comparison benchmarks.
Table 8 shows the transfer accuracy of the best QTSIM setups compared to a GNN, GRU, and Voting classifier
setup. The results show that advanced deep learning models, specifically with QTSIM leading with 83.5% accuracy,
outperform established machine learning baselines in a challenging transfer learning domain. Not only does this setup
outperform the Voting Classifier (81.1%), it also outperforms the GRU (79.4% accuracy) and GNN (59.6%) baselines,
adding to the confidence in the QTSIM architecture for cross-regional flight delay classification.
Table 8: Transferability Accuracy Comparison: US-Trained Models Tested on EU Dataset.
Model Transfer Accuracy (%)
Graph Neural Network (GNN) 59.6
Gated Recurrent Unit (GRU) 79.4
Voting Classifier 81.1
QTSIM 83.5
4 Conclusion
This paper provides a methodology for flight delay prediction that emphasises data harmonisation and model transferability based on flight operations data from multiple sources and sequential input representations. This paper proposes
three deep learning models for flight delay prediction alongside original queue-aware attention. Detailed layers of
preparation and model design considerations have been outlined, and the conclusions are as follows.
1. A robust data acquisition and feature harmonisation pipeline was established based on the need for crossregional analysis. This process yielded a unified schema from US BTS and EU EUROCONTROL data,
enabling the creation of "flight chains" temporally ordered sequences of flights, which allow models to learn
how delays propagate through an aircraft’s daily schedule, crucial for assessing model transferability.
2. According to the spatiotemporal characteristics of flight delay propagation and the need for more nuanced
attention, a QTSimAM-QMogrifier LSTM network was proposed integrating the principles of queueing theory.
The convolutional front extracts spatial patterns, which are then weighted by a novel QT-SimAM module
that incorporates residual delay proxies (derived from flight distance and airborne time) to focus attention on
congested flight segments. Subsequently, a QMogrifier LSTM processes these queue-aware features, further
extracting temporal dependencies by modulating its gates with per-leg delay proxies, thereby effectively
improving the model’s sensitivity to workload dynamics in predicting delay propagation.
In conclusion, this paper outlines an end-to-end methodology for predicting flight delay outcomes, comprising data
harmonisation, sequential input construction methods, and developing sophisticated, attention-based deep learning
models. The application of queueing theory to the attention mechanism significantly contributes to operational awareness
in flight delay predictions. Moving forward, we now look forward to a rigorous empirical evaluation of these models,
including considering the transferability performance of these models between the US and the EU. Future work will
also incorporate other harmonisable dynamic factors, such as real-time weather information and air traffic control
data, to improve predictive accuracy under different operational circumstances. Furthermore, research could focus
on advanced methodologies to address the inherent class imbalance in delay data. Enhancing model interpretability
through advanced eXplainable AI techniques could also be explored to provide deeper insights into the causal drivers of
predicted delays, fostering greater trust and operational utility.
References
[1] Kešel’ová M, Hanák P. Risk and opportunities in the process of flight delay. [Internet]. In: 2019 New Trends
in Aviation Development (NTAD); 2019; Chlumec nad Cidlinou, Czech Republic. p. 87-91. [cited 2025 Apr 2].
Available from: https://doi.org/10.1109/NTAD.2019.8875614.
[2] Khan WA, Ma HL, Chung SH, Wen X. Hierarchical integrated machine learning model for predicting flight
departure delays and duration in series. [Internet]. Transp Res Part C Emerg Technol. 2021;129:103225. [cited
2025 Apr 2]. Available from: https://doi.org/10.1016/j.trc.2021.103225.
11
[3] Chauhan VK, Ledwoch A, Brintrup A, Herrera M, Giannikas V, Stojkovic G, Mcfarlane D. Network science approach for identifying disruptive elements of an airline. [Internet]. Data Science and Management.
2023;6(2):110–121. [cited 2025 Apr 2]. Available from: https://doi.org/10.1016/j.dsm.2023.04.001.
[4] Etani N. Development of a predictive model for on-time arrival flight of airliner by discovering correlation
between flight and weather data. [Internet]. J Big Data. 2019;6(1):85. [cited 2025 Apr 2]. Available from:
https://doi.org/10.1186/s40537-019-0251-y.
[5] Wang T, Zheng Y, Xu H. A Review of Flight Delay Prediction Methods. [Internet]. In: 2022 2nd International
Conference on Big Data Engineering and Education (BDEE); 2022; Chengdu, China. p. 135-141. [cited 2025 Apr
2]. Available from: https://doi.org/10.1109/BDEE55929.2022.00029.
[6] Carvalho L, Sternberg A, Maia Gonçalves L, Cruz AB, Soares JA, Brandão D, Carvalho D, Ogasawara E.
On the relevance of data science for flight delay research: a systematic review. [Internet]. Transport Reviews. 2020;41(4):499–528. [cited 2025 Apr 2]. Available from: https://doi.org/10.1080/01441647.2020.
1861123.
[7] Gui G, Liu F, Sun J, Yang J, Zhou Z, Zhao D. Flight delay prediction based on aviation big data and machine
learning. [Internet]. IEEE Transactions on Vehicular Technology. 2020 Jan;69(1):140-150. [cited 2025 Mar 15].
Available from: https://doi.org/10.1109/TVT.2019.2954094.
[8] Mamdouh M, Ezzat M, Hefny H. Improving flight delays prediction by developing attention-based bidirectional
LSTM network. [Internet]. Expert Systems with Applications. 2024;238:121747. [cited 2025 Mar 21]. Available
from: https://doi.org/10.1016/j.eswa.2023.121747.
[9] Sternberg A, Soares J, Carvalho D, Ogasawara E. A review on flight delay prediction. [Internet]. arXiv preprint
arXiv:1703.06118; 2017. [cited 2025 Mar 13]. Available from: https://arxiv.org/abs/1703.06118.
[10] Pineda-Jaramillo J, Munoz C, Mesa-Arango R, Gonzalez-Calderon C, Lange A. Integrating multiple data sources
for improved flight delay prediction using explainable machine learning. [Internet]. Research in Transportation
Business & Management. 2024;56:101161. [cited 2025 Mar 20]. Available from: https://doi.org/10.1016/
j.rtbm.2024.101161.
[11] Mokhtarimousavi S, Mehrabi A. Flight delay causality: Machine learning technique in conjunction with
random parameter statistical analysis. [Internet]. International Journal of Transportation Science and Technology.
2023;12(1):230-244. [cited 2025 Mar 20]. Available from: https://doi.org/10.1016/j.ijtst.2022.01.
007.
[12] Lee K. Airline operational disruptions and loss-reduction investment. [Internet]. Transportation Research Part B:
Methodological. 2023;177:102817. [cited 2025 Apr 2]. Available from: https://doi.org/10.1016/j.trb.
2023.102817.
[13] Bliman N. Flight delays cost passengers billions. [Internet]. PLANADVISER; 2010 Oct 21 [cited 2025 Apr 2].
Available from: https://www.planadviser.com/flight-delays-cost-passengers-billions/.
[14] Anupkumar A. Investigating the costs and economic impact of flight delays in the aviation industry and the
potential strategies for reduction. [Internet]. Electronic Theses, Projects, and Dissertations. San Bernardino
(CA): California State University, San Bernardino; 2023 May [cited 2025 Apr 2]. Available from: https:
//scholarworks.lib.csusb.edu/cgi/viewcontent.cgi?article=2885&context=etd.
[15] Erdem F, Taner Bilgiç. Airline delay propagation: Estimation and modeling in daily operations. [Internet]. Journal
of Air Transport Management. 2024;115:102548. [cited 2025 Apr 2]. Available from: https://doi.org/10.
1016/j.jairtraman.2024.102548.
[16] IATA. Inefficiency in European airspace. [Internet]. IATA Economic Briefing; 2013 [cited 2025 Apr
2]. Available from: https://www.iata.org/en/iata-repository/publications/economic-reports/
inefficiency-in-european-airspace/.
[17] Sher F, Raore D, Klemeš JJ, Rafi-ul-Shan PM, Khzouz M, Marintseva K, Razmkhah O. Unprecedented impacts of
aviation emissions on global environmental and climate change scenario. [Internet]. *Current Pollution Reports*.
2021;7(4):549–564. [cited 2025 Apr 5]. Available from: https://doi.org/10.1007/s40726-021-00206-3.
[18] Koopman BO. Air-terminal queues under time-dependent conditions. [Internet]. *Oper Res*.
1972;20(6):1089–1114. [cited 2025 Apr 18].
[19] Khanmohammadi S, Chou CA, Lewis HW, Elias D. A systems approach for scheduling aircraft landings in JFK
airport. [Internet]. In: 2014 IEEE International Conference on Fuzzy Systems (FUZZ-IEEE); 2014 Jul 6-11;
Beijing, China. p. 1578-1585. [cited 2025 Mar 15]. Available from: https://doi.org/10.1109/FUZZ-IEEE.
2014.6891588.
12
[20] Tu Y, Ball MO, Jank WS. Estimating Flight Departure Delay Distributions—A Statistical Approach With LongTerm Trend and Short-Term Pattern. [Internet]. Journal of the American Statistical Association. 2008;103(481):112-
125. [cited 2025 Mar 13]. Available from: https://doi.org/10.1198/016214507000000257.
[21] Cetek C, Cinar E, Aybek F, Cavcar A. Capacity and delay analysis for airport manoeuvring areas using simulation.
[Internet]. *Aircraft Eng Aerosp Technol*. 2013;86(1):43–55. [cited 2025 Apr 18]. Available from: https:
//doi.org/10.1108/AEAT-04-2012-0058.
[22] AIAA. Aircraft Technology, Integration, and Operations (ATIO) 2002 Technical Forum. [Internet]. AIAA; 2002.
[cited 2025 Apr 3]. Available from: https://doi.org/10.2514/matio02.
[23] Kim YJ, Choi S, Briceno S, Mavris D. A deep learning approach to flight delay prediction. [Internet]. In: 2016
IEEE/AIAA 35th Digital Avionics Systems Conference (DASC); 2016 Sep; Sacramento, CA, USA. p. 1-6. [cited
2025 Mar 12]. Available from: https://doi.org/10.1109/DASC.2016.7778092.
[24] Dalmau R, Ballerini F, Naessens H, Belkoura S, Wangnick S. An explainable machine learning approach to
improve take-off time predictions. [Internet]. Journal of Air Transport Management. 2021;95:102090. [cited 2025
Apr 27]. Available from: https://doi.org/10.1016/j.jairtraman.2021.102090.
[25] Birolini S, Jacquillat A. Day-ahead aircraft routing with data-driven primary delay predictions. [Internet]. *Eur J
Oper Res*. 2023;310(1):379–396. [cited 2025 Apr 18]. Available from: https://doi.org/10.1016/j.ejor.
2023.02.035.
[26] Jingyi Qu, Shixing Wu, and Jinjie Zhang. Flight delay propagation prediction based on deep learning. Mathematics,
11(3):494, 2023.
[27] Woo S, Park J, Lee JY, Kweon IS. CBAM: Convolutional Block Attention Module. [Internet]. arXiv.org; 2018 Jul
17. [cited 2025 May 4]. Available from: https://arxiv.org/abs/1807.06521.
[28] Lingxiao Yang, Ru-Yuan Zhang, Lida Li, and Xiaohua Xie. Simam: A simple, parameter-free attention module
for convolutional neural networks. In International conference on machine learning, pages 11863–11874. PMLR,
2021.
[29] Hernández D, Muñoz JC, Giesen R, Delgado F. Analysis of real-time control strategies in a corridor with multiple
bus services. [Internet]. Transportation Research Part B: Methodological. 2015 Jul;78:83–105. [cited 2025 May
5]. Available from: https://doi.org/10.1016/j.trb.2015.04.011.
[30] Bae KH, Feng B, Kim S, Lazarova-Molnar S, Zheng Z, Roeder T, Thiesing R, Palomo S, Pender J. Intelligent manufacturing enabled by simulation: a framework and review. [Internet]. In: Proceedings of the
2020 Winter Simulation Conference; 2020 Dec 13–16; Orlando, FL. [cited 2025 May 5]. Available from:
https://informs-sim.org/wsc20papers/094.pdf.
[31] Kingma DP, Ba J. Adam: A method for stochastic optimization. [Internet]. arXiv.org; 2017. [cited 2025 May 8].
Available from: https://arxiv.org/abs/1412.6980.
[32] Ball M, Barnhart C, Dresner M, Hansen M, Neels K, Odoni AR, Peterson E, Sherry L, Trani A, Zou B. Total delay
impact study: a comprehensive assessment of the costs and impacts of flight delay in the United States. [Internet].
University of California, Berkeley. Institute of Transportation Studies; 2010. [cited 2025 Mar 16]. Available from:
https://rosap.ntl.bts.gov/view/dot/6234/dot_6234_DS1.pdf.
[33] Liu Y, Yin M, Hansen M. Economic costs of air cargo flight delays related to late package deliveries. [Internet].
Transportation Research Part E: Logistics and Transportation Review. 2019;126:105-118. [cited 2025 Mar 20].
Available from: https://doi.org/10.1016/j.tre.2019.03.017.
[34] Atkinson SE, Ramdas K, Williams JW. Robust scheduling practices in the US airline industry: Costs, returns, and
inefficiencies. [Internet]. *Management Science*. 2016;62(11):3372–3391. [cited 2025 May 8]. Available from:
https://doi.org/10.1287/mnsc.2015.2302.
[35] Anderson SW, Baggett LS, Widener SK. The impact of service operations failures on customer satisfaction:
evidence on how failures and their source affect what matters to customers. [Internet]. *Manufacturing & Service
Operations Management*. 2009;11(1):52–69. [cited 2025 May 8]. Available from: https://doi.org/10.1287/
msom.1070.0193.
[36] Lall A. Delays in the New York City metroplex. [Internet]. Transportation Research Part A: Policy and Practice.
2018;114:139-153. [cited 2025 Mar 13]. Available from: https://doi.org/10.1016/j.tra.2017.12.006.
[37] Coy S. A global model for estimating the block time of commercial passenger aircraft. [Internet]. Journal of
Air Transport Management. 2006;12(6):300-305. [cited 2025 Mar 17]. Available from: https://ideas.repec.
org/a/eee/jaitra/v12y2006i6p300-305.html.
13
[38] Sasse M, Hauf T. A study of thunderstorm-induced delays at Frankfurt Airport, Germany. [Internet]. Meteorological Applications. 2003;10(1):21-30. [cited 2025 Mar 20]. Available from: https://doi.org/10.1017/
S1350482703005036.
[39] Pejovic T, Williams VA, Noland RB, Toumi R. Factors affecting the frequency and severity of airport weather
delays and the implications of climate change for future delays. [Internet]. Transportation Research Record.
2009;(2139):97-106. [cited 2025 Mar 20]. Available from: https://doi.org/10.3141/2139-12.
[40] Borsky S, Unterberger C. Bad weather and flight delays: The impact of sudden and slow onset weather
events. [Internet]. Economics of Transportation. 2019;18:10-26. [cited 2025 Mar 18]. Available from: https:
//doi.org/10.1016/j.ecotra.2019.02.002.
[41] Rebollo JJ, Balakrishnan H. Characterization and prediction of air traffic delays. [Internet]. Transportation
Research Part C: Emerging Technologies. 2014;44:231-241. [cited 2025 Mar 07]. Available from: https:
//doi.org/10.1016/j.trc.2014.04.007.
[42] Pérez–Rodríguez JV, Pérez–Sánchez JM, Gómez–Déniz E. Modelling the asymmetric probabilistic delay of
aircraft arrival. [Internet]. Journal of Air Transport Management. 2017;62:90-98. [cited 2025 Mar 17]. Available
from: https://doi.org/10.1016/j.jairtraman.2017.03.001.
[43] Yu B, Guo Z, Asian S, Wang H, Chen G. Flight delay prediction for commercial air transport: A deep learning
approach. [Internet]. Transportation Research Part E: Logistics and Transportation Review. 2019;125(C):203-221.
[cited 2025 Mar 20]. Available from: https://ideas.repec.org/a/eee/transe/v125y2019icp203-221.
html.
[44] Thiagarajan B, Srinivasan L, Sharma AV, Sreekanthan D, Vijayaraghavan V. A machine learning approach for
prediction of on-time performance of flights. [Internet]. In: 2017 IEEE/AIAA 36th Digital Avionics Systems
Conference (DASC); 2017 Sep; St. Petersburg, FL, USA. p. 1-6. [cited 2025 Mar 13]. Available from: https:
//doi.org/10.1109/DASC.2017.8102138.
[45] Lin Y, Zhang JW, Liu H. Deep learning based short-term air traffic flow prediction considering temporal–spatial
correlation. [Internet]. Aerospace Science and Technology. 2019;93:105113. [cited 2025 Mar 20]. Available from:
https://doi.org/10.1016/j.ast.2019.04.021.
[46] Ribeiro NA, Tay J, Ng W, Birolini S. Delay predictive analytics for airport capacity management. [Internet].
*Transp Res Part C Emerg Technol*. 2025;171:104947. [cited 2025 Apr 18]. Available from: https://doi.
org/10.1016/j.trc.2024.104947.
[47] Lee H, Balakrishnan H. Fast-time simulations of Detroit Airport operations for evaluating performance in the
presence of uncertainties. [Internet]. In: 2012 IEEE/AIAA 31st Digital Avionics Systems Conference (DASC);
2012 Oct 14–18; Williamsburg, VA, USA. Piscataway (NJ): IEEE; 2012. p. 4E2-1. [cited 2025 Apr 18]. Available
from: https://doi.org/10.1109/DASC.2012.6382349.
[48] Simic TK, Babic O. Influence of airport airside area layouts and air traffic management tactics on flight
cost efficiency. [Internet]. *Transp Plan Technol*. 2020;43(2):208–222. [cited 2025 Apr 18]. Available from:
https://doi.org/10.1080/03081060.2020.1717142.
[49] Offerman H. Simulation to support the airport stakeholder decision-making process. [Internet]. *Air Space
Eur*. 2001;3(1–2):60–67. [cited 2025 Apr 18]. Available from: https://doi.org/10.1016/S1290-0958(01)
90017-6.
[50] Munoz Hernandez A, Soler M. Simulation based validation of a mixed-integer optimal control algorithm
for conflict detection and resolution using TAAM software. [Internet]. In: 17th AIAA Aviation Technology,
Integration, and Operations Conference; 2017 Jun 5–9; Denver, CO, USA. Reston (VA): AIAA; 2017. p. 3436.
[cited 2025 Apr 18]. Available from: https://doi.org/10.2514/6.2017-3436.
[51] Günther Y, Pick A, Kern S, Lorenz S, Gerz T, Keis F, Köhler M. Improved airport operations planning by using
tailored forecasts of severe weather. [Internet]. *Journal Name*. 2015;vol(issue):pages. [cited 2025 Apr 18].
[52] Li Y, Cai K, Yan S, Tang Y, Zhu Y. Network-wide flight trajectories planning in China using an improved
genetic algorithm. [Internet]. In: 2016 IEEE/AIAA 35th Digital Avionics Systems Conference (DASC); 2016
Sep 25–29; Sacramento, CA, USA. Piscataway (NJ): IEEE; 2016. p. 1–7. [cited 2025 Apr 18]. Available from:
https://doi.org/10.1109/DASC.2016.7778051.
[53] Kreuz M, Luchkova T, Schultz M. Effect of restricted airspace on the ATM system. [Internet]. ResearchGate;
2016 [cited 2025 Apr 18]. Available from: https://www.researchgate.net/publication/312215273_
Effect_Of_Restricted_Airspace_On_The_ATM_System.
[54] Bäuerle N, Engelhardt-Funke O, Kolonko M. On the waiting time of arriving aircrafts and the capacity of airports
with one or two runways. [Internet]. *Eur J Oper Res*. 2007;177(2):1180–1196. [cited 2025 Apr 18].
14
[55] Grunewald E. Incentive-based slot allocation for airports. [Internet]. *Transp Res Procedia*. 2016;14:3761–3770.
[cited 2025 Apr 18].
[56] Odoni AR, Roth E. An empirical investigation of the transient behavior of stationary queueing systems. [Internet].
*Oper Res*. 1983;31(3):432–455. [cited 2025 Apr 18]. Available from: https://doi.org/10.1287/opre.31.
3.432.
[57] Kivestu PA. Alternative methods of investigating the time dependent M/G/k queue. [dissertation]. Cambridge
(MA): Massachusetts Institute of Technology; 1976. [cited 2025 Apr 18].
[58] Malone KM. Dynamic queueing systems: behavior and approximations for individual queues and for networks.
[dissertation]. Cambridge (MA): Massachusetts Institute of Technology; 1995. [cited 2025 Apr 18].
[59] Pyrgiotis N, Malone KM, Odoni A. Modelling delay propagation within an airport network. [Internet]. Transportation Research Part C: Emerging Technologies. 2013 Feb;27:60–75. [cited 2025 Apr 3]. Available from:
https://doi.org/10.1016/j.trc.2011.05.017.
[60] Lovell D, Churchill A, Odoni A, Mukherjee A, Ball M. Calibrating aggregate models of flight delays and
cancellation probabilities at individual airports. [Internet]. In: Proceedings of the 7th USA/Europe Air Traffic
Management R&D Seminar; 2007 Jun 3–7; Barcelona, Spain. [cited 2025 Apr 18].
[61] Hebert JE, Dietz DC. Modeling and analysis of an airport departure process. [Internet]. *J Aircraft*.
1997;34(1):43–47. [cited 2025 Apr 18].
[62] Shone R, Glazebrook K, Zografos KG. Resource allocation in congested queueing systems with time-varying
demand: an application to airport operations. [Internet]. *Eur J Oper Res*. 2019;276(2):566–581. [cited 2025 Apr
18].
[63] Lancia C, Lulli G. Predictive modeling of inbound demand at major European airports with Poisson and prescheduled random arrivals. [Internet]. *Eur J Oper Res*. 2020;280(1):179–190. [cited 2025 Apr 18]. Available
from: https://doi.org/10.1016/j.ejor.2019.06.056.
[64] Nikoleris T, Hansen M. Queueing models for trajectory-based aircraft operations. [Internet]. *Transp Sci*.
2012;46(4):501–511. [cited 2025 Apr 18].
[65] Caccavale MV, Iovanella A, Lancia C, Lulli G, Scoppola B. A model of inbound air traffic: The application to
Heathrow airport. [Internet]. *Journal of Air Transport Management*. 2014;34:116–122. [cited 2025 May 8].
Available from: https://doi.org/10.1016/j.jairtraman.2013.09.004.
[66] Nayak N, Zhang Y. Estimation and comparison of impact of single airport delay on national airspace system with
multivariate simultaneous models. [Internet]. Transportation Research Record. 2011;2206(1):52-60. [cited 2025
Mar 18]. Available from: https://doi.org/10.3141/2206-07.
[67] Hansen M, Zhang Y. Operational consequences of alternative airport demand management policies: case of
LaGuardia airport, New York. [Internet]. Transportation Research Record. 2005;1915(1):95-104. [cited 2025 Mar
18]. Available from: https://doi.org/10.1177/0361198105191500112.
[68] Wong JT, Tsai SC. A survival model for flight delay propagation. [Internet]. Journal of Air Transport Management.
2012;23:5-11. [cited 2025 Mar 17]. Available from: https://doi.org/10.1016/j.jairtraman.2012.01.
016.
[69] Abdel-Aty M, Lee C, Bai Y, Li X, Michalak M. Detecting periodic patterns of arrival delay. [Internet].
Journal of Air Transport Management. 2007;13(6):355-361. [cited 2025 Mar 14]. Available from: https:
//doi.org/10.1016/j.jairtraman.2007.06.002.
[70] Xu N, Sherry L, Laskey KB. Multifactor model for predicting delays at U.S. airports. [Internet]. Transportation
Research Record. 2008;2052(1):62-71. [cited 2025 Mar 17]. Available from: https://doi.org/10.3141/
2052-08.
[71] Markovic D, Hauf T, Röhner P, Spehr U. A statistical study of the weather impact on punctuality at Frankfurt
Airport. [Internet]. Meteorological Applications. 2008 Jun;15(2):293-303. [cited 2025 Mar 18]. Available from:
https://doi.org/10.1002/met.74.
[72] Mokhtarimousavi S, Anderson JC, Azizinamini A, Hadi M. Factors affecting injury severity in vehicle-pedestrian
crashes: A day-of-week analysis using random parameter ordered response models and Artificial Neural Networks.
[Internet]. International Journal of Transportation Science and Technology. 2020;9(2):100-115. [cited 2025 Mar
20]. Available from: https://doi.org/10.1016/j.ijtst.2020.01.001.
[73] Yu L, Zhou L, Tan L, Jiang H, Wang Y, Wei S, Nie S. Application of a new hybrid model with seasonal
auto-regressive integrated moving average (ARIMA) and nonlinear auto-regressive neural network (NARNN) in
forecasting incidence cases of HFMD in Shenzhen, China. [Internet]. PLoS One. 2014;9(6):e98241. [cited 2025
15
Mar 14]. Available from: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.
0098241.
[74] Khaksar H, Sheikholeslami A. Airline delay prediction by machine learning algorithms. [Internet]. Scientia Iranica.
2019;26(5):2689-2702. [cited 2025 Mar 21]. Available from: https://doi.org/10.24200/sci.2017.20020.
[75] Choi S, Kim YJ, Briceno S, Mavris D. Prediction of weather-induced airline delays based on machine learning
algorithms. [Internet]. In: 2015 IEEE/AIAA 34th Digital Avionics Systems Conference (DASC); 2015 Sep
13–17; Prague, Czech Republic. Piscataway (NJ): IEEE; 2016. p. 1–6. [cited 2025 Apr 5]. Available from:
https://doi.org/10.1109/DASC.2016.7777956.
[76] Zonglei L, Jiandong W, Guansheng Z. A new method to alarm large scale of flights delay based on machine
learning. [Internet]. In: 2008 International Symposium on Knowledge Acquisition and Modeling; 2008 Dec 21-22;
Wuhan, China. p. 589-592. [cited 2025 Mar 20]. Available from: https://doi.org/10.1109/KAM.2008.18.
[77] Dai M. A hybrid machine learning-based model for predicting flight delay through aviation big data. [Internet]. Scientific Reports. 2024;14(1):4603. [cited 2025 Mar 21]. Available from: https://doi.org/10.1038/
s41598-024-55217-z.
[78] Li Q, Jing R. Flight delay prediction from spatial and temporal perspective. [Internet]. Expert Systems with
Applications. 2022;205:117662. [cited 2025 Mar 21]. Available from: https://doi.org/10.1016/j.eswa.
2022.117662.
[79] Li Q, Guan X, Liu J. A CNN-LSTM framework for flight delay prediction. [Internet]. Expert Systems with
Applications. 2023;227:120287. [cited 2025 Mar 19]. Available from: https://doi.org/10.1016/j.eswa.
2023.120287.
[80] Ai Y, Pan W, Yang C, Wu D, Tang J. A deep learning approach to predict the spatial and temporal distribution of
flight delay in network. [Internet]. Journal of Intelligent & Fuzzy Systems. 2019;37(5):6029-6037. [cited 2025
Mar 21]. Available from: http://dx.doi.org/10.3233/JIFS-179185.
[81] Cai K, Li Y, Fang YP, Zhu Y. A deep learning approach for flight delay prediction through time-evolving graphs.
[Internet]. IEEE Trans Intell Transp Syst. 2022 Aug;23(8):11397-11407. [cited 2025 Mar 15]. Available from:
https://doi.org/10.1109/TITS.2021.3103502.
[82] Guo Z, Mei G, Liu S, Pan L, Bian L, Tang H, Wang D. SGDAN—A spatio-temporal graph dual-attention
neural network for quantified flight delay prediction. [Internet]. Sensors. 2020;20(22):6433. [cited 2025 Mar 15].
Available from: https://doi.org/10.3390/s20226433.
[83] Zeng W, Li J, Quan Z, Lu X. A deep graph-embedded LSTM neural network approach for airport delay prediction.
[Internet]. J Adv Transp. 2021;2021:1-15. [cited 2025 Mar 15]. Available from: https://doi.org/10.1155/
2021/6638130.
[84] Cai K, Wang Y, Yang Y, Qian S. AAGNN: Adaptive airport graph neural network for flight sequence prediction.
[Internet]. Expert Syst Appl. 2024;256:125013. [cited 2025 Mar 15]. Available from: https://doi.org/10.
1016/j.eswa.2024.125013.
[85] Zang H, Zhu J, Gao Q. Deep learning architecture for flight flow spatiotemporal prediction in airport network.
[Internet]. *Electronics*. 2022;11(23):4058. [cited 2025 Apr 18]. Available from: https://doi.org/10.3390/
electronics11234058.
[86] Bahdanau D, Cho K, Bengio Y. Neural machine translation by jointly learning to align and translate. [Internet].
arXiv preprint arXiv:1409.0473; 2014 Sep 1. [cited 2025 Apr 18]. Available from: https://arxiv.org/abs/
1409.0473.
[87] Vaswani A, Shazeer N, Parmar N, Uszkoreit J, Jones L, Gomez AN, Kaiser L, Polosukhin I. Attention is all you
need. [Internet]. arXiv.org. 2017. [cited 2025 Apr 3]. Available from: https://arxiv.org/abs/1706.03762.
[88] Velickovi ˇ c P, Cucurull G, Casanova A, Romero A, Liò P, Bengio Y. Graph attention networks. [Internet]. arXiv ´
preprint arXiv:1710.10903; 2018 Oct 27. [cited 2025 Apr 18]. Available from: https://arxiv.org/pdf/1710.
10903.
[89] Fang Y, Gao J, Huang C, Peng H, Wu R. Self multi-head attention-based convolutional neural networks
for fake news detection. [Internet]. PLOS ONE. 2019;14(9):e0222713. [cited 2025 Apr 3]. Available from:
https://doi.org/10.1371/journal.pone.0222713.
[90] Bao J, Yang Z, Zeng W. Graph to sequence learning with attention mechanism for network-wide multi-step-ahead
flight delay prediction. [Internet]. Transportation Research Part C: Emerging Technologies. 2021;130:103323.
[cited 2025 Mar 21]. Available from: https://doi.org/10.1016/j.trc.2021.103323.
16
[91] Zheng H, Wang Z, Zheng C, Wang Y, Fan X, Cong W, Hu M. A graph multi-attention network for predicting
airport delays. [Internet]. Transportation Research Part E: Logistics and Transportation Review. 2024;181:103375.
[cited 2025 Mar 21]. Available from: https://doi.org/10.1016/j.tre.2023.103375.
A Literature Review
With the rapid growth of the global aviation industry, flight delay is often acknowledged as one of the most important
performance indicators in the sector [9]. Flight delays have severe negative repercussions, resulting in annual economic
losses exceeding billions of dollars globally and causing significant operational inefficiencies and customer dissatisfaction [32, 33, 34, 35]. According to the Bureau of Transportation Statistics, both weather and non-weather factors can
influence flight time delays.
Weather features on flight delays Weather-related factors significantly influence flight delays. Studies have
shown that adverse weather conditions decrease airport capacity and cause delays throughout nearly every step of
operations [36]. Research consistently finds that delays are more severe in bad weather, with thunderstorms, in particular,
causing a considerable, non-linear increase in flight delays [37, 38]. Specific conditions like fog, thunderstorms, and
snowfall can increase the chance of delay by over 25% [39]. In quantitative terms, adverse weather can add from 10 to
23 minutes to departure delays, with factors like poor visibility and high winds being primary contributors [40].
Non-weather features on flight delays On clear days, non-weather factors—such as airline operations, maintenance,
and crew problems—are the primary "culprits" of delays [40]. Research has identified several key non-weather
variables that impact delays, including temporal factors like the day-of-week and time-of-day [41, 42]. Other critical
elements are the flight’s origin, departure and scheduled arrival times, the distance between airports, and the specific
airlines involved [19, 42]. Furthermore, operational conditions such as air traffic control actions, the degree of airport
crowdedness, and delays from a previous flight leg are also major contributors [43].
A.1 Flight Delay Prediction Models
While researchers have long used traditional statistical approaches to model flight delays [44, 20], recent advances
in big data analytics using machine learning (ML) and deep learning (DL) have shown great promise in improving
predictive capacity [41, 23, 45]. This section reviews three main categories of flight delay models: simulation, queuing,
and data-driven models [46].
A.1.1 Simulation models
Simulation models use a bottom-up method, simulating how an aviation system would operate based on predetermined
rules. Common tools include SIMMOD, Total Airspace and Airport Modeller (TAAM), and AirTOP. SIMMOD has been
used to analyse the causes of en-route delays and the impact of uncertainty in ground operations on delays [21, 47, 48].
TAAM, which uses a 3D framework, has been employed to simulate airfield capacity and optimise aircraft trajectories
to resolve conflicts [49, 50]. AirTOP is a fast-time simulator used to assess the impact of extreme weather events and to
optimise flight trajectories to mitigate congestion [51, 52, 53].
In summary, simulation models are valuable for assessing the potential effects of infrastructure and operational changes.
However, their drawbacks include high computational costs, which can limit the scope of analysis, and the difficulty
and time required for calibration and validation.
A.1.2 Analytical: queuing models
Analytical models use mathematical expressions of queuing dynamics to estimate flight delays, offering a computationally efficient alternative to simulation that does not require extensive data for calibration.
Stochastic and Non-stationary queueing models Stochastic queuing models are often characterized by probability
distributions. The simplest forms, stationary models, assume that demand rate fluctuations are insignificant, a belief
that is often incorrect in air travel where schedules change throughout the day [54, 55, 56]. To address this, nonstationary queuing models relax the steady-state assumption. The DELAYS algorithm, based on M(t)/Ek(t)/s
queuing systems, is one of the most widely used and accurate analytical techniques for predicting flight delays and their
propagation [46, 18, 57, 58, 59, 60].
17
Poisson and Pre-scheduled Random Demand Models Nonhomogeneous Poisson processes, which accommodate
varying arrival and service rates, have also been applied to predict departure and operational delays [61, 62]. To
overcome the limitations of Poisson models in precisely modelling arrival streams, the Pre-scheduled Random Demand
(PSRD) or Pre-scheduled Random Arrivals (PSRA) model was introduced. The PSRD model offers more precise
predictions and has been used extensively to investigate flight delay propagation and landing delays [63, 64, 65].
In conclusion, queuing models offer a valuable and efficient method for predicting flight time delays, requiring fewer
specific inputs than simulation models.
A.1.3 Data-driven models
Data-driven models use a top-down approach, leveraging historical data to identify trends and predict flight delays
empirically.
Traditional Statistical Methods Statistical models have been widely used to assess delay causes. Researchers
have employed methods like multivariate simultaneous regression [66, 67], Cox proportional hazards models [68],
multinomial logistic regression [69], and ordered probit models [39] to identify factors associated with delays, such
as season, flight distance, and time of day. Other techniques include Multivariate Adaptive Regression Splines
(MARS) [70] and hybrid regression and time series methodologies [71].
Machine Learning Models Machine learning models often outperform traditional statistical methods, as they can
automatically engineer high-order interactions between variables [72, 73]. Researchers have effectively implemented a
range of ML algorithms, including random forests, decision trees, support vector machines (SVM), and neural networks
to predict delays [7, 74, 75]. For instance, a combination of Bayes, rule, neural network, and decision tree models
achieved a prediction accuracy of 79.73% on data from a Chinese hub airport [76]. Other studies have used explainable
AI (xAI) techniques like SHAP to interpret delay factors [10], fuzzy inference systems to forecast delays at major
airports [19], and hybrid feature selection methods to identify influencing variables [77].
Deep learning models Deep learning (DL) represents a natural progression from ML, offering superior performance,
particularly for long-range temporal dependencies. DL models excel at distilling hierarchical representations from
complex data, which is critical for disentangling the multifactorial causes of delays [23]. Recurrent architectures like
Long Short-Term Memory (LSTM) and frameworks combining Convolutional Neural Networks (CNN) with LSTMs
have been used successfully to predict delays by capturing temporal patterns [78, 79, 80].
While effective, these recurrent models often cannot model the spatial interdependencies between airports, limiting their
ability to capture cascading delay propagation. This gap is addressed by recent advances in Graph Neural Networks
(GNNs), which explicitly encode airport systems as graphs. This spatio-temporal modeling capability has positioned
GNNs as an evolution beyond sequence-centric approaches [81, 82]. GNN architectures such as the Multiscale
Spatial-Temporal Adaptive GCN (MSTAGCN) [81], Deep Graph-Embedded LSTM (DGLSTM) [83], Adaptive Airport
Awareness GNN (AAGNN) [84], and ATFSTNP [85] have all demonstrated marked improvements in predicting delay
propagation dynamics within complex air traffic networks.
Attention Mechanism The attention mechanism was first developed for neural machine translation to allow a
model to dynamically focus on the most relevant parts of a source input [86]. This concept has since evolved into
powerful architectures like the self-attention-based Transformer [87] and the Graph Attention Network (GAT) [88].
In transportation networks, this flexibility is highly attractive because delays propagate in a nonlinear, time-varying
manner that is difficult to capture with fixed models. By allocating learnable weights to different airports and time
horizons, attention mechanisms both boost predictive accuracy and provide an interpretable view of what interactions
drive disruptions.
Building on this, recent aviation studies have integrated attention into sophisticated spatio-temporal models. For
example, some models embed attention in a combinatorial framework to accelerate convergence [89], while others use
it to predict multi-step hourly delay dynamics [90]. The Spatio-temporal Graph Dual-Attention Network (SGDAN)
provides real-time departure delay forecasts [82], and other recent models use multi-attention blocks to capture crossairport contagion patterns or fuse bidirectional LSTMs with an attention head to refine flight-level estimates [91, 8].
Collectively, these works demonstrate that attention is now a cornerstone in state-of-the-art delay-propagation models,
enabling them to handle high-dimensional traffic data and the stochastic nature of real-world operations.
B Algorithms
18
Algorithm 1: Extraction of feasible flight chains
Data: Harmonised table De, window length L, turnaround limits τmin and τmax
Result: Tensor stack C and label vector y
Sort De by Tail_Number and scheduled departure
foreach same-tail, same-day block g do
for j = 1 to |g| − L + 1 do
Form chain c = (fj , fj+1, fj+2)
if turnaround rules (4) hold then
Stack features to Xc, append to C
Compute ordinal label yc from fj+2, append to y
Stratify C, y into train : val : test = 70 : 15 : 15
Algorithm 2: Forward pass of CBAM–CNN
Input: x ∈ R
B×S×p
z ← x
⊤ // permute to (B, C, S)
for ℓ = 1 to K do
z ← CBAM
f
(ℓ)
CONV(z)

h ← GAP(z) // (B, C)
return Wh + b
Algorithm 3: Forward pass of the SimAM–CNN–LSTM Model
Input: Input mini-batch x ∈ R
B×S×p
z ← permute(x, 0, 2, 1) // To to (B, p, S) for Conv1d
// Pass through K Conv+SimAM stages
for ℓ = 1 to K do
zconv ← f
(ℓ)
CONV(z) z ← SimAM(zconv)
s ← z
⊤ // Reshape to (B, S, C) for LSTM
(_,(hT, _)) ← LSTM(s)
if LSTM is bidirectional then
hfinal ← Concatenate final forward & backward hidden states
else
hfinal ← hT[−1] // Get last layer’s hidden state
return Whfinal + b
19
Algorithm 4: ResidualDelayLayer
Data: mini-batch x ∈ R
B×S×F
Result: Wn, Ln ∈ [0, 1]B×S×1
// Extract distance and airborne-time columns
d ← x[:, :, F − 3]
a ← x[:, :, F − 5]
// Queue parameters
ES ← ks d + ε
λ ← ka/(a + ε)
ρ ← min(λ ES, 0.99)
// M/M/1 workload surrogates
Wq ← ρ ES/(1 − ρ + ε)
Lq ← λ Wq
// Min–max normalisation across the chain
Wmin, Wmax ← mint Wq, maxt Wq
Lmin, Lmax ← mint Lq, maxt Lq
Wn ←
Wq − Wmin
Wmax − Wmin + ε
Ln ←
Lq − Lmin
Lmax − Lmin + ε
return Wn.unsqueeze(−1), Ln.unsqueeze(−1)
Algorithm 5: Forward pass of the QT-SIMAM–CNN–QM-LSTM model
Input: flight-chain tensor X ∈ R
B×S×p
; use_softmp ∈ {true, false}
Output: classification logits yˆ and (optionally) residual-delay prediction ∆ˆ
S
// Calculate queue proxies per leg
Wn, Ln ← RESIDUALDELAYLAYER(X) // Output shape: (B, S, 1)
// Apply optional Soft Max-Plus front-end
if use_softmp then δ ← SOFTMAXPLUS(Wn ⊙ Ln, τ )
X ← concat(X, δ)
// Pass through CNN stem with QT-SimAM
Z ← permute(X, 0, 2, 1) // Reshape to (B, C0, S)
// Apply Lconv = 3 Conv+QT-SimAM stages
for ℓ ← 1 to Lconv do
Z ← CONVBLOCK(ℓ)
(Z) d ← meant Wn l ← meant Ln Z ← QT-SIMAM(Z, d, l)
// Process sequence with QMogrifier LSTM head
S ← permute(Z, 0, 2, 1) // Reshape to (B, S, Cout)
_, hT ← QMOGRIFIERSTACK(S, Wn, Ln) // Get final hidden state (B, H)
// Compute outputs
yˆ ← WclshT + bcls // Classification logits
∆ˆ
S ← W∆hT + b∆ // Residual delay prediction
return yˆ, ∆ˆ
S
20