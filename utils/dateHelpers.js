// utils/dateHelpers.js (same as before)
function getDateFromRange(range) {
  const now = new Date();
  const start = new Date(now);
  switch (range) {
    case '1d': start.setDate(now.getDate() - 1); break;
    case '1w': start.setDate(now.getDate() - 7); break;
    case '1m': start.setMonth(now.getMonth() - 1); break;
    case '3m': start.setMonth(now.getMonth() - 3); break;
    case '6m': start.setMonth(now.getMonth() - 6); break;
    case '1y': start.setFullYear(now.getFullYear() - 1); break;
    default: start.setDate(now.getDate() - 1);
  }
  return start;
}
module.exports = { getDateFromRange };
