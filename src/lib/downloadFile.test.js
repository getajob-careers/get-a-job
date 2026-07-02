// cvFilename: QA-R1 P1 fix - CV downloads must be human-sensible {Name}_{Role}_CV.pdf,
// not the storage machine name (render_<timestamp>.pdf).
import { describe, it, expect } from "vitest";
import { cvFilename } from "@/lib/downloadFile";

describe("cvFilename", () => {
  it("builds Name_Role_CV.pdf and sanitizes spaces/punctuation", () => {
    expect(cvFilename("Dana Cohen", "Product Manager")).toBe("Dana_Cohen_Product_Manager_CV.pdf");
    expect(cvFilename("Jane O'Brien-Smith", "Sr. Data/ML Eng")).toBe("Jane_OBrien-Smith_Sr_DataML_Eng_CV.pdf");
  });
  it("drops the role segment when there is no role (master CV)", () => {
    expect(cvFilename("Dana Cohen", "")).toBe("Dana_Cohen_CV.pdf");
    expect(cvFilename("Dana Cohen", null)).toBe("Dana_Cohen_CV.pdf");
  });
  it("falls back gracefully with no name (or a non-Latin name)", () => {
    expect(cvFilename("", "Product Manager")).toBe("Product_Manager_CV.pdf");
    expect(cvFilename("דנה כהן", "")).toBe("CV.pdf"); // non-Latin collapses; never empty
    expect(cvFilename("", "")).toBe("CV.pdf");
  });
});
