/**
 *   Filter key      → Response field
 *   ─────────────────────────────────
 *   instituteType   → institutionType
 *   academicYear    → year
 *   medium          → medium          (trim before compare)
 *   stream          → streamName
 *   graduationType  → graduationType
 *   degreeName      → degreeName
 *   division        → division
 *   standard        → standard
 */

export const applyClassroomFilters = (classrooms = [], filters = {}) => {
  if (!filters || Object.keys(filters).length === 0) return classrooms;

  const trim = (v) => (v ? String(v).trim() : '');

  return classrooms.filter((item) => {
    if (filters.instituteType  && trim(item.institutionType) !== trim(filters.instituteType))  return false;
    if (filters.academicYear   && trim(item.year)            !== trim(filters.academicYear))   return false;
    if (filters.medium         && trim(item.medium)          !== trim(filters.medium))         return false;
    if (filters.stream         && trim(item.streamName)      !== trim(filters.stream))         return false;
    if (filters.graduationType && trim(item.graduationType)  !== trim(filters.graduationType)) return false;
    if (filters.degreeName     && trim(item.degreeName)      !== trim(filters.degreeName))     return false;
    if (filters.division       && trim(item.division)        !== trim(filters.division))       return false;
    if (filters.standard       && trim(item.standard)        !== trim(filters.standard))       return false;
    return true;
  });
};