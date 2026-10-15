import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const exactMoves = [
  [
    "researchPapers/A_Data-Light_and_T_A_Data-Light_and_Trajectory-Based_Machine_Learning_Appr_y-Based_Machine_Learning_Approach_for_the_Online_Prediction_of_Flight_Time_of_Arrival.md",
    "data-collection/research-papers/A_Data-Light_and_T_A_Data-Light_and_Trajectory-Based_Machine_Learning_Appr_y-Based_Machine_Learning_Approach_for_the_Online_Prediction_of_Flight_Time_of_Arrival.md",
    "f0c11ae9304a343409f78863d909445597f4b58d"
  ],
  [
    "researchPapers/Air_Traffic_Dela_affic_Delay_Prediction_Based_on_Machine_Learning_and_Dela_ediction_Based_on_Machine_Learning_and_Delay_Propagation.md",
    "data-collection/research-papers/Air_Traffic_Dela_affic_Delay_Prediction_Based_on_Machine_Learning_and_Dela_ediction_Based_on_Machine_Learning_and_Delay_Propagation.md",
    "1f22599cbd798287f23b00df60b168894d258d6f"
  ],
  [
    "researchPapers/Chained_Predictions_of_Flight_Delay_Using_Machine_Learning.md",
    "data-collection/research-papers/Chained_Predictions_of_Flight_Delay_Using_Machine_Learning.md",
    "ddcd3af8abae0d266d59b8acd5b823aa8db2d942"
  ],
  [
    "researchPapers/ConvolutionalLong-ShortTermMemoryNetworkwithMulti-HeadAttentionMechanismforTrafficFlowPrediction.md",
    "data-collection/research-papers/ConvolutionalLong-ShortTermMemoryNetworkwithMulti-HeadAttentionMechanismforTrafficFlowPrediction.md",
    "5ee31736ac5a5787399588cc5c7bbe7ef024de12"
  ],
  [
    "researchPapers/Edge-BasedGNNforNetworkDelayPredictionEnhancedbyFlightConnectivity.md",
    "data-collection/research-papers/Edge-BasedGNNforNetworkDelayPredictionEnhancedbyFlightConnectivity.md",
    "ff508aad194f39d6171ac3c3716101e33c0553a8"
  ],
  [
    "researchPapers/LLM4Delay:FlightDelayPredictionviaCross-ModalityAdaptationofLargeLanguageModelsandAircraftTrajectoryRepresentation.md",
    "data-collection/research-papers/LLM4Delay:FlightDelayPredictionviaCross-ModalityAdaptationofLargeLanguageModelsandAircraftTrajectoryRepresentation.md",
    "324fadbae5768efc03e61e2c26a9b7f226a3424b"
  ],
  [
    "researchPapers/MachineLearningforAirTrafficFlowManagement:ASurvey.md",
    "data-collection/research-papers/MachineLearningforAirTrafficFlowManagement:ASurvey.md",
    "8ccd7b3c00252ba9cdf8809ecebb7f3d658334c1"
  ],
  [
    "researchPapers/QUEUE_UP_FOR_TAKEOFF:A_TRANSFERABLE_DEEP_LEARNING_FRAMEWORK_FOR_FLIGHT_DELAY_PREDICTION.md",
    "data-collection/research-papers/QUEUE_UP_FOR_TAKEOFF:A_TRANSFERABLE_DEEP_LEARNING_FRAMEWORK_FOR_FLIGHT_DELAY_PREDICTION.md",
    "0b1e6670bc149aa0269a8b5524248f2d35808636"
  ],
  [
    "screenshots/auth-login-1440.jpg",
    "docs/history/travnr-ui-screenshots/auth-login-1440.jpg",
    "067302d27d18708c6ff2bc153b13e7ea2a7d5610"
  ],
  [
    "screenshots/auth-register-1440.jpg",
    "docs/history/travnr-ui-screenshots/auth-register-1440.jpg",
    "b0e71476b8acd9ef312e39b7d8a557d74b3ab586"
  ],
  [
    "screenshots/guest-booking-error-1440.jpg",
    "docs/history/travnr-ui-screenshots/guest-booking-error-1440.jpg",
    "1e31feb702b83f738a37b60f23a571426a7e4cb6"
  ],
  [
    "screenshots/landing-1440.jpg",
    "docs/history/travnr-ui-screenshots/landing-1440.jpg",
    "7fdd58e076a7f60841582c2c5e6fd980ab422572"
  ]
] as const;
describe("Oct 4 safe structural root cleanup", () => {
  it("preserves 12 original literal blobs and removes three obsolete tracked root folders", () => {
    for (const [oldPath,newPath,sha] of exactMoves) {
      expect(existsSync(oldPath), "old path retained " + oldPath).toBe(false);
      expect(existsSync(newPath), "new archive source missing " + newPath).toBe(true);
      expect(execFileSync("git", ["hash-object", "--",newPath],{encoding:"utf8",timeout:5000}).trim()).toBe(sha);
    }
    expect(existsSync("researchPapers/README.md")).toBe(false);
    expect(existsSync("data-collection/research-papers/README.md")).toBe(true);
    expect(existsSync(".agents/agent_assets_metadata.toml")).toBe(false);
    expect(readFileSync(".gitignore","utf8")).toContain(".agents/");
    for(const path of ["researchPapers",".agents","screenshots"]) {
      const out=execFileSync("git",["ls-files","--cached","--",path],{encoding:"utf8",timeout:5000}).trim();
      expect(out,"old tracked directory retained: "+path).toBe("");
    }
    for(const path of ["SEPmd/V3.9_DataCollectPlan_f.8.md","SEPmd/V3.9_IMPLEMENTATION_LOG.md",
      "SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md","SEPmd/V3.9_PHASE2G_AUTH_20261013_P2G25.json",
      "artifacts/phase2g-gate2-runtime-P2G-S1-20261013-03.json",
      "SEPmd/PHASE2G/OPERATOR_SHELL_ONLY_GUARDRAIL.md","AGENTS.md","attached_assets"]){
      expect(existsSync(path),"critical original source missing: "+path).toBe(true);
    }
    console.log("REPO_OCT04_STRUCTURAL_MOVE="+JSON.stringify({unchanged_blob_paths:exactMoves.length,root_folders_removed:3,obsolete_metadata_file_removed:true,provider_calls:0}));
  });
  it("rejects code references to moved original filenames",()=>{
    const dirs=["scripts","server","client","shared","migrations",".github"];
    const unsafe:string[]=[];
    for(const [oldPath] of exactMoves){
      try {
        const out=execFileSync("git",["grep","-I","-l","-F","-e",oldPath,"--",...dirs],{encoding:"utf8",timeout:9000}).trim();
        if(out)unsafe.push(oldPath+" referenced in "+out);
      } catch(e) { if((e as {status?:number}).status!==1)throw e; }
    }
    expect(unsafe).toEqual([]);
  });
});