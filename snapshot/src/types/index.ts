export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

/** 色彩感知三元组 [H(0..360), S(0..100), V(0..100)] */
export type HSVTuple = [number, number, number];

/** OKLab 感知色彩空间坐标 [L(0..1), a(-0.4..0.4), b(-0.4..0.4)] */
export type OKLabTuple = [number, number, number];