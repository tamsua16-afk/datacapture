/**
 * Utility chuẩn hóa văn bản và Alias cho Xưởng Data Capture
 */

/**
 * Loại bỏ dấu tiếng Việt khỏi chuỗi văn bản
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return ''
  let result = str
  result = result.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a')
  result = result.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E')
  result = result.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e')
  result = result.replace(/ì|í|ị|ỉ|ĩ/g, 'i')
  result = result.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o')
  result = result.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u')
  result = result.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y')
  result = result.replace(/đ/g, 'd')
  result = result.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A')
  result = result.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I')
  result = result.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O')
  result = result.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U')
  result = result.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y')
  result = result.replace(/Đ/g, 'D')
  // Một số ký tự kết hợp dấu Unicode (NFD)
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return result
}

/**
 * Chuẩn hóa Alias:
 * - Chuyển chữ thường
 * - Bỏ dấu tiếng Việt
 * - Loại bỏ khoảng trắng ở 2 đầu
 * - Gộp các khoảng trắng liên tiếp thành 1 khoảng trắng đơn
 */
export function normalizeAlias(alias: string): string {
  if (!alias) return ''
  const noTones = removeVietnameseTones(alias)
  return noTones
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Kiểm tra 2 chuỗi alias có khớp nhau sau khi chuẩn hóa không
 */
export function isAliasMatching(a: string, b: string): boolean {
  return normalizeAlias(a) === normalizeAlias(b)
}
