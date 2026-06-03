import { describe, it, expect } from "vitest";
import { computeSkillMatch } from "@/lib/skillMatch";

describe("computeSkillMatch", () => {
  it("returns full match split when user has every required core + nice skill", () => {
    const r = computeSkillMatch(
      { core: ["python", "sql"], nice: ["airflow"] },
      ["python", "sql", "airflow", "tableau"],
    );
    expect(r.matchedCore).toEqual(["python", "sql"]);
    expect(r.matchedNice).toEqual(["airflow"]);
    expect(r.missingCore).toEqual([]);
    expect(r.missingNice).toEqual([]);
  });

  it("partitions correctly on partial match", () => {
    const r = computeSkillMatch(
      { core: ["python", "sql", "spark"], nice: ["airflow", "dbt"] },
      ["python", "airflow"],
    );
    expect(r.matchedCore).toEqual(["python"]);
    expect(r.missingCore).toEqual(["sql", "spark"]);
    expect(r.matchedNice).toEqual(["airflow"]);
    expect(r.missingNice).toEqual(["dbt"]);
  });

  it("returns all-missing when user has zero overlap", () => {
    const r = computeSkillMatch(
      { core: ["python", "sql"], nice: ["airflow"] },
      ["javascript", "react"],
    );
    expect(r.matchedCore).toEqual([]);
    expect(r.matchedNice).toEqual([]);
    expect(r.missingCore).toEqual(["python", "sql"]);
    expect(r.missingNice).toEqual(["airflow"]);
  });

  it("handles nice-only requirement (empty core)", () => {
    const r = computeSkillMatch(
      { core: [], nice: ["airflow", "dbt"] },
      ["airflow"],
    );
    expect(r.matchedCore).toEqual([]);
    expect(r.matchedNice).toEqual(["airflow"]);
    expect(r.missingCore).toEqual([]);
    expect(r.missingNice).toEqual(["dbt"]);
  });

  it("treats empty userCanonical as nothing-matched", () => {
    const r = computeSkillMatch(
      { core: ["python"], nice: ["airflow"] },
      [],
    );
    expect(r.matchedCore).toEqual([]);
    expect(r.matchedNice).toEqual([]);
    expect(r.missingCore).toEqual(["python"]);
    expect(r.missingNice).toEqual(["airflow"]);
  });

  it("tolerates missing fields on either side without throwing", () => {
    // required missing entirely → empty arrays in every output bucket
    expect(computeSkillMatch(null, ["python"])).toEqual({
      matchedCore: [], matchedNice: [], missingCore: [], missingNice: [],
    });
    // required with non-array fields
    expect(computeSkillMatch({ core: "not-an-array", nice: undefined }, ["python"])).toEqual({
      matchedCore: [], matchedNice: [], missingCore: [], missingNice: [],
    });
    // userCanonical null
    expect(computeSkillMatch({ core: ["python"], nice: ["airflow"] }, null)).toEqual({
      matchedCore: [], matchedNice: [], missingCore: ["python"], missingNice: ["airflow"],
    });
  });
});
