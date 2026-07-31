export type RiskLevel =
  | 'NEGATIVE_STOCK'   // Priority 1: Âm kho
  | 'DUPLICATE'        // Priority 2: Trùng phiếu
  | 'UNMAPPED_ITEM'    // Priority 3: Mã hàng chưa ánh xạ
  | 'UNIT_MISMATCH'     // Priority 4: Sai đơn vị
  | 'LOW_CONFIDENCE'   // Priority 5: Confidence thấp
  | 'LONG_WAIT'        // Priority 6: Chờ lâu (>24h)
  | 'NORMAL'           // Priority 7: Bình thường

export const RISK_PRIORITY_MAP: Record<RiskLevel, number> = {
  NEGATIVE_STOCK: 1,
  DUPLICATE: 2,
  UNMAPPED_ITEM: 3,
  UNIT_MISMATCH: 4,
  LOW_CONFIDENCE: 5,
  LONG_WAIT: 6,
  NORMAL: 7,
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  NEGATIVE_STOCK: 'Âm kho',
  DUPLICATE: 'Trùng phiếu',
  UNMAPPED_ITEM: 'Chưa ánh xạ',
  UNIT_MISMATCH: 'Sai đơn vị',
  LOW_CONFIDENCE: 'Confidence thấp',
  LONG_WAIT: 'Chờ lâu (>24h)',
  NORMAL: 'Bình thường',
}
