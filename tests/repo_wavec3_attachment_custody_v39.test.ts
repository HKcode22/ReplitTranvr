import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const blobs: ReadonlyArray<{name:string;sha:string;kind:"image"|"archive"}> = [
  {
    "name": "IMG_5534_1772068196299.png",
    "sha": "ebe6159f01214ffbf4f8518f6c337d8e755ffdba",
    "kind": "image"
  },
  {
    "name": "Pasted-Before-I-manually-configure-Bland-Dynamic-Data-in-the-B_1777685941718.txt",
    "sha": "61eadd45efeb71af9a54272e7224719b5c0feec5",
    "kind": "archive"
  },
  {
    "name": "Pasted-Build-a-full-stack-web-app-called-Travnr-a-personal-tra_1771098877225.txt",
    "sha": "85c83a422e68b89de394ca133f5cd43ae9545edd",
    "kind": "archive"
  },
  {
    "name": "Pasted-Create-proper-Privacy-Policy-and-Terms-of-Service-pages_1777766650690.txt",
    "sha": "282cd9d8ba34e396b3d9f6f24edd4ba6247873aa",
    "kind": "archive"
  },
  {
    "name": "Pasted-Five-fixes-additions-to-the-Travnr-admin-dashboard-Here_1776979699206.txt",
    "sha": "47fd6bad0af4c4b0ae8e6384cb9ea43e2bd415e2",
    "kind": "archive"
  },
  {
    "name": "Pasted-Fix-the-admin-dashboard-data-issues-in-server-routes-ts_1776965374887.txt",
    "sha": "70e2f3b9122f6623fe9fe792d583acb55653c871",
    "kind": "archive"
  },
  {
    "name": "Pasted-Fix-the-admin-dashboard-data-issues-in-server-routes-ts_1776966481902.txt",
    "sha": "70e2f3b9122f6623fe9fe792d583acb55653c871",
    "kind": "archive"
  },
  {
    "name": "Pasted-I-need-two-major-features-added-to-the-Travnr-app-Here-_1776963405019.txt",
    "sha": "c310919dbcf5b98c43eacfe7a90c5d87e36635a1",
    "kind": "archive"
  },
  {
    "name": "Pasted-IMPORTANT-Do-not-change-anything-except-what-is-specifi_1777336931604.txt",
    "sha": "0fa743b554df84a7f2c4f0d19df5a8ff666ba92c",
    "kind": "archive"
  },
  {
    "name": "Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777052446636.txt",
    "sha": "c157723d9094c24d9a0d2e1004c72286f3e6af55",
    "kind": "archive"
  },
  {
    "name": "Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777291230221.txt",
    "sha": "742ac3c3871c75e7ddb753d245ff0c57d7123e84",
    "kind": "archive"
  },
  {
    "name": "Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777291230346.txt",
    "sha": "742ac3c3871c75e7ddb753d245ff0c57d7123e84",
    "kind": "archive"
  },
  {
    "name": "Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777291272855.txt",
    "sha": "742ac3c3871c75e7ddb753d245ff0c57d7123e84",
    "kind": "archive"
  },
  {
    "name": "Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777300049409.txt",
    "sha": "7a52f3585ae4fa6baa8204ea17680f22db2f31b4",
    "kind": "archive"
  },
  {
    "name": "Pasted-Read-every-file-in-the-project-before-making-any-change_1776823654318.txt",
    "sha": "cfe10f225dfe1d49628e39068f64388d26e0b108",
    "kind": "archive"
  },
  {
    "name": "Pasted-Read-server-lib-bland-ts-in-full-before-making-any-chan_1776993442013.txt",
    "sha": "ad3ded00dfd9c3ca747e486a569c677735d8881f",
    "kind": "archive"
  },
  {
    "name": "Pasted-Read-these-files-in-full-before-making-any-changes-serv_1776825621672.txt",
    "sha": "e33830840131e15b206e435ddf071283ea844f08",
    "kind": "archive"
  },
  {
    "name": "Pasted-Read-these-files-in-full-before-making-any-changes-serv_1776996479994.txt",
    "sha": "9979304fed6489a075e7a4b57f8598c04260b8c8",
    "kind": "archive"
  },
  {
    "name": "Pasted-Read-these-files-in-full-before-touching-anything-serve_1776820476065.txt",
    "sha": "dc997d66d20bf705fe673527d44bebba8542a098",
    "kind": "archive"
  },
  {
    "name": "Pasted-Set-up-Travnr-SMS-proposal-delivery-infrastructure-with_1777767597105.txt",
    "sha": "76544d8d38b95e3d30644c64f52e91b12fdfab86",
    "kind": "archive"
  },
  {
    "name": "Pasted-The-Bland-webhook-URL-in-the-Bland-dashboard-is-already_1777682924902.txt",
    "sha": "c83a5016f6b0e5c4de29270f0b613d2c7ad62c38",
    "kind": "archive"
  },
  {
    "name": "Pasted-We-are-adding-hidden-hotel-infrastructure-to-Travnr-but_1777777742955.txt",
    "sha": "f123e480968853437779e0da73d3b09591965e8a",
    "kind": "archive"
  },
  {
    "name": "Pasted-We-found-a-real-issue-with-inbound-caller-identity-When_1777761335968.txt",
    "sha": "10cf793db51f4308b04aeeb40b76bf089819bd78",
    "kind": "archive"
  },
  {
    "name": "Pasted-You-are-working-on-the-Travnr-website-Goal-Improve-Trav_1777800542211.txt",
    "sha": "a7bfc5926acc95fae5d7553acf7a4f66e08e60ee",
    "kind": "archive"
  },
  {
    "name": "Screenshot_2026-02-13_at_11.46.50_PM_1771098913727.png",
    "sha": "a5204b3a3451d2c0db63cf7300800a9bd6f03039",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-02-14_at_1.55.00_PM_1771098913727.png",
    "sha": "d86c2f9738f30c6dead113f71601619193cc334f",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-02-14_at_5.15.23_PM_1771111055053.png",
    "sha": "644e715e935d0d2c3621adfb8f80b2c6bdacbdd7",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-02-22_at_2.58.24_PM_1771793906904.png",
    "sha": "c86f250e9498555be323514dd6aea1a3d2ba9dc1",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-02-22_at_2.58.34_PM_1771793917353.png",
    "sha": "78a1f78e9344f3d8deba63146b2eb976581321ad",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-02-22_at_3.04.34_PM_1771794275524.png",
    "sha": "039af6e99db084448425c89ef8e5d1bd926fcef1",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-04-23_at_4.12.35_PM_1776978761554.png",
    "sha": "0ecae810f012cb5600412bde9b7a975cc4c5f4e3",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-05-03_at_1.10.21_AM_1777788686653.png",
    "sha": "614195d205a02e2f29db81600a7faa82be3a29fd",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-05-03_at_3.17.09_AM_1777796235646.png",
    "sha": "0b5e91a137f834e3033eae6c57a033c55867e19f",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-05-03_at_3.22.44_AM_1777796569780.png",
    "sha": "d9b8aa3373d50abb66bcdee0ebaa21ae48336e64",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-05-03_at_3.24.19_AM_1777796665591.png",
    "sha": "4ca8374b36b40afb6e6651794a0bfa5e31ca215d",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-05-03_at_4.00.45_AM_1777798931058.png",
    "sha": "2cb93bfe595444d6abb91a2f4c8dda2d14d85e24",
    "kind": "image"
  },
  {
    "name": "Screenshot_2026-05-03_at_4.01.53_AM_1777799212597.png",
    "sha": "f2c90f95e44c6cda10306f510a00e894dbf1d365",
    "kind": "image"
  },
  {
    "name": "_favicon_1771098927785.png",
    "sha": "6f1f7fed24008c29014fc4b1f9eb4631febaab60",
    "kind": "image"
  },
  {
    "name": "image_1771521625481.png",
    "sha": "6b4271c0a2f40df22de26f56f4cb193be20f6dcd",
    "kind": "image"
  },
  {
    "name": "image_1772307616240.png",
    "sha": "cdc24076ee99b7a8fc0364bfb45f07cb135e1660",
    "kind": "image"
  },
  {
    "name": "travnr-airplane-icon.png",
    "sha": "87be6b56acfd385bd30c1de0c982599a0407c6b3",
    "kind": "image"
  },
  {
    "name": "travnr-project_1771519817145.zip",
    "sha": "05a72519f63510d24b15e078d086af6656468dae",
    "kind": "archive"
  }
];
const fromRoot = "attached_assets";
const imgRoot = "client/src/assets/images/legacy-attachments";
const historyRoot = "docs/history/legacy-replit-attachments";

describe("Wave C3 legacy attachments remain byte-identical (no provider)", () => {
  it("preserves every one of 42 original Git identities with no old tracked root assets", () => {
    expect(blobs).toHaveLength(42);
    expect(blobs.filter(f=>f.kind==="image")).toHaveLength(18);
    expect(blobs.filter(f=>f.kind==="archive")).toHaveLength(24);
    for (const f of blobs) {
      const path = (f.kind === "image" ? imgRoot : historyRoot) + "/" + f.name;
      expect(existsSync(path), path).toBe(true);
      const sha = execFileSync("git", ["hash-object", "--", path], { encoding: "utf8" }).trim();
      expect(sha, path).toBe(f.sha);
      expect(existsSync(fromRoot + "/" + f.name)).toBe(false);
    }
    expect(execFileSync("git",["ls-files","--cached","--",fromRoot], {encoding:"utf8"}).trim()).toBe("");
  });
  it("retains Vite legacy image alias and two protected audit roots", () => {
    const vite=readFileSync("vite.config.ts","utf8");
    expect(vite).toContain('"@assets": path.resolve(import.meta.dirname, "client", "src", "assets", "images", "legacy-attachments")');
    const audit=readFileSync("scripts/repo_cleanup_reference_audit.mjs","utf8");
    for(const root of [imgRoot,historyRoot])expect(audit).toContain(root + "/");
    expect(existsSync(imgRoot)).toBe(true);
    expect(existsSync(historyRoot)).toBe(true);
  });
});
