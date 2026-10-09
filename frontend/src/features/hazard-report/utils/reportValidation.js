export const hazardValues = ['FLOOD', 'LANDSLIDE', 'ROAD_BLOCKAGE', 'FALLEN_TREE', 'FIRE', 'BUILDING_DAMAGE', 'OTHER'];
export function localDateTime(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
export function validateReport(data) {
  const errors = {};
  if (!hazardValues.includes(data.hazardType))
    errors.hazardType = 'Choose a hazard type.';
  if (!data.description?.trim())
    errors.description = 'Describe the hazard.';
  else if (data.description.length > 500)
    errors.description = 'Use no more than 500 characters.';
  for (const [field, limit] of [['latitude', 90], ['longitude', 180]]) {
    const value = data[field];
    if (value === '' || value == null || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > limit)
      errors[field] = `Enter a valid ${field} between -${limit} and ${limit}.`;
  }
  if (!data.dateTime || !Number.isFinite(new Date(data.dateTime).getTime()))
    errors.dateTime = 'Enter a valid date and time.';
  else if (new Date(data.dateTime).getTime() > Date.now() + 60000)
    errors.dateTime = 'The hazard date cannot be in the future.';
  return errors;
}
export function createEmptyReport() {
  return {
    hazardType: '',
    description: '',
    latitude: '',
    longitude: '',
    dateTime: localDateTime(),
    photo: null,
    photoPreview: '',
    clientRequestId: crypto.randomUUID()
  };
}
export function mergeReportData(current, updates) {
  return { ...current, ...updates };
}
export function validatePhoto(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type))
    return 'Choose a JPEG or PNG image.';
  if (file.size > 2 * 1024 * 1024)
    return 'Choose an image smaller than 2 MB.';
  return '';
}
export const formatReportDate = value => new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
