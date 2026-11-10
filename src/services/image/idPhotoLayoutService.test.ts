import {
  calculateIdPhotoLayout,
  idPhotoFileName,
  ID_PHOTO_DPI,
  ID_PHOTO_MAX_PAGES,
  mmToPixels,
} from "./idPhotoLayoutService";

describe("ID photo layout", () => {
  const options = {
    photoWidthMm: 35,
    photoHeightMm: 45,
    paperWidthMm: 101.6,
    paperHeightMm: 152.4,
    marginMm: 0,
    spacingMm: 0,
    copies: 7,
    cropMarks: false,
  };

  it("fits a centered 35 × 45 mm grid on 4 × 6 paper and paginates extra copies", () => {
    const layout = calculateIdPhotoLayout(options);

    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(3);
    expect(layout.capacity).toBe(6);
    expect(layout.pageCount).toBe(2);
    expect(layout.placements[0].xMm).toBeCloseTo(15.8);
    expect(layout.placements[0].yMm).toBeCloseTo(8.7);
    expect(layout.placements[0].widthMm).toBe(35);
    expect(layout.placements[0].heightMm).toBe(45);
    expect(layout.placements.at(-1)?.xMm).toBeLessThanOrEqual(101.6 - 35);
    expect(layout.placements.at(-1)?.yMm).toBeLessThanOrEqual(152.4 - 45);
  });

  it("rounds each physical dimension to 300 DPI without accumulating layout error", () => {
    expect(ID_PHOTO_DPI).toBe(300);
    expect(mmToPixels(25)).toBe(295);
    expect(mmToPixels(35)).toBe(413);
    expect(mmToPixels(101.6)).toBe(1200);
    expect(mmToPixels(152.4)).toBe(1800);
  });

  it("uses the requested margin and spacing when calculating rows and columns", () => {
    const layout = calculateIdPhotoLayout({
      ...options,
      marginMm: 5,
      spacingMm: 8,
      copies: 1,
    });

    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(2);
    expect(layout.placements[1].xMm - layout.placements[0].xMm).toBe(43);
    expect(layout.placements.every((placement) => placement.xMm >= 5 && placement.yMm >= 5)).toBe(true);
  });

  it("rejects layouts that do not fit, exceed page limits, or have invalid values", () => {
    expect(() => calculateIdPhotoLayout({ ...options, paperWidthMm: 20 })).toThrow("photo-does-not-fit");
    expect(() => calculateIdPhotoLayout({ ...options, copies: 601 })).toThrow("page-limit");
    expect(() => calculateIdPhotoLayout({ ...options, marginMm: -1 })).toThrow("invalid-layout");
    expect(ID_PHOTO_MAX_PAGES).toBe(100);
  });

  it("creates a filename containing the photo and paper dimensions", () => {
    expect(idPhotoFileName(35, 45, "4x6", "pdf")).toBe("id-photo-35x45mm-4x6.pdf");
    expect(idPhotoFileName(25.5, 35, "A4", "png")).toBe("id-photo-25-5x35mm-A4.png");
  });
});
